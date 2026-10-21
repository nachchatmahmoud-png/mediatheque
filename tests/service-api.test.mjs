import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const source=await readFile(new URL('../interface/service-api.js',import.meta.url),'utf8');
function client(onService,reply){
  const requests=[];
  const context=vm.createContext({URL,Event,er:undefined,MX_ON_SERVICE:onService,MX_SERVICE:{publicFeedEnabled:true},MX_API_ORIGIN:'https://admin.example.test',document:{baseURI:'https://public.example.test/mediatheque/'},$n:{authenticated:false},window:{dispatchEvent(){}},fetch:async(url,options)=>{requests.push({url:String(url),options});return reply?reply():{ok:true,json:async()=>({items:[],events:[]})};}});
  vm.runInContext(source,context);
  return {context,requests};
}
test('public consultation never requests an administrator session or sends credentials',async()=>{
  const {context,requests}=client(false);
  assert.equal((await context.Ho('/api/auth/session')).authenticated,false);
  assert.equal(requests.length,0);
  await context.Ho('/api/library');
  assert.equal(requests[0].url,'https://admin.example.test/api/library');
  assert.equal(requests[0].options.credentials,'omit');
  await assert.rejects(context.Ho('/api/publications',{method:'POST'}),/Connectez-vous/);
  assert.equal(requests.length,1);
});
test('administration uses its own session and a failed catalogue can be retried',async()=>{
  let attempt=0;
  const {context,requests}=client(true,()=>({ok:++attempt>1,json:async()=>({items:[]})}));
  await assert.rejects(context.cL(),/indisponible/);
  await context.cL();
  assert.equal(requests.length,2);
  assert.equal(requests[1].options.credentials,'include');
});
