// Wording and payloads follow the selected medium; each editor owns its draft.
const MX_PUBLICATION_FORMS={
  video:{label:'Vidéo',hint:'Fichier ou lien, miniature et langue parlée',heading:'Ajouter une vidéo',information:'Informations sur la vidéo',media:'Vidéo et miniature',instruction:'Importez une vidéo ou indiquez son lien, puis vérifiez sa miniature et sa langue parlée.',titleLabel:'Titre de la vidéo *',titlePlaceholder:'Titre précis de la vidéo',dateLabel:'Date de diffusion *',dateName:'Date de diffusion',creditLabel:'Crédits de la vidéo',optional:'Crédits et réalisation',emptyTitle:'Le titre de votre vidéo'},
  photo:{label:'Photos',hint:'Album, couverture et légendes',heading:'Ajouter des photos',information:'Informations sur l’album photo',media:'Photographies et couverture',instruction:'Réunissez les photos d’un même sujet, choisissez la couverture de l’album et ajoutez les légendes utiles.',titleLabel:'Titre de l’album photo *',titlePlaceholder:'Sujet ou événement photographié',dateLabel:'Date des prises de vue *',dateName:'Date des prises de vue',creditLabel:'Photographe / crédit photo',optional:'Présentation et crédits de l’album',descriptionLabel:'Présentation de l’album',emptyTitle:'Le titre de votre album photo'},
  press:{label:'Communiqué de presse',hint:'Texte, document PDF ou les deux',heading:'Ajouter un communiqué de presse',information:'Informations sur le communiqué',media:'Contenu du communiqué',instruction:'Joignez le PDF du communiqué, saisissez son texte ou associez les deux versions.',titleLabel:'Titre du communiqué *',titlePlaceholder:'Objet du communiqué de presse',dateLabel:'Date du communiqué *',dateName:'Date du communiqué',creditLabel:'Service émetteur',optional:'Chapeau et service émetteur',descriptionLabel:'Chapeau du communiqué',emptyTitle:'Le titre de votre communiqué'},
};

function mxPressSelection(mode,files,text){
  if(!['pdf','text','both'].includes(mode))throw new Error('Choisissez le format du communiqué.');
  return {files:mode==='text'?[]:files,content:mode==='pdf'?'':text,needsPdf:mode!=='text',needsText:mode!=='pdf'};
}

function mxPublicationPayload(input){
  if(!MX_PUBLICATION_FORMS[input.type])throw new Error('Choisissez un type de contenu.');
  const item={requestId:input.requestId,type:input.type,title:input.title.trim(),date:input.date,topic:input.topic,language:input.language,description:input.description||'',credit:input.credit||'',status:'published',keywords:[input.topic],location:'',duration:'',thumbnailUrl:'',mediaUrl:'',fileUrl:'',captionsUrl:'',spokenLanguage:'',captionsLanguage:'',captionsSource:'',captionsValidated:false,photos:[],content:'',transcript:''};
  if(item.type==='video')Object.assign(item,{thumbnailUrl:input.thumbnailUrl||'',mediaUrl:input.mediaUrl||'',spokenLanguage:input.spokenLanguage||'',captionsLanguage:input.captionsLanguage||'',captionsSource:input.captionsSource||'',captionsValidated:!!input.captionsSource&&input.captionsValidated===true,captionsUrl:input.captionsUrl||''});
  if(item.type==='photo')Object.assign(item,{photos:input.photos||[],thumbnailUrl:input.thumbnailUrl||'',location:input.location||''});
  if(item.type==='press')Object.assign(item,{fileUrl:input.fileUrl||'',content:input.content||''});
  return item;
}
