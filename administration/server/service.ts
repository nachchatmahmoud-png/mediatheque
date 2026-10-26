import {ServiceError,uuid,digest,validateUpload,preparePublication,type Upload} from './publication.ts';
import type {GitHubPublisher} from './github.ts';

export type Account={id:string;username:string;authEmail:string;displayName:string;role:'owner'|'admin';enabled:boolean;requiresPasswordChange:boolean;version:number};
export interface AdminStore {
  allow(key:string,limit:number):Promise<boolean>;
  account(username:string):Promise<Account|null>;
  createSession(hash:string,account:Account,expiresAt:string):Promise<void>;
  session(hash:string):Promise<Account|null>;
  revokeSession(hash:string):Promise<void>;
  revokeAccountSessions(id:string):Promise<void>;
  passwordChanged(id:string):Promise<Account>;
  putUpload(upload:Upload,bytes:Uint8Array):Promise<void>;
  upload(id:string):Promise<Upload|null>;
  download(path:string):Promise<Uint8Array>;
  countAccounts():Promise<number>;
}
export interface PasswordProvider {
  verify(email:string,password:string):Promise<string|null>;
  change(id:string,password:string):Promise<void>;
}
export type AdminDependencies={store:AdminStore;passwords:PasswordProvider;publisher:Pick<GitHubPublisher,'configured'|'publish'>;publicationAccess?:()=>Promise<Account>};
const origin='https://nachchatmahmoud-png.github.io';
const sessionDuration=8*60*60*1000;
const jsonHeaders={'Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const token=()=>Array.from(crypto.getRandomValues(new Uint8Array(32))).map(value=>value.toString(16).padStart(2,'0')).join('');
const hashToken=(value:string)=>digest(new TextEncoder().encode(value));
export async function readBody(request:Request,max:number){
  const announced=Number(request.headers.get('content-length'));
  if(Number.isFinite(announced)&&announced>max)throw new ServiceError('Le fichier ou la requête dépasse la taille autorisée.',413);
  const reader=request.body?.getReader();if(!reader)return new Uint8Array();
  const chunks:Uint8Array[]=[];let size=0;
  try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw new ServiceError('Le fichier ou la requête dépasse la taille autorisée.',413);}chunks.push(value);}}finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return bytes;
}
async function bodyJSON(request:Request,max=4096){
  if(request.headers.get('content-type')?.split(';')[0].trim()!=='application/json')throw new ServiceError('Format de requête non valide.',415);
  try{const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await readBody(request,max)));if(!value||typeof value!=='object'||Array.isArray(value))throw new Error();return value;}catch(error){if(error instanceof ServiceError)throw error;throw new ServiceError('Format de requête non valide.');}
}
const info=(account:Account)=>({authenticated:true,configured:true,username:account.username,displayName:account.displayName,role:account.role,requiresPasswordChange:account.requiresPasswordChange});
const passwordValue=(value:unknown):value is string=>typeof value==='string'&&value.length>0&&new TextEncoder().encode(value).length<=512;
export function validateNewPassword(value:unknown){
  if(!passwordValue(value)||[...value].length<15||[...value].length>128||!value.trim()||/^(.)\1+$/u.test(value))throw new ServiceError('Choisissez un mot de passe personnel de 15 à 128 caractères.');
  return value;
}

export function createAdminHandler({store,passwords,publisher,publicationAccess}:AdminDependencies){
  async function issue(account:Account){
    const sessionToken=token(),expiresAt=new Date(Date.now()+sessionDuration).toISOString();
    await store.createSession(await hashToken(sessionToken),account,expiresAt);
    return {...info(account),sessionToken,expiresAt};
  }
  async function authenticate(request:Request,allowInitial=false){
    // Only uploads and publication use this access; accounts and sessions keep their own checks.
    if(!allowInitial&&publicationAccess)return {account:await publicationAccess(),hash:''};
    const authorization=request.headers.get('authorization')||'';
    if(!/^Bearer [a-f0-9]{64}$/.test(authorization))throw new ServiceError('Reconnectez-vous à l’espace de gestion.',401);
    const hash=await hashToken(authorization.slice(7)),account=await store.session(hash);
    if(!account||!uuid(account.id)||!account.enabled||!['owner','admin'].includes(account.role))throw new ServiceError('Reconnectez-vous à l’espace de gestion.',401);
    if(!allowInitial&&account.requiresPasswordChange)throw new ServiceError('Choisissez d’abord votre mot de passe personnel.',403);
    return {account,hash};
  }
  return async(request:Request):Promise<Response>=>{
    const allowed=request.headers.get('origin')===origin;
    const headers={...jsonHeaders,...(allowed?{'Access-Control-Allow-Origin':origin,Vary:'Origin'}:{})};
    const answer=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers});
    try{
      if(!allowed)throw new ServiceError('Origine de requête non autorisée.',403);
      if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Max-Age':'600'}});
      const url=new URL(request.url),position=url.pathname.lastIndexOf('/api/'),path=position<0?url.pathname:url.pathname.slice(position);
      if(path==='/api/health'&&request.method==='GET'){
        const ready=publisher.configured&&await store.countAccounts()===4;
        return answer({configured:ready},ready?200:503);
      }
      if(path==='/api/auth/login'&&request.method==='POST'){
        const body=await bodyJSON(request),username=typeof body.username==='string'?body.username.trim().toLowerCase():'';
        if(!/^[\p{L}\p{N}][\p{L}\p{M}\p{N}._@ -]{2,59}$/u.test(username)||!passwordValue(body.password))throw new ServiceError('Identifiant ou mot de passe incorrect.',401);
        const ip=(request.headers.get('cf-connecting-ip')||request.headers.get('x-forwarded-for')?.split(',')[0]||'unknown').slice(0,128);
        // Per-account limits remain effective even if a caller spoofs an IP header.
        if(!await store.allow(await hashToken('login:account:'+username),20)||!await store.allow(await hashToken('login:ip:'+ip),10))throw new ServiceError('Trop de tentatives. Patientez avant de réessayer.',429);
        const account=await store.account(username);
        const verified=await passwords.verify(account?.authEmail||username+'@mediatheque.invalid',body.password);
        if(!account||!account.enabled||!['owner','admin'].includes(account.role)||verified!==account.id)throw new ServiceError('Identifiant ou mot de passe incorrect.',401);
        return answer(await issue(account));
      }
      if(path==='/api/auth/session'&&request.method==='GET'){const {account}=await authenticate(request,true);return answer(info(account));}
      if(path==='/api/auth/logout'&&request.method==='POST'){const {hash}=await authenticate(request,true);await store.revokeSession(hash);return answer({ok:true});}
      if(path==='/api/auth/change-password'&&request.method==='POST'){
        const {account}=await authenticate(request,true),body=await bodyJSON(request),password=validateNewPassword(body.password);
        if(body.password!==body.confirmPassword)throw new ServiceError('Les deux mots de passe ne correspondent pas.');
        if(!passwordValue(body.currentPassword)||await passwords.verify(account.authEmail,body.currentPassword)!==account.id)throw new ServiceError('Le mot de passe actuel est incorrect.',401);
        if(password===body.currentPassword)throw new ServiceError('Choisissez un nouveau mot de passe personnel.');
        if(!await store.allow(await hashToken('password:'+account.id),5))throw new ServiceError('Trop de tentatives. Patientez avant de réessayer.',429);
        // Revoke application sessions before changing the provider credential.
        await store.revokeAccountSessions(account.id);
        await passwords.change(account.id,password);
        return answer(await issue(await store.passwordChanged(account.id)));
      }
      if(path==='/api/uploads'&&request.method==='POST'){
        const {account}=await authenticate(request);
        if(!await store.allow(await hashToken('uploads:'+account.id),100))throw new ServiceError('Trop de transferts. Patientez avant de réessayer.',429);
        const name=url.searchParams.get('name')||'',ext=name.split('.').at(-1)!.toLowerCase();
        const limits:Record<string,number>={jpg:12,jpeg:12,png:12,webp:12,mp4:25,webm:25,pdf:20,vtt:1};
        if(!name||name.length>180||/[\/\\\x00-\x1f]/.test(name)||!limits[ext])throw new ServiceError('Nom ou format de fichier non valide.');
        const bytes=await readBody(request,limits[ext]*1024*1024);
        try{validateUpload(bytes,name);}catch(error){throw new ServiceError(error instanceof Error?error.message:'Fichier non valide.');}
        const id=crypto.randomUUID(),upload:Upload={id,accountId:account.id,path:account.id+'/'+id+'/asset.'+ext,name,size:bytes.length,digest:await digest(bytes),createdAt:new Date().toISOString()};
        await store.putUpload(upload,bytes);return answer({url:'admin-upload:'+id,name,size:bytes.length},201);
      }
      if(path==='/api/publications'&&request.method==='POST'){
        const {account}=await authenticate(request);
        if(!await store.allow(await hashToken('publications:'+account.id),30))throw new ServiceError('Trop de publications. Patientez avant de réessayer.',429);
        const prepared=await preparePublication(await bodyJSON(request,120000),account.id,id=>store.upload(id));
        return answer(await publisher.publish(prepared,path=>store.download(path)),201);
      }
      throw new ServiceError('Opération non disponible.',404);
    }catch(error){
      if(error instanceof ServiceError)return new Response(JSON.stringify({error:error.message}),{status:error.status,headers:{...headers,...(error.status===429?{'Retry-After':'900'}:{})}});
      // Never log incoming bodies, provider errors, tokens or credentials.
      return answer({error:'Le service est momentanément indisponible. Réessayez.'},503);
    }
  };
}
