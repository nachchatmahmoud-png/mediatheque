import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {File} from 'node:buffer';
import {validateMedia,blankMedia} from '../app/lib/model.ts';
const helpers=await readFile(new URL('../interface/components.js',import.meta.url),'utf8');
const source=await readFile(new URL('../interface/video-languages.js',import.meta.url),'utf8');
const client=vm.runInNewContext(helpers+'\n'+source+';({mxVideoLanguageDetails,mxVideoEmbedUrl,mxLatestPresentation,mxReadCaptions})',{
 URL,MX_LOCALE:'fr',MX_VIDEO_LOCALIZATIONS:{abcdefghijk:{spokenLanguage:'ar',fr:{title:'Titre français validé',description:'Présentation française'}}},mxDetectedLanguage:()=>'ar',mxT:value=>value,
});
const base={...blankMedia(),title:'Test',date:'2026-10-21',topic:'Vie institutionnelle',description:'Résumé français',keywords:['Test'],mediaUrl:'https://www.youtube.com/watch?v=abcdefghijk',status:'published'};
test('audio language stays distinct from page language and unverified captions are never advertised',()=>{
 const video={...base,language:'fr',spokenLanguage:'ar',captionsSource:'youtube',captionsLanguage:'fr'};
 assert.equal(client.mxVideoLanguageDetails(video).original,'Vidéo en arabe');
 assert.equal(client.mxVideoLanguageDetails(video).captions,'');
 assert.equal(client.mxVideoLanguageDetails({...video,captionsValidated:true}).captions,'Sous-titres français');
 assert.equal(client.mxVideoLanguageDetails({...video,captionsValidated:true,mediaUrl:'https://youtube.com.evil.test/watch?v=abcdefghijk'}).captions,'');
 const embed=client.mxVideoEmbedUrl({...video,captionsValidated:true},'https://www.youtube-nocookie.com/embed/abcdefghijk');
 assert.equal(new URL(embed).searchParams.get('cc_lang_pref'),'fr');
 assert.equal(new URL(embed).searchParams.get('cc_load_policy'),'1');
 assert.equal(new URL(client.mxVideoEmbedUrl(video,'https://www.youtube-nocookie.com/embed/abcdefghijk')).searchParams.has('cc_lang_pref'),false);
});
test('video validation rejects unreviewed, missing and incompatible subtitle tracks',()=>{
 assert.throws(()=>validateMedia({...base,spokenLanguage:'en'}),/langue parlée/);
 assert.throws(()=>validateMedia({...base,captionsLanguage:'fr',captionsSource:'youtube'}),/validation/);
 assert.throws(()=>validateMedia({...base,captionsLanguage:'fr',captionsSource:'file',captionsUrl:'https://example.test/fr.vtt',captionsValidated:true}),/YouTube Studio/);
 assert.throws(()=>validateMedia({...base,mediaUrl:'https://example.test/video.mp4',captionsLanguage:'fr',captionsSource:'file',captionsValidated:true}),/YouTube/);
 const item=validateMedia({...base,spokenLanguage:'ar',captionsLanguage:'fr',captionsSource:'youtube',captionsValidated:true});
 assert.equal(item.spokenLanguage,'ar');assert.equal(item.language,'fr');assert.equal(item.captionsLanguage,'fr');
});
test('a translation is tied to its video and cannot leak into the next official upload',()=>{
 const first=client.mxLatestPresentation({videoId:'abcdefghijk',title:'العنوان الأصلي'});
 assert.equal(first.title,'Titre français validé');assert.equal(first.description,'Présentation française');assert.equal(first.item.spokenLanguage,'ar');
 const next=client.mxLatestPresentation({videoId:'0123456789a',title:'فيديو جديد'});
 assert.equal(next.title,'Dernière vidéo du ministère');assert.equal(next.description,'');assert.equal(next.item.spokenLanguage,'');
});
test('subtitle import accepts timed WebVTT and refuses renamed or empty text',async()=>{
 await assert.doesNotReject(client.mxReadCaptions(new File(['WEBVTT\n\n00:00.000 --> 00:02.000\nTexte français\n'],'fr.vtt',{type:'text/vtt'})));
 await assert.rejects(client.mxReadCaptions(new File(['WEBVTT\n\nTexte sans repères'],'fr.vtt')),/repères/);
 await assert.rejects(client.mxReadCaptions(new File(['WEBVTT\n\n00:00.000 --> 00:02.000\nTexte'],'fr.exe')),/format/);
});
