import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../interface/publication-fields.js',import.meta.url),'utf8');
const {mxPublicationPayload,mxPressSelection,mxVideoEditions}=vm.runInNewContext(source+';({mxPublicationPayload,mxPressSelection,mxVideoEditions})');
const filled={requestId:'12345678-1234-4234-8234-123456789abc',title:'  Titre saisi  ',date:'2026-10-22',topic:'Vie institutionnelle',language:'fr',description:'Présentation',credit:'Source du support',mediaUrl:'https://example.test/video.mp4',thumbnailUrl:'cover.jpg',spokenLanguage:'ar',captionsLanguage:'fr',captionsSource:'file',captionsValidated:true,captionsUrl:'subtitles.vtt',fileUrl:'communique.pdf',content:'Texte du communiqué',location:'Rabat',photos:[{url:'photo.jpg',caption:'Légende'}]};

test('each publication carries only the fields of its medium, including the photo location',()=>{
  const video=mxPublicationPayload({...filled,type:'video'});
  assert.equal(video.title,'Titre saisi');assert.equal(video.mediaUrl,filled.mediaUrl);assert.equal(video.spokenLanguage,'ar');assert.equal(video.captionsUrl,'subtitles.vtt');
  assert.equal(video.fileUrl,'');assert.equal(video.content,'');assert.equal(video.location,'');assert.equal(video.photos.length,0);
  const photos=mxPublicationPayload({...filled,type:'photo'});
  assert.equal(photos.photos[0].caption,'Légende');assert.equal(photos.thumbnailUrl,'cover.jpg');assert.equal(photos.location,'Rabat');assert.equal(photos.credit,filled.credit);
  assert.equal(photos.mediaUrl,'');assert.equal(photos.fileUrl,'');assert.equal(photos.content,'');assert.equal(photos.spokenLanguage,'');assert.equal(photos.captionsValidated,false);
  const press=mxPublicationPayload({...filled,type:'press'});
  assert.equal(press.content,'Texte du communiqué');assert.equal(press.fileUrl,'communique.pdf');assert.equal(press.credit,'Source du support');
  assert.equal(press.thumbnailUrl,'');assert.equal(press.photos.length,0);assert.equal(press.location,'');assert.equal(press.mediaUrl,'');assert.equal(press.captionsSource,'');
});

test('switching communiqué format excludes hidden text or files and requires the selected format',()=>{
  const files=[{name:'communique.pdf'}];
  const pdf=mxPressSelection('pdf',files,'Ancien texte à ne pas publier');
  assert.equal(pdf.content,'');assert.equal(pdf.files.length,1);assert.equal(pdf.needsPdf,true);assert.equal(pdf.needsText,false);
  const text=mxPressSelection('text',files,'Texte à publier');
  assert.equal(text.files.length,0);assert.equal(text.content,'Texte à publier');assert.equal(text.needsPdf,false);assert.equal(text.needsText,true);
  const both=mxPressSelection('both',files,'Texte et pièce jointe');
  assert.equal(both.files.length,1);assert.equal(both.content,'Texte et pièce jointe');assert.equal(both.needsText,true);assert.equal(both.needsPdf,true);
  assert.throws(()=>mxPressSelection('other',files,''),/format du communiqué/);
});

test('one video payload carries the selected translations and excludes unchecked language drafts',()=>{
  const translations={fr:{title:'Présentation du programme de logement',description:'Présentation en français.'},ar:{title:'تقديم برنامج السكن',description:'تقديم البرنامج باللغة العربية.'}};
  const both=mxPublicationPayload({...filled,type:'video',languages:['ar','fr'],translations});
  assert.equal(both.language,'fr');assert.equal(both.title,translations.fr.title);assert.equal(both.translations.ar.title,translations.ar.title);
  assert.equal(both.mediaUrl,filled.mediaUrl);assert.equal(both.thumbnailUrl,filled.thumbnailUrl);
  const arabic=mxPublicationPayload({...filled,type:'video',languages:['ar'],translations:{...translations,fr:{title:'مسودة غير منشورة'}}});
  assert.equal(arabic.language,'ar');assert.equal(arabic.title,translations.ar.title);assert.deepEqual(Object.keys(arabic.translations),['ar']);
  assert.throws(()=>mxVideoEditions([],translations),/au moins une page/);
  assert.throws(()=>mxVideoEditions(['ar','fr'],{ar:translations.ar}),/titre traduit en français/);
  assert.throws(()=>mxVideoEditions(['fr'],{fr:{title:'عنوان بالعربية'}}),/française en français/);
  assert.throws(()=>mxVideoEditions(['ar'],{ar:translations.fr}),/arabe en arabe/);
});

test('the editor publishes one video once with both titles and retains unchecked drafts',async()=>{
  const publisher=await readFile(new URL('../interface/publisher.js',import.meta.url),'utf8');
  const hooks=[],calls=[],published=[],notices=[];let cursor=0;
  const O={Fragment:'fragment',useState(initial){const index=cursor++;if(!(index in hooks))hooks[index]=typeof initial==='function'?initial():initial;return [hooks[index],value=>{hooks[index]=typeof value==='function'?value(hooks[index]):value;}];},useRef(initial){const index=cursor++;if(!(index in hooks))hooks[index]={current:initial};return hooks[index];},useEffect(){}};
  const context=vm.createContext({O,URL,SL:'2026-10-26',el:['Vie institutionnelle'],mxElement:(tag,props,...children)=>({tag,props:props||{},children:children.flat(Infinity).filter(Boolean)}),mxUseObjectUrl:()=>'',mxYoutubeThumbnail:value=>value.includes('youtube.com/watch?v=')?'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg':'',mxHttps:value=>value.startsWith('https://')?value:'',mxUuid:()=>filled.requestId,Ya:value=>value,Ho:async(path,options)=>{calls.push({path,...options});return {id:'video-partagee',published:true};},...Object.fromEntries(['Ta','pa','ma','Oo','zl','MxPreviewIcon','MxThumbnailField','MxVideoLanguageFields','MxThumbnailImage','MxPublicationPreview'].map(name=>[name,name]))});
  vm.runInContext(source+'\n'+publisher,context);
  const props={type:'video',auth:{sharedMode:true},busy:false,setBusy(){},onToast:value=>notices.push(value),onPublished:async(...values)=>published.push(values)};
  const render=()=>{cursor=0;return context.MxPublicationEditor(props);};
  const nodes=tree=>[tree,...tree.children.flatMap(child=>child&&typeof child==='object'?nodes(child):[])];
  const field=(tree,label)=>nodes(tree).find(node=>node.props['aria-label']===label);
  let tree=render();
  const checkbox=locale=>nodes(tree).find(node=>node.tag==='input'&&node.props.type==='checkbox'&&node.props.value===locale);
  assert.equal(checkbox('fr').props.checked,true);assert.equal(checkbox('ar').props.checked,true);
  field(tree,'Titre en arabe *').props.onChange({target:{value:'تقديم برنامج السكن'}});
  field(tree,'Titre en français *').props.onChange({target:{value:'Présentation du programme de logement'}});
  nodes(tree).find(node=>node.tag==='button'&&node.children.includes('Utiliser un lien vidéo')).props.onClick();
  tree=render();field(tree,'Lien de la vidéo *').props.onChange({target:{value:'https://www.youtube.com/watch?v=abcdefghijk'}});
  tree=render();checkbox('fr').props.onChange({target:{checked:false}});
  tree=render();assert.equal(field(tree,'Titre en français *'),undefined);
  checkbox('fr').props.onChange({target:{checked:true}});
  tree=render();assert.equal(field(tree,'Titre en français *').props.value,'Présentation du programme de logement');
  await nodes(tree).find(node=>node.tag==='form').props.onSubmit({preventDefault(){}});
  assert.equal(calls.length,1);assert.equal(calls[0].path,'/api/publications');
  const payload=JSON.parse(calls[0].body);assert.equal(payload.spokenLanguage,'ar');assert.equal(payload.translations.fr.title,'Présentation du programme de logement');assert.equal(payload.translations.ar.title,'تقديم برنامج السكن');
  assert.equal(payload.mediaUrl,'https://www.youtube.com/watch?v=abcdefghijk');assert.equal(published.length,1);assert.match(notices[0],/pages française et arabe/);
  checkbox('fr').props.onChange({target:{checked:false}});tree=render();checkbox('ar').props.onChange({target:{checked:false}});tree=render();
  await nodes(tree).find(node=>node.tag==='form').props.onSubmit({preventDefault(){}});
  assert.equal(calls.length,1);assert.ok(nodes(render()).some(node=>node.props.role==='alert'&&node.children.some(value=>typeof value==='string'&&value.includes('au moins une page'))));
});
