// Public pages contain neither passwords nor a GitHub publishing credential.
// The authentication service must authorize every upload and publication.
const MxAdministration=(()=>{
  const unavailable='L’accès administrateur n’est pas encore activé.';
  const apiBase=(()=>{
    try{const url=new URL(MX_SERVICE.authentication?.apiBase||'');return url.protocol==='https:'&&!url.username&&!url.password&&!url.search&&!url.hash?url.href.replace(/\/$/,''):'';}catch{return '';}
  })();
  let token='',identity=null,idleTimer=null,expiresAt=0;
  const pending=new Map();
  const anonymous=()=>({authenticated:false,configured:!!apiBase,canSetup:false,canRecover:false,username:''});
  const clear=()=>{token='';identity=null;expiresAt=0;pending.clear();clearTimeout(idleTimer);};
  const expire=()=>{clear();window.dispatchEvent(new Event('management-session-expired'));};
  const touch=()=>{clearTimeout(idleTimer);idleTimer=setTimeout(expire,Math.max(0,Math.min(30*60*1000,expiresAt-Date.now())));};
  const current=()=>{if(identity&&expiresAt<=Date.now())clear();return identity?{...identity}:anonymous();};
  const requireAccess=()=>{if(!current().authenticated)throw new Error('Connectez-vous à l’espace de gestion.');touch();};
  async function request(path,{method='GET',body,headers={},authenticated=true}={}){
    if(!apiBase)throw new Error(unavailable);
    if(authenticated)requireAccess();
    const outgoing={...headers,Accept:'application/json'};
    if(authenticated)outgoing.Authorization='Bearer '+token;
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
    if(!/^[a-z0-9][a-z0-9._@-]{2,59}$/.test(username)||typeof password!=='string'||!password||password.length>512)throw new Error('Renseignez votre identifiant et votre mot de passe.');
    const result=await request('/api/auth/login',{method:'POST',authenticated:false,headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});
    const expiry=Date.parse(result.expiresAt);
    if(result.authenticated!==true||!['owner','admin'].includes(result.role)||typeof result.sessionToken!=='string'||! /^[A-Za-z0-9._~-]{32,4096}$/.test(result.sessionToken)||!Number.isFinite(expiry)||expiry<=Date.now()||expiry>Date.now()+8*60*60*1000)throw new Error('La connexion n’a pas été confirmée. Réessayez.');
    token=result.sessionToken;expiresAt=expiry;
    identity={authenticated:true,configured:true,username,displayName:typeof result.displayName==='string'?result.displayName:username,role:result.role};
    touch();return current();
  }
  async function session(){
    if(!current().authenticated)return current();
    const result=await request('/api/auth/session');
    if(result.authenticated!==true){clear();return current();}
    return current();
  }
  async function logout(){
    try{if(current().authenticated)await request('/api/auth/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});}finally{clear();}
    return {ok:true};
  }
  async function stage(file){
    requireAccess();
    if(!file||typeof file.arrayBuffer!=='function'||!file.size||file.size>50*1048576)throw new Error('Sélectionnez un fichier valide de 50 Mio maximum.');
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
        if(response.ok){const catalogue=await response.json();if(catalogue.items?.some(item=>item.id===publication.id)){er=Promise.resolve({...mxLocaleCatalogue(catalogue),isAdmin:current().authenticated});return {id:publication.id,published:true};}}
      }catch{}
      await new Promise(resolve=>setTimeout(resolve,5000));
    }while(Date.now()<deadline);
    throw new Error('Le contenu est enregistré. La mise en ligne se poursuit. Cliquez à nouveau sur « Valider et publier » pour vérifier son affichage, sans créer de doublon.');
  }
  return {current,session,login,logout,requireAccess,stage,publish};
})();
