import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {File} from 'node:buffer';
import {webcrypto} from 'node:crypto';
import {publicationToCatalogue} from '../github-pages/catalogue.ts';

const source=(await Promise.all(['components.js','video-languages.js','github-service.js','service-api.js'].map(name=>readFile(new URL('../interface/'+name,import.meta.url),'utf8')))).join('\n');
const repository='nachchatmahmoud-png/mediatheque';
const input={requestId:'12345678-1234-1234-1234-123456789abc',type:'photo',title:'TEST LOCAL — album',date:'2026-10-22',topic:'Vie institutionnelle',language:'fr',description:'Résumé français',photos:[]};
const png=await readFile(new URL('../site/images/logo-ministere.png',import.meta.url));
function client({push=true,conflict=false,failDeployment=false,invalidKey=false}={}){
 const calls=[],trees=[],commits=[];let written=false,live=false,patches=0,head='a'.repeat(40),metadata=null,folder='',fail=failDeployment;
 const response=(status,value)=>({ok:status>=200&&status<300,status,json:async()=>value});
 const context=vm.createContext({URL,Event,File,Intl,TextDecoder,Uint8Array,crypto:webcrypto,Date,btoa:content=>Buffer.from(content,'binary').toString('base64'),
  MX_SERVICE:{repository,branch:'main'},MX_LOCALE:'fr',mxT:value=>value,mxLocaleCatalogue:value=>value,el:['Vie institutionnelle'],er:undefined,
  document:{baseURI:'https://nachchatmahmoud-png.github.io/mediatheque/'},window:{dispatchEvent(){}},
  localStorage:{getItem(){throw new Error('No credential storage');},setItem(){throw new Error('No credential storage');}},
  setTimeout:(callback,delay)=>{if(delay<10000)queueMicrotask(callback);return 1;},clearTimeout(){},
  fetch:async(url,options={})=>{
   url=String(url);calls.push({url,options});
   if(!url.startsWith('https://api.github.com/')){
    assert.equal(options.headers?.Authorization,undefined);
    return response(200,live&&metadata?{items:publicationToCatalogue(metadata,folder).items,events:[],settings:{}}:{items:[],events:[],settings:{}});
   }
   const path=new URL(url).pathname.replace('/repos/'+repository,'');
   if(path==='/user')return response(invalidKey?401:200,{login:'local-admin',name:'Administrateur de test'});
   if(path==='')return response(200,{permissions:{push,admin:true}});
   if(path.startsWith('/contents/'))return response(404,{});
   if(path==='/git/blobs')return response(201,{sha:'b'.repeat(40)});
   if(path==='/git/ref/heads/main')return response(200,{object:{sha:head}});
   if(path.startsWith('/git/commits/')&&options.method==='GET')return response(200,{tree:{sha:'c'.repeat(40)}});
   if(path==='/git/trees'){
    const body=JSON.parse(options.body);trees.push(body);const entry=body.tree.find(value=>value.path.endsWith('/publication.json'));
    metadata=JSON.parse(entry.content);folder=entry.path.split('/')[1];return response(201,{sha:'d'.repeat(40)});
   }
   if(path==='/git/commits'){
    const body=JSON.parse(options.body);commits.push(body);return response(201,{sha:'e'.repeat(40)});
   }
   if(path==='/git/refs/heads/main'){
    patches++;if(conflict&&patches===1){head='f'.repeat(40);return response(422,{});}
    assert.equal(JSON.parse(options.body).force,false);written=true;live=!fail;return response(200,{});
   }
   if(path.endsWith('/actions/runs'))return response(200,{workflow_runs:fail?[{status:'completed',conclusion:'failure'}]:[]});
   throw new Error('Unexpected request: '+path);
  },
 });
 vm.runInContext(source,context);
 return {context,calls,trees,commits,get written(){return written;},get metadata(){return metadata;},get folder(){return folder;},resume(){fail=false;live=true;}};
}
async function login(value){return value.context.Ho('/api/auth/login',{method:'POST',body:JSON.stringify({accessKey:'LOCAL_TEST_CREDENTIAL_NOT_VALID'})});}
async function stage(value,file){return (await value.context.Ho('/api/uploads?name='+encodeURIComponent(file.name),{method:'POST',body:file})).url;}

test('public consultation stays on GitHub Pages and anonymous users cannot upload or publish',async()=>{
 const value=client();assert.equal((await value.context.Ho('/api/auth/session')).authenticated,false);assert.equal(value.calls.length,0);
 await value.context.Ho('/api/library');assert.equal(new URL(value.calls[0].url).origin+new URL(value.calls[0].url).pathname,'https://nachchatmahmoud-png.github.io/mediatheque/catalogue.json');
 assert.equal(value.calls[0].options.credentials,'omit');
 await assert.rejects(value.context.Ho('/api/publications',{method:'POST',body:'{}'}),/Connectez-vous/);
 await assert.rejects(value.context.Ho('/api/uploads?name=x.png',{method:'POST',body:new File([png],'x.png')}),/Connectez-vous/);
 assert.equal(value.calls.length,1);
});
test('GitHub verifies both the identity and the repository publication right',async()=>{
 const denied=client({push:false});await assert.rejects(login(denied),/droit de publication/);assert.equal((await denied.context.Ho('/api/auth/session')).authenticated,false);
 assert.equal(denied.calls.some(call=>call.options.method==='POST'),false);
 const invalid=client({invalidKey:true});await assert.rejects(login(invalid),/invalide/);
 const value=client();const auth=await login(value);assert.equal(auth.username,'local-admin');assert.equal(auth.github,true);assert.equal('accessKey' in auth,false);
 await value.context.Ho('/api/auth/logout',{method:'POST'});assert.equal((await value.context.Ho('/api/auth/session')).authenticated,false);
 await assert.rejects(value.context.Ho('/api/library?manage=1'),/Connectez-vous/);
});
test('an album is committed atomically with its selected cover and appears only after publication',async()=>{
 const value=client();await login(value);
 const first=await stage(value,new File([png],'first.png',{type:'image/png'})),second=await stage(value,new File([png],'second.png',{type:'image/png'}));
 const progress=[];
 const result=await value.context.Ho('/api/publications',{method:'POST',body:JSON.stringify({...input,photos:[{url:first,caption:'Première photo'},{url:second,caption:'Couverture choisie'}],thumbnailUrl:second}),onProgress:note=>progress.push(note)});
 assert.equal(result.published,true);assert.equal(value.written,true);assert.equal(value.commits.length,1);
 const callsAfterPublication=value.calls.length;assert.equal((await value.context.Ho('/api/library')).items[0].id,result.id);assert.equal(value.calls.length,callsAfterPublication);
 assert.equal(value.metadata.cover,'photos/photo-02.png');assert.equal(value.metadata.photos[0].caption,'Première photo');
 assert.equal(publicationToCatalogue(value.metadata,value.folder).items[0].id,result.id);
 assert.ok(progress.some(note=>note.includes('Mise en ligne')));
 for(const call of value.calls){assert.equal(call.options.credentials,'omit');if(call.options.headers?.Authorization)assert.ok(call.url.startsWith('https://api.github.com/'));}
 const metadata=value.trees[0].tree.find(entry=>entry.path.endsWith('publication.json')).content;assert.equal(metadata.includes('LOCAL_TEST_CREDENTIAL'),false);
});
test('concurrent updates are retried without force or dropping the other administrator’s commit',async()=>{
 const value=client({conflict:true});await login(value);const photo=await stage(value,new File([png],'photo.png'));
 const result=await value.context.Ho('/api/publications',{method:'POST',body:JSON.stringify({...input,photos:[{url:photo}],thumbnailUrl:photo})});
 assert.equal(result.published,true);assert.equal(value.commits.length,2);assert.deepEqual(value.commits[1].parents,['f'.repeat(40)]);
 assert.equal(value.calls.filter(call=>new URL(call.url).pathname.endsWith('/git/blobs')).length,1);
});
test('a failed deployment can be resumed without creating a duplicate publication',async()=>{
 const value=client({failDeployment:true});await login(value);const photo=await stage(value,new File([png],'photo.png'));
 const body=JSON.stringify({...input,photos:[{url:photo}],thumbnailUrl:photo});
 await assert.rejects(value.context.Ho('/api/publications',{method:'POST',body}),/mise en ligne a échoué/);
 assert.equal(value.commits.length,1);value.resume();
 assert.equal((await value.context.Ho('/api/publications',{method:'POST',body})).published,true);assert.equal(value.commits.length,1);
});
test('invalid file contents are refused before any repository mutation',async()=>{
 const value=client();await login(value);const photo=await stage(value,new File(['not a PNG'],'photo.png'));
 await assert.rejects(value.context.Ho('/api/publications',{method:'POST',body:JSON.stringify({...input,photos:[{url:photo}],thumbnailUrl:photo})}),/ne correspond pas/);
 assert.equal(value.calls.some(call=>['POST','PATCH'].includes(call.options.method)),false);
});
test('a failed public catalogue request can be retried',async()=>{
 const value=client();let calls=0;value.context.fetch=async()=>({ok:++calls>1,json:async()=>({items:[],events:[],settings:{}})});
 await assert.rejects(value.context.cL(),/indisponible/);await value.context.cL();assert.equal(calls,2);
});

test('a YouTube publication keeps one link and its language metadata',async()=>{
 const value=client();await login(value);
 const video={...input,type:'video',mediaUrl:'https://www.youtube.com/watch?v=abcdefghijk',spokenLanguage:'ar',captionsLanguage:'fr',captionsSource:'youtube',captionsValidated:true,thumbnailUrl:'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg'};
 const result=await value.context.Ho('/api/publications',{method:'POST',body:JSON.stringify(video)});
 assert.equal(result.published,true);assert.equal(value.metadata.videos[0].url,video.mediaUrl);
 const item=publicationToCatalogue(value.metadata,value.folder).items[0];
 assert.equal(item.language,'fr');assert.equal(item.spokenLanguage,'ar');assert.equal(item.captionsValidated,true);
 assert.equal(item.thumbnailUrl,video.thumbnailUrl);
 assert.equal(value.calls.some(call=>new URL(call.url).pathname.endsWith('/git/blobs')),false);
});
test('PDF communiqués and imported videos with subtitles produce complete publication dossiers',async()=>{
 const press=client();await login(press);const pdf=await stage(press,new File(['%PDF-1.4\nTEST LOCAL'],'communique.pdf',{type:'application/pdf'}));
 const pressResult=await press.context.Ho('/api/publications',{method:'POST',body:JSON.stringify({...input,type:'press',fileUrl:pdf,content:'Communiqué de vérification locale'})});
 assert.equal(pressResult.published,true);assert.equal(press.metadata.press[0].file,'communiques/communique.pdf');
 const video=client();await login(video);
 const media=await stage(video,new File([new Uint8Array([0,0,0,20,102,116,121,112,0,0,0,0])],'video.mp4',{type:'video/mp4'}));
 const thumbnail=await stage(video,new File([png],'cover.png',{type:'image/png'}));
 const subtitles=await stage(video,new File(['WEBVTT\n\n00:00.000 --> 00:02.000\nTexte français.\n'],'fr.vtt',{type:'text/vtt'}));
 const videoResult=await video.context.Ho('/api/publications',{method:'POST',body:JSON.stringify({...input,type:'video',mediaUrl:media,thumbnailUrl:thumbnail,spokenLanguage:'ar',captionsUrl:subtitles,captionsLanguage:'fr',captionsSource:'file',captionsValidated:true})});
 assert.equal(videoResult.published,true);
 const item=publicationToCatalogue(video.metadata,video.folder).items[0];
 assert.ok(item.mediaUrl.endsWith('/videos/video.mp4'));assert.ok(item.thumbnailUrl.endsWith('/photos/miniature.png'));assert.ok(item.captionsUrl.endsWith('/videos/sous-titres-fr.vtt'));
});
