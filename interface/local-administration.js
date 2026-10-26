// This access and its publications belong to this browser only. No remote
// administrator or GitHub permission is created by this local implementation.
function mxLocalAccountStorage() {
  let connection;
  const message='Le stockage local est indisponible. Autorisez les données de ce site dans votre navigateur, puis réessayez.';
  async function open(){
    if(!connection)connection=new Promise((resolve,reject)=>{
      if(typeof indexedDB==='undefined'){reject(new Error(message));return;}
      const request=indexedDB.open('mediatheque-acces-local-v1',1);
      request.onupgradeneeded=()=>{request.result.createObjectStore('account');request.result.createObjectStore('sessions',{keyPath:'id'});};
      request.onerror=()=>reject(new Error(message));
      request.onblocked=()=>reject(new Error('Fermez les autres onglets de la médiathèque, puis réessayez.'));
      request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();connection=undefined;};resolve(db);};
    }).catch(error=>{connection=undefined;throw error;});
    return connection;
  }
  async function run(store,mode,action){
    const db=await open();
    return new Promise((resolve,reject)=>{
      const transaction=db.transaction(store,mode);let request;
      transaction.oncomplete=()=>resolve(request.result);
      transaction.onabort=()=>reject(new Error(transaction.error?.name==='ConstraintError'?'Un accès existe déjà dans ce navigateur. Utilisez « Se connecter ».':message));
      transaction.onerror=()=>{};
      request=action(transaction.objectStore(store));
    });
  }
  return {account:()=>run('account','readonly',store=>store.get('owner')),create:account=>run('account','readwrite',store=>store.add(account,'owner')),save:account=>run('account','readwrite',store=>store.put(account,'owner')),session:id=>run('sessions','readonly',store=>store.get(id)),saveSession:session=>run('sessions','readwrite',store=>store.put(session)),deleteSession:id=>run('sessions','readwrite',store=>store.delete(id))};
}

async function mxExistingAccountProof(account,username,password){
  if(!account||account.username!==username)throw new Error('Identifiant ou mot de passe incorrect.');
  if(account.iterations!==600000||!/^[a-f0-9]{32}$/.test(account.salt||'')||!/^[a-f0-9]{64}$/.test(account.passwordHash||''))throw new Error('L’accès enregistré dans ce navigateur ne peut pas encore être transféré.');
  const salt=new Uint8Array(account.salt.match(/../g).map(byte=>parseInt(byte,16)));
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
  const bytes=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:account.iterations,hash:'SHA-256'},key,256));
  const derived=Array.from(bytes,byte=>byte.toString(16).padStart(2,'0')).join('');let difference=0;
  for(let index=0;index<derived.length;index++)difference|=derived.charCodeAt(index)^account.passwordHash.charCodeAt(index);
  if(difference)throw new Error('Identifiant ou mot de passe incorrect.');
  return {salt:account.salt,passwordHash:account.passwordHash,iterations:account.iterations};
}

function createMxLocalAdministration(storage=mxLocalAccountStorage(),contentStorage=mxBrowserTestStorage('mediatheque-contenus-locaux-v1')) {
  const contents=createMxTestAdministration(contentStorage,{localMode:true});
  const key='mediatheque-session-locale-v1',idle=30*60*1000,lifetime=8*60*60*1000,iterations=600000;
  const hex=bytes=>Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,'0')).join('');
  const unhex=value=>new Uint8Array(value.match(/../g).map(byte=>parseInt(byte,16)));
  let accountExists=false,identity=null,activeSession=null,timer,accountError='';
  const available=()=>typeof crypto!=='undefined'&&!!crypto.subtle;
  const current=()=>{
    if(activeSession&&(Date.now()>=activeSession.expiresAt||Date.now()-activeSession.lastSeen>=idle))clear();
    return identity?{...identity}:{authenticated:false,configured:available()&&!accountError,localMode:true,canSetup:!accountExists&&!accountError,username:'',error:accountError};
  };
  const sessionKey=()=>{try{return sessionStorage.getItem(key)||'';}catch{return '';}};
  function clear(){identity=null;activeSession=null;clearTimeout(timer);try{sessionStorage.removeItem(key);}catch{}}
  function schedule(){clearTimeout(timer);timer=setTimeout(()=>{clear();window.dispatchEvent(new Event('management-session-expired'));},Math.max(0,Math.min(idle-(Date.now()-activeSession.lastSeen),activeSession.expiresAt-Date.now())));}
  const digest=async value=>hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
  async function derive(password,salt){
    const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
    return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:unhex(salt),iterations,hash:'SHA-256'},material,256));
  }
  const equal=(a,b)=>{if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let difference=0;for(let index=0;index<a.length;index++)difference|=a.charCodeAt(index)^b.charCodeAt(index);return difference===0;};
  function validate(credentials,creating=false){
    if(!available())throw new Error('Ce navigateur ne permet pas la connexion locale. Ouvrez le site avec une version récente de votre navigateur.');
    const username=typeof credentials?.username==='string'?credentials.username.trim().toLowerCase():'';
    const password=credentials?.password;
    if(!/^[a-z0-9][a-z0-9._@-]{2,59}$/.test(username))throw new Error('Choisissez un identifiant de 3 à 60 caractères : lettres sans accent, chiffres, point, tiret ou arobase.');
    if(typeof password!=='string'||!password||password.length>128)throw new Error('Renseignez votre mot de passe.');
    if(creating&&password.length<15)throw new Error('Choisissez un mot de passe de 15 à 128 caractères. Vous pouvez utiliser une phrase.');
    if(creating&&password!==credentials.confirmPassword)throw new Error('Les deux mots de passe ne correspondent pas.');
    return {username,password};
  }
  async function register(credentials){
    const {username,password}=validate(credentials,true);
    if(await storage.account())throw new Error('Un accès existe déjà dans ce navigateur. Utilisez « Se connecter ».');
    const salt=hex(crypto.getRandomValues(new Uint8Array(16)));
    await storage.create({username,salt,passwordHash:await derive(password,salt),iterations,failures:0,blockedUntil:0,createdAt:new Date().toISOString()});
    accountExists=true;return {created:true,username};
  }
  async function login(credentials){
    clear();const {username,password}=validate(credentials);
    const account=await storage.account();accountExists=!!account;
    if(account?.blockedUntil>Date.now())throw new Error('Trop de tentatives. Patientez une minute avant de réessayer.');
    if(!account||username!==account.username||!equal(await derive(password,account.salt),account.passwordHash)){
      if(account){account.failures=(account.failures||0)+1;if(account.failures>=5){account.blockedUntil=Date.now()+60000;account.failures=0;}await storage.save(account);}
      throw new Error('Identifiant ou mot de passe incorrect.');
    }
    account.failures=0;account.blockedUntil=0;await storage.save(account);
    const token=hex(crypto.getRandomValues(new Uint8Array(32)));
    activeSession={id:await digest(token),username,expiresAt:Date.now()+lifetime,lastSeen:Date.now()};
    await storage.saveSession(activeSession);
    try{sessionStorage.setItem(key,token);}catch{}
    identity={authenticated:true,configured:true,localMode:true,role:'admin',username,displayName:username,canManageAccess:false,requiresPasswordChange:false};
    schedule();return current();
  }
  async function session(){
    try{accountExists=!!(await storage.account());accountError='';}catch(error){clear();accountError=error.message;return current();}
    if(current().authenticated)return current();
    const token=sessionKey();
    if(!available()||!accountExists||!/^[a-f0-9]{64}$/.test(token))return current();
    const saved=await storage.session(await digest(token));
    if(!saved||Date.now()>=saved.expiresAt||Date.now()-saved.lastSeen>=idle){clear();return current();}
    activeSession=saved;identity={authenticated:true,configured:true,localMode:true,role:'admin',username:saved.username,displayName:saved.username,canManageAccess:false,requiresPasswordChange:false};
    schedule();return current();
  }
  function requireAccess(){
    if(!current().authenticated)throw new Error('Connectez-vous à l’espace de gestion.');
    activeSession.lastSeen=Date.now();storage.saveSession({...activeSession}).catch(()=>{});schedule();
  }
  async function logout(){const id=activeSession?.id;clear();if(id)await storage.deleteSession(id);return {ok:true};}
  return {current,session,register,login,logout,requireAccess,stage:async file=>{requireAccess();return contents.stage(file);},publish:async(input,onProgress)=>{requireAccess();return contents.publish(input,onProgress);},catalogue:contents.catalogue,storageError:contents.storageError};
}

const MxLocalAdministration=MX_SERVICE.management?.mode==='local'?createMxLocalAdministration():null;

async function mxRemoveLocalAccounts(){
  // Remove earlier browser credentials while retaining the separate content database.
  try{sessionStorage.removeItem('mediatheque-session-locale-v1');}catch{}
  if(typeof indexedDB==='undefined')return;
  await new Promise(resolve=>{
    let request;
    try{request=indexedDB.deleteDatabase('mediatheque-acces-local-v1');}catch{resolve();return;}
    request.onsuccess=request.onerror=request.onblocked=()=>resolve();
  });
}
