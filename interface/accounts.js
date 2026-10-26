// Passwords remain masked until the user explicitly reveals an individual field.
function MxPasswordField({id,label,hint,showLabel='Afficher le mot de passe',hideLabel='Masquer le mot de passe',...inputProps}){
 const h=mxElement;
 const [visible,setVisible]=O.useState(false);
 O.useEffect(()=>{if(!inputProps.value||inputProps.disabled)setVisible(false);},[inputProps.value,inputProps.disabled]);
 const action=visible?hideLabel:showLabel;
 return h('div',{className:'field mx-password-field'},
  h('label',{htmlFor:id},label),
  h('div',{className:'mx-password-control'},
   h('input',{...inputProps,id,type:visible?'text':'password','aria-describedby':hint?id+'-hint':undefined}),
   h('button',{className:'mx-password-toggle',type:'button',disabled:inputProps.disabled,'aria-label':action,'aria-controls':id,'aria-pressed':visible,title:action,onClick:()=>setVisible(value=>!value)},
    h('svg',{width:20,height:20,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true},h('path',{d:'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z'}),h('circle',{cx:12,cy:12,r:3}),visible&&h('path',{d:'m3 3 18 18'})))),
  hint&&h('small',{id:id+'-hint'},hint));
}

// The administration service verifies the account and publication rights.
function MxPasswordChange({onAuthenticated}){
 const h=mxElement;
 const [currentPassword,setCurrentPassword]=O.useState(''),[password,setPassword]=O.useState(''),[confirmPassword,setConfirmPassword]=O.useState(''),[busy,setBusy]=O.useState(false),[error,setError]=O.useState('');
 const submit=async event=>{
  event.preventDefault();if(busy)return;setError('');
  if(password!==confirmPassword){setError('Les deux mots de passe ne correspondent pas.');return;}
  setBusy(true);
  try{await Ho('/api/auth/change-password',{method:'POST',body:JSON.stringify({currentPassword,password,confirmPassword})});setCurrentPassword('');setPassword('');setConfirmPassword('');await onAuthenticated();}
  catch(exception){setError(exception.message);}finally{setBusy(false);}
 };
 return h('form',{className:'mx-password-card',onSubmit:submit},h('div',{className:'eyebrow'},'PREMIÈRE CONNEXION'),h('h2',null,'Choisir mon mot de passe'),h('p',null,'Remplacez votre mot de passe initial par un mot de passe personnel avant de publier.'),
  h(MxPasswordField,{id:'mx-current-password',label:'Mot de passe initial',autoComplete:'current-password',required:true,maxLength:512,disabled:busy,value:currentPassword,onChange:event=>setCurrentPassword(event.target.value)}),
  h(MxPasswordField,{id:'mx-new-password',label:'Nouveau mot de passe',autoComplete:'new-password',required:true,minLength:15,maxLength:128,disabled:busy,value:password,onChange:event=>setPassword(event.target.value),hint:'15 à 128 caractères. Vous pouvez utiliser une phrase de plusieurs mots.'}),
  h(MxPasswordField,{id:'mx-confirm-new-password',label:'Confirmer le nouveau mot de passe',showLabel:'Afficher la confirmation du mot de passe',hideLabel:'Masquer la confirmation du mot de passe',autoComplete:'new-password',required:true,minLength:15,maxLength:128,disabled:busy,value:confirmPassword,onChange:event=>setConfirmPassword(event.target.value)}),
  error&&h('p',{className:'gh-error',role:'alert'},error),h('button',{className:'button primary',type:'submit',disabled:busy},h(Wi,{size:17}),busy?'Enregistrement…':'Valider mon mot de passe'));
}
function MxManagementHero({auth,items,onLogout,busy,onToast}){
 const h=mxElement;
 if(auth.openPublishing)return h('div',{className:'mx-management-hero'},h('div',{className:'mx-management-hero-copy'},h('div',{className:'eyebrow'},h('span',null),'ESPACE DE GESTION'),h('h1',null,'Gestion des contenus'),h('p',null,'Ajoutez une vidéo, un album photo ou un communiqué, puis validez pour le publier sur l’accueil.')));
 if(auth.testMode)return h('div',{className:'mx-management-hero'},h('div',{className:'mx-management-hero-copy'},h('div',{className:'eyebrow'},h('span',null),'ESPACE DE GESTION'),h('h1',null,'Gestion des contenus'),h('p',null,'Préparez une vidéo, un album photo ou un communiqué et découvrez son affichage dans l’accueil.')),h('div',{className:'mx-session-card'},h('span',{className:'mx-session-label'},h('span',null),'MODE TEST'),h('strong',null,'Accès sans connexion'),h('small',null,'Vos essais sont conservés dans ce navigateur.')));
 return h('div',{className:'mx-management-hero'},h('div',{className:'mx-management-hero-copy'},h('div',{className:'eyebrow'},h('span',null),'ESPACE ADMINISTRATEUR'),h('h1',null,'Gestion des contenus'),h('p',null,auth.authenticated?'Préparez vos supports, vérifiez leur présentation et publiez en toute simplicité.':'Un accès personnel pour enrichir et administrer la médiathèque.')),auth.authenticated&&h('div',{className:'mx-session-card'},h('span',{className:'mx-session-label'},h('span',null),'SESSION OUVERTE'),h('strong',null,auth.displayName||auth.username),h('small',null,auth.role==='owner'?'Propriétaire · Administration des comptes':'Administrateur · Publication des contenus'),h('button',{className:'button secondary',disabled:busy,onClick:()=>onLogout().catch(exception=>onToast(exception.message))},h(Wi,{size:15}),'Se déconnecter')));
}

function MxSharedAccounts(){
 const h=mxElement;
 const [accounts,setAccounts]=O.useState([]),[busy,setBusy]=O.useState(''),[error,setError]=O.useState(''),[invitation,setInvitation]=O.useState(null);
 O.useEffect(()=>{Ho('/api/accounts').then(result=>setAccounts(result.accounts)).catch(exception=>setError(exception.message));},[]);
 const invite=async account=>{setBusy(account.username);setError('');setInvitation(null);try{const result=await Ho('/api/accounts/invite',{method:'POST',body:JSON.stringify({username:account.username})});const url=new URL(mxManagementUrl());url.hash='activation='+result.activationToken;setInvitation({name:account.displayName,url:url.href});}catch(exception){setError(exception.message);}finally{setBusy('');}};
 return h('details',{className:'mx-shared-accounts',id:'mx-shared-accounts'},h('summary',null,'Gérer les accès des administrateurs'),
  h('p',null,'Chaque administrateur choisit son mot de passe à partir de son lien personnel. Son compte fonctionne ensuite depuis ses différents navigateurs et ordinateurs.'),
  error&&h('p',{className:'gh-error',role:'alert'},error),
  h('div',{className:'mx-shared-account-list'},...accounts.map(account=>h('article',{key:account.username},h('div',null,h('strong',null,account.displayName),h('small',null,account.username)),h('span',null,account.active?'Compte actif':'À activer'),!account.active&&h('button',{className:'button secondary',type:'button',disabled:!!busy,onClick:()=>invite(account)},busy===account.username?'Préparation…':'Créer un lien d’activation')))),
  invitation&&h('div',{className:'mx-invitation-result',role:'status'},h('strong',null,'Lien personnel pour '+invitation.name),h('p',null,'Transmettez ce lien uniquement à cette personne. Il est valable 7 jours et ne peut être utilisé qu’une seule fois.'),h('label',{className:'field'},'Lien d’activation',h('input',{type:'text',readOnly:true,value:invitation.url,onFocus:event=>event.target.select()}))));
}

function MxLocalImport({auth,onRefresh}){
 const h=mxElement;
 const [items,setItems]=O.useState([]),[busy,setBusy]=O.useState(false),[error,setError]=O.useState(''),[progress,setProgress]=O.useState('');
 const storage=O.useRef(null);
 O.useEffect(()=>{storage.current=mxBrowserTestStorage('mediatheque-contenus-locaux-v1');storage.current.read().then(data=>setItems(data.items.filter(item=>!item.sharedPublication))).catch(()=>{});},[]);
 const transfer=async()=>{
  if(busy)return;setBusy(true);setError('');
  try{
   const data=await storage.current.read(),assets=new Map(data.assets.map(asset=>[asset.id,asset]));
   for(let index=0;index<items.length;index++){
    const item=items[index],paths=new Map();setProgress('Publication '+(index+1)+' / '+items.length+' : '+item.title);
    const file=async ref=>{if(!ref?.startsWith('local-content:'))return ref||'';if(paths.has(ref))return paths.get(ref);const asset=assets.get(ref);if(!asset)throw new Error('Une pièce jointe est absente : '+item.title);const result=await mxManagementClient().stage(new File([asset.blob],asset.name,{type:asset.blob.type}));paths.set(ref,result.url);return result.url;};
    const payload={...item,requestId:item.id.replace(/^local-/,''),thumbnailUrl:await file(item.thumbnailUrl),mediaUrl:await file(item.mediaUrl),fileUrl:await file(item.fileUrl),captionsUrl:await file(item.captionsUrl),photos:[]};
    for(const photo of item.photos)payload.photos.push({...photo,url:await file(photo.url)});
    const published=await mxManagementClient().publish(payload);await storage.current.save({...item,sharedPublication:published.id},[]);
    setItems(previous=>previous.filter(value=>value.id!==item.id));
   }
   await onRefresh();
  }catch(exception){setError(exception.message);}finally{setBusy(false);setProgress('');}
 };
 if(!items.length)return null;
 return h('details',{className:'mx-local-import'},h('summary',null,items.length+' contenu(s) enregistré(s) sur cet appareil'),h('p',null,'Ces contenus sont encore conservés dans ce navigateur. Vous pouvez les publier dans la médiathèque commune pour les rendre visibles depuis les autres navigateurs.'),h('ul',null,...items.map(item=>h('li',{key:item.id},item.title))),error&&h('p',{className:'gh-error',role:'alert'},error),progress&&h('p',{role:'status'},progress),h('button',{className:'button primary',type:'button',disabled:busy,onClick:transfer},busy?'Publication en cours…':'Publier ces contenus pour tous les visiteurs'));
}
