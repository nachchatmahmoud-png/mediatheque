// Wording and payloads follow the selected medium; each editor owns its draft.
const MX_PUBLICATION_FORMS={
  video:{label:'Vidéo',hint:'Un transfert, deux pages de publication au choix',heading:'Ajouter une vidéo',information:'Pages de publication et titres',media:'Vidéo et miniature',instruction:'Ajoutez la vidéo une seule fois. Cochez les pages française et arabe, puis renseignez le titre dans chaque langue sélectionnée.',titleLabel:'Titre de la vidéo *',titlePlaceholder:'Titre précis de la vidéo',dateLabel:'Date de diffusion *',dateName:'Date de diffusion',creditLabel:'Crédits de la vidéo',optional:'Crédits et réalisation',emptyTitle:'Le titre de votre vidéo'},
  photo:{label:'Photos',hint:'Un album pour les pages française et arabe',heading:'Ajouter des photos',information:'Pages de publication et titres de l’album',media:'Photographies et couverture',instruction:'Importez les photos une seule fois. Cochez les pages française et arabe, puis renseignez le titre et les légendes dans chaque langue sélectionnée.',titleLabel:'Titre de l’album photo *',titlePlaceholder:'Sujet ou événement photographié',dateLabel:'Date des prises de vue *',dateName:'Date des prises de vue',creditLabel:'Photographe / crédit photo',optional:'Lieu et crédits de l’album',descriptionLabel:'Présentation de l’album',emptyTitle:'Le titre de votre album photo'},
  press:{label:'Communiqué de presse',hint:'Un communiqué pour les pages française et arabe',heading:'Ajouter un communiqué de presse',information:'Pages de publication et titres du communiqué',media:'Contenu du communiqué',instruction:'Ajoutez le communiqué une seule fois. Cochez les pages française et arabe, puis renseignez les titres et les textes dans chaque langue sélectionnée.',titleLabel:'Titre du communiqué *',titlePlaceholder:'Objet du communiqué de presse',dateLabel:'Date du communiqué *',dateName:'Date du communiqué',creditLabel:'Service émetteur',optional:'Service émetteur',descriptionLabel:'Chapeau du communiqué',emptyTitle:'Le titre de votre communiqué'},
};

function mxPressSelection(mode,files,text){
  if(!['pdf','text','both'].includes(mode))throw new Error('Choisissez le format du communiqué.');
  return {files:mode==='text'?[]:files,content:mode==='pdf'?'':text,needsPdf:mode!=='text',needsText:mode!=='pdf'};
}

function mxPublicationPayload(input){
  if(!MX_PUBLICATION_FORMS[input.type])throw new Error('Choisissez un type de contenu.');
  const item={requestId:input.requestId,type:input.type,title:input.title.trim(),date:input.date,topic:input.topic,language:input.language,description:input.description||'',credit:input.credit||'',status:'published',keywords:MX_DOC_RUNTIME.validateDocumentaryKeywords(input.topic,input.keywords),location:'',duration:'',thumbnailUrl:'',mediaUrl:'',fileUrl:'',captionsUrl:'',spokenLanguage:'',captionsLanguage:'',captionsSource:'',captionsValidated:false,photos:[],content:'',transcript:''};
  if(item.type==='video')Object.assign(item,{thumbnailUrl:input.thumbnailUrl||'',mediaUrl:input.mediaUrl||'',spokenLanguage:input.spokenLanguage||'',captionsLanguage:input.captionsLanguage||'',captionsSource:input.captionsSource||'',captionsValidated:!!input.captionsSource&&input.captionsValidated===true,captionsUrl:input.captionsUrl||''});
  if(item.type==='photo')Object.assign(item,{photos:input.photos||[],thumbnailUrl:input.thumbnailUrl||'',location:input.location||''});
  if(item.type==='press')Object.assign(item,{fileUrl:input.fileUrl||'',content:input.content||''});
  if(input.languages!==undefined)Object.assign(item,mxPublicationEditions(item.type,input.languages,input.translations));
  return item;
}

function mxPublicationEditions(type,languages,values){
  if(!MX_PUBLICATION_FORMS[type])throw new Error('Choisissez un type de contenu.');
  if(!Array.isArray(languages)||!languages.length||languages.some(value=>!['fr','ar'].includes(value))||new Set(languages).size!==languages.length)throw new Error('Cochez au moins une page de publication : français ou arabe.');
  const translations={};
  for(const language of ['fr','ar']){
    if(!languages.includes(language))continue;
    const fields=values?.[language]||{},title=typeof fields.title==='string'?fields.title.trim():'',description=typeof fields.description==='string'?fields.description.trim():'',credit=typeof fields.credit==='string'?fields.credit.trim():'';
    if(!title||title.length>180)throw new Error(language==='fr'?'Renseignez le titre traduit en français (180 caractères maximum).':'Renseignez le titre en arabe (180 caractères maximum).');
    if(description.length>1200||credit.length>200)throw new Error('Le résumé ou les crédits dépassent la longueur autorisée.');
    const extra={};
    if(type==='photo'){
      extra.location=typeof fields.location==='string'?fields.location.trim():'';
      if(extra.location.length>150||!Array.isArray(fields.captions||[])||(fields.captions||[]).length>30||(fields.captions||[]).some(caption=>typeof caption!=='string'||caption.length>300))throw new Error('Vérifiez le lieu et les légendes de l’album.');
      extra.captions=(fields.captions||[]).map(caption=>caption.trim());
    }
    if(type==='press'){
      extra.content=typeof fields.content==='string'?fields.content.trim():'';
      extra.fileUrl=typeof fields.fileUrl==='string'?fields.fileUrl:'';
      if(extra.content.length>40000)throw new Error('Le texte du communiqué dépasse 40 000 caractères.');
    }
    if(language==='fr'&&(!/\p{Script=Latin}/u.test(title)||/\p{Script=Arabic}/u.test([title,description,credit,extra.location,extra.content,...(extra.captions||[])].join(' '))))throw new Error('Renseignez le titre et les textes de la version française en français.');
    if(language==='ar'&&!/\p{Script=Arabic}/u.test(title))throw new Error('Renseignez le titre de la version arabe en arabe.');
    translations[language]={title,description,credit,...extra};
  }
  const language=languages.includes('fr')?'fr':'ar';
  return {language,...translations[language],translations};
}

function mxVideoEditions(languages,values){return mxPublicationEditions('video',languages,values);}
