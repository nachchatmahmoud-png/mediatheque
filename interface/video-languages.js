// Publication language describes the text on the page, not the audio track.
function mxVideoLanguageDetails(item) {
  if(item.type!=='video')return null;
  const original={ar:'Vidéo en arabe',fr:'Vidéo en français',mixed:'Vidéo en arabe et en français'}[item.spokenLanguage]||'Version originale';
  const onYoutube=!!mxYoutubeThumbnail(item.mediaUrl);
  const validated=item.captionsValidated===true&&['fr','ar'].includes(item.captionsLanguage)&&((item.captionsSource==='file'&&item.captionsUrl&&!onYoutube)||(item.captionsSource==='youtube'&&onYoutube));
  return {original:mxT(original),captions:validated?mxT(item.captionsLanguage==='fr'?'Sous-titres français':'Sous-titres arabes'):'',captionsLanguage:validated?item.captionsLanguage:'',onYoutube};
}

function MxVideoLanguage({item,compact=false}) {
  const h=mxElement,details=mxVideoLanguageDetails(item);
  if(!details)return null;
  return h('div',{className:'mx-video-language'+(compact?' compact':''),'aria-label':mxT('Langue de la vidéo')},
    h('span',{className:'mx-original-language'},h(Ta,{size:compact?12:14}),details.original),
    details.captions&&h('span',{className:'mx-caption-language'},h(zl,{size:compact?12:14}),details.captions));
}

function mxVideoEmbedUrl(item,embed) {
  if(!embed)return '';
  const url=new URL(embed);
  url.searchParams.set('hl',MX_LOCALE);
  const details=mxVideoLanguageDetails(item);
  if(details?.captionsLanguage&&item.captionsSource==='youtube'){
    url.searchParams.set('cc_lang_pref',details.captionsLanguage);
    url.searchParams.set('cc_load_policy','1');
  }
  return url.href;
}

function MxVideoReader({item}) {
  const h=mxElement,[failed,setFailed]=O.useState(false);
  const embed=xg(item.mediaUrl),details=mxVideoLanguageDetails(item);
  const captionFile=item.captionsSource==='file'&&details.captionsLanguage?item.captionsUrl:!item.captionsSource?item.captionsUrl:'';
  return h('section',{className:'mx-video-reading'},h(MxVideoLanguage,{item}),
    h('div',{className:'video-frame'},embed?h('iframe',{src:mxVideoEmbedUrl(item,embed),title:item.title,allow:'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',allowFullScreen:true,referrerPolicy:'strict-origin-when-cross-origin'}):h('video',{controls:true,playsInline:true,preload:'metadata',poster:je(item.thumbnailUrl),onError:()=>setFailed(true)},
      h('source',{src:je(item.mediaUrl)}),captionFile&&h('track',{kind:'subtitles',src:je(captionFile),srcLang:details.captionsLanguage||undefined,label:details.captions||mxT('Sous-titres'),default:true}))),
    details.captions&&item.captionsSource==='youtube'&&h('p',{className:'mx-caption-help'},mxT('Les sous-titres se règlent dans le lecteur YouTube.')),
    captionFile&&details.captionsLanguage&&h('a',{className:'mx-caption-download',href:je(captionFile),target:'_blank',rel:'noreferrer'},mxT('Télécharger les sous-titres')),
    failed&&h('p',{className:'video-error',role:'alert'},mxT('La vidéo ne peut pas être lue. '),h('a',{href:je(item.mediaUrl),target:'_blank',rel:'noreferrer'},mxT('Ouvrir le fichier vidéo'))));
}

async function mxReadCaptions(file) {
  mxValidateFile(file,'captions');
  const content=(await file.text()).replace(/^\uFEFF/,'');
  if(!/^WEBVTT(?:[ \t][^\r\n]*)?\r?\n/.test(content)||!/(?:\d{2}:)?\d{2}:\d{2}\.\d{3}\s+-->\s+(?:\d{2}:)?\d{2}:\d{2}\.\d{3}/.test(content))throw new Error('Le fichier doit être un sous-titrage WebVTT contenant des repères temporels.');
  return file;
}

function MxVideoLanguageFields({spokenLanguage,onSpokenLanguage,captionsLanguage,onCaptionsLanguage,captionsFile,onCaptionsFile,validated,onValidated,onRemove,isYoutube}) {
  const h=mxElement;
  return h('div',{className:'mx-video-language-fields'},
    h('label',{className:'field'},'Langue parlée dans la vidéo *',h('select',{required:true,value:spokenLanguage,onChange:event=>onSpokenLanguage(event.target.value)},h('option',{value:'',disabled:true},'Choisir la langue parlée…'),h('option',{value:'ar'},'Arabe'),h('option',{value:'fr'},'Français'),h('option',{value:'mixed'},'Arabe et français'))),
    h('details',{className:'mx-caption-fields'},h('summary',null,'Sous-titres',h('small',null,'Facultatif')),
      h('label',{className:'field'},'Sous-titres disponibles',h('select',{value:captionsLanguage,onChange:event=>onCaptionsLanguage(event.target.value)},h('option',{value:''},'Aucun sous-titre déclaré'),h('option',{value:'fr'},'Français'),h('option',{value:'ar'},'Arabe'))),
      captionsLanguage&&h(O.Fragment,null,isYoutube?h('p',{className:'mx-caption-instruction'},'Ajoutez la piste '+(captionsLanguage==='fr'?'française':'arabe')+' à cette vidéo dans ',h('a',{href:'https://studio.youtube.com/',target:'_blank',rel:'noreferrer'},'YouTube Studio',h(Oe,{size:12})),', puis confirmez sa disponibilité.'):
        h('div',{className:'mx-caption-file'},h('label',{className:'button secondary mx-thumbnail-upload'},h(ma,{size:15}),captionsFile?'Remplacer le fichier':'Importer les sous-titres',h('input',{type:'file',accept:'.vtt,text/vtt','aria-label':'Importer le fichier de sous-titres',onChange:event=>{onCaptionsFile(event.target.files?.[0]);event.target.value='';}})),h('small',null,'WebVTT (.vtt) · 1 Mio maximum'),captionsFile&&h('div',null,h('span',null,captionsFile.name),h('button',{type:'button',onClick:onRemove},'Retirer'))),
        h('label',{className:'mx-caption-review'},h('input',{type:'checkbox',checked:validated,onChange:event=>onValidated(event.target.checked)}),h('span',null,isYoutube?'J’ai vérifié les sous-titres et leur publication sur cette vidéo YouTube.':'J’ai vérifié le texte, la traduction et la synchronisation des sous-titres.')))));
}

function mxFrenchVideoTitle(video) {
  const title=MX_VIDEO_LOCALIZATIONS[video.videoId]?.fr?.title||video.title||'';
  return typeof title==='string'&&title.trim()&&!/[\u0600-\u06ff]/u.test(title)?title.trim():'';
}

function mxLatestPresentation(video) {
  const record=MX_VIDEO_LOCALIZATIONS[video.videoId]||{};
  const translation=record[MX_LOCALE]||{};
  return {title:MX_LOCALE==='fr'?mxFrenchVideoTitle(video):translation.title||video.title,description:translation.description||'',
    item:{type:'video',mediaUrl:'https://www.youtube.com/watch?v='+video.videoId,spokenLanguage:record.spokenLanguage||'',captionsLanguage:record.captionsLanguage||'',captionsSource:'youtube',captionsValidated:record.captionsValidated===true}};
}
