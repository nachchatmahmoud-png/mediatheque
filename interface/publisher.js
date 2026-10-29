// The selected client handles either this browser's local access or a service.
function MxAdminLogin({auth,onAuthenticated}) {
  const h=mxElement;
  const [username,setUsername]=O.useState(auth.registrationUsername||''),[password,setPassword]=O.useState(''),[confirmPassword,setConfirmPassword]=O.useState(''),[busy,setBusy]=O.useState(false),[error,setError]=O.useState(''),[mode,setMode]=O.useState(auth.canSetup&&!auth.setupRequired?'create':'login'),[registered,setRegistered]=O.useState(false);
  const preserving=auth.sharedMode&&auth.canSetup&&auth.setupRequired&&!auth.registrationUsername&&!registered;
  const creating=mode==='create',canCreate=auth.canSetup&&!registered&&!preserving;
  const [existingLocalAccount,setExistingLocalAccount]=O.useState(null);
  O.useEffect(()=>{if(preserving)mxLocalAccountStorage().account().then(account=>{setExistingLocalAccount(account);if(account)setUsername(value=>value||account.username);}).catch(()=>{});},[preserving]);
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
    h('form',{className:'mx-login-panel',onSubmit:submit},h('h3',null,creating?'Créer mon accès':preserving?'Connexion avec mon accès existant':'Connexion administrateur'),h('p',null,creating?'Choisissez votre identifiant et votre mot de passe personnels.':'Connectez-vous avec votre identifiant et votre mot de passe habituels.'),
      auth.localMode&&h('p',{className:'mx-local-scope',role:'note'},'Accès local : votre compte et vos ajouts sont conservés dans ce navigateur uniquement. Ils ne sont pas partagés avec les autres ordinateurs ni les visiteurs du site.'),
      auth.sharedMode&&h('p',{className:'mx-local-scope',role:'note'},'Votre accès fonctionne depuis vos différents navigateurs et ordinateurs. Les contenus publiés sont visibles par tous les visiteurs de la médiathèque.'),
      auth.sharedMode&&auth.setupRequired&&!preserving&&!registered&&h('p',{className:'mx-login-activation',role:'status'},'Pour conserver votre accès actuel, ouvrez votre lien personnel de connexion, puis saisissez votre identifiant et votre mot de passe habituels.'),
      preserving&&h('p',{className:'mx-auth-success',role:'note'},'Votre identifiant et votre mot de passe sont conservés. Cliquez simplement sur « Se connecter » pour utiliser ce même accès depuis vos autres navigateurs.'),
      registered&&h('p',{className:'mx-auth-success',role:'status'},'Votre accès a été créé. Connectez-vous maintenant avec votre identifiant et votre mot de passe.'),
      !auth.configured&&h('p',{className:'mx-login-activation',role:'status'},auth.error||(auth.localMode?'Ce navigateur ne permet pas la connexion locale. Ouvrez le site avec une version récente de votre navigateur.':'Le service de connexion n’est pas encore configuré. Aucun compte administrateur n’est actuellement activé.')),
      h('label',{className:'field'},'Identifiant',h('input',{type:'text',name:'username',autoComplete:'username',autoCapitalize:'none',spellCheck:false,required:true,minLength:3,maxLength:60,readOnly:creating&&!!auth.registrationUsername||preserving&&!!existingLocalAccount,disabled:busy||!auth.configured,value:username,onChange:event=>setUsername(event.target.value)}),creating&&h('small',null,'3 à 60 caractères : lettres sans accent, chiffres, point ou tiret.')),
      h(MxPasswordField,{key:mode+'-password',id:'mx-auth-password',label:'Mot de passe',name:'password',autoComplete:creating?'new-password':'current-password',required:true,minLength:creating?15:undefined,maxLength:creating||auth.localMode?128:512,disabled:busy||!auth.configured,value:password,onChange:event=>setPassword(event.target.value),hint:creating?'15 à 128 caractères. Vous pouvez utiliser une phrase de plusieurs mots.':''}),
      creating&&h(MxPasswordField,{key:mode+'-confirm',id:'mx-auth-confirm-password',label:'Confirmer le mot de passe',showLabel:'Afficher la confirmation du mot de passe',hideLabel:'Masquer la confirmation du mot de passe',name:'confirmPassword',autoComplete:'new-password',required:true,minLength:15,maxLength:128,disabled:busy||!auth.configured,value:confirmPassword,onChange:event=>setConfirmPassword(event.target.value)}),
      error&&h('p',{className:'gh-error',role:'alert'},error),h('button',{className:'button primary mx-auth-submit',type:'submit',disabled:busy||!auth.configured},h(Wi,{size:16}),busy?(creating?'Création en cours…':'Connexion en cours…'):(creating?'Créer mon accès':'Se connecter')),
      (creating||canCreate)&&h('button',{className:'button secondary mx-auth-switch',type:'button',disabled:busy,onClick:()=>changeMode(creating?'login':'create')},creating?'J’ai déjà un accès — Se connecter':'Première visite ? Créer mon accès'),
      auth.localMode&&h('small',null,'Conservez votre mot de passe. La suppression des données du navigateur efface cet accès et les contenus locaux.'),
      auth.sharedMode&&!canCreate&&!preserving&&!registered&&h('small',null,'Votre lien personnel permet de conserver votre accès existant.'),
      h('small',null,'Accès réservé aux administrateurs habilités de la médiathèque.')));
}

function nf({auth,isAdmin,loading,error,onBack,onLogout,onRefresh,onToast,onPublished,items=[],onPreview}) {
  const h=mxElement;
  const [activeType,setActiveType]=O.useState('video');
  const [editingExisting,setEditingExisting]=O.useState(false);
  const [busy,setBusy]=O.useState(false);
  const [resetError,setResetError]=O.useState('');
  const resetTests=async()=>{if(busy)return;setBusy(true);setResetError('');try{await Ho('/api/test/reset',{method:'POST'});await onRefresh();onToast('Les contenus de test de ce navigateur ont été effacés.');}catch(exception){setResetError(exception.message);}finally{setBusy(false);}};
  return h('section',{className:'container gh-management mx-simple-management'},
    h('button',{className:'button secondary',onClick:onBack},h(Xi,{size:17}),'Retour à la médiathèque'),
    h(MxManagementHero,{auth,items,onLogout,busy,onToast}),
    auth.testMode&&h(MxTestNotice,{onReset:resetTests,busy}),
    auth.localMode&&auth.authenticated&&h('aside',{className:'mx-local-management-note',role:'note'},h('strong',null,'Gestion locale'),h('p',null,'Vos ajouts apparaissent dans l’accueil de ce navigateur après validation. Ils ne sont pas publiés pour les autres visiteurs.')),
    resetError&&h('p',{className:'gh-error',role:'alert'},resetError),
    loading?h('p',{role:'status'},'Chargement de l’espace de gestion…'):error?h('div',{className:'gh-error',role:'alert'},error,h('button',{className:'button secondary',onClick:onRefresh},'Réessayer')):(!auth.authenticated&&!auth.canPublish)||!isAdmin?h(MxAdminLogin,{key:auth.canSetup?'activation':'login',auth,onAuthenticated:onRefresh}):auth.requiresPasswordChange?h(MxPasswordChange,{onAuthenticated:onRefresh}):h(O.Fragment,null,
      h('nav',{className:'mx-workspace-nav','aria-label':'Administration'},h('span',{className:'active'},h(Ta,{size:17}),'Publications'),!auth.testMode&&!auth.localMode&&!auth.sharedMode&&h('a',{href:'https://github.com/'+MX_SERVICE.repository+'/actions',target:'_blank',rel:'noreferrer'},'Suivi de la mise en ligne',h(Oe,{size:14})),auth.canManageAccess&&h('a',{href:auth.sharedMode?'#mx-shared-accounts':'https://github.com/'+MX_SERVICE.repository+'/settings/access',...(auth.sharedMode?{}:{target:'_blank',rel:'noreferrer'})},'Gérer les accès',h(Oe,{size:14}))),
      auth.sharedMode&&h(MxLocalImport,{auth,onRefresh}),
      auth.canManageAccess&&auth.sharedMode&&h(MxSharedAccounts,{}),
      h('div',{hidden:editingExisting},h('h2',{className:'mx-content-choice-title'},'Quel contenu souhaitez-vous ajouter ?'),
      h('div',{className:'transfer-shortcuts gh-type-choices',role:'group','aria-label':'Type de contenu à ajouter'},...yL.map(({type,Icon})=>h('button',{key:type,type:'button',disabled:busy,className:'transfer-shortcut gh-type-card '+type+(activeType===type?' selected':''),'aria-label':MX_PUBLICATION_FORMS[type].label,'aria-pressed':activeType===type,'aria-controls':'mx-editor-'+type,onClick:()=>setActiveType(type)},h('span',{className:'transfer-shortcut-icon'},h(Icon,{size:26})),h('span',{className:'mx-content-choice-copy'},h('strong',null,MX_PUBLICATION_FORMS[type].label),h('small',null,MX_PUBLICATION_FORMS[type].hint)),activeType===type&&h(zl,{size:20})))),
      ...['video','photo','press'].map(type=>h('div',{key:type,id:'mx-editor-'+type,className:'mx-content-editor',hidden:activeType!==type},h(MxPublicationEditor,{type,auth,busy,setBusy,onToast,onPublished})))),
      h(MxPublishedList,{items,onOpen:onPreview,onRefresh,onEditingChange:setEditingExisting})));
}

function MxPublicationEditor({type,auth,busy,setBusy,onToast,onPublished}) {
  const h=mxElement,form=MX_PUBLICATION_FORMS[type];
  const [date,setDate]=O.useState(SL);
  const [topic,setTopic]=O.useState('');
  const [keywords,setKeywords]=O.useState([]);
  const [files,setFiles]=O.useState([]);
  const [videoMode,setVideoMode]=O.useState('file');
  const [videoUrl,setVideoUrl]=O.useState('');
  const [pressMode,setPressMode]=O.useState('pdf');
  const [pressFiles,setPressFiles]=O.useState({fr:null,ar:null});
  const [pages,setPages]=O.useState(['fr','ar']);
  const [texts,setTexts]=O.useState({fr:{title:'',description:'',credit:'',location:'',captions:[],content:''},ar:{title:'',description:'',credit:'',location:'',captions:[],content:''}});
  const [spokenLanguage,setSpokenLanguage]=O.useState(type==='video'?'ar':'');
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
  const [thumbnailChoices,setThumbnailChoices]=O.useState([]);
  const [thumbnailBusy,setThumbnailBusy]=O.useState(false);
  const [thumbnailNote,setThumbnailNote]=O.useState('');
  const requestId=O.useRef('');
  const uploaded=O.useRef(new Map());
  const finalLanguage=pages.includes('fr')?'fr':pages.includes('ar')?'ar':'';
  const primaryText=texts[finalLanguage]||{},displayTitle=primaryText.title||'',description=primaryText.description||'',credit=primaryText.credit||'',location=primaryText.location||'';
  const selectedTexts=Object.fromEntries(['fr','ar'].filter(value=>pages.includes(value)).map(value=>[value,{...texts[value],content:type==='press'&&pressMode!=='pdf'?texts[value].content:''}]));
  const updateText=(locale,field,value)=>setTexts(previous=>({...previous,[locale]:{...previous[locale],[field]:value}}));
  const changePhotoCaptions=transform=>setTexts(previous=>Object.fromEntries(Object.entries(previous).map(([locale,fields])=>[locale,{...fields,captions:transform(fields.captions)}])));
  const pressSelection=mxPressSelection(pressMode,pages.map(locale=>pressFiles[locale]).filter(Boolean),primaryText.content||'');
  const activeFiles=type==='press'?pressSelection.files:type==='video'&&videoMode==='link'?[]:files;
  const isYoutube=type==='video'&&videoMode==='link'&&!!mxYoutubeThumbnail(videoUrl);
  const captionsSource=type==='video'&&captionsLanguage?(isYoutube?'youtube':'file'):'';
  const coverFile=files.includes(photoCover)?photoCover:files[0]||null;
  const thumbnail=type==='photo'?coverFile:type==='video'?(customThumbnail||(videoMode==='file'?automaticThumbnail:mxYoutubeThumbnail(videoUrl))):null;
  const thumbnailPending=type==='video'&&videoMode==='file'&&thumbnailBusy&&!customThumbnail;
  const thumbnailPreviewUrl=mxUseObjectUrl(thumbnail);
  O.useEffect(()=>{
    setAutomaticThumbnail(null);setThumbnailChoices([]);setThumbnailNote('');
    if(type!=='video'||videoMode!=='file'||!files[0]){setThumbnailBusy(false);return;}
    const controller=new AbortController();setThumbnailBusy(true);
    mxVideoThumbnails(files[0],controller.signal).then(choices=>{if(!controller.signal.aborted){setThumbnailChoices(choices);setAutomaticThumbnail(choices[0]?.file||null);setThumbnailNote('Choisissez l’une des miniatures proposées ci-dessous.');}}).catch(exception=>{if(!controller.signal.aborted)setThumbnailNote(exception.message);}).finally(()=>{if(!controller.signal.aborted)setThumbnailBusy(false);});
    return ()=>controller.abort();
  },[type,videoMode,files[0]]);
  O.useEffect(()=>{setCaptionsValidated(false);},[type,videoMode,videoUrl,files[0]]);
  const chooseCaptions=async file=>{if(!file)return;try{await mxReadCaptions(file);setCaptionsFile(file);setCaptionsValidated(false);setFormError('');}catch(exception){setFormError(exception.message);}};
  const chooseThumbnail=file=>{if(!file)return;try{mxValidateFile(file,'photo');setCustomThumbnail(file);setThumbnailOrigin('import');setFormError('');}catch(exception){setFormError(exception.message);}};
  const chooseVideoFrame=file=>{setCustomThumbnail(file);setThumbnailOrigin('video');setFormError('');};
  const choosePressFile=(locale,list)=>{const file=Array.from(list||[])[0];if(!file)return;try{mxValidateFile(file,'press');setPressFiles(previous=>({...previous,[locale]:file}));setFormError('');}catch(exception){setFormError(exception.message);}};
  const addFiles=list=>{
    const chosen=Array.from(list||[]);if(!chosen.length)return;
    try{
      chosen.forEach(file=>mxValidateFile(file,type));
      const next=type==='photo'?[...files,...chosen.filter(file=>!files.some(other=>other.name===file.name&&other.size===file.size&&other.lastModified===file.lastModified))]:[chosen[0]];
      if(next.length>30)throw new Error('Un album peut contenir au maximum 30 photographies.');
      if(next.reduce((total,file)=>total+file.size,0)>100*1048576)throw new Error('La publication ne peut pas dépasser 100 Mio.');
      if(type==='video'){setCustomThumbnail(null);setThumbnailOrigin('');}
      setFiles(next);if(type==='photo')changePhotoCaptions(notes=>[...notes,...next.slice(files.length).map(()=>'')]);setFormError('');
    }catch(exception){setFormError(exception.message);}
  };
  const upload=async file=>{
    const key=file;
    if(uploaded.current.has(key))return uploaded.current.get(key);
    const mime=/\.vtt$/i.test(file.name)?'text/vtt':file.type||({jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',mp4:'video/mp4',webm:'video/webm',pdf:'application/pdf'}[file.name.split('.').at(-1).toLowerCase()]);
    const result=await Ho('/api/uploads?name='+encodeURIComponent(file.name),{method:'POST',headers:{'Content-Type':mime},body:file});
    uploaded.current.set(key,result.url);return result.url;
  };
  const publish=async event=>{
    event.preventDefault();if(busy)return;setFormError('');
    try{
      const editions=mxPublicationEditions(type,pages,selectedTexts);
      if(!['fr','ar'].includes(finalLanguage))throw new Error('Choisissez la langue de publication.');
      if(type==='photo'&&!files.length)throw new Error('Sélectionnez au moins une photographie.');
      if(type==='video'&&(videoMode==='file'?!files.length:!mxHttps(videoUrl)))throw new Error(videoMode==='file'?'Sélectionnez une vidéo.':'Renseignez une adresse vidéo HTTPS valide.');
      if(type==='video'&&thumbnailPending)throw new Error('La miniature est en cours de création. Patientez quelques instants.');
      if(type==='video'&&!thumbnail)throw new Error('Ajoutez une miniature pour présenter la vidéo dans l’accueil.');
      if(type==='video'&&!['ar','fr','mixed'].includes(spokenLanguage))throw new Error('Choisissez la langue parlée dans la vidéo.');
      if(type==='video'&&captionsLanguage&&(!captionsValidated||(!isYoutube&&!captionsFile)))throw new Error(isYoutube?'Confirmez que les sous-titres ont été vérifiés et publiés sur YouTube.':'Joignez le fichier de sous-titres et confirmez sa validation.');
      if(type==='press'&&pressSelection.needsPdf&&!activeFiles.length)throw new Error('Joignez au moins un PDF du communiqué. Le second est facultatif.');
      if(type==='press'&&pressSelection.needsText&&pages.some(locale=>!selectedTexts[locale].content.trim()))throw new Error('Saisissez le texte du communiqué dans chaque langue sélectionnée.');
      const documentaryKeywords=MX_DOC_RUNTIME.validateDocumentaryKeywords(topic,keywords);
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
      const publicationTexts=type==='press'?Object.fromEntries(Object.entries(selectedTexts).map(([locale,fields])=>[locale,{...fields,fileUrl:pressSelection.needsPdf?paths[activeFiles.indexOf(pressFiles[locale])]||paths[0]||'':''}])):selectedTexts;
      const payload=mxPublicationPayload({requestId:requestId.current,type,title:editions.title,date,topic,keywords:documentaryKeywords,language:finalLanguage,description:editions.description,credit:editions.credit,languages:pages,translations:publicationTexts,location,thumbnailUrl,mediaUrl:videoMode==='link'?videoUrl.trim():paths[0],fileUrl:type==='press'?publicationTexts[finalLanguage].fileUrl:paths[0]||'',captionsUrl,spokenLanguage,captionsLanguage,captionsSource,captionsValidated,photos:paths.map((url,index)=>({url,caption:primaryText.captions?.[index]||''})),content:pressSelection.content});
      const result=await Ho('/api/publications',{method:'POST',headers:{'Content-Type':'application/json'},onProgress:setProgress,body:JSON.stringify(payload)});
      if(!result.published)throw new Error('La publication n’a pas été confirmée.');
      setProgress('Publication effectuée.');onToast(result.localOnly?'Le contenu est visible dans l’accueil de ce navigateur.':result.testMode?'Le contenu de test est visible dans l’accueil de ce navigateur.':pages.length===2?'La publication est en ligne dans les pages française et arabe.':'La publication est en ligne et visible dans l’accueil.');
      await onPublished(result.id,finalLanguage);
    }catch(exception){setFormError(exception.message);}finally{setBusy(false);setProgress('');}
  };
  const move=(index,destination)=>{const next=[...files];next.splice(destination,0,next.splice(index,1)[0]);setFiles(next);changePhotoCaptions(notes=>{const reordered=[...notes];reordered.splice(destination,0,reordered.splice(index,1)[0]);return reordered;});};
  const input=(label,value,onChange,props={})=>h('label',{className:'field'},label,h('input',{...props,'aria-label':label,value,onChange:event=>onChange(event.target.value)}));
  const attachmentLabel=type==='photo'?'Importer les photographies *':type==='video'?'Importer la vidéo *':'Joindre le communiqué PDF *';
  const showUpload=type==='photo'||type==='video'&&videoMode==='file';
  const textArea=(label,value,onChange,props={})=>h('label',{className:'field gh-wide'},label,h('textarea',{rows:3,maxLength:1200,...props,'aria-label':label,value,onChange:event=>onChange(event.target.value)}));
  return h('div',null,
    h('div',{className:'mx-editor-heading'},h('h2',null,form.heading),h('p',null,form.instruction),h('small',null,'* Champs obligatoires')),
    h('div',{className:'mx-publication-workspace'},h('form',{className:'gh-form mx-simple-form','aria-label':form.heading,onSubmit:publish},
      h('fieldset',{disabled:busy},h('legend',null,form.information),
        h('div',{className:'mx-video-pages'},h('strong',null,type==='video'?'Afficher la vidéo dans *':type==='photo'?'Afficher l’album photo dans *':'Afficher le communiqué dans *'),
          h('div',{className:'mx-video-page-choices',role:'group','aria-label':type==='video'?'Pages de publication de la vidéo':type==='photo'?'Pages de publication de l’album photo':'Pages de publication du communiqué'},...['fr','ar'].map(locale=>h('label',{key:locale,className:'mx-video-page-choice '+(pages.includes(locale)?'selected':'')},h('input',{type:'checkbox',name:type+'-pages',value:locale,checked:pages.includes(locale),onChange:event=>setPages(previous=>event.target.checked?[...previous,locale]:previous.filter(value=>value!==locale))}),h('span',{lang:locale},locale==='fr'?'Français':'العربية')))),
          h('small',null,type==='video'?'Une vidéo, une miniature et une seule validation pour toutes les pages cochées.':type==='photo'?'Un album, une couverture et une seule validation pour toutes les pages cochées.':'Titres dans les deux langues, un seul PDF suffit. Le second PDF est facultatif.')),
        h('div',{className:'gh-fields'},input(form.dateLabel,date,setDate,{type:'date',required:true}),

          h('label',{className:'field'},'Domaine principal *',h('select',{'aria-label':'Domaine principal *',required:true,value:topic,onChange:event=>{setTopic(event.target.value);setKeywords([]);}},h('option',{value:'',disabled:true},'Choisir le domaine…'),...el.map(value=>h('option',{key:value,value},value))))),
        h('p',{className:'mx-documentary-guidance'},'Choisissez la rubrique principale, puis précisez le sujet traité avec les mots-clés. Les interventions et réponses parlementaires disposent de leur propre rubrique.'),
        h(MxDocumentaryFields,{topic,value:keywords,onChange:setKeywords}),

        h('div',{className:'mx-video-editions'},...['ar','fr'].filter(locale=>pages.includes(locale)).map(locale=>h('section',{key:locale,className:'mx-video-edition','aria-label':locale==='fr'?'Version française':'Version arabe'},
          h('h3',null,locale==='fr'?'Version française':'Version arabe'),h('p',null,locale==='fr'?'Renseignez la traduction française du titre. Seuls ces textes apparaîtront sur la page française.':'Renseignez le titre en arabe. Il apparaîtra sur la page arabe.'),
          input(locale==='fr'?'Titre en français *':'Titre en arabe *',texts[locale].title,value=>updateText(locale,'title',value),{required:true,maxLength:180,dir:locale==='ar'?'rtl':'ltr',lang:locale,placeholder:type==='video'?(locale==='ar'?'عنوان الفيديو بالعربية':'Traduction française du titre de la vidéo'):type==='photo'?(locale==='ar'?'عنوان الألبوم بالعربية':'Titre de l’album en français'):(locale==='ar'?'عنوان البلاغ بالعربية':'Titre du communiqué en français')}),
          textArea(type==='video'?(locale==='fr'?'Résumé en français (facultatif)':'Résumé en arabe (facultatif)'):type==='photo'?(locale==='fr'?'Présentation de l’album en français (facultatif)':'Présentation de l’album en arabe (facultatif)'):(locale==='fr'?'Bref résumé du communiqué en français (facultatif)':'Bref résumé du communiqué en arabe (facultatif)'),texts[locale].description,value=>updateText(locale,'description',value),{rows:2,dir:locale==='ar'?'rtl':'ltr',lang:locale}))))),
      h('fieldset',{disabled:busy,className:'mx-media-fieldset'},h('legend',null,form.media),
        type==='video'&&h('div',{className:'mx-video-mode',role:'group','aria-label':'Source de la vidéo'},h('button',{type:'button','aria-pressed':videoMode==='file',onClick:()=>setVideoMode('file')},'Importer un fichier'),h('button',{type:'button','aria-pressed':videoMode==='link',onClick:()=>setVideoMode('link')},'Utiliser un lien vidéo')),
        type==='press'&&h('div',{className:'mx-video-mode mx-press-mode',role:'group','aria-label':'Format du communiqué'},h('button',{type:'button','aria-pressed':pressMode==='pdf',onClick:()=>setPressMode('pdf')},'PDF uniquement'),h('button',{type:'button','aria-pressed':pressMode==='text',onClick:()=>setPressMode('text')},'Texte uniquement'),h('button',{type:'button','aria-pressed':pressMode==='both',onClick:()=>setPressMode('both')},'Texte et PDF')),
        type==='press'&&pressSelection.needsPdf&&h('div',{className:'mx-video-editions'},...['fr','ar'].filter(locale=>pages.includes(locale)).map(locale=>h('section',{key:locale,className:'mx-video-edition','aria-label':locale==='fr'?'PDF en français':'PDF en arabe'},
          h('label',{className:'gh-file-label'},h(ma,{size:22}),locale==='fr'?'Transférer le PDF en français':'Transférer le PDF en arabe',h('input',{type:'file','aria-label':locale==='fr'?'Transférer le PDF en français':'Transférer le PDF en arabe',accept:'application/pdf',onChange:event=>{choosePressFile(locale,event.target.files);event.target.value='';}})),
          h('small',null,'PDF · 20 Mio maximum'),pressFiles[locale]&&h('div',{className:'mx-selected-files'},h('strong',null,pressFiles[locale].name),h('small',null,mxSize(pressFiles[locale].size)),h('button',{type:'button',className:'mx-remove',onClick:()=>setPressFiles(previous=>({...previous,[locale]:null}))},locale==='fr'?'Retirer le PDF en français':'Retirer le PDF en arabe'))))),
        type==='video'&&videoMode==='link'&&input('Lien de la vidéo *',videoUrl,setVideoUrl,{type:'url',required:true,maxLength:2000,placeholder:'https://www.youtube.com/watch?v=…'}),
        showUpload&&h('div',{className:'mx-support-upload'},h('label',{className:'gh-file-label'},h(type==='photo'?pa:type==='video'?Ta:ma,{size:22}),attachmentLabel,h('input',{type:'file','aria-label':attachmentLabel,accept:type==='photo'?'image/jpeg,image/png,image/webp':type==='video'?'video/mp4,video/webm':'application/pdf',multiple:type==='photo',onChange:event=>{addFiles(event.target.files);event.target.value='';}})),h('small',null,type==='photo'?'JPG, PNG ou WebP · 30 photos maximum · 12 Mio par photo':type==='video'?'MP4 ou WebM · 50 Mo maximum':'PDF · 20 Mio maximum')),
        type!=='press'&&activeFiles.length>0&&h('div',{className:'mx-selected-files'},type==='photo'?h(O.Fragment,null,
          h('p',{className:'mx-cover-help'},h(pa,{size:16}),'Choisissez la couverture commune de l’album et renseignez les légendes dans chaque langue sélectionnée.'),
          h('div',{className:'mx-photo-grid'},...files.map((file,index)=>h(MxPhotoPreview,{key:file.name+'-'+file.size+'-'+file.lastModified,file,editions:selectedTexts,index,total:files.length,cover:file===coverFile,onCover:()=>setPhotoCover(file),onCaption:(locale,value)=>updateText(locale,'captions',texts[locale].captions.map((note,position)=>position===index?value:note)),onRemove:()=>{setFiles(files.filter((_,position)=>position!==index));changePhotoCaptions(notes=>notes.filter((_,position)=>position!==index));},onMove:destination=>move(index,destination)})))):h('div',null,h('strong',null,activeFiles[0].name),h('small',null,mxSize(activeFiles[0].size)),h('button',{type:'button',className:'mx-remove',onClick:()=>{setFiles([]);if(type==='video'){setCustomThumbnail(null);setAutomaticThumbnail(null);setThumbnailChoices([]);setThumbnailOrigin('');}}},'Retirer'))),
        type==='video'&&h(O.Fragment,null,
          h(MxThumbnailField,{source:thumbnail,pending:thumbnailPending,generating:videoMode==='file'&&thumbnailBusy,choices:videoMode==='file'?thumbnailChoices:[],onSelect:choice=>{setAutomaticThumbnail(choice.file);setCustomThumbnail(null);setThumbnailOrigin('video');setFormError('');},custom:!!customThumbnail,fromVideo:thumbnailOrigin==='video',videoFile:videoMode==='file'?files[0]||null:null,onFrame:chooseVideoFrame,note:videoMode==='link'&&mxYoutubeThumbnail(videoUrl)?'Miniature récupérée depuis le lien YouTube.':thumbnailNote,onChange:chooseThumbnail,onReset:()=>{setCustomThumbnail(null);setThumbnailOrigin('');}}),
          h(MxVideoLanguageFields,{spokenLanguage,onSpokenLanguage:setSpokenLanguage,captionsLanguage,onCaptionsLanguage:value=>{setCaptionsLanguage(value);setCaptionsValidated(false);},captionsFile,onCaptionsFile:chooseCaptions,validated:captionsValidated,onValidated:setCaptionsValidated,onRemove:()=>{setCaptionsFile(null);setCaptionsValidated(false);},isYoutube}),
          h('p',{className:'mx-page-language-help'},'La langue parlée et l’audio restent ceux de la vidéo d’origine. Les titres et résumés sont propres à chaque page.')),
        type==='press'&&pressSelection.needsText&&h('div',{className:'mx-video-editions'},...['ar','fr'].filter(locale=>pages.includes(locale)).map(locale=>textArea(locale==='fr'?'Texte intégral du communiqué en français *':'Texte intégral du communiqué en arabe *',texts[locale].content,value=>updateText(locale,'content',value),{key:locale,rows:8,maxLength:40000,required:true,lang:locale,dir:locale==='ar'?'rtl':'ltr'}))),
        type==='press'&&pressSelection.needsPdf&&h('p',{className:'mx-page-language-help'},'Un seul PDF suffit : il sera accessible dans les deux pages. Avec deux PDF, chaque page affichera le document de sa langue.')),
      h('details',{className:'mx-optional-fields'},h('summary',null,form.optional,h('small',null,'Facultatif')),h('div',{className:'gh-fields'},...['fr','ar'].filter(locale=>pages.includes(locale)).map(locale=>h(O.Fragment,{key:locale},
        type==='photo'&&input(locale==='fr'?'Lieu des prises de vue en français':'Lieu des prises de vue en arabe',texts[locale].location,value=>updateText(locale,'location',value),{maxLength:150,disabled:busy,dir:locale==='ar'?'rtl':'ltr',lang:locale}),
        input(type==='video'?(locale==='fr'?'Crédits de la vidéo en français':'Crédits de la vidéo en arabe'):type==='photo'?(locale==='fr'?'Photographe / crédit photo en français':'Photographe / crédit photo en arabe'):(locale==='fr'?'Service émetteur en français':'Service émetteur en arabe'),texts[locale].credit,value=>updateText(locale,'credit',value),{maxLength:200,disabled:busy,dir:locale==='ar'?'rtl':'ltr',lang:locale}))))),
      formError&&h('p',{className:'gh-error',role:'alert'},formError),
      h('div',{className:'mx-publish-footer'},h('button',{className:'button secondary',type:'button',disabled:busy,onClick:()=>setPreview(true)},h(MxPreviewIcon,{size:17}),'Aperçu'),h('button',{className:'button primary mx-publish-button',type:'submit',disabled:busy||thumbnailPending},h(zl,{size:20}),busy?'Publication en cours…':'Valider et publier')),
      busy&&h('p',{className:'mx-publishing-status',role:'status','aria-live':'polite'},progress)),
    h('aside',{className:'mx-publication-guide'},h('div',{className:'eyebrow'},'VOTRE PUBLICATION'),(type==='video'||type==='photo')&&h('div',{className:'mx-guide-cover'},h(MxThumbnailImage,{source:thumbnailPreviewUrl,title:displayTitle}),h('small',null,type==='photo'?'Couverture de l’album':'Miniature dans l’accueil')),h('span',{className:'mx-guide-format'},h(Oo,{type,size:22}),form.label),h('h2',{dir:'auto'},displayTitle.trim()||form.emptyTitle),h('div',{className:'mx-guide-editions'},...Object.entries(selectedTexts).map(([locale,fields])=>h('p',{key:locale},h('small',null,locale==='fr'?'Français':'العربية'),h('span',{lang:locale,dir:locale==='ar'?'rtl':'ltr'},fields.title||'Titre à renseigner')))),h('dl',null,h('div',null,h('dt',null,form.dateName),h('dd',null,date?Ya(date):'À renseigner')),h('div',null,h('dt',null,'Domaine principal'),h('dd',null,topic||'À renseigner')),h('div',null,h('dt',null,'Mots-clés'),h('dd',null,keywords.length?keywords.join(' · '):'À renseigner')),h('div',null,h('dt',null,'Support'),h('dd',null,type==='video'&&videoMode==='link'?'Lien vidéo':type==='photo'?mxPlural(files.length,'photo'):type==='press'?pressMode==='pdf'?'Document PDF':pressMode==='text'?'Texte du communiqué':'Texte et PDF':files.length?'Fichier vidéo':'À sélectionner')),type==='photo'&&location&&h('div',null,h('dt',null,'Lieu des prises de vue'),h('dd',{dir:'auto'},location)),credit&&h('div',null,h('dt',null,form.creditLabel),h('dd',{dir:'auto'},credit))),h('div',{className:'mx-guide-note'},h(MxPreviewIcon,{size:17}),h('p',null,auth.testMode?'Vérifiez l’aperçu, puis validez pour retrouver votre essai dans l’accueil de ce navigateur.':'Vérifiez votre contenu dans l’aperçu. Le bouton « Valider et publier » confirme sa mise en ligne.')))),
    preview&&h(MxPublicationPreview,{type,title:displayTitle,date,topic,keywords,description,credit,editions:selectedTexts,location: type==='photo'?location:'',language:finalLanguage,thumbnail,videoLanguages:{type,spokenLanguage,captionsLanguage,captionsSource,captionsValidated,captionsUrl:captionsSource==='file'&&captionsFile?'selected':'',mediaUrl:isYoutube?videoUrl:''},captionsFile:captionsSource==='file'?captionsFile:null,photos:type==='photo'?files:[],captions:primaryText.captions||[],video:type==='video'&&videoMode==='file'?files[0]||null:null,videoUrl:type==='video'&&videoMode==='link'?videoUrl:'',pressFiles:type==='press'&&pressSelection.needsPdf?pressFiles:{},pressText:type==='press'?pressSelection.content:'',onClose:()=>setPreview(false)}));
}
