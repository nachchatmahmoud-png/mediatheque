// Administration: the server owns authentication, sessions and publication.
function MxAdminLogin({auth,onAuthenticated}) {
  const h=mxElement;
  const [username,setUsername]=O.useState(auth.username||'');
  const [password,setPassword]=O.useState('');
  const [confirmation,setConfirmation]=O.useState('');
  const [recover,setRecover]=O.useState(false);
  const [busy,setBusy]=O.useState(false);
  const [error,setError]=O.useState('');
  const create=!auth.configured&&auth.canSetup;
  const newPassword=create||recover;
  const submit=async event=>{
    event.preventDefault();setError('');setBusy(true);
    try{
      await Ho('/api/auth/'+(create?'setup':recover?'recover':'login'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password,confirmPassword:confirmation})});
      const status=await Ho('/api/auth/session');
      if(!status.authenticated)throw new Error('La session n’a pas pu être conservée. Ouvrez la gestion dans un onglet distinct, puis reconnectez-vous.');
      setPassword('');setConfirmation('');await onAuthenticated();
    }catch(exception){setError(exception.message);}finally{setBusy(false);}
  };
  return h(O.Fragment,null,h('div',{className:'mx-admin-login'},
    h('div',{className:'mx-login-intro'},h('span',{className:'mx-login-lock'},h(Wi,{size:30})),h('div',{className:'eyebrow'},'ACCÈS RÉSERVÉ'),h('h2',null,'Espace administrateur'),h('p',null,'Connectez-vous pour ajouter et publier les contenus de la médiathèque.'),h('ul',{className:'mx-login-features'},h('li',null,h(zl,{size:16}),'Un accès nominatif pour chaque administrateur'),h('li',null,h(zl,{size:16}),'Des supports regroupés dans un même espace'),h('li',null,h(zl,{size:16}),'Une publication après votre validation')),h('p',{className:'mx-login-note'},'Service de communication · Médiathèque')),
    !auth.configured&&!auth.canSetup?h('div',{className:'mx-login-panel'},h('h3',null,'Activer le compte administrateur'),h('p',null,'Le propriétaire doit d’abord définir l’identifiant et le mot de passe de gestion.'),h('a',{className:'button primary',href:'/signin-with-chatgpt?return_to=%2F%3Fview%3Dmanage',target:'_top'},'Accéder avec le compte propriétaire',h(wl,{size:17})))
    :h('form',{className:'mx-login-panel',onSubmit:submit},h('h3',null,create?'Créer le compte administrateur':recover?'Réinitialiser l’accès':'Connexion'),
      h('label',{className:'field'},'Identifiant',h('input',{name:'username',autoComplete:'username',autoCapitalize:'none',spellCheck:false,required:true,maxLength:60,minLength:3,value:username,onChange:event=>setUsername(event.target.value)})),
      h('label',{className:'field'},newPassword?'Nouveau mot de passe':'Mot de passe',h('input',{name:'password',type:'password',autoComplete:newPassword?'new-password':'current-password',required:true,minLength:newPassword?15:undefined,maxLength:128,value:password,onChange:event=>setPassword(event.target.value)}),newPassword&&h('small',null,'Choisissez une phrase de passe de 15 caractères minimum.')),
      newPassword&&h('label',{className:'field'},'Confirmer le mot de passe',h('input',{name:'confirmPassword',type:'password',autoComplete:'new-password',required:true,minLength:15,maxLength:128,value:confirmation,onChange:event=>setConfirmation(event.target.value)})),
      error&&h('p',{className:'gh-error',role:'alert'},error),
      h('button',{className:'button primary mx-auth-submit',type:'submit',disabled:busy},h(Wi,{size:16}),busy?'Connexion en cours…':create?'Créer le compte et se connecter':recover?'Enregistrer le nouvel accès':'Se connecter'),
      auth.canRecover&&h('button',{className:'mx-recover',type:'button',disabled:busy,onClick:()=>{setRecover(!recover);setPassword('');setConfirmation('');setError('');}},recover?'Revenir à la connexion':'Réinitialiser mon accès propriétaire'))),auth.canRevealInitialCredentials&&h(MxInitialAccess,{onRefresh:onAuthenticated}));
}

function nf({auth,isAdmin,loading,error,onBack,onLogout,onRefresh,onToast,onPublished,items=[],onPreview}) {
  const h=mxElement;
  const [workspace,setWorkspace]=O.useState('publish');
  const [type,setType]=O.useState('video');
  const [title,setTitle]=O.useState('');
  const [date,setDate]=O.useState(SL);
  const [topic,setTopic]=O.useState(el[0]);
  const [files,setFiles]=O.useState([]);
  const [captions,setCaptions]=O.useState([]);
  const [videoMode,setVideoMode]=O.useState('file');
  const [videoUrl,setVideoUrl]=O.useState('');
  const [pressText,setPressText]=O.useState('');
  const [description,setDescription]=O.useState('');
  const [credit,setCredit]=O.useState('');
  const [language,setLanguage]=O.useState('');
  const [busy,setBusy]=O.useState(false);
  const [progress,setProgress]=O.useState('');
  const [formError,setFormError]=O.useState('');
  const [preview,setPreview]=O.useState(false);
  const [photoCover,setPhotoCover]=O.useState(null);
  const [customThumbnail,setCustomThumbnail]=O.useState(null);
  const [automaticThumbnail,setAutomaticThumbnail]=O.useState(null);
  const [thumbnailBusy,setThumbnailBusy]=O.useState(false);
  const [thumbnailNote,setThumbnailNote]=O.useState('');
  const requestId=O.useRef('');
  const uploaded=O.useRef(new Map());
  const finalLanguage=language;
  const coverFile=files.includes(photoCover)?photoCover:files[0]||null;
  const thumbnail=type==='photo'?coverFile:type==='video'?(customThumbnail||(videoMode==='file'?automaticThumbnail:mxYoutubeThumbnail(videoUrl))):null;
  const thumbnailPending=type==='video'&&videoMode==='file'&&thumbnailBusy&&!customThumbnail;
  const thumbnailPreviewUrl=mxUseObjectUrl(thumbnail);
  O.useEffect(()=>{
    setAutomaticThumbnail(null);setThumbnailNote('');
    if(type!=='video'||videoMode!=='file'||!files[0]){setThumbnailBusy(false);return;}
    const controller=new AbortController();setThumbnailBusy(true);
    mxVideoThumbnail(files[0],controller.signal).then(file=>{if(!controller.signal.aborted){setAutomaticThumbnail(file);setThumbnailNote('Miniature créée à partir de votre vidéo.');}}).catch(exception=>{if(!controller.signal.aborted)setThumbnailNote(exception.message);}).finally(()=>{if(!controller.signal.aborted)setThumbnailBusy(false);});
    return ()=>controller.abort();
  },[type,videoMode,files[0]]);
  const setKind=value=>{if(busy)return;setType(value);setFiles([]);setCaptions([]);setPhotoCover(null);setCustomThumbnail(null);setFormError('');requestId.current='';uploaded.current.clear();};
  const chooseThumbnail=file=>{if(!file)return;try{mxValidateFile(file,'photo');setCustomThumbnail(file);setFormError('');}catch(exception){setFormError(exception.message);}};
  const addFiles=list=>{
    const chosen=Array.from(list||[]);if(!chosen.length)return;
    try{
      chosen.forEach(file=>mxValidateFile(file,type));
      const next=type==='photo'?[...files,...chosen.filter(file=>!files.some(other=>other.name===file.name&&other.size===file.size&&other.lastModified===file.lastModified))]:[chosen[0]];
      if(next.length>30)throw new Error('Un album peut contenir au maximum 30 photographies.');
      if(next.reduce((total,file)=>total+file.size,0)>100*1048576)throw new Error('La publication ne peut pas dépasser 100 Mio.');
      if(type==='video')setCustomThumbnail(null);
      setFiles(next);setCaptions(type==='photo'?[...captions,...next.slice(files.length).map(()=>'')]:[]);setFormError('');
    }catch(exception){setFormError(exception.message);}
  };
  const upload=async file=>{
    const key=[file.name,file.size,file.lastModified].join(':');
    if(uploaded.current.has(key))return uploaded.current.get(key);
    const mime=file.type||({jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',mp4:'video/mp4',webm:'video/webm',pdf:'application/pdf'}[file.name.split('.').at(-1).toLowerCase()]);
    const result=await Ho('/api/uploads?name='+encodeURIComponent(file.name),{method:'POST',headers:{'Content-Type':mime},body:file});
    uploaded.current.set(key,result.url);return result.url;
  };
  const publish=async event=>{
    event.preventDefault();if(busy)return;setFormError('');
    try{
      if(!title.trim())throw new Error('Renseignez le titre de la publication.');
      if(!['fr','ar'].includes(language))throw new Error('Choisissez la langue de publication.');
      if(type==='photo'&&!files.length)throw new Error('Sélectionnez au moins une photographie.');
      if(type==='video'&&(videoMode==='file'?!files.length:!mxHttps(videoUrl)))throw new Error(videoMode==='file'?'Sélectionnez une vidéo.':'Renseignez une adresse vidéo HTTPS valide.');
      if(type==='video'&&thumbnailPending)throw new Error('La miniature est en cours de création. Patientez quelques instants.');
      if(type==='video'&&!thumbnail)throw new Error('Ajoutez une miniature pour présenter la vidéo dans l’accueil.');
      if(type==='press'&&!files.length&&!pressText.trim())throw new Error('Sélectionnez un PDF ou saisissez le texte du communiqué.');
      setBusy(true);setProgress('Validation de la publication…');
      const paths=[];
      const activeFiles=type==='video'&&videoMode==='link'?[]:files;
      const extraThumbnail=type==='video'&&thumbnail&&typeof thumbnail!=='string'?thumbnail:null;
      if(activeFiles.reduce((sum,file)=>sum+file.size,extraThumbnail?.size||0)>100*1048576)throw new Error('La publication, miniature comprise, ne peut pas dépasser 100 Mio.');
      for(let index=0;index<activeFiles.length;index++){setProgress('Transfert des fichiers : '+(index+1)+' / '+activeFiles.length);paths.push(await upload(activeFiles[index]));}
      let thumbnailUrl=type==='photo'?paths[files.indexOf(coverFile)]||'':typeof thumbnail==='string'?thumbnail:'';
      if(extraThumbnail){setProgress('Transfert de la miniature…');thumbnailUrl=await upload(extraThumbnail);}
      requestId.current ||= crypto.randomUUID();
      const result=await Ho('/api/publications',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId:requestId.current,type,title:title.trim(),date,topic,language:finalLanguage,description,credit,status:'published',keywords:[topic],location:'',duration:'',thumbnailUrl,mediaUrl:type==='video'?(videoMode==='link'?videoUrl.trim():paths[0]):'',fileUrl:type==='press'?paths[0]||'':'',captionsUrl:'',photos:type==='photo'?paths.map((url,index)=>({url,caption:captions[index]||''})):[],content:type==='press'?pressText:'',transcript:''})});
      if(!result.published)throw new Error('La publication n’a pas été confirmée.');
      setProgress('Publication effectuée.');onToast('La publication est en ligne et visible dans l’accueil.');
      await onPublished(result.id,finalLanguage);
    }catch(exception){setFormError(exception.message);}finally{setBusy(false);setProgress('');}
  };
  const move=(index,destination)=>{const next=[...files],notes=[...captions];next.splice(destination,0,next.splice(index,1)[0]);notes.splice(destination,0,notes.splice(index,1)[0]);setFiles(next);setCaptions(notes);};
  const input=(label,value,onChange,props={})=>h('label',{className:'field'},label,h('input',{...props,value,onChange:event=>onChange(event.target.value)}));
  const attachmentLabel=type==='photo'?'Sélectionner les photos':type==='video'?'Sélectionner la vidéo':'Sélectionner le PDF';
  return h('section',{className:'container gh-management mx-simple-management'},
    h('button',{className:'button secondary',onClick:onBack},h(Xi,{size:17}),'Retour à la médiathèque'),
    h(MxManagementHero,{auth,items,onLogout,busy,onToast}),
    loading?h('p',{role:'status'},'Chargement de l’espace de gestion…'):error?h('div',{className:'gh-error',role:'alert'},error,h('button',{className:'button secondary',onClick:onRefresh},'Réessayer')):auth.authenticated&&auth.requiresPasswordChange?h(MxPasswordChange,{auth,onSaved:onRefresh}):!auth.authenticated||!isAdmin?h(MxAdminLogin,{auth,onAuthenticated:onRefresh}):h(O.Fragment,null,
      auth.canRevealInitialCredentials&&auth.role==='owner'&&h(MxInitialAccess,{onRefresh}),
      h('nav',{className:'mx-workspace-nav','aria-label':'Administration'},h('button',{type:'button',disabled:busy,className:workspace==='publish'?'active':'','aria-current':workspace==='publish'?'page':undefined,onClick:()=>setWorkspace('publish')},h(Ta,{size:17}),'Publications'),auth.role==='owner'&&h('button',{type:'button',disabled:busy,className:workspace==='accounts'?'active':'',onClick:()=>setWorkspace('accounts')},h(Wi,{size:17}),'Comptes administrateurs'),h('button',{type:'button',disabled:busy,className:workspace==='password'?'active':'',onClick:()=>setWorkspace('password')},'Mon mot de passe')),
      workspace==='accounts'&&auth.role==='owner'?h(MxAccountsManager,{}):workspace==='password'?h(MxPasswordChange,{auth,onSaved:async()=>{await onRefresh();setWorkspace('publish');onToast('Votre mot de passe a été mis à jour.');},onCancel:()=>setWorkspace('publish')}):h(O.Fragment,null,
      h('div',{className:'transfer-shortcuts gh-type-choices',role:'group','aria-label':'Type de support'},...yL.map(({type:kind,Icon,label})=>h('button',{key:kind,type:'button',disabled:busy,className:'transfer-shortcut gh-type-card '+kind+(type===kind?' selected':''),'aria-pressed':type===kind,onClick:()=>setKind(kind)},h('span',{className:'transfer-shortcut-icon'},h(Icon,{size:26})),h('strong',null,label),type===kind&&h(zl,{size:20})))),
      h('div',{className:'mx-publication-workspace'},h('form',{className:'gh-form mx-simple-form',onSubmit:publish},
        h('fieldset',{disabled:busy},h('legend',null,'Nouvelle publication'),
          h('div',{className:'gh-fields'},input('Titre *',title,setTitle,{required:true,maxLength:180,placeholder:'Titre de la vidéo, de l’album ou du communiqué',dir:'auto'}),input('Date *',date,setDate,{type:'date',required:true}),
            h('label',{className:'field'},'Langue de publication *',h('select',{value:language,required:true,onChange:event=>setLanguage(event.target.value)},h('option',{value:'',disabled:true},'Choisir la langue…'),h('option',{value:'fr'},'Français'),h('option',{value:'ar'},'العربية'))),
            h('label',{className:'field gh-wide'},'Rubrique *',h('select',{required:true,value:topic,onChange:event=>setTopic(event.target.value)},...el.map(value=>h('option',{key:value,value},value))))),
          type==='video'&&h('div',{className:'mx-video-mode',role:'group','aria-label':'Source de la vidéo'},h('button',{type:'button','aria-pressed':videoMode==='file',onClick:()=>setVideoMode('file')},'Importer un fichier'),h('button',{type:'button','aria-pressed':videoMode==='link',onClick:()=>setVideoMode('link')},'Utiliser un lien vidéo')),
          type==='video'&&videoMode==='link'?input('Adresse HTTPS de la vidéo *',videoUrl,setVideoUrl,{type:'url',required:true,maxLength:2000,placeholder:'https://…'}):h('div',{className:'mx-support-upload'},
            h('label',{className:'gh-file-label'},h(type==='photo'?pa:type==='video'?Ta:ma,{size:22}),attachmentLabel,h('input',{type:'file',accept:type==='photo'?'image/jpeg,image/png,image/webp':type==='video'?'video/mp4,video/webm':'application/pdf',multiple:type==='photo',onChange:event=>{addFiles(event.target.files);event.target.value='';}})),
            h('small',null,type==='photo'?'JPG, PNG ou WebP · 30 photos maximum · 12 Mio par photo':type==='video'?'MP4 ou WebM · 25 Mio maximum':'PDF · 20 Mio maximum')),
          type==='photo'&&files.length>0&&h('p',{className:'mx-cover-help'},h(pa,{size:16}),'Choisissez la photo qui servira de miniature dans l’accueil.'),
          files.length>0&&!(type==='video'&&videoMode==='link')&&h('div',{className:'mx-selected-files'},type==='photo'?h('div',{className:'mx-photo-grid'},...files.map((file,index)=>h(MxPhotoPreview,{key:file.name+'-'+file.size+'-'+file.lastModified,file,caption:captions[index]||'',index,total:files.length,cover:file===coverFile,onCover:()=>setPhotoCover(file),onCaption:value=>setCaptions(captions.map((note,position)=>position===index?value:note)),onRemove:()=>{setFiles(files.filter((_,position)=>position!==index));setCaptions(captions.filter((_,position)=>position!==index));},onMove:destination=>move(index,destination)}))):h('div',null,h('strong',null,files[0].name),h('small',null,mxSize(files[0].size)),h('button',{type:'button',className:'mx-remove',onClick:()=>setFiles([])},'Retirer'))),
          type==='video'&&h(MxThumbnailField,{source:thumbnail,pending:thumbnailPending,custom:!!customThumbnail,note:videoMode==='link'&&mxYoutubeThumbnail(videoUrl)?'Miniature récupérée depuis le lien YouTube.':thumbnailNote,onChange:chooseThumbnail,onReset:()=>setCustomThumbnail(null)}),
          type==='press'&&h('label',{className:'field mx-press-text'},'Texte du communiqué'+(!files.length?' *':' (facultatif)'),h('textarea',{rows:5,maxLength:40000,value:pressText,required:!files.length,onChange:event=>setPressText(event.target.value),dir:'auto',placeholder:'Saisissez le texte si vous ne joignez pas de PDF.'}))),
        h('details',{className:'mx-optional-fields'},h('summary',null,'Informations complémentaires',h('small',null,'Facultatif')),h('div',{className:'gh-fields'},h('label',{className:'field gh-wide'},'Courte description',h('textarea',{rows:3,maxLength:1200,value:description,disabled:busy,onChange:event=>setDescription(event.target.value)})),input('Crédits / auteur',credit,setCredit,{maxLength:200,disabled:busy}))),
        formError&&h('p',{className:'gh-error',role:'alert'},formError),
        h('div',{className:'mx-publish-footer'},h('button',{className:'button secondary',type:'button',disabled:busy,onClick:()=>setPreview(true)},h(au,{size:17}),'Aperçu'),h('button',{className:'button primary mx-publish-button',type:'submit',disabled:busy||thumbnailPending},h(zl,{size:20}),busy?'Publication en cours…':'Valider et publier')),
        busy&&h('p',{className:'mx-publishing-status',role:'status','aria-live':'polite'},progress)),
      h('aside',{className:'mx-publication-guide'},h('div',{className:'eyebrow'},'VOTRE PUBLICATION'),(type==='video'||type==='photo')&&h('div',{className:'mx-guide-cover'},h(MxThumbnailImage,{source:thumbnailPreviewUrl,title}),h('small',null,'Miniature dans l’accueil')),h('span',{className:'mx-guide-format'},h(Oo,{type,size:22}),nu[type]),h('h2',{dir:'auto'},title.trim()||'Un nouveau contenu à partager'),h('dl',null,h('div',null,h('dt',null,'Date'),h('dd',null,date?Ya(date):'À renseigner')),h('div',null,h('dt',null,'Rubrique'),h('dd',null,topic)),h('div',null,h('dt',null,'Support'),h('dd',null,type==='video'&&videoMode==='link'?'Lien vidéo HTTPS':files.length?mxPlural(files.length,'fichier'):type==='press'&&pressText?'Texte du communiqué':'À sélectionner'))),h('div',{className:'mx-guide-note'},h(Wi,{size:17}),h('p',null,'Vérifiez votre contenu dans l’aperçu. Le bouton « Valider et publier » confirme sa mise en ligne.')))),
      preview&&h(MxPublicationPreview,{title,date,topic,description,language:finalLanguage,thumbnail,photos:type==='photo'?files:[],captions,video:type==='video'&&videoMode==='file'?files[0]||null:null,videoUrl:type==='video'&&videoMode==='link'?videoUrl:'',press:type==='press'?files[0]||null:null,pressText:type==='press'?pressText:'',onClose:()=>setPreview(false)}),
      h(MxPublishedList,{items,onOpen:onPreview}))));
}
