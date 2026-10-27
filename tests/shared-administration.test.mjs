import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {pbkdf2Sync} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createSharedHandler,portalOrigin} from '../administration/shared/service.mjs';
const schema=await readFile(new URL('../administration/shared/schema.sql',import.meta.url),'utf8');
const secret='a'.repeat(64),password='Phrase privée de contrôle 2026';
function setup({openPublishing=false}={}){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec(schema);const files=new Map();
 const statement=(sql,values=[])=>({bind:(...next)=>statement(sql,next),first:async()=>sqlite.prepare(sql).get(...values)||null,all:async()=>({results:sqlite.prepare(sql).all(...values)}),run:async()=>{const result=sqlite.prepare(sql).run(...values);return {meta:{changes:Number(result.changes)}};}});
 const DB={prepare:statement,batch:async statements=>{sqlite.exec('BEGIN');try{const results=[];for(const item of statements)results.push(await item.run());sqlite.exec('COMMIT');return results;}catch(error){sqlite.exec('ROLLBACK');throw error;}}};
 const BUCKET={put:async(key,value)=>{files.set(key,new Uint8Array(value));},delete:async key=>files.delete(key),head:async key=>files.has(key)?{size:files.get(key).length,httpEtag:'"fixture"'}:null,get:async(key,options)=>{if(!files.has(key))return null;const full=files.get(key),bytes=options?.range?full.slice(options.range.offset,options.range.offset+options.range.length):full;return {arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),body:bytes};}};
 const handler=createSharedHandler({DB,BUCKET,OWNER_SETUP_SECRET:secret,REQUIRE_AUTHENTICATION:openPublishing?'false':'true'});
 async function request(path,{method='GET',body,token,activation,origin=portalOrigin,headers={}}={}){
  const response=await handler(new Request('https://service.example'+path,{method,headers:{Origin:origin,...(token?{Authorization:'Bearer '+token}:{}),...(activation?{Authorization:'Activation '+activation}:{}),...(body!==undefined?{'Content-Type':body instanceof Uint8Array?'application/octet-stream':'application/json'}:{}),...headers},...(body===undefined?{}:{body:body instanceof Uint8Array?body:JSON.stringify(body)})}));
  return {status:response.status,headers:response.headers,body:response.headers.get('Content-Type')?.includes('application/json')?await response.json():new Uint8Array(await response.arrayBuffer())};
 }
 const register=()=>request('/api/auth/register',{method:'POST',activation:secret,body:{username:'mahmoud',password,confirmPassword:password}});
 const login=()=>request('/api/auth/login',{method:'POST',body:{username:'MAHMOUD',password}});
 return {request,register,login,sqlite,files,DB,BUCKET};
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

test('an existing reserved identifier is preserved while the named administrator keeps a separate account',async()=>{
 for(const username of ['katiri.abdelah','rbina.abdelah','ilham.boudil']){
  const value=setup(),created=await value.request('/api/auth/register',{method:'POST',activation:secret,body:{username,password:'Ancien2026',keepExistingAccess:true}});
  assert.equal(created.status,201,JSON.stringify(created.body));assert.equal(created.body.username,username);
  const owner=await value.request('/api/auth/login',{method:'POST',body:{username,password:'Ancien2026'}});assert.equal(owner.status,200);assert.equal(owner.body.role,'owner');
  const token=owner.body.sessionToken,accounts=(await value.request('/api/accounts',{token})).body.accounts;
  assert.equal(accounts.length,4);assert.equal(new Set(accounts.map(account=>account.username)).size,4);
  assert.equal(accounts.filter(account=>account.active).length,1);
  const colleague=accounts.find(account=>account.username===username+'.admin');assert.ok(colleague);assert.equal(colleague.active,false);
  assert.equal((await value.request('/api/accounts/invite',{method:'POST',token,body:{username}})).status,400);
  const invite=await value.request('/api/accounts/invite',{method:'POST',token,body:{username:colleague.username}});assert.equal(invite.status,201);
  assert.equal((await value.request('/api/auth/register',{method:'POST',activation:invite.body.activationToken,body:{username:colleague.username,password,confirmPassword:password}})).status,201);
  const admin=await value.request('/api/auth/login',{method:'POST',body:{username:colleague.username,password}});assert.equal(admin.status,200);assert.equal(admin.body.role,'admin');assert.equal(admin.body.displayName,colleague.displayName);
  assert.equal((await value.request('/api/accounts',{token:admin.body.sessionToken})).status,403);
  assert.equal((await value.request('/api/auth/login',{method:'POST',body:{username,password:'Ancien2026'}})).status,200);
 }
 const legacy=setup(),salt='b'.repeat(32),passwordHash=pbkdf2Sync(password,Buffer.from(salt,'hex'),600000,32,'sha256').toString('hex');
 assert.equal((await legacy.request('/api/auth/register',{method:'POST',activation:secret,body:{username:'katiri.abdelah',legacyVerifier:{salt,passwordHash,iterations:600000}}})).status,201);
 assert.equal((await legacy.request('/api/auth/login',{method:'POST',body:{username:'katiri.abdelah',password}})).status,200);
 const fresh=setup();assert.equal((await fresh.request('/api/auth/register',{method:'POST',body:{username:'katiri.abdelah',password,confirmPassword:password}})).status,403);
 assert.equal((await fresh.request('/api/auth/register',{method:'POST',activation:secret,body:{username:'katiri.abdelah',password,confirmPassword:password}})).status,201);
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
  const input={requestId:crypto.randomUUID(),title:'Publication '+extra.type,date:'2026-10-26',topic:'Habitat et logement',keywords:['Aide directe au logement'],language:'fr',...extra};
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
 const input={requestId:crypto.randomUUID(),type:'video',title:translations.fr.title,date:'2026-10-26',topic:'Habitat et logement',keywords:['Aide directe au logement'],language:'fr',spokenLanguage:'ar',mediaUrl,thumbnailUrl,translations};
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

test('open management removes accounts and publishes shared content without a login or session',async()=>{
 const value=setup({openPublishing:true});
 value.sqlite.prepare('INSERT INTO administrators(id,username,display_name,role,salt,password_hash) VALUES(?,?,?,?,?,?)').run('old-account','ancien.compte','Ancien compte','owner','fixture','fixture');
 value.sqlite.prepare('INSERT INTO sessions(id,account_id,account_version,expires_at,last_seen) VALUES(?,?,?,?,?)').run('old-session','old-account',1,Date.now()+100000,Date.now());
 value.sqlite.prepare('INSERT INTO invitations(username,display_name,token_hash,expires_at) VALUES(?,?,?,?)').run('invitation','Invitation','fixture',Date.now()+100000);
 const options=await value.request('/api/auth/options');
 assert.equal(options.body.openPublishing,true);assert.equal(options.body.authenticationRequired,false);assert.equal(options.body.canSetup,false);
 for(const table of ['administrators','sessions','invitations'])assert.equal(value.sqlite.prepare('SELECT COUNT(*) AS count FROM '+table).get().count,0);
 assert.equal((await value.login()).status,410);
 const png=new Uint8Array(await readFile(new URL('../site/images/logo-ministere.png',import.meta.url)));
 const upload=await value.request('/api/uploads?name=couverture.png',{method:'POST',body:png});
 assert.equal(upload.status,201,JSON.stringify(upload.body));
 const input={requestId:crypto.randomUUID(),type:'photo',title:'Album publié sans connexion',date:'2026-10-26',topic:'Habitat et logement',keywords:['Aide directe au logement'],language:'fr',thumbnailUrl:upload.body.url,photos:[{url:upload.body.url,caption:'Rabat'}]};
 const published=await value.request('/api/publications',{method:'POST',body:input});
 assert.equal(published.status,201,JSON.stringify(published.body));
 const anotherBrowser=await value.request('/api/catalogue',{origin:''});
 assert.equal(anotherBrowser.body.items.length,1);assert.equal(anotherBrowser.body.items[0].id,published.body.id);
 assert.equal((await value.request(new URL(anotherBrowser.body.items[0].thumbnailUrl).pathname,{origin:''})).status,200);
 assert.equal((await value.request('/api/accounts')).status,401);
 assert.equal((await value.request('/api/accounts/invite',{method:'POST',body:{username:'katiri.abdelah'}})).status,401);
 assert.equal((await value.request('/api/publications',{method:'POST',origin:'https://untrusted.example',body:input})).status,403);
 assert.equal(value.sqlite.prepare('SELECT COUNT(*) AS count FROM sessions').get().count,0);
 const protectedHandler=createSharedHandler({DB:value.DB,BUCKET:value.BUCKET,OWNER_SETUP_SECRET:secret,REQUIRE_AUTHENTICATION:'true'});
 const protectedUpload=await protectedHandler(new Request('https://service.example/api/uploads?name=test.png',{method:'POST',headers:{Origin:portalOrigin},body:png}));
 assert.equal(protectedUpload.status,401);
});

test('removing all accounts retains already published documents and their files',async()=>{
 const value=setup();await value.register();const token=(await value.login()).body.sessionToken;
 const png=new Uint8Array(await readFile(new URL('../site/images/logo-ministere.png',import.meta.url)));
 const upload=await value.request('/api/uploads?name=photo.png',{method:'POST',body:png,token});
 const input={requestId:crypto.randomUUID(),type:'photo',title:'Publication existante',date:'2026-10-26',topic:'Habitat et logement',keywords:['Aide directe au logement'],language:'fr',thumbnailUrl:upload.body.url,photos:[{url:upload.body.url,caption:''}]};
 const saved=await value.request('/api/publications',{method:'POST',body:input,token});assert.equal(saved.status,201);
 const openHandler=createSharedHandler({DB:value.DB,BUCKET:value.BUCKET,REQUIRE_AUTHENTICATION:'false'});
 const response=await openHandler(new Request('https://service.example/api/auth/options',{headers:{Origin:portalOrigin}}));assert.equal(response.status,200);
 assert.equal(value.sqlite.prepare('SELECT COUNT(*) AS count FROM administrators').get().count,0);
 assert.equal(value.sqlite.prepare('SELECT COUNT(*) AS count FROM publications').get().count,1);
 assert.equal(value.sqlite.prepare('SELECT COUNT(*) AS count FROM uploads').get().count,1);
 const catalogue=await (await openHandler(new Request('https://service.example/api/catalogue'))).json();assert.equal(catalogue.items[0].id,saved.body.id);
 const file=await openHandler(new Request(catalogue.items[0].thumbnailUrl));assert.equal(file.status,200);assert.deepEqual(new Uint8Array(await file.arrayBuffer()),png);
});

test('one photo album or communiqué creates both language pages without copying its attachments',async()=>{
 const value=setup({openPublishing:true});
 const png=new Uint8Array(await readFile(new URL('../site/images/logo-ministere.png',import.meta.url)));
 const pdf=new TextEncoder().encode('%PDF-1.4\nFixture locale');
 const stage=async(name,body)=>(await value.request('/api/uploads?name='+name,{method:'POST',body})).body.url;
 const photo=await stage('album.png',png),document=await stage('communique.pdf',pdf);
 const cases=[
  {type:'photo',photos:[{url:photo}],thumbnailUrl:photo,translations:{fr:{title:'Programme de logement en images',location:'Rabat',captions:['Présentation du programme']},ar:{title:'برنامج السكن بالصور',location:'الرباط',captions:['تقديم البرنامج']}}},
  {type:'press',translations:{fr:{title:'Communiqué sur le logement',content:'Présentation du programme de logement.'},ar:{title:'بلاغ حول السكن',content:'تقديم برنامج السكن.',fileUrl:document}}},
 ];
 for(const extra of cases){
  const input={requestId:crypto.randomUUID(),date:'2026-10-27',topic:'Habitat et logement',keywords:['Aide directe au logement'],language:'fr',title:extra.translations.fr.title,...extra};
  const first=await value.request('/api/publications',{method:'POST',body:input});assert.equal(first.status,201,JSON.stringify(first.body));
  const retry=await value.request('/api/publications',{method:'POST',body:input});assert.equal(retry.body.id,first.body.id);
  const catalogue=(await value.request('/api/catalogue',{origin:''})).body;
  const items=catalogue.items.filter(item=>item.type===extra.type),fr=items.find(item=>item.language==='fr'),ar=items.find(item=>item.language==='ar');
  assert.equal(items.length,2);assert.equal(fr.id,first.body.id);assert.notEqual(fr.id,ar.id);assert.notEqual(fr.eventId,ar.eventId);
  assert.equal(fr.title,extra.translations.fr.title);assert.equal(ar.title,extra.translations.ar.title);
  assert.deepEqual(fr.keywords,['Aide directe au logement']);assert.deepEqual(ar.keywords,fr.keywords);
  if(extra.type==='photo'){
   assert.equal(fr.photos[0].url,ar.photos[0].url);assert.equal(fr.thumbnailUrl,ar.thumbnailUrl);
   assert.equal(fr.photos[0].caption,'Présentation du programme');assert.equal(ar.photos[0].caption,'تقديم البرنامج');assert.equal(fr.location,'Rabat');assert.equal(ar.location,'الرباط');
  }else{
   assert.equal(fr.fileUrl,ar.fileUrl);assert.equal(fr.content,extra.translations.fr.content);assert.equal(ar.content,extra.translations.ar.content);
   assert.deepEqual((await value.request(new URL(fr.fileUrl).pathname)).body,pdf);
  }
  const invalid={...input,requestId:crypto.randomUUID(),translations:{...extra.translations,fr:{...extra.translations.fr,...(extra.type==='photo'?{captions:['نص عربي']}:{content:'نص عربي'})}}};
  assert.equal((await value.request('/api/publications',{method:'POST',body:invalid})).status,400);
 }
 assert.equal(value.files.size,2);assert.equal(value.sqlite.prepare('SELECT COUNT(*) AS count FROM publications').get().count,2);
 const onlyArabic=await value.request('/api/publications',{method:'POST',body:{...cases[0],requestId:crypto.randomUUID(),title:cases[0].translations.ar.title,language:'ar',date:'2026-10-27',topic:'Habitat et logement',keywords:['Aide directe au logement'],translations:{ar:cases[0].translations.ar}}});
 assert.equal(onlyArabic.status,201);assert.equal(value.files.size,2);
 const large={fr:{title:'Communiqué intégral',content:'Le programme de logement. '.repeat(1500)},ar:{title:'البلاغ الكامل',content:'برنامج السكن. '.repeat(2800)}};
 const full=await value.request('/api/publications',{method:'POST',body:{requestId:crypto.randomUUID(),type:'press',title:large.fr.title,language:'fr',date:'2026-10-27',topic:'Habitat et logement',keywords:['Aide directe au logement'],content:large.fr.content,translations:large}});
 assert.equal(full.status,201,JSON.stringify(full.body));
 const onePdf={requestId:crypto.randomUUID(),type:'press',title:'Un PDF et deux titres',language:'fr',date:'2026-10-27',topic:'Habitat et logement',keywords:['Aide directe au logement'],translations:{fr:{title:'Un PDF et deux titres'},ar:{title:'ملف واحد وعنوانان',fileUrl:document}}};
 const single=await value.request('/api/publications',{method:'POST',body:onePdf});assert.equal(single.status,201,JSON.stringify(single.body));
 const singleItems=(await value.request('/api/catalogue',{origin:''})).body.items,primary=singleItems.find(item=>item.id===single.body.id),secondary=singleItems.find(item=>item.eventId===primary.eventId.replace(/-fr$/,'-ar'));
 assert.equal(primary.fileUrl,secondary.fileUrl);assert.equal(primary.content,'');assert.equal(secondary.title,'ملف واحد وعنوانان');assert.equal(value.files.size,2);
 const noTitle=await value.request('/api/publications',{method:'POST',body:{...onePdf,requestId:crypto.randomUUID(),translations:{...onePdf.translations,fr:{title:''}}}});assert.equal(noTitle.status,400);
 const frenchPdf=new TextEncoder().encode('%PDF-1.4\nVersion francaise'),frenchRef=await stage('communique-fr.pdf',frenchPdf);
 const twoPdfs=await value.request('/api/publications',{method:'POST',body:{requestId:crypto.randomUUID(),type:'press',title:'Deux PDF du communiqué',language:'fr',date:'2026-10-27',topic:'Habitat et logement',keywords:['Aide directe au logement'],translations:{fr:{title:'Deux PDF du communiqué',fileUrl:frenchRef},ar:{title:'نسختان من البلاغ',fileUrl:document}}}});
 assert.equal(twoPdfs.status,201,JSON.stringify(twoPdfs.body));
 const records=(await value.request('/api/catalogue',{origin:''})).body.items;
 const frPdf=records.find(item=>item.id===twoPdfs.body.id),arPdf=records.find(item=>item.eventId===frPdf.eventId.replace(/-fr$/,'-ar'));
 assert.notEqual(frPdf.fileUrl,arPdf.fileUrl);assert.deepEqual((await value.request(new URL(frPdf.fileUrl).pathname)).body,frenchPdf);assert.deepEqual((await value.request(new URL(arPdf.fileUrl).pathname)).body,pdf);
 assert.equal(value.files.size,3);

 const missing=await value.request('/api/publications',{method:'POST',body:{requestId:crypto.randomUUID(),type:'press',title:large.fr.title,language:'fr',date:'2026-10-27',topic:'Habitat et logement',keywords:['Aide directe au logement'],translations:{fr:large.fr,ar:{title:'بلاغ غير مكتمل'}}}});
 assert.equal(missing.status,400);
});
