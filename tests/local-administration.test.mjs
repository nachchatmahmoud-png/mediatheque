import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';
import {File} from 'node:buffer';

const files=await Promise.all(['components.js','test-administration.js','local-administration.js','service-api.js','i18n.js'].map(name=>readFile(new URL('../interface/'+name,import.meta.url),'utf8')));
const credentials={username:'  Local.Admin  ',password:'Phrase de contrôle locale 2026',confirmPassword:'Phrase de contrôle locale 2026'};
const topic='Habitat et logement';
function stores(){
 let account,items=[],assets=[];const sessions=new Map(),tab=new Map();
 return {
  auth:{account:async()=>structuredClone(account),create:async value=>{if(account)throw new Error('Un accès existe déjà.');account=structuredClone(value);},save:async value=>{account=structuredClone(value);},session:async id=>structuredClone(sessions.get(id)),saveSession:async value=>{sessions.set(value.id,structuredClone(value));},deleteSession:async id=>{sessions.delete(id);}},
  content:{read:async()=>structuredClone({items,assets}),save:async(item,files)=>{items=items.filter(value=>value.id!==item.id).concat(structuredClone(item));assets=assets.concat(structuredClone(files));}},
  tab:{getItem:key=>tab.get(key),setItem:(key,value)=>tab.set(key,value),removeItem:key=>tab.delete(key)},sessions,
 };
}
function client(saved=stores()){
 const calls=[],timers=[],events=[];
 const context=vm.createContext({URL,File,Blob,Date,Intl,TextEncoder,crypto:webcrypto,Event,sessionStorage:saved.tab,storage:saved.auth,contentStorage:saved.content,er:undefined,el:[topic],MX_SERVICE:{management:{mode:'local'}},document:{baseURI:'https://nachchatmahmoud-png.github.io/mediatheque/',documentElement:{lang:'fr'}},window:{dispatchEvent:event=>events.push(event.type)},setTimeout:callback=>{timers.push(callback);return timers.length;},clearTimeout(){},fetch:async(url,options={})=>{calls.push({url:String(url),options});assert.equal(options.method||'GET','GET');return {ok:true,json:async()=>({items:[{id:'official',language:'fr',status:'published'}],events:[],settings:{}})};}});
 const [components,testSource,local,api,i18n]=files;
 const localBoundary=local.indexOf('const MxLocalAdministration=');
 vm.runInContext(i18n.replace('/*__MX_MESSAGES__*/','const MX_MESSAGES={};')+'\n'+components+'\n'+testSource+'\n'+local.slice(0,localBoundary)+'\nconst MxLocalAdministration=createMxLocalAdministration(storage,contentStorage);\n'+api,context);
 return {api:context.Ho,saved,calls,timers,events,auth:vm.runInContext('MxLocalAdministration',context)};
}
const request=(value,path,body)=>value.api('/api/auth/'+path,{method:'POST',body:JSON.stringify(body)});

test('local registration stores a salted hash, requires a separate login and rejects duplicate setup',async()=>{
 const value=client();
 assert.equal((await value.api('/api/auth/session')).canSetup,true);
 await assert.rejects(request(value,'register',{...credentials,confirmPassword:'different'}),/correspondent/);
 await assert.rejects(request(value,'register',{...credentials,password:'short',confirmPassword:'short'}),/15/);
 const result=await request(value,'register',credentials);
 assert.equal(result.username,'local.admin');assert.equal(result.created,true);
 const stored=await value.saved.auth.account();assert.match(stored.salt,/^[a-f0-9]{32}$/);assert.match(stored.passwordHash,/^[a-f0-9]{64}$/);
 assert.equal(stored.iterations,600000);assert.equal(JSON.stringify(stored).includes(credentials.password),false);
 assert.equal((await value.api('/api/auth/session')).authenticated,false);
 assert.equal((await value.api('/api/auth/session')).canSetup,false);
 await assert.rejects(request(value,'register',credentials),/existe déjà/);
 assert.equal(value.calls.length,0);
});

test('incorrect local credentials and anonymous writes fail; sessions survive reload and logout revokes them',async()=>{
 const value=client();await request(value,'register',credentials);
 await assert.rejects(value.api('/api/library?manage=1'),/Connectez/);
 await assert.rejects(request(value,'login',{...credentials,password:'incorrect'}),/incorrect/);
 const auth=await request(value,'login',credentials);
 assert.equal(auth.authenticated,true);assert.equal(auth.localMode,true);assert.equal(auth.testMode,undefined);assert.equal(auth.password,undefined);
 assert.equal((await client(value.saved).api('/api/auth/session')).authenticated,true);
 await request(value,'logout',{});
 assert.equal((await client(value.saved).api('/api/auth/session')).authenticated,false);
 await assert.rejects(value.api('/api/uploads?name=photo.png',{method:'POST',body:new File(['photo'],'photo.png',{type:'image/png'})}),/Connectez/);
 assert.equal(value.calls.length,0);
});

test('authenticated local uploads publish all three support types in this browser only',async()=>{
 const value=client();await request(value,'register',credentials);await request(value,'login',credentials);
 const image=await value.api('/api/uploads?name=photo.png',{method:'POST',body:new File(['photo locale'],'photo.png',{type:'image/png'})});
 assert.match(image.url,/^local-content:/);
 for(const extra of [{type:'photo',photos:[{url:image.url,caption:'Rabat'}],thumbnailUrl:image.url},{type:'video',mediaUrl:'https://youtu.be/abcdefghijk',spokenLanguage:'fr'},{type:'press',content:'Communiqué local'}]){
  const input={requestId:webcrypto.randomUUID(),title:'Publication locale '+extra.type,date:'2026-10-26',language:'fr',topic,...extra};
  const result=await value.api('/api/publications',{method:'POST',body:JSON.stringify(input)});
  assert.equal(result.localOnly,true);assert.equal(result.published,true);assert.equal(result.testMode,undefined);
 }
 const catalogue=await value.api('/api/library');
 assert.equal(catalogue.items.filter(item=>item.localOnly).length,3);
 assert.equal(catalogue.items.some(item=>item.testOnly),false);
 const other=await client().api('/api/library');assert.equal(other.items.some(item=>item.localOnly),false);
 assert.ok(value.calls.every(call=>(call.options.method||'GET')==='GET'));
 value.timers.at(-1)();
 assert.equal(value.auth.current().authenticated,false);assert.ok(value.events.includes('management-session-expired'));
 await assert.rejects(value.api('/api/publications',{method:'POST',body:'{}'}),/Connectez/);
});

test('unavailable local account storage leaves public consultation usable and management closed',async()=>{
 const saved=stores();saved.auth.account=async()=>{throw new Error('Stockage local indisponible.');};
 const value=client(saved),auth=await value.api('/api/auth/session');
 assert.equal(auth.authenticated,false);assert.equal(auth.configured,false);assert.equal(auth.canSetup,false);
 assert.match(auth.error,/Stockage/);
 assert.ok((await value.api('/api/library')).items.some(item=>item.id==='official'));
 await assert.rejects(value.api('/api/library?manage=1'),/Connectez/);
});
