import {documentaryTranslations} from '../app/lib/keyword-catalog.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildInterface,localizeJavaScriptStrings} from '../scripts/build-interface.mjs';
import {buildLanguagePages} from '../scripts/build-language-pages.mjs';

const root=new URL('../',import.meta.url).pathname;
const baseMessages=JSON.parse(await readFile(new URL('../interface/translations-ar.json',import.meta.url),'utf8'));
const messages={...baseMessages,...documentaryTranslations};
const source=(await readFile(new URL('../interface/i18n.js',import.meta.url),'utf8')).replace('/*__MX_MESSAGES__*/','const MX_MESSAGES='+JSON.stringify(messages)+';');
function languageClient(language){
 return vm.runInNewContext(source+';({mxLocaleCatalogue,mxPageUrl,mxDetectedLanguage})',{URL,document:{documentElement:{lang:language},baseURI:'https://example.test/mediatheque/'},MX_SERVICE:{origin:'https://admin.example.test'}});
}
test('each page includes only its language and the corresponding events',()=>{
 const catalogue={settings:{ministryName:'Ministère'},events:[{id:'ef',topic:'Habitat et logement',keywords:[]},{id:'ea',topic:'Habitat et logement',keywords:[]},{id:'orphan',keywords:[]}],items:[{id:'fr',language:'fr',eventId:'ef',title:'Titre français',topic:'Habitat et logement',keywords:['Habitat et logement']},{id:'ar',language:'ar',eventId:'ea',title:'عنوان عربي',topic:'Habitat et logement',keywords:['Habitat et logement']},{id:'unknown',language:'en',eventId:'orphan'}]};
 for(const language of ['fr','ar']){
  const result=languageClient(language).mxLocaleCatalogue(catalogue);
  assert.deepEqual(Array.from(result.items,item=>item.id),[language]);
  assert.deepEqual(Array.from(result.events,event=>event.id),[language==='ar'?'ea':'ef']);
  assert.equal(result.items[0].title,language==='ar'?'عنوان عربي':'Titre français');
  assert.equal(result.items[0].topic,language==='ar'?'السكن والإسكان':'Habitat et logement');
 }
 assert.equal(languageClient('fr').mxDetectedLanguage('بلاغ الوزارة'),'ar');
 assert.equal(languageClient('fr').mxDetectedLanguage('Actualité du Ministère'),'fr');
});
test('language navigation keeps the hosting base and never reuses the other page filters',()=>{
 const client=languageClient('ar');
 assert.equal(String(client.mxPageUrl('fr')),'https://example.test/mediatheque/fr/');
 assert.equal(String(client.mxPageUrl('ar')),'https://example.test/mediatheque/ar/');
 assert.equal(String(client.mxPageUrl('fr','https://admin.example.test')),'https://admin.example.test/fr/');
});
test('management uses the same GitHub Pages origin and base path',()=>{
 const client=vm.runInNewContext(source+';({mxManagementUrl})',{URL,document:{documentElement:{lang:'ar'},baseURI:'https://nachchatmahmoud-png.github.io/mediatheque/'}});
 assert.equal(String(client.mxManagementUrl()),'https://nachchatmahmoud-png.github.io/mediatheque/fr/?view=manage');
});
test('French and Arabic pages use separate bundles with valid syntax and matching document directions',async()=>{
 const output=await mkdtemp(join(tmpdir(),'mediatheque-languages-'));
 try{
  await mkdir(join(output,'assets'));await buildInterface(root,output);await buildLanguagePages(root,output);
  for(const language of ['fr','ar']){
   const html=await readFile(join(output,language,'index.html'),'utf8');
   assert.match(html,new RegExp('lang="'+language+'" dir="'+(language==='ar'?'rtl':'ltr')+'"'));
   assert.match(html,/<base href="\.\.\/">/);
   assert.match(html,new RegExp('app-'+language+'\\.js\\?v=[a-f0-9]{16}'));
   const bundle=await readFile(join(output,'assets/app-'+language+'.js'),'utf8');
   assert.doesNotThrow(()=>new vm.Script(bundle));
   assert.ok(bundle.includes(language==='ar'?'مكتبة الفيديو':'Vidéothèque'));
  }
  assert.match(await readFile(join(output,'index.html'),'utf8'),/location\.replace/);
 }finally{await rm(output,{recursive:true,force:true});}
});

test('escaped French literals in retained readers are localized without touching code',()=>{
 const result=localizeJavaScriptStrings(String.raw`const labels={video:"Vid\xE9oth\xE8que",photo:'Phototh\u00e8que'};const id='video';`,{'Vidéothèque':'مكتبة الفيديو','Photothèque':'مكتبة الصور'});
 const value=vm.runInNewContext(result+';({labels,id})');
 assert.equal(value.labels.video,'مكتبة الفيديو');assert.equal(value.labels.photo,'مكتبة الصور');assert.equal(value.id,'video');
 assert.equal(localizeJavaScriptStrings('const id="publications";',{'publications':'منشورات'}),'const id="publications";');
});
