import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GitHubPublisher} from '../server/github.ts';
import {digest,preparePublication} from '../server/publication.ts';
const accountId='11111111-1111-4111-8111-111111111111',uploadId='22222222-2222-4222-8222-222222222222';
const bytes=new Uint8Array(await readFile(new URL('../../site/images/logo-ministere.png',import.meta.url)));
const upload={id:uploadId,accountId,path:accountId+'/'+uploadId+'/asset.png',name:'cover.png',size:bytes.length,digest:await digest(bytes),createdAt:new Date().toISOString()};
const prepared=await preparePublication({requestId:'33333333-3333-4333-8333-333333333333',type:'photo',title:'Album de test',date:'2026-10-22',topic:'Vie institutionnelle',language:'fr',photos:[{url:'admin-upload:'+uploadId}]},accountId,async()=>upload);
function repository({conflict=false}={}){
 const calls=[],trees=[],commits=[];let head='a'.repeat(40),written=null,patches=0;
 const fetcher=async(url,options)=>{
  assert.equal(new URL(url).origin,'https://api.github.com');
  assert.equal(options.headers.Authorization,'Bearer LOCAL_SERVER_TEST_KEY_NEVER_VALID');
  calls.push({url,options});const path=new URL(url).pathname.replace('/repos/nachchatmahmoud-png/mediatheque','');
  const answer=(value,status=200)=>Response.json(value,{status});
  if(path==='')return answer({permissions:{push:true}});
  if(path==='/git/ref/heads/main')return answer({object:{sha:head}});
  if(path.startsWith('/contents/publications/'))return written?answer({content:Buffer.from(JSON.stringify(written)).toString('base64')}):answer({},404);
  if(path.startsWith('/git/commits/'))return answer({tree:{sha:'b'.repeat(40)}});
  if(path==='/git/blobs')return answer({sha:'c'.repeat(40)},201);
  if(path==='/git/trees'){trees.push(JSON.parse(options.body));return answer({sha:'d'.repeat(40)},201);}
  if(path==='/git/commits'){commits.push(JSON.parse(options.body));return answer({sha:'e'.repeat(40)},201);}
  if(path==='/git/refs/heads/main'){
   assert.equal(JSON.parse(options.body).force,false);patches++;
   if(conflict&&patches===1){head='f'.repeat(40);return answer({},422);}
   written=JSON.parse(trees.at(-1).tree.find(value=>value.path.endsWith('/publication.json')).content);head='e'.repeat(40);return answer({});
  }
  throw new Error('Unexpected GitHub operation');
 };
 return {publisher:new GitHubPublisher('LOCAL_SERVER_TEST_KEY_NEVER_VALID',fetcher),calls,trees,commits};
}
test('a complete publication is committed atomically and retrying never creates a second dossier',async()=>{
 const value=repository();assert.equal(await value.publisher.verify(),true);
 const result=await value.publisher.publish(prepared,async()=>bytes);assert.equal(result.id,prepared.id);
 assert.equal(value.trees.length,1);assert.equal(value.commits.length,1);
 assert.equal(value.trees[0].tree.length,2);
 assert.ok(value.trees[0].tree.every(entry=>entry.path.startsWith('publications/'+prepared.folder+'/')));
 assert.equal(JSON.stringify(value.trees).includes('LOCAL_SERVER_TEST_KEY'),false);
 await value.publisher.publish(prepared,async()=>bytes);assert.equal(value.commits.length,1);
});
test('a concurrent update is preserved using a new parent without force',async()=>{
 const value=repository({conflict:true});await value.publisher.publish(prepared,async()=>bytes);
 assert.equal(value.commits.length,2);assert.deepEqual(value.commits[1].parents,['f'.repeat(40)]);
 assert.equal(value.calls.filter(call=>new URL(call.url).pathname.endsWith('/git/blobs')).length,1);
});
test('a modified or forged asset is refused before any repository mutation',async()=>{
 const value=repository();await assert.rejects(value.publisher.publish(prepared,async()=>new Uint8Array([1,2,3])),/modifiée/);
 assert.equal(value.calls.some(call=>call.options.method!=='GET'),false);
 const forged=new Uint8Array(bytes.length);const data={...prepared,assets:[{path:'photos/cover.png',upload:{...upload,digest:await digest(forged)}}]};
 await assert.rejects(value.publisher.publish(data,async()=>forged),/format annoncé/);
 assert.equal(value.calls.length,0);
});
