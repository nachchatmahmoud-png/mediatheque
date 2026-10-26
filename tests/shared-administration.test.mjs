import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {pbkdf2Sync} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createSharedHandler,portalOrigin} from '../administration/shared/service.mjs';
const schema=await readFile(new URL('../administration/shared/schema.sql',import.meta.url),'utf8');
const secret='a'.repeat(64),password='Phrase privée de contrôle 2026';
function setup(){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec(schema);const files=new Map();
 const statement=(sql,values=[])=>({bind:(...next)=>statement(sql,next),first:async()=>sqlite.prepare(sql).get(...values)||null,all:async()=>({results:sqlite.prepare(sql).all(...values)}),run:async()=>{const result=sqlite.prepare(sql).run(...values);return {meta:{changes:Number(result.changes)}};}});
 const DB={prepare:statement,batch:async statements=>{sqlite.exec('BEGIN');try{const results=[];for(const item of statements)results.push(await item.run());sqlite.exec('COMMIT');return results;}catch(error){sqlite.exec('ROLLBACK');throw error;}}};
 const BUCKET={put:async(key,value)=>{files.set(key,new Uint8Array(value));},delete:async key=>files.delete(key),head:async key=>files.has(key)?{size:files.get(key).length,httpEtag:'"fixture"'}:null,get:async(key,options)=>{if(!files.has(key))return null;const full=files.get(key),bytes=options?.range?full.slice(options.range.offset,options.range.offset+options.range.length):full;return {arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),body:bytes};}};
 const handler=createSharedHandler({DB,BUCKET,OWNER_SETUP_SECRET:secret});
 async function request(path,{method='GET',body,token,activation,origin=portalOrigin,headers={}}={}){
  const response=await handler(new Request('https://service.example'+path,{method,headers:{Origin:origin,...(token?{Authorization:'Bearer '+token}:{}),...(activation?{Authorization:'Activation '+activation}:{}),...(body!==undefined?{'Content-Type':body instanceof Uint8Array?'application/octet-stream':'application/json'}:{}),...headers},...(body===undefined?{}:{body:body instanceof Uint8Array?body:JSON.stringify(body)})}));
  return {status:response.status,headers:response.headers,body:response.headers.get('Content-Type')?.includes('application/json')?await response.json():new Uint8Array(await response.arrayBuffer())};
 }
 const register=()=>request('/api/auth/register',{method:'POST',activation:secret,body:{username:'mahmoud',password,confirmPassword:password}});
 const login=()=>request('/api/auth/login',{method:'POST',body:{username:'MAHMOUD',password}});
 return {request,register,login,sqlite,files,DB};
}

test('the first shared account requires its private activation link and works from independent clients',async()=>{
 const value=setup();
 assert.equal((await value.request('/api/auth/options')).body.canSetup,false);
 assert.equal((await value.request('/api/auth/options')).body.setupRequired,true);
 const inactive=await value.login();assert.equal(inactive.status,409);assert.equal(inactive.body.code,'SETUP_REQUIRED');assert.match(inactive.body.error,/pas encore activé/);
 assert.equal((await value.request('/api/auth/options',{activation:secret})).body.canSetup,true);
 assert.equal((await value.request('/api/auth/register',{method:'POST',body:{username:'mahmoud',password,confirmPassword:password}})).status,403);
 assert.equal((await value.register()).status,201);
 assert.equal((await value.request('/api/auth/options')).body.setupRequired,false);
 assert.equal((await value.request('/api/auth/options',{activation:secret})).body.canSetup,false);
 const first=await value.login(),second=await value.login();
 assert.equal(first.status,200);assert.equal(second.status,200);assert.notEqual(first.body.sessionToken,second.body.sessionToken);
 for(const auth of [first,second])assert.equal((await value.request('/api/auth/session',{token:auth.body.sessionToken})).body.username,'mahmoud');
 const account=value.sqlite.prepare('SELECT * FROM administrators').get();assert.equal(JSON.stringify(account).includes(password),false);assert.equal(account.role,'owner');
 await value.request('/api/auth/logout',{method:'POST',token:first.body.sessionToken,body:{}});
 assert.equal((await value.request('/api/auth/session',{token:first.body.sessionToken})).status,401);
 assert.equal((await value.request('/api/auth/session',{token:second.body.sessionToken})).status,200);
});

test('a private owner link preserves existing credentials despite earlier rejected setup attempts',async()=>{
 const value=setup(),existing={username:'Nachchat Mahmoud',password:'Ancien2026',keepExistingAccess:true};
 for(let index=0;index<11;index++)assert.equal((await value.request('/api/auth/register',{method:'POST',body:existing})).status,index<10?403:429);
 const created=await value.request('/api/auth/register',{method:'POST',activation:secret,body:existing});assert.equal(created.status,201,JSON.stringify(created.body));assert.equal(created.body.username,'nachchat mahmoud');
 for(let index=0;index<2;index++)assert.equal((await value.request('/api/auth/login',{method:'POST',body:{username:existing.username,password:existing.password}})).status,200);
 const other=setup();assert.equal((await other.request('/api/auth/register',{method:'POST',activation:secret,body:{...existing,keepExistingAccess:false,confirmPassword:existing.password}})).status,400);
});

test('shared publications become public immediately, uploads stay private and video range reads work',async()=>{
 const value=setup();await value.register();const {sessionToken}= (await value.login()).body;
 const png=new Uint8Array(await readFile(new URL('../site/images/logo-ministere.png',import.meta.url)));
 const video=new Uint8Array([0,0,0,20,102,116,121,112,0,0,0,0]);
 const stage=async(name,bytes)=>(await value.request('/api/uploads?name='+name,{method:'POST',body:bytes,token:sessionToken})).body.url;
 assert.equal((await value.request('/api/publications',{method:'POST',body:{}})).status,401);
 const cover=await stage('image.png',png),media=await stage('film.mp4',video);
 assert.equal((await value.request('/api/media/private/staged.mp4')).status,404);
 for(const extra of [{type:'press',content:'Communiqué partagé'},{type:'photo',photos:[{url:cover,caption:'Rabat'}],thumbnailUrl:cover},{type:'video',mediaUrl:media,thumbnailUrl:cover,spokenLanguage:'fr'}]){
  const input={requestId:crypto.randomUUID(),title:'Publication '+extra.type,date:'2026-10-26',topic:'Vie institutionnelle',language:'fr',...extra};
  const first=await value.request('/api/publications',{method:'POST',token:sessionToken,body:input});assert.equal(first.status,201,JSON.stringify(first.body));
  const retry=await value.request('/api/publications',{method:'POST',token:sessionToken,body:input});assert.equal(retry.body.id,first.body.id);
 }
 const catalogue=await value.request('/api/catalogue',{origin:''});assert.equal(catalogue.status,200);assert.equal(catalogue.body.items.length,3);
 const item=catalogue.body.items.find(item=>item.type==='video');assert.match(item.mediaUrl,/^https:\/\/service.example\/api\/media\//);
 const range=await value.request(new URL(item.mediaUrl).pathname,{headers:{Range:'bytes=4-7'}});assert.equal(range.status,206);assert.equal(range.headers.get('Content-Range'),'bytes 4-7/12');assert.equal(new TextDecoder().decode(range.body),'ftyp');
});

test('one uploaded Arabic video publishes two distinct language entries sharing the same files',async()=>{
 const value=setup();await value.register();const token=(await value.login()).body.sessionToken;
 const stage=async(name,bytes)=>(await value.request('/api/uploads?name='+name,{method:'POST',body:bytes,token})).body.url;
 const thumbnailUrl=await stage('miniature.png',new Uint8Array(await readFile(new URL('../site/images/logo-ministere.png',import.meta.url))));
 const mediaUrl=await stage('video.mp4',new Uint8Array([0,0,0,20,102,116,121,112,0,0,0,0]));
 const translations={fr:{title:'Présentation du programme de logement',description:'',credit:''},ar:{title:'تقديم برنامج السكن',description:'',credit:''}};
 const input={requestId:crypto.randomUUID(),type:'video',title:translations.fr.title,date:'2026-10-26',topic:'Vie institutionnelle',language:'fr',spokenLanguage:'ar',mediaUrl,thumbnailUrl,translations};
 const first=await value.request('/api/publications',{method:'POST',token,body:input});assert.equal(first.status,201,JSON.stringify(first.body));
 assert.equal((await value.request('/api/publications',{method:'POST',token,body:input})).body.id,first.body.id);
 const catalogue=(await value.request('/api/catalogue',{origin:''})).body;
 assert.equal(catalogue.items.length,2);assert.equal(catalogue.events.length,2);
 const fr=catalogue.items.find(item=>item.language==='fr'),ar=catalogue.items.find(item=>item.language==='ar');
 assert.equal(fr.title,translations.fr.title);assert.equal(ar.title,translations.ar.title);assert.notEqual(fr.id,ar.id);assert.notEqual(fr.eventId,ar.eventId);
 assert.equal(fr.mediaUrl,ar.mediaUrl);assert.equal(fr.thumbnailUrl,ar.thumbnailUrl);assert.equal(fr.spokenLanguage,'ar');assert.equal(ar.spokenLanguage,'ar');
 assert.equal(value.files.size,2);assert.equal(value.sqlite.prepare('SELECT COUNT(*) AS count FROM publications').get().count,1);
 for(const invalid of [{...translations,fr:{title:'عنوان بالعربية'}},{fr:translations.fr,ar:{title:'Titre non traduit'}},{fr:{title:''},ar:translations.ar},{}]){
  const response=await value.request('/api/publications',{method:'POST',token,body:{...input,requestId:crypto.randomUUID(),translations:invalid}});assert.equal(response.status,400);
 }
 assert.equal(value.sqlite.prepare('SELECT COUNT(*) AS count FROM publications').get().count,1);
 const arabic=await value.request('/api/publications',{method:'POST',token,body:{...input,requestId:crypto.randomUUID(),language:'ar',title:translations.ar.title,translations:{ar:translations.ar}}});assert.equal(arabic.status,201);
 const after=(await value.request('/api/catalogue',{origin:''})).body;
 assert.equal(after.items.filter(item=>item.language==='fr').length,1);assert.equal(after.items.filter(item=>item.language==='ar').length,2);assert.equal(value.files.size,2);
});

test('only the owner can invite the three designated administrators, and activation links are single use',async()=>{
 const value=setup();await value.register();const owner=(await value.login()).body.sessionToken;
 assert.equal((await value.request('/api/accounts/invite',{method:'POST',body:{username:'katiri.abdelah'}})).status,401);
 const invite=await value.request('/api/accounts/invite',{method:'POST',token:owner,body:{username:'katiri.abdelah'}});assert.equal(invite.status,201);
 assert.equal((await value.request('/api/auth/register',{method:'POST',activation:invite.body.activationToken,body:{username:'katiri.abdelah',password:'court',confirmPassword:'court',keepExistingAccess:true}})).status,400);
 assert.equal((await value.request('/api/auth/options',{activation:invite.body.activationToken})).body.registrationUsername,'katiri.abdelah');
 const created=await value.request('/api/auth/register',{method:'POST',activation:invite.body.activationToken,body:{username:'katiri.abdelah',password,confirmPassword:password}});assert.equal(created.status,201);
 assert.equal((await value.request('/api/auth/options',{activation:invite.body.activationToken})).body.canSetup,false);
 const admin=(await value.request('/api/auth/login',{method:'POST',body:{username:'katiri.abdelah',password}})).body.sessionToken;
 assert.equal((await value.request('/api/accounts',{token:admin})).status,403);
 const accounts=(await value.request('/api/accounts',{token:owner})).body.accounts;assert.equal(accounts.length,4);assert.equal(accounts.find(item=>item.username==='katiri.abdelah').active,true);
 assert.equal((await value.request('/api/auth/login',{method:'POST',origin:'https://untrusted.example',body:{username:'mahmoud',password}})).status,403);
});

 test('the existing browser account can be transferred without changing its password and is upgraded at login',async()=>{
 const value=setup(),salt='b'.repeat(32),passwordHash=pbkdf2Sync(password,Buffer.from(salt,'hex'),600000,32,'sha256').toString('hex');
 const result=await value.request('/api/auth/register',{method:'POST',activation:secret,body:{username:'mahmoud',legacyVerifier:{salt,passwordHash,iterations:600000}}});
 assert.equal(result.status,201);assert.equal(value.sqlite.prepare('SELECT password_hash FROM administrators').get().password_hash,'pbkdf2:'+passwordHash);
 assert.equal((await value.login()).status,200);
 assert.equal(value.sqlite.prepare('SELECT password_hash FROM administrators').get().password_hash.startsWith('pbkdf2:'),false);
 assert.equal((await value.login()).status,200);
 });
