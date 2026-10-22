import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';
import {File} from 'node:buffer';

const [components,localSource,api,i18n]=await Promise.all(['components.js','test-administration.js','service-api.js','i18n.js'].map(name=>readFile(new URL('../interface/'+name,import.meta.url),'utf8')));
const topic='Habitat et politique de la ville';
const base={items:[{id:'official-fr',language:'fr'},{id:'official-ar',language:'ar'}],events:[],settings:{ministryName:'Médiathèque'}};
function memoryStorage(){
  let data={items:[],assets:[]};
  return {read:async()=>structuredClone(data),save:async(item,assets)=>{const items=new Map(data.items.map(value=>[value.id,value])),files=new Map(data.assets.map(value=>[value.id,value]));items.set(item.id,item);for(const asset of assets)files.set(asset.id,asset);data=structuredClone({items:[...items.values()],assets:[...files.values()]});},clear:async()=>{data={items:[],assets:[]};}};
}
function client(storage=memoryStorage(),language='fr'){
  const calls=[];
  const context=vm.createContext({URL,File,Blob,Date,Intl,crypto:webcrypto,er:undefined,el:[topic],testStorage:storage,MX_SERVICE:{management:{mode:'test'}},document:{baseURI:'https://nachchatmahmoud-png.github.io/mediatheque/',documentElement:{lang:language}},fetch:async(url,options={})=>{calls.push({url:String(url),options});assert.equal(options.method||'GET','GET');assert.match(String(url),/^https:\/\/nachchatmahmoud-png\.github\.io\/mediatheque\/catalogue\.json\?/);return {ok:true,json:async()=>structuredClone(base)};}});
  // Use the same client/router with a storage port that survives VM reloads.
  const boundary=localSource.indexOf('const MxTestAdministration=');
  vm.runInContext(i18n.replace('/*__MX_MESSAGES__*/','const MX_MESSAGES={};')+'\n'+components+'\n'+localSource.slice(0,boundary)+'\nconst MxTestAdministration=createMxTestAdministration(testStorage);\n'+localSource.slice(localSource.indexOf('function mxManagementClient()',boundary))+'\n'+api,context);
  return {api:context.Ho,calls,storage,local:vm.runInContext('MxTestAdministration',context)};
}
const publication=(type,extras={})=>({requestId:webcrypto.randomUUID(),type,title:'ESSAI LOCAL '+type,date:'2026-10-22',language:'fr',topic,...extras});
const upload=(value,file)=>value.api('/api/uploads?name='+encodeURIComponent(file.name),{method:'POST',body:file});
const publish=(value,item)=>value.api('/api/publications',{method:'POST',body:JSON.stringify(item)});

test('management opens without credentials and all three supports publish locally without network writes',async()=>{
  const value=client();
  assert.equal((await value.api('/api/auth/session')).testMode,true);
  const image=await upload(value,new File(['LOCAL IMAGE ONLY'],'essai.png',{type:'image/png'}));
  const photo=publication('photo',{photos:[{url:image.url,caption:'Légende de test'}],thumbnailUrl:image.url});
  const youtube=publication('video',{mediaUrl:'https://www.youtube.com/watch?v=abcdefghijk',spokenLanguage:'ar',description:'Résumé français de test'});
  const pdf=await upload(value,new File(['%PDF-1.4 LOCAL TEST ONLY'],'essai.pdf',{type:'application/pdf'}));
  const press=publication('press',{fileUrl:pdf.url,content:'Communiqué de test'});
  for(const item of [photo,youtube,press])assert.equal((await publish(value,item)).testMode,true);
  const result=await value.api('/api/library?manage=1');
  assert.equal(result.isAdmin,true);assert.equal(result.items.filter(item=>item.testOnly).length,3);
  const album=result.items.find(item=>item.type==='photo');
  assert.equal(album.photos[0].caption,'Légende de test');
  assert.equal(album.thumbnailUrl,album.photos[0].url);
  assert.equal(await (await fetch(album.photos[0].url)).text(),'LOCAL IMAGE ONLY');
  assert.equal(await (await fetch(result.items.find(item=>item.type==='press').fileUrl)).text(),'%PDF-1.4 LOCAL TEST ONLY');
  assert.equal(result.items.find(item=>item.type==='video').thumbnailUrl,'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg');
  assert.equal(value.calls.length,1); // Only the anonymous public catalogue read.
});

test('uploaded video, custom thumbnail and subtitles survive reload; French and Arabic catalogues stay separate',async()=>{
  const first=client();
  const video=await upload(first,new File(['LOCAL VIDEO ONLY'],'essai.mp4',{type:'video/mp4'}));
  const cover=await upload(first,new File(['LOCAL COVER ONLY'],'couverture.jpg',{type:'image/jpeg'}));
  const captions=await upload(first,new File(['WEBVTT\n\n00:00.000 --> 00:01.000\nEssai'],'essai.vtt',{type:'text/vtt'}));
  const item=publication('video',{mediaUrl:video.url,thumbnailUrl:cover.url,spokenLanguage:'ar',description:'Résumé en français',captionsLanguage:'fr',captionsSource:'file',captionsValidated:true,captionsUrl:captions.url});
  const result=await publish(first,item);
  await publish(first,publication('press',{language:'ar',title:'تجربة محلية',content:'نص تجريبي'}));
  const french=client(first.storage,'fr'),arabic=client(first.storage,'ar');
  const fr=await french.api('/api/library'),ar=await arabic.api('/api/library');
  assert.ok(fr.items.every(value=>value.language==='fr'));assert.ok(ar.items.every(value=>value.language==='ar'));
  const restored=fr.items.find(value=>value.id===result.id);
  assert.equal(await (await fetch(restored.mediaUrl)).text(),'LOCAL VIDEO ONLY');
  assert.equal(await (await fetch(restored.thumbnailUrl)).text(),'LOCAL COVER ONLY');
  assert.match(await (await fetch(restored.captionsUrl)).text(),/^WEBVTT/);
  assert.equal(ar.items.filter(value=>value.testOnly).length,1);
});

test('retrying a publication creates one item; reset removes only local tests and invalidates the catalogue',async()=>{
  const value=client(),item=publication('press',{content:'Essai supprimable'});
  const first=await publish(value,item),second=await publish(value,item);
  assert.equal(first.id,second.id);
  assert.equal((await value.api('/api/library')).items.filter(value=>value.testOnly).length,1);
  await value.api('/api/test/reset',{method:'POST'});
  const after=await value.api('/api/library');
  assert.equal(after.items.filter(value=>value.testOnly).length,0);
  assert.ok(after.items.some(value=>value.id==='official-fr'));
  assert.equal((await value.storage.read()).assets.length,0);
});

test('invalid and incompatible files, missing thumbnails and unsafe links never become publications',async()=>{
  const value=client();
  await assert.rejects(upload(value,new File(['x'],'essai.html')),/accepté/);
  await assert.rejects(upload(value,new File([],'vide.pdf')),/octet/);
  await assert.rejects(publish(value,publication('video',{mediaUrl:'javascript:alert(1)',spokenLanguage:'fr'})),/HTTPS/);
  await assert.rejects(publish(value,publication('video',{mediaUrl:'https://example.org/essai.mp4',spokenLanguage:'fr'})),/miniature/);
  await assert.rejects(publish(value,publication('video',{mediaUrl:'https://youtu.be/abcdefghijk',spokenLanguage:'ar'})),/résumé/);
  const file=await upload(value,new File(['%PDF'],'essai.pdf',{type:'application/pdf'}));
  await assert.rejects(publish(value,publication('photo',{photos:[{url:file.url}]})),/support/);
  await assert.rejects(publish(value,publication('press',{date:'2026-02-31',content:'essai'})),/date/);
  assert.equal((await value.storage.read()).items.length,0);
});

test('failed storage never reports publication success and leaves public consultation usable',async()=>{
  const value=client({read:async()=>({items:[],assets:[]}),save:async()=>{throw new Error('Le stockage est plein.');},clear:async()=>{}});
  await assert.rejects(publish(value,publication('press',{content:'Essai'})),/stockage/);
  assert.equal((await value.api('/api/library')).items.some(item=>item.testOnly),false);
  const denied=client({read:async()=>{throw new Error('Stockage indisponible.');}});
  assert.ok((await denied.api('/api/library')).items.some(item=>item.id==='official-fr'));
  assert.equal(denied.local.storageError(),'Stockage indisponible.');
  await assert.rejects(publish(denied,publication('press',{content:'Essai'})),/Stockage/);
});
