import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../interface/publication-fields.js',import.meta.url),'utf8');
const {mxPublicationPayload,mxPressSelection}=vm.runInNewContext(source+';({mxPublicationPayload,mxPressSelection})');
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
