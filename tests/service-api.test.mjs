import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {File} from 'node:buffer';

const source=(await Promise.all(['admin-service.js','service-api.js'].map(name=>readFile(new URL('../interface/'+name,import.meta.url),'utf8')))).join('\n');
const apiBase='https://administration.example.test/functions/v1/mediatheque';
const sessionToken='LOCAL_TEST_SESSION_TOKEN_NEVER_VALID_123456789';
const credentials={username:'  Admin.Test  ',password:'Mot de passe de test non utilisable'};
const publication={requestId:'12345678-1234-1234-1234-123456789abc',type:'video',title:'Publication de test',language:'fr'};

function client({base=apiBase,denyLogin=false,denyWrite=false,badSession=false,logoutFailure=false,initialPassword=false}={}){
  const calls=[],events=[],timers=[];let live=false,checks=0;
  const response=(status,value)=>({ok:status>=200&&status<300,status,json:async()=>value});
  const context=vm.createContext({URL,Event,File,Date,er:undefined,MX_SERVICE:{authentication:{apiBase:base}},
    mxLocaleCatalogue:value=>({...value,items:value.items.filter(item=>item.language==='fr')}),document:{baseURI:'https://nachchatmahmoud-png.github.io/mediatheque/'},
    window:{dispatchEvent:event=>events.push(event.type)},localStorage:{getItem(){throw new Error('No session storage');},setItem(){throw new Error('No session storage');}},
    setTimeout:(callback,delay)=>{if(delay<10000)queueMicrotask(callback);else timers.push(callback);return 1;},clearTimeout(){},
    fetch:async(url,options={})=>{
      url=String(url);calls.push({url,options});
      if(!url.startsWith(apiBase)){
        assert.equal(new URL(url).origin,'https://nachchatmahmoud-png.github.io');
        assert.equal(options.headers?.Authorization,undefined);
        checks++;if(checks>1)live=true;
        return response(200,{items:live?[{id:'publication-test-video-1',language:'fr',title:publication.title},{id:'publication-ar',language:'ar'}]:[],events:[],settings:{}});
      }
      const path=url.slice(apiBase.length);
      if(path==='/api/auth/login')return response(denyLogin?401:200,{authenticated:true,sessionToken,expiresAt:new Date(Date.now()+3600000).toISOString(),role:badSession?'reader':'admin',displayName:'Administrateur de test',requiresPasswordChange:initialPassword});
      assert.equal(options.headers.Authorization,'Bearer '+sessionToken);
      if(path==='/api/auth/session')return response(200,{authenticated:true,requiresPasswordChange:initialPassword});
      if(path==='/api/auth/change-password'){initialPassword=false;return response(200,{authenticated:true,sessionToken,expiresAt:new Date(Date.now()+3600000).toISOString(),role:'admin',requiresPasswordChange:false});}
      if(path==='/api/auth/logout'){if(logoutFailure)throw new Error('offline');return response(200,{ok:true});}
      if(denyWrite)return response(403,{});
      if(path.startsWith('/api/uploads?'))return response(201,{url:'admin-upload:12345678-1234-1234-1234-123456789abc',name:'test.png',size:10});
      if(path==='/api/publications')return response(201,{id:'publication-test-video-1',published:true});
      throw new Error('Unexpected request: '+path);
    },
  });
  vm.runInContext(source,context);
  return {context,calls,events,timers};
}
const login=value=>value.context.Ho('/api/auth/login',{method:'POST',body:JSON.stringify(credentials)});

test('an unconfigured service keeps authentication inactive and never receives passwords',async()=>{
  const value=client({base:''});
  assert.equal((await value.context.Ho('/api/auth/session')).configured,false);
  await assert.rejects(login(value),/pas encore activé/);
  await assert.rejects(value.context.Ho('/api/publications',{method:'POST',body:JSON.stringify(publication)}),/Connectez-vous/);
  assert.equal(value.calls.length,0);
});

test('public consultation remains on GitHub Pages without an authentication request',async()=>{
  const value=client();
  assert.equal((await value.context.Ho('/api/auth/session')).authenticated,false);
  await value.context.Ho('/api/library');
  assert.equal(value.calls.length,1);
  assert.equal(new URL(value.calls[0].url).pathname,'/mediatheque/catalogue.json');
  assert.equal(value.calls[0].options.credentials,'omit');
  await assert.rejects(value.context.Ho('/api/uploads?name=x.png',{method:'POST',body:new File(['test'],'x.png')}),/Connectez-vous/);
});

test('identifier and password go only to the configured HTTPS service and the session stays private',async()=>{
  const value=client();const auth=await login(value);
  assert.equal(auth.authenticated,true);assert.equal(auth.username,'admin.test');
  assert.equal('sessionToken' in auth,false);assert.equal('password' in auth,false);
  const request=value.calls[0];assert.equal(request.url,apiBase+'/api/auth/login');
  assert.deepEqual(JSON.parse(request.options.body),{username:'admin.test',password:credentials.password});
  assert.equal(request.options.headers.Authorization,undefined);
  assert.equal(request.options.redirect,'error');assert.equal(request.options.referrerPolicy,'no-referrer');
  await value.context.Ho('/api/auth/session');
  assert.equal(value.calls[1].options.headers.Authorization,'Bearer '+sessionToken);
  await value.context.Ho('/api/library');
  assert.equal(value.calls.at(-1).options.headers?.Authorization,undefined);
});

test('incorrect credentials and unauthorized login responses never open management',async()=>{
  const denied=client({denyLogin:true});await assert.rejects(login(denied),/incorrect/);
  assert.equal((await denied.context.Ho('/api/auth/session')).authenticated,false);
  const malformed=client({badSession:true});await assert.rejects(login(malformed),/pas été confirmée/);
  assert.equal((await malformed.context.Ho('/api/auth/session')).authenticated,false);
  const insecure=client({base:'http://administration.example.test'});await assert.rejects(login(insecure),/pas encore activé/);assert.equal(insecure.calls.length,0);
});

test('server rejection revokes the browser session and prevents further uploads',async()=>{
  const value=client({denyWrite:true});await login(value);
  await assert.rejects(value.context.Ho('/api/uploads?name=test.png',{method:'POST',body:new File(['test'],'test.png')}),/accès/);
  assert.equal(value.events.includes('management-session-expired'),true);
  const count=value.calls.length;
  await assert.rejects(value.context.Ho('/api/uploads?name=test.png',{method:'POST',body:new File(['test'],'test.png')}),/Connectez-vous/);
  assert.equal(value.calls.length,count);
});

test('publication waits for the real public catalogue and retrying does not submit a duplicate',async()=>{
  const value=client();await login(value);
  const transferred=await value.context.Ho('/api/uploads?name=test.png',{method:'POST',body:new File(['test'],'test.png',{type:'image/png'})});
  assert.match(transferred.url,/^admin-upload:/);
  const options={method:'POST',body:JSON.stringify(publication)};
  const result=await value.context.Ho('/api/publications',options);
  assert.equal(result.published,true);
  assert.equal(value.calls.filter(call=>new URL(call.url).pathname.endsWith('/catalogue.json')).length,2);
  const count=value.calls.length;
  assert.equal((await value.context.Ho('/api/library')).items[0].id,result.id);
  assert.equal(value.calls.length,count);
  await value.context.Ho('/api/publications',options);
  assert.equal(value.calls.filter(call=>call.url===apiBase+'/api/publications').length,1);
});

test('logout clears the local session even when the service cannot be reached',async()=>{
  const value=client({logoutFailure:true});await login(value);
  await assert.rejects(value.context.Ho('/api/auth/logout',{method:'POST'}),/indisponible/);
  assert.equal((await value.context.Ho('/api/auth/session')).authenticated,false);
  await assert.rejects(value.context.Ho('/api/library?manage=1'),/Connectez-vous/);
});

test('an idle administrator session closes without leaving a persistent credential',async()=>{
  const value=client();await login(value);value.timers.at(-1)();
  assert.equal((await value.context.Ho('/api/auth/session')).authenticated,false);
  assert.equal(value.events.includes('management-session-expired'),true);
});

test('the first-login password requirement is preserved until the server confirms the new password',async()=>{
  const value=client({initialPassword:true});assert.equal((await login(value)).requiresPasswordChange,true);
  assert.equal((await value.context.Ho('/api/auth/session')).requiresPasswordChange,true);
  const result=await value.context.Ho('/api/auth/change-password',{method:'POST',body:JSON.stringify({currentPassword:'INITIAL TEST ONLY',password:'NEW TEST PASSWORD ONLY',confirmPassword:'NEW TEST PASSWORD ONLY'})});
  assert.equal(result.requiresPasswordChange,false);
  assert.equal((await value.context.Ho('/api/auth/session')).requiresPasswordChange,false);
  assert.equal('sessionToken' in result,false);
});
