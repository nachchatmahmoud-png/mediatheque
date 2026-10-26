// The selected client handles either this browser's local access or a service.
function MxAdminLogin({auth,onAuthenticated}) {
  const h=mxElement;
  const [username,setUsername]=O.useState(auth.registrationUsername||''),[password,setPassword]=O.useState(''),[confirmPassword,setConfirmPassword]=O.useState(''),[busy,setBusy]=O.useState(false),[error,setError]=O.useState(''),[mode,setMode]=O.useState(auth.canSetup?'create':'login'),[registered,setRegistered]=O.useState(false);
  const creating=mode==='create',canCreate=auth.canSetup&&!registered;
  const [existingLocalAccount,setExistingLocalAccount]=O.useState(null);
  O.useEffect(()=>{if(auth.sharedMode&&auth.canSetup&&!auth.registrationUsername)mxLocalAccountStorage().account().then(setExistingLocalAccount).catch(()=>{});},[auth.sharedMode,auth.canSetup,auth.registrationUsername]);
  const transferLocalAccount=async()=>{if(busy||!existingLocalAccount)return;setBusy(true);setError('');try{const {username,salt,passwordHash,iterations}=existingLocalAccount,result=await Ho('/api/auth/register',{method:'POST',body:JSON.stringify({username,legacyVerifier:{salt,passwordHash,iterations}})});setUsername(result.username);setRegistered(true);setMode('login');setPassword('');setConfirmPassword('');}catch(exception){setError(exception.message);}finally{setBusy(false);}};
  const changeMode=value=>{setMode(value);setError('');setPassword('');setConfirmPassword('');};
  const submit=async event=>{
    event.preventDefault();if(busy||!auth.configured)return;setError('');
    if(creating&&password!==confirmPassword){setError('Les deux mots de passe ne correspondent pas.');return;}
    setBusy(true);
    try{
      const result=await Ho(creating?'/api/auth/register':'/api/auth/login',{method:'POST',body:JSON.stringify({username,password,...(creating?{confirmPassword}:{})})});
      setPassword('');setConfirmPassword('');
      if(creating){setUsername(result.username);setRegistered(true);setMode('login');}else await onAuthenticated();
    }catch(exception){setPassword('');setConfirmPassword('');setError(exception.message);}finally{setBusy(false);}
  };
  return h('div',{className:'mx-admin-login'},
    h('div',{className:'mx-login-intro'},h('span',{className:'mx-login-lock'},h(Wi,{size:30})),h('div',{className:'eyebrow'},'ACCÈS RÉSERVÉ'),h('h2',null,'Espace administrateur'),h('p',null,'Un espace pour préparer vos vidéos, vos albums photo et vos communiqués, puis les publier sur l’accueil.'),h('ul',{className:'mx-login-features'},h('li',null,h(zl,{size:16}),'Un compte personnel pour chaque administrateur'),h('li',null,h(zl,{size:16}),'Des champs adaptés à chaque support'),h('li',null,h(zl,{size:16}),'Un seul bouton pour valider et publier')),h('p',{className:'mx-login-note'},'Médiathèque · Hébergement GitHub')),
    h('form',{className:'mx-login-panel',onSubmit:submit},h('h3',null,creating?'Créer mon accès':'Connexion administrateur'),h('p',null,creating?'Choisissez votre identifiant et votre mot de passe personnels.':'Connectez-vous avec votre identifiant et votre mot de passe personnels.'),
      auth.localMode&&h('p',{className:'mx-local-scope',role:'note'},'Accès local : votre compte et vos ajouts sont conservés dans ce navigateur uniquement. Ils ne sont pas partagés avec les autres ordinateurs ni les visiteurs du site.'),
      auth.sharedMode&&h('p',{className:'mx-local-scope',role:'note'},'Votre accès fonctionne depuis vos différents navigateurs et ordinateurs. Les contenus publiés sont visibles par tous les visiteurs de la médiathèque.'),
      registered&&h('p',{className:'mx-auth-success',role:'status'},'Votre accès a été créé. Connectez-vous maintenant avec votre identifiant et votre mot de passe.'),
      creating&&existingLocalAccount&&h('div',{className:'mx-existing-local-access'},h('strong',null,'Votre accès existant : '+existingLocalAccount.username),h('p',null,'Conservez votre identifiant et votre mot de passe actuels pour vous connecter depuis les autres navigateurs.'),h('button',{className:'button secondary',type:'button',disabled:busy,onClick:transferLocalAccount},busy?'Activation en cours…':'Conserver mon accès existant'),h('small',null,'Vous pouvez aussi choisir un nouvel accès dans les champs ci-dessous.')),
      !auth.configured&&h('p',{className:'mx-login-activation',role:'status'},auth.error||(auth.localMode?'Ce navigateur ne permet pas la connexion locale. Ouvrez le site avec une version récente de votre navigateur.':'Le service de connexion n’est pas encore configuré. Aucun compte administrateur n’est actuellement activé.')),
      h('label',{className:'field'},'Identifiant',h('input',{type:'text',name:'username',autoComplete:'username',autoCapitalize:'none',spellCheck:false,required:true,minLength:3,maxLength:60,readOnly:creating&&!!auth.registrationUsername,disabled:busy||!auth.configured,value:username,onChange:event=>setUsername(event.target.value)}),creating&&h('small',null,'3 à 60 caractères : lettres sans accent, chiffres, point ou tiret.')),
      h(MxPasswordField,{key:mode+'-password',id:'mx-auth-password',label:'Mot de passe',name:'password',autoComplete:creating?'new-password':'current-password',required:true,minLength:creating?15:undefined,maxLength:creating||auth.localMode?128:512,disabled:busy||!auth.configured,value:password,onChange:event=>setPassword(event.target.value),hint:creating?'15 à 128 caractères. Vous pouvez utiliser une phrase de plusieurs mots.':''}),
      creating&&h(MxPasswordField,{key:mode+'-confirm',id:'mx-auth-confirm-password',label:'Confirmer le mot de passe',showLabel:'Afficher la confirmation du mot de passe',hideLabel:'Masquer la confirmation du mot de passe',name:'confirmPassword',autoComplete:'new-password',required:true,minLength:15,maxLength:128,disabled:busy||!auth.configured,value:confirmPassword,onChange:event=>setConfirmPassword(event.target.value)}),
      error&&h('p',{className:'gh-error',role:'alert'},error),h('button',{className:'button primary mx-auth-submit',type:'submit',disabled:busy||!auth.configured},h(Wi,{size:16}),busy?(creating?'Création en cours…':'Connexion en cours…'):(creating?'Créer mon accès':'Se connecter')),
      (creating||canCreate)&&h('button',{className:'button secondary mx-auth-switch',type:'button',disabled:busy,onClick:()=>changeMode(creating?'login':'create')},creating?'J’ai déjà un accès — Se connecter':'Première visite ? Créer mon accès'),
      auth.localMode&&h('small',null,'Conservez votre mot de passe. La suppression des données du navigateur efface cet accès et les contenus locaux.'),
      auth.sharedMode&&!canCreate&&!registered&&h('small',null,'Pour créer votre premier accès, utilisez le lien personnel d’activation remis par le responsable de la médiathèque.'),
      h('small',null,'Accès réservé aux administrateurs habilités de la médiathèque.')));
}

function nf({auth,isAdmin,loading,error,onBack,onLogout,onRefresh,onToast,onPublished,items=[],onPreview}) {
  const h=mxElement;
  const [activeType,setActiveType]=O.useState('video');
  const [busy,setBusy]=O.useState(false);
  const [resetError,setResetError]=O.useState('');
  const resetTests=async()=>{if(busy)return;setBusy(true);setResetError('');try{await Ho('/api/test/reset',{method:'POST'});await onRefresh();onToast('Les contenus de test de ce navigateur ont été effacés.');}catch(exception){setResetError(exception.message);}finally{setBusy(false);}};
  return h('section',{className:'container gh-management mx-simple-management'},
    h('button',{className:'button secondary',onClick:onBack},h(Xi,{size:17}),'Retour à la médiathèque'),
    h(MxManagementHero,{auth,items,onLogout,busy,onToast}),
    auth.testMode&&h(MxTestNotice,{onReset:resetTests,busy}),
    auth.localMode&&auth.authenticated&&h('aside',{className:'mx-local-management-note',role:'note'},h('strong',null,'Gestion locale'),h('p',null,'Vos ajouts apparaissent dans l’accueil de ce navigateur après validation. Ils ne sont pas publiés pour les autres visiteurs.')),
    resetError&&h('p',{className:'gh-error',role:'alert'},resetError),
    loading?h('p',{role:'status'},'Chargement de l’espace de gestion…'):error?h('div',{className:'gh-error',role:'alert'},error,h('button',{className:'button secondary',onClick:onRefresh},'Réessayer')):!auth.authenticated||!isAdmin?h(MxAdminLogin,{auth,onAuthenticated:onRefresh}):auth.requiresPasswordChange?h(MxPasswordChange,{onAuthenticated:onRefresh}):h(O.Fragment,null,
      h('nav',{className:'mx-workspace-nav','aria-label':'Administration'},h('span',{className:'active'},h(Ta,{size:17}),'Publications'),!auth.testMode&&!auth.localMode&&!auth.sharedMode&&h('a',{href:'https://github.com/'+MX_SERVICE.repository+'/actions',target:'_blank',rel:'noreferrer'},'Suivi de la mise en ligne',h(Oe,{size:14})),auth.canManageAccess&&h('a',{href:auth.sharedMode?'#mx-shared-accounts':'https://github.com/'+MX_SERVICE.repository+'/settings/access',...(auth.sharedMode?{}:{target:'_blank',rel:'noreferrer'})},'Gérer les accès',h(Oe,{size:14}))),
      auth.sharedMode&&h(MxLocalImport,{auth,onRefresh}),
      auth.canManageAccess&&auth.sharedMode&&h(MxSharedAccounts,{}),
      h('h2',{className:'mx-content-choice-title'},'Quel contenu souhaitez-vous ajouter ?'),
      h('div',{className:'transfer-shortcuts gh-type-choices',role:'group','aria-label':'Type de contenu à ajouter'},...yL.map(({type,Icon})=>h('button',{key:type,type:'button',disabled:busy,className:'transfer-shortcut gh-type-card '+type+(activeType===type?' selected':''),'aria-label':MX_PUBLICATION_FORMS[type].label,'aria-pressed':activeType===type,'aria-controls':'mx-editor-'+type,onClick:()=>setActiveType(type)},h('span',{className:'transfer-shortcut-icon'},h(Icon,{size:26})),h('span',{className:'mx-content-choice-copy'},h('strong',null,MX_PUBLICATION_FORMS[type].label),h('small',null,MX_PUBLICATION_FORMS[type].hint)),activeType===type&&h(zl,{size:20})))),
      ...['video','photo','press'].map(type=>h('div',{key:type,id:'mx-editor-'+type,className:'mx-content-editor',hidden:activeType!==type},h(MxPublicationEditor,{type,auth,busy,setBusy,onToast,onPublished}))),
      h(MxPublishedList,{items,onOpen:onPreview})));
}

function MxPublicationEditor({type,auth,busy,setBusy,onToast,onPublished}) {
  const h=mxElement,form=MX_PUBLICATION_FORMS[type];
  const [title,setTitle]=O.useState('');
  const [date,setDate]=O.useState(SL);
  const [topic,setTopic]=O.useState(el[0]);
  const [files,setFiles]=O.useState([]);
  const [captions,setCaptions]=O.useState([]);
  const [videoMode,setVideoMode]=O.useState('file');
  const [videoUrl,setVideoUrl]=O.useState('');
  const [pressText,setPressText]=O.useState('');
  const [pressMode,setPressMode]=O.useState('pdf');
  const [description,setDescription]=O.useState('');
  const [credit,setCredit]=O.useState('');
  const [location,setLocation]=O.useState('');
  const [language,setLanguage]=O.useState('');
  const [spokenLanguage,setSpokenLanguage]=O.useState('');
  const [captionsLanguage,setCaptionsLanguage]=O.useState('');
  const [captionsFile,setCaptionsFile]=O.useState(null);
  const [captionsValidated,setCaptionsValidated]=O.useState(false);
  const [progress,setProgress]=O.useState('');
  const [formError,setFormError]=O.useState('');
  const [preview,setPreview]=O.useState(false);
  const [photoCover,setPhotoCover]=O.useState(null);
  const [customThumbnail,setCustomThumbnail]=O.useState(null);
  const [thumbnailOrigin,setThumbnailOrigin]=O.useState('');
  const [automaticThumbnail,setAutomaticThumbnail]=O.useState(null);
  const [thumbnailBusy,setThumbnailBusy]=O.useState(false);
  const [thumbnailNote,setThumbnailNote]=O.useState('');
  const requestId=O.useRef('');
  const uploaded=O.useRef(new Map());
  const finalLanguage=language;
  const pressSelection=mxPressSelection(pressMode,files,pressText);
  const activeFiles=type==='press'?pressSelection.files:type==='video'&&videoMode==='link'?[]:files;
  const isYoutube=type==='video'&&videoMode==='link'&&!!mxYoutubeThumbnail(videoUrl);
  const captionsSource=type==='video'&&captionsLanguage?(isYoutube?'youtube':'file'):'';
  const needsFrenchSummary=type==='video'&&language==='fr'&&['ar','mixed'].includes(spokenLanguage);
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
  O.useEffect(()=>{setCaptionsValidated(false);},[type,videoMode,videoUrl,files[0]]);
  const chooseCaptions=async file=>{if(!file)return;try{await mxReadCaptions(file);setCaptionsFile(file);setCaptionsValidated(false);setFormError('');}catch(exception){setFormError(exception.message);}};
  const chooseThumbnail=file=>{if(!file)return;try{mxValidateFile(file,'photo');setCustomThumbnail(file);setThumbnailOrigin('import');setFormError('');}catch(exception){setFormError(exception.message);}};
  const chooseVideoFrame=file=>{setCustomThumbnail(file);setThumbnailOrigin('video');setFormError('');};
  const addFiles=list=>{
    const chosen=Array.from(list||[]);if(!chosen.length)return;
    try{
      chosen.forEach(file=>mxValidateFile(file,type));
      const next=type==='photo'?[...files,...chosen.filter(file=>!files.some(other=>other.name===file.name&&other.size===file.size&&other.lastModified===file.lastModified))]:[chosen[0]];
      if(next.length>30)throw new Error('Un album peut contenir au maximum 30 photographies.');
      if(next.reduce((total,file)=>total+file.size,0)>100*1048576)throw new Error('La publication ne peut pas dépasser 100 Mio.');
      if(type==='video'){setCustomThumbnail(null);setThumbnailOrigin('');}
      setFiles(next);setCaptions(type==='photo'?[...captions,...next.slice(files.length).map(()=>'')]:[]);setFormError('');
    }catch(exception){setFormError(exception.message);}
  };
  const upload=async file=>{
    const key=[file.name,file.size,file.lastModified].join(':');
    if(uploaded.current.has(key))return uploaded.current.get(key);
    const mime=/\.vtt$/i.test(file.name)?'text/vtt':file.type||({jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',mp4:'video/mp4',webm:'video/webm',pdf:'application/pdf'}[file.name.split('.').at(-1).toLowerCase()]);
    const result=await Ho('/api/uploads?name='+encodeURIComponent(file.name),{method:'POST',headers:{'Content-Type':mime},body:file});
    uploaded.current.set(key,result.url);return result.url;
  };
  const publish=async event=>{
    event.preventDefault();if(busy)return;setFormError('');
    try{
      if(!title.trim())throw new Error(type==='video'?'Renseignez le titre de la vidéo.':type==='photo'?'Renseignez le titre de l’album photo.':'Renseignez le titre du communiqué.');
      if(!['fr','ar'].includes(language))throw new Error('Choisissez la langue de publication.');
      if(type==='photo'&&!files.length)throw new Error('Sélectionnez au moins une photographie.');
      if(type==='video'&&(videoMode==='file'?!files.length:!mxHttps(videoUrl)))throw new Error(videoMode==='file'?'Sélectionnez une vidéo.':'Renseignez une adresse vidéo HTTPS valide.');
      if(type==='video'&&thumbnailPending)throw new Error('La miniature est en cours de création. Patientez quelques instants.');
      if(type==='video'&&!thumbnail)throw new Error('Ajoutez une miniature pour présenter la vidéo dans l’accueil.');
      if(type==='video'&&!['ar','fr','mixed'].includes(spokenLanguage))throw new Error('Choisissez la langue parlée dans la vidéo.');
      if(needsFrenchSummary&&!description.trim())throw new Error('Ajoutez un bref résumé en français pour présenter cette vidéo.');
      if(type==='video'&&captionsLanguage&&(!captionsValidated||(!isYoutube&&!captionsFile)))throw new Error(isYoutube?'Confirmez que les sous-titres ont été vérifiés et publiés sur YouTube.':'Joignez le fichier de sous-titres et confirmez sa validation.');
      if(type==='press'&&pressSelection.needsPdf&&!activeFiles.length)throw new Error('Joignez le document PDF du communiqué.');
      if(type==='press'&&pressSelection.needsText&&!pressSelection.content.trim())throw new Error('Saisissez le texte du communiqué.');
      setBusy(true);setProgress('Validation de la publication…');
      const paths=[];
      const extraThumbnail=type==='video'&&thumbnail&&typeof thumbnail!=='string'?thumbnail:null;
      if(activeFiles.reduce((sum,file)=>sum+file.size,(extraThumbnail?.size||0)+(captionsSource==='file'?captionsFile?.size||0:0))>100*1048576)throw new Error('La publication, miniature comprise, ne peut pas dépasser 100 Mio.');
      for(let index=0;index<activeFiles.length;index++){setProgress('Préparation des fichiers : '+(index+1)+' / '+activeFiles.length);paths.push(await upload(activeFiles[index]));}
      let thumbnailUrl=type==='photo'?paths[files.indexOf(coverFile)]||'':typeof thumbnail==='string'?thumbnail:'';
      if(extraThumbnail){setProgress('Transfert de la miniature…');thumbnailUrl=await upload(extraThumbnail);}
      let captionsUrl='';
      if(captionsSource==='file'&&captionsFile){setProgress('Transfert des sous-titres…');captionsUrl=await upload(captionsFile);}
      requestId.current ||= mxUuid();
      const payload=mxPublicationPayload({requestId:requestId.current,type,title,date,topic,language:finalLanguage,description,credit,location,thumbnailUrl,mediaUrl:videoMode==='link'?videoUrl.trim():paths[0],fileUrl:paths[0]||'',captionsUrl,spokenLanguage,captionsLanguage,captionsSource,captionsValidated,photos:paths.map((url,index)=>({url,caption:captions[index]||''})),content:pressSelection.content});
      const result=await Ho('/api/publications',{method:'POST',headers:{'Content-Type':'application/json'},onProgress:setProgress,body:JSON.stringify(payload)});
      if(!result.published)throw new Error('La publication n’a pas été confirmée.');
      setProgress('Publication effectuée.');onToast(result.localOnly?'Le contenu est visible dans l’accueil de ce navigateur.':result.testMode?'Le contenu de test est visible dans l’accueil de ce navigateur.':'La publication est en ligne et visible dans l’accueil.');
      await onPublished(result.id,finalLanguage);
    }catch(exception){setFormError(exception.message);}finally{setBusy(false);setProgress('');}
  };
  const move=(index,destination)=>{const next=[...files],notes=[...captions];next.splice(destination,0,next.splice(index,1)[0]);notes.splice(destination,0,notes.splice(index,1)[0]);setFiles(next);setCaptions(notes);};
  const input=(label,value,onChange,props={})=>h('label',{className:'field'},label,h('input',{...props,'aria-label':label,value,onChange:event=>onChange(event.target.value)}));
  const attachmentLabel=type==='photo'?'Importer les photographies *':type==='video'?'Importer la vidéo *':'Joindre le communiqué PDF *';
  const showUpload=type==='photo'||type==='video'&&videoMode==='file'||type==='press'&&pressSelection.needsPdf;
  const textArea=(label,value,onChange,props={})=>h('label',{className:'field gh-wide'},label,h('textarea',{rows:3,maxLength:1200,...props,'aria-label':label,value,dir:language==='ar'?'rtl':'auto',onChange:event=>onChange(event.target.value)}));
  return h('div',null,
    h('div',{className:'mx-editor-heading'},h('h2',null,form.heading),h('p',null,form.instruction),h('small',null,'* Champs obligatoires')),
    h('div',{className:'mx-publication-workspace'},h('form',{className:'gh-form mx-simple-form','aria-label':form.heading,onSubmit:publish},
      h('fieldset',{disabled:busy},h('legend',null,form.information),
        h('div',{className:'gh-fields'},input(form.titleLabel,title,setTitle,{required:true,maxLength:180,placeholder:form.titlePlaceholder,dir:'auto'}),input(form.dateLabel,date,setDate,{type:'date',required:true}),
          h('label',{className:'field'},'Page de publication *',h('select',{'aria-label':'Page de publication *',value:language,required:true,onChange:event=>setLanguage(event.target.value)},h('option',{value:'',disabled:true},'Choisir la langue…'),h('option',{value:'fr'},'Français'),h('option',{value:'ar'},'العربية'))),
          h('label',{className:'field'},'Rubrique *',h('select',{'aria-label':'Rubrique *',required:true,value:topic,onChange:event=>setTopic(event.target.value)},...el.map(value=>h('option',{key:value,value},value))))),
        language&&h('p',{className:'mx-page-language-help'},language==='fr'?'Renseignez les textes de cette fiche en français.':'Renseignez les textes de cette fiche en arabe.')),
      h('fieldset',{disabled:busy,className:'mx-media-fieldset'},h('legend',null,form.media),
        type==='video'&&h('div',{className:'mx-video-mode',role:'group','aria-label':'Source de la vidéo'},h('button',{type:'button','aria-pressed':videoMode==='file',onClick:()=>setVideoMode('file')},'Importer un fichier'),h('button',{type:'button','aria-pressed':videoMode==='link',onClick:()=>setVideoMode('link')},'Utiliser un lien vidéo')),
        type==='press'&&h('div',{className:'mx-video-mode mx-press-mode',role:'group','aria-label':'Format du communiqué'},h('button',{type:'button','aria-pressed':pressMode==='pdf',onClick:()=>setPressMode('pdf')},'PDF uniquement'),h('button',{type:'button','aria-pressed':pressMode==='text',onClick:()=>setPressMode('text')},'Texte uniquement'),h('button',{type:'button','aria-pressed':pressMode==='both',onClick:()=>setPressMode('both')},'Texte et PDF')),
        type==='video'&&videoMode==='link'&&input('Lien de la vidéo *',videoUrl,setVideoUrl,{type:'url',required:true,maxLength:2000,placeholder:'https://www.youtube.com/watch?v=…'}),
        showUpload&&h('div',{className:'mx-support-upload'},h('label',{className:'gh-file-label'},h(type==='photo'?pa:type==='video'?Ta:ma,{size:22}),attachmentLabel,h('input',{type:'file','aria-label':attachmentLabel,accept:type==='photo'?'image/jpeg,image/png,image/webp':type==='video'?'video/mp4,video/webm':'application/pdf',multiple:type==='photo',onChange:event=>{addFiles(event.target.files);event.target.value='';}})),h('small',null,type==='photo'?'JPG, PNG ou WebP · 30 photos maximum · 12 Mio par photo':type==='video'?'MP4 ou WebM · 25 Mio maximum':'PDF · 20 Mio maximum')),
        activeFiles.length>0&&h('div',{className:'mx-selected-files'},type==='photo'?h(O.Fragment,null,h('p',{className:'mx-cover-help'},h(pa,{size:16}),'Choisissez la couverture de l’album. Vous pouvez légender et réordonner chaque photographie.'),h('div',{className:'mx-photo-grid'},...files.map((file,index)=>h(MxPhotoPreview,{key:file.name+'-'+file.size+'-'+file.lastModified,file,caption:captions[index]||'',index,total:files.length,cover:file===coverFile,onCover:()=>setPhotoCover(file),onCaption:value=>setCaptions(captions.map((note,position)=>position===index?value:note)),onRemove:()=>{setFiles(files.filter((_,position)=>position!==index));setCaptions(captions.filter((_,position)=>position!==index));},onMove:destination=>move(index,destination)})))):h('div',null,h('strong',null,activeFiles[0].name),h('small',null,mxSize(activeFiles[0].size)),h('button',{type:'button',className:'mx-remove',onClick:()=>setFiles([])},'Retirer'))),
        type==='video'&&h(O.Fragment,null,
          h(MxThumbnailField,{source:thumbnail,pending:thumbnailPending,custom:!!customThumbnail,fromVideo:thumbnailOrigin==='video',videoFile:videoMode==='file'?files[0]||null:null,onFrame:chooseVideoFrame,note:videoMode==='link'&&mxYoutubeThumbnail(videoUrl)?'Miniature récupérée depuis le lien YouTube.':thumbnailNote,onChange:chooseThumbnail,onReset:()=>{setCustomThumbnail(null);setThumbnailOrigin('');}}),
          h(MxVideoLanguageFields,{spokenLanguage,onSpokenLanguage:setSpokenLanguage,captionsLanguage,onCaptionsLanguage:value=>{setCaptionsLanguage(value);setCaptionsValidated(false);},captionsFile,onCaptionsFile:chooseCaptions,validated:captionsValidated,onValidated:setCaptionsValidated,onRemove:()=>{setCaptionsFile(null);setCaptionsValidated(false);},isYoutube}),
          textArea((language==='ar'?'Résumé de la vidéo en arabe':'Résumé de la vidéo en français')+(needsFrenchSummary?' *':' (facultatif)'),description,setDescription,{required:needsFrenchSummary,placeholder:language==='ar'?'ملخص موجز لمضمون الفيديو':'Présentez brièvement le sujet de la vidéo.'})),
        type==='press'&&pressSelection.needsText&&textArea('Texte intégral du communiqué *',pressText,setPressText,{rows:8,maxLength:40000,required:true,placeholder:'Saisissez ici le texte intégral du communiqué.'})),
      h('details',{className:'mx-optional-fields'},h('summary',null,form.optional,h('small',null,'Facultatif')),h('div',{className:'gh-fields'},type!=='video'&&textArea(form.descriptionLabel,description,setDescription,{disabled:busy,placeholder:type==='press'?'Quelques lignes pour présenter l’objet du communiqué.':'Décrivez brièvement le sujet de cet album.'}),type==='photo'&&input('Lieu des prises de vue',location,setLocation,{maxLength:150,disabled:busy,placeholder:'Ville ou lieu photographié',dir:'auto'}),input(form.creditLabel,credit,setCredit,{maxLength:200,disabled:busy,dir:'auto',placeholder:type==='press'?'Direction ou service à l’origine du communiqué':type==='photo'?'Nom du photographe ou mention de crédit':'Auteur, réalisation ou source de la vidéo'}))),
      formError&&h('p',{className:'gh-error',role:'alert'},formError),
      h('div',{className:'mx-publish-footer'},h('button',{className:'button secondary',type:'button',disabled:busy,onClick:()=>setPreview(true)},h(MxPreviewIcon,{size:17}),'Aperçu'),h('button',{className:'button primary mx-publish-button',type:'submit',disabled:busy||thumbnailPending},h(zl,{size:20}),busy?'Publication en cours…':'Valider et publier')),
      busy&&h('p',{className:'mx-publishing-status',role:'status','aria-live':'polite'},progress)),
    h('aside',{className:'mx-publication-guide'},h('div',{className:'eyebrow'},'VOTRE PUBLICATION'),(type==='video'||type==='photo')&&h('div',{className:'mx-guide-cover'},h(MxThumbnailImage,{source:thumbnailPreviewUrl,title}),h('small',null,type==='photo'?'Couverture de l’album':'Miniature dans l’accueil')),h('span',{className:'mx-guide-format'},h(Oo,{type,size:22}),form.label),h('h2',{dir:'auto'},title.trim()||form.emptyTitle),h('dl',null,h('div',null,h('dt',null,form.dateName),h('dd',null,date?Ya(date):'À renseigner')),h('div',null,h('dt',null,'Rubrique'),h('dd',null,topic)),h('div',null,h('dt',null,'Support'),h('dd',null,type==='video'&&videoMode==='link'?'Lien vidéo':type==='photo'?mxPlural(files.length,'photo'):type==='press'?pressMode==='pdf'?'Document PDF':pressMode==='text'?'Texte du communiqué':'Texte et PDF':files.length?'Fichier vidéo':'À sélectionner')),type==='photo'&&location&&h('div',null,h('dt',null,'Lieu des prises de vue'),h('dd',{dir:'auto'},location)),credit&&h('div',null,h('dt',null,form.creditLabel),h('dd',{dir:'auto'},credit))),h('div',{className:'mx-guide-note'},h(MxPreviewIcon,{size:17}),h('p',null,auth.testMode?'Vérifiez l’aperçu, puis validez pour retrouver votre essai dans l’accueil de ce navigateur.':'Vérifiez votre contenu dans l’aperçu. Le bouton « Valider et publier » confirme sa mise en ligne.')))),
    preview&&h(MxPublicationPreview,{type,title,date,topic,description,credit,location: type==='photo'?location:'',language:finalLanguage,thumbnail,videoLanguages:{type,spokenLanguage,captionsLanguage,captionsSource,captionsValidated,captionsUrl:captionsSource==='file'&&captionsFile?'selected':'',mediaUrl:isYoutube?videoUrl:''},captionsFile:captionsSource==='file'?captionsFile:null,photos:type==='photo'?files:[],captions,video:type==='video'&&videoMode==='file'?files[0]||null:null,videoUrl:type==='video'&&videoMode==='link'?videoUrl:'',press:type==='press'?activeFiles[0]||null:null,pressText:type==='press'?pressSelection.content:'',onClose:()=>setPreview(false)}));
}
