// Public pages contain neither passwords nor a GitHub publishing credential.
// The authentication service must authorize every upload and publication.
const MxAdministration=(()=>{
  const unavailable='L’accès administrateur n’est pas encore activé.';
  const apiBase=(()=>{
    try{const url=new URL(MX_SERVICE.authentication?.apiBase||'');return url.protocol==='https:'&&!url.username&&!url.password&&!url.search&&!url.hash?url.href.replace(/\/$/,''):'';}catch{return '';}
  })();
  let token='',identity=null,idleTimer=null,expiresAt=0,setupInfo={};
  const sharedMode=MX_SERVICE.authentication?.shared===true;
  let activationToken='';
  function receiveActivation(){
    const fragment=new URLSearchParams(window.location.hash.slice(1)),candidate=fragment.get('activation')||'';
    if(!/^[a-f0-9]{64}$/.test(candidate))return false;
    activationToken=candidate;history.replaceState(null,'',window.location.pathname+window.location.search);return true;
  }
  if(sharedMode&&typeof window!=='undefined'){
    receiveActivation();
    window.addEventListener?.('hashchange',()=>{if(receiveActivation()){clear();setupInfo={};window.dispatchEvent(new Event('management-activation-received'));}});
  }
  const pending=new Map();
  const anonymous=()=>({authenticated:false,canPublish:false,openPublishing:false,configured:!!apiBase,canSetup:setupInfo.canSetup===true,setupRequired:setupInfo.setupRequired===true,canRecover:false,username:'',sharedMode,registrationUsername:setupInfo.registrationUsername||''});
  const clear=()=>{token='';identity=null;expiresAt=0;pending.clear();clearTimeout(idleTimer);};
  const expire=()=>{clear();window.dispatchEvent(new Event('management-session-expired'));};
  const touch=()=>{if(identity?.openPublishing)return;clearTimeout(idleTimer);idleTimer=setTimeout(expire,Math.max(0,Math.min(30*60*1000,expiresAt-Date.now())));};
  const current=()=>{if(identity&&!identity.openPublishing&&expiresAt<=Date.now())clear();return identity?{...identity}:anonymous();};
  const requireAccess=()=>{if(!current().authenticated&&!current().canPublish)throw new Error('Connectez-vous à l’espace de gestion.');touch();};
  function installSession(result,username){
    const expiry=Date.parse(result.expiresAt);
    if(result.authenticated!==true||!['owner','admin'].includes(result.role)||typeof result.sessionToken!=='string'||! /^[A-Za-z0-9._~-]{32,4096}$/.test(result.sessionToken)||!Number.isFinite(expiry)||expiry<=Date.now()||expiry>Date.now()+8*60*60*1000)throw new Error('La connexion n’a pas été confirmée. Réessayez.');
    clear();token=result.sessionToken;expiresAt=expiry;
    identity={authenticated:true,configured:true,username,displayName:typeof result.displayName==='string'?result.displayName:username,role:result.role,sharedMode,canManageAccess:sharedMode&&result.role==='owner',requiresPasswordChange:result.requiresPasswordChange===true};
    touch();return current();
  }
  async function request(path,{method='GET',body,headers={},authenticated=true}={}){
    if(!apiBase)throw new Error(unavailable);
    if(authenticated)requireAccess();
    const outgoing={...headers,Accept:'application/json'};
    if(authenticated&&!identity?.openPublishing)outgoing.Authorization='Bearer '+token;
    let response;
    try{response=await fetch(apiBase+path,{method,headers:outgoing,body,credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',cache:'no-store'});}
    catch{throw new Error('La connexion est momentanément indisponible. Réessayez.');}
    const result=await response.json().catch(()=>({}));
    if(!response.ok){
      if(authenticated&&[401,403].includes(response.status))expire();
      throw new Error(response.status===401?'Identifiant ou mot de passe incorrect.':response.status===403?'Votre accès ne permet pas cette opération.':response.status===429?'Trop de tentatives. Patientez avant de réessayer.':typeof result.error==='string'?result.error.slice(0,500):'L’opération n’a pas abouti. Réessayez.');
    }
    return result;
  }
  async function login(credentials){
    clear();
    if(!apiBase)throw new Error(unavailable);
    const username=typeof credentials?.username==='string'?credentials.username.trim().toLowerCase():'';
    const password=credentials?.password;
    if(!/^[\p{L}\p{N}][\p{L}\p{M}\p{N}._@ -]{2,59}$/u.test(username)||typeof password!=='string'||!password||new TextEncoder().encode(password).length>512)throw new Error('Renseignez votre identifiant et votre mot de passe.');
    if(sharedMode&&activationToken){
      setupInfo=await request('/api/auth/options',{authenticated:false,headers:{Authorization:'Activation '+activationToken}});
      if(setupInfo.canSetup&&setupInfo.setupRequired&&!setupInfo.registrationUsername){
        let account;try{account=await mxLocalAccountStorage().account();}catch{}
        const proof=account?await mxExistingAccountProof(account,username,password):null;
        await register({username,...(proof?{legacyVerifier:proof}:{keepExistingAccess:true,password})});
      }
    }
    const result=await request('/api/auth/login',{method:'POST',authenticated:false,headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});
    return installSession(result,username);
  }
  async function register(credentials){
    if(!sharedMode||!activationToken)throw new Error('Utilisez votre lien personnel d’activation pour créer votre accès.');
    const result=await request('/api/auth/register',{method:'POST',authenticated:false,headers:{'Content-Type':'application/json',Authorization:'Activation '+activationToken},body:JSON.stringify(credentials)});
    if(result.created!==true)throw new Error('La création de votre accès n’a pas été confirmée.');
    activationToken='';setupInfo={};return result;
  }
  async function changePassword(credentials){
    requireAccess();const username=identity.username;
    const result=await request('/api/auth/change-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(credentials)});
    return installSession(result,username);
  }
  async function session(){
    if(sharedMode&&apiBase&&(!current().authenticated||identity?.openPublishing)){
      try{
        setupInfo=await request('/api/auth/options',{authenticated:false,headers:activationToken?{Authorization:'Activation '+activationToken}:{}});
        if(setupInfo.openPublishing===true){
          clear();
          mxRemoveLocalAccounts().catch(()=>{});
          identity={authenticated:false,canPublish:true,openPublishing:true,configured:true,sharedMode:true,canManageAccess:false,requiresPasswordChange:false,username:'',displayName:'Gestion des contenus'};
          return current();
        }
        if(identity?.openPublishing)clear();
      }catch(error){clear();return {...anonymous(),configured:false,error:error.message};}
    }
    if(!current().authenticated)return current();
    const result=await request('/api/auth/session');
    if(result.authenticated!==true){clear();return current();}
    identity.requiresPasswordChange=result.requiresPasswordChange===true;
    return current();
  }
  async function logout(){
    try{if(current().authenticated&&!identity?.openPublishing)await request('/api/auth/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});}finally{clear();}
    return {ok:true};
  }
  async function catalogue(base){
    if(!sharedMode)return base;
    const result=await request('/api/catalogue',{authenticated:false});
    if(!Array.isArray(result.items)||!Array.isArray(result.events))throw new Error('Les publications sont momentanément indisponibles.');
    const merge=(first,second)=>[...new Map([...second,...first].map(item=>[item.id,item])).values()];
    return {...base,items:merge(result.items,base.items||[]),events:merge(result.events,base.events||[])};
  }
  const accounts=()=>request('/api/accounts');
  const invite=username=>request('/api/accounts/invite',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username})});
  async function stage(file){
    requireAccess();
    if(!file||typeof file.arrayBuffer!=='function'||!file.size||file.size>80*1048576)throw new Error('Sélectionnez un fichier valide de 80 Mio maximum.');
    const result=await request('/api/uploads?name='+encodeURIComponent(file.name),{method:'POST',headers:{'Content-Type':file.type||'application/octet-stream'},body:file});
    if(typeof result.url!=='string'||!/^admin-upload:[a-f0-9-]{36}$/.test(result.url))throw new Error('Le transfert du fichier n’a pas été confirmé.');
    return result;
  }
  async function publish(input,onProgress=()=>{}){
    requireAccess();
    if(!input||!/^[a-f0-9-]{36}$/.test(input.requestId||''))throw new Error('Identifiant de publication non valide.');
    let publication=pending.get(input.requestId);
    if(!publication){
      onProgress('Enregistrement de la publication…');
      publication=await request('/api/publications',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
      if(typeof publication.id!=='string'||!/^[-a-zA-Z0-9_]{1,200}$/.test(publication.id))throw new Error('La publication n’a pas été confirmée.');
      pending.set(input.requestId,publication);
    }
    onProgress('Mise en ligne de la publication…');
    const deadline=Date.now()+180000;
    do{
      try{
        const url=new URL('./catalogue.json',document.baseURI);url.searchParams.set('v',String(Date.now()));
        const response=await fetch(url,{cache:'no-store',credentials:'omit'});
        if(response.ok){const published=await catalogue(await response.json());if(published.items?.some(item=>item.id===publication.id)){er=Promise.resolve({...mxLocaleCatalogue(published),isAdmin:current().authenticated||current().canPublish});return {id:publication.id,published:true};}}
      }catch{}
      await new Promise(resolve=>setTimeout(resolve,5000));
    }while(Date.now()<deadline);
    throw new Error('Le contenu est enregistré. La mise en ligne se poursuit. Cliquez à nouveau sur « Valider et publier » pour vérifier son affichage, sans créer de doublon.');
  }
  const publication=folder=>{requireAccess();return request('/api/publications/'+encodeURIComponent(folder));};
  const updatePublication=async(folder,input)=>{requireAccess();const result=await request('/api/publications/'+encodeURIComponent(folder),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});er=undefined;return result;};
  const trash=()=>{requireAccess();return request('/api/trash');};
  return {current,session,register,login,logout,changePassword,requireAccess,stage,publish,catalogue,accounts,invite,publication,updatePublication,trash};
})();
