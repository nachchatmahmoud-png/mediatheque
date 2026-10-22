import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createAdminHandler} from '../server/service.ts';
import {digest} from '../server/publication.ts';
const origin='https://nachchatmahmoud-png.github.io';
const accountId='11111111-1111-4111-8111-111111111111';
const otherId='22222222-2222-4222-8222-222222222222';
const initialPassword='INITIAL TEST PASSWORD NEVER VALID';
const newPassword='NOUVEAU MOT DE PASSE DE TEST';
const png=new Uint8Array(await readFile(new URL('../../site/images/logo-ministere.png',import.meta.url)));
function setup({requiresPasswordChange=false}={}){
 const profile={id:accountId,username:'admin.test',authEmail:'admin.test@mediatheque.invalid',displayName:'Test',role:'admin',enabled:true,version:1,requiresPasswordChange};
 const sessions=new Map(),uploads=new Map(),files=new Map(),limits=new Map(),calls=[];let password=initialPassword;
 const store={
  async allow(key,limit){const count=(limits.get(key)||0)+1;limits.set(key,count);return count<=limit;},
  async account(username){return username===profile.username?{...profile}:null;},
  async createSession(hash,account,expiresAt){sessions.set(hash,{account:{...account},expiresAt});},
  async session(hash){const session=sessions.get(hash);return session&&Date.parse(session.expiresAt)>Date.now()&&profile.enabled&&session.account.version===profile.version?{...profile}:null;},
  async revokeSession(hash){sessions.delete(hash);},
  async revokeAccountSessions(){sessions.clear();profile.version++;},
  async passwordChanged(){profile.requiresPasswordChange=false;return {...profile};},
  async putUpload(upload,bytes){uploads.set(upload.id,upload);files.set(upload.path,bytes);},
  async upload(id){return uploads.get(id)||null;},
  async download(path){return files.get(path);},
  async countAccounts(){return 4;},
 };
 const passwords={async verify(email,value){calls.push({action:'verify',email});return email===profile.authEmail&&value===password?profile.id:null;},async change(id,value){calls.push({action:'change',id});password=value;}};
 const publisher={configured:true,async publish(prepared){calls.push({action:'publish',prepared});return {id:prepared.id,commitSha:'a'.repeat(40)};}};
 const handler=createAdminHandler({store,passwords,publisher});
 async function request(path,{method='GET',body,token,origin:requestOrigin=origin,headers={}}={}){
  const options={method,headers:{Origin:requestOrigin,...headers,...(token?{Authorization:'Bearer '+token}:{})}};
  if(body!==undefined){options.body=body instanceof Uint8Array?body:JSON.stringify(body);if(!(body instanceof Uint8Array))options.headers['Content-Type']='application/json';}
  const response=await handler(new Request('https://project.supabase.co/functions/v1/mediatheque'+path,options));
  return {status:response.status,headers:response.headers,body:response.status===204?null:await response.json()};
 }
 const login=()=>request('/api/auth/login',{method:'POST',body:{username:'ADMIN.TEST',password:initialPassword}});
 return {request,login,profile,sessions,uploads,files,calls,store};
}

test('login verifies the provider credential, stores only a token hash and returns no publishing key',async()=>{
 const value=setup(),result=await value.login();assert.equal(result.status,200);
 assert.match(result.body.sessionToken,/^[a-f0-9]{64}$/);assert.equal(result.body.username,'admin.test');
 assert.equal(value.sessions.has(result.body.sessionToken),false);
 assert.equal(value.sessions.has(await digest(new TextEncoder().encode(result.body.sessionToken))),true);
 assert.equal(JSON.stringify(result.body).includes(initialPassword),false);
 assert.equal('githubToken' in result.body,false);
 assert.equal(result.headers.get('Access-Control-Allow-Origin'),origin);
 const session=await value.request('/api/auth/session',{token:result.body.sessionToken});assert.equal(session.status,200);assert.equal('sessionToken' in session.body,false);
});

test('incorrect, unknown and disabled accounts get the same refusal; attempts are limited',async()=>{
 const value=setup();
 const wrong=await value.request('/api/auth/login',{method:'POST',body:{username:'admin.test',password:'incorrect'}});
 const unknown=await value.request('/api/auth/login',{method:'POST',body:{username:'unknown.user',password:'incorrect'}});
 assert.equal(wrong.status,401);assert.deepEqual(wrong.body,unknown.body);
 value.profile.enabled=false;assert.deepEqual((await value.login()).body,wrong.body);
 const limited=setup();let last;
 for(let i=0;i<11;i++)last=await limited.request('/api/auth/login',{method:'POST',body:{username:'admin.test',password:'incorrect'}});
 assert.equal(last.status,429);assert.equal(last.headers.get('Retry-After'),'900');
});

test('every mutation rejects anonymous callers and a disabled account loses an existing session',async()=>{
 const value=setup();
 for(const path of ['/api/uploads?name=x.png','/api/publications'])assert.equal((await value.request(path,{method:'POST',body:{}})).status,401);
 const auth=await value.login();value.profile.enabled=false;
 assert.equal((await value.request('/api/uploads?name=x.png',{method:'POST',body:png,token:auth.body.sessionToken})).status,401);
 assert.equal(value.uploads.size,0);assert.equal(value.calls.some(call=>call.action==='publish'),false);
});

test('the initial password cannot publish; choosing a personal password revokes all older sessions',async()=>{
 const value=setup({requiresPasswordChange:true}),first=await value.login(),second=await value.login();
 assert.equal(first.body.requiresPasswordChange,true);
 assert.equal((await value.request('/api/uploads?name=x.png',{method:'POST',body:png,token:first.body.sessionToken})).status,403);
 const changed=await value.request('/api/auth/change-password',{method:'POST',token:first.body.sessionToken,body:{currentPassword:initialPassword,password:newPassword,confirmPassword:newPassword}});
 assert.equal(changed.status,200);assert.equal(changed.body.requiresPasswordChange,false);
 for(const token of [first.body.sessionToken,second.body.sessionToken])assert.equal((await value.request('/api/auth/session',{token})).status,401);
 assert.equal((await value.login()).status,401);
 const next=await value.request('/api/auth/login',{method:'POST',body:{username:'admin.test',password:newPassword}});assert.equal(next.status,200);
 assert.equal((await value.request('/api/auth/logout',{method:'POST',token:next.body.sessionToken,body:{}})).status,200);
 assert.equal((await value.request('/api/auth/session',{token:next.body.sessionToken})).status,401);
});

test('uploads validate actual bytes, stay private and cannot be reused by another administrator',async()=>{
 const value=setup(),auth=await value.login(),token=auth.body.sessionToken;
 assert.equal((await value.request('/api/uploads?name=x.png',{method:'POST',body:new TextEncoder().encode('<html>not PNG</html>'),token})).status,400);
 const staged=await value.request('/api/uploads?name=photo.png',{method:'POST',body:png,token});assert.equal(staged.status,201);
 const stored=value.uploads.get(staged.body.url.slice(13));assert.ok(stored.path.startsWith(accountId+'/'));
 stored.accountId=otherId;
 const result=await value.request('/api/publications',{method:'POST',token,body:{requestId:crypto.randomUUID(),type:'photo',title:'Album',date:'2026-10-22',topic:'Vie institutionnelle',language:'fr',photos:[{url:staged.body.url}]}});
 assert.equal(result.status,400);assert.equal(value.calls.some(call=>call.action==='publish'),false);
});

test('photo, YouTube, imported video with captions and communiqué use the catalogue schema',async()=>{
 const value=setup(),auth=await value.login(),token=auth.body.sessionToken;
 const stage=async(name,bytes)=>(await value.request('/api/uploads?name='+name,{method:'POST',body:bytes,token})).body.url;
 const photo=await stage('cover.png',png),pdf=await stage('communique.pdf',new TextEncoder().encode('%PDF-1.4\nTEST'));
 const media=await stage('video.mp4',new Uint8Array([0,0,0,20,102,116,121,112,0,0,0,0]));
 const captions=await stage('fr.vtt',new TextEncoder().encode('WEBVTT\n\n00:00.000 --> 00:02.000\nTexte de test.\n'));
 const base={title:'Publication de test',date:'2026-10-22',topic:'Vie institutionnelle',language:'fr',description:'Résumé français'};
 for(const support of [
  {type:'photo',photos:[{url:photo,caption:'Couverture'}],thumbnailUrl:photo,location:'Rabat',credit:'Photographe de test'},
  {type:'video',mediaUrl:'https://www.youtube.com/watch?v=abcdefghijk',spokenLanguage:'ar'},
  {type:'video',mediaUrl:media,thumbnailUrl:photo,spokenLanguage:'ar',captionsSource:'file',captionsLanguage:'fr',captionsValidated:true,captionsUrl:captions},
  {type:'press',fileUrl:pdf,content:'Texte du communiqué'},
 ]){
  const response=await value.request('/api/publications',{method:'POST',token,body:{...base,...support,requestId:crypto.randomUUID()}});
  assert.equal(response.status,201,JSON.stringify(response.body));assert.match(response.body.id,/^publication-/);
 }
 assert.equal(value.calls.filter(call=>call.action==='publish').length,4);
 const album=value.calls.find(call=>call.action==='publish').prepared;
 assert.equal(album.record.location,'Rabat');assert.equal(album.record.credit,'Photographe de test');
});

test('untrusted origins, oversized login bodies and malformed subtitle files are refused',async()=>{
 const value=setup();
 assert.equal((await value.request('/api/auth/login',{method:'POST',origin:'https://other.example',body:{username:'admin.test',password:initialPassword}})).status,403);
 assert.equal(value.calls.length,0);
 assert.equal((await value.request('/api/auth/login',{method:'POST',body:{password:'x'.repeat(5000)}})).status,413);
 const auth=await value.login();
 assert.equal((await value.request('/api/uploads?name=fr.vtt',{method:'POST',token:auth.body.sessionToken,body:new TextEncoder().encode('WEBVTT\n\nPas de repères')})).status,400);
 assert.equal((await value.request('/api/auth/login',{method:'OPTIONS'})).status,204);
});
