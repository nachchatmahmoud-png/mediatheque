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
  h('label',{className:'field'},'Mot de passe initial',h('input',{type:'password',autoComplete:'current-password',required:true,maxLength:512,disabled:busy,value:currentPassword,onChange:event=>setCurrentPassword(event.target.value)})),
  h('label',{className:'field'},'Nouveau mot de passe',h('input',{type:'password',autoComplete:'new-password',required:true,minLength:15,maxLength:128,disabled:busy,value:password,onChange:event=>setPassword(event.target.value)}),h('small',null,'15 à 128 caractères. Vous pouvez utiliser une phrase de plusieurs mots.')),
  h('label',{className:'field'},'Confirmer le nouveau mot de passe',h('input',{type:'password',autoComplete:'new-password',required:true,minLength:15,maxLength:128,disabled:busy,value:confirmPassword,onChange:event=>setConfirmPassword(event.target.value)})),
  error&&h('p',{className:'gh-error',role:'alert'},error),h('button',{className:'button primary',type:'submit',disabled:busy},h(Wi,{size:17}),busy?'Enregistrement…':'Valider mon mot de passe'));
}
function MxManagementHero({auth,items,onLogout,busy,onToast}){
 const h=mxElement;
 if(auth.testMode)return h('div',{className:'mx-management-hero'},h('div',{className:'mx-management-hero-copy'},h('div',{className:'eyebrow'},h('span',null),'ESPACE DE GESTION'),h('h1',null,'Gestion des contenus'),h('p',null,'Préparez une vidéo, un album photo ou un communiqué et découvrez son affichage dans l’accueil.')),h('div',{className:'mx-session-card'},h('span',{className:'mx-session-label'},h('span',null),'MODE TEST'),h('strong',null,'Accès sans connexion'),h('small',null,'Vos essais sont conservés dans ce navigateur.')));
 return h('div',{className:'mx-management-hero'},h('div',{className:'mx-management-hero-copy'},h('div',{className:'eyebrow'},h('span',null),'ESPACE ADMINISTRATEUR'),h('h1',null,'Gestion des contenus'),h('p',null,auth.authenticated?'Préparez vos supports, vérifiez leur présentation et publiez en toute simplicité.':'Un accès personnel pour enrichir et administrer la médiathèque.')),auth.authenticated&&h('div',{className:'mx-session-card'},h('span',{className:'mx-session-label'},h('span',null),'SESSION OUVERTE'),h('strong',null,auth.displayName||auth.username),h('small',null,auth.role==='owner'?'Propriétaire · Administration des comptes':'Administrateur · Publication des contenus'),h('button',{className:'button secondary',disabled:busy,onClick:()=>onLogout().catch(exception=>onToast(exception.message))},h(Wi,{size:15}),'Se déconnecter')));
}
