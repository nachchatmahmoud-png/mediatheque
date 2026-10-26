import {scryptSync,pbkdf2Sync,randomBytes,timingSafeEqual} from 'node:crypto';
import {createAdminHandler,readBody,validateNewPassword} from '../server/service.ts';
import {ServiceError,digest,validateUpload} from '../server/publication.ts';
import {publicationToCatalogue,emptyCatalogue} from '../../github-pages/catalogue.ts';

export const portalOrigin='https://nachchatmahmoud-png.github.io';
const roster=[{username:'katiri.abdelah',displayName:'Katiri Abdelah'},{username:'rbina.abdelah',displayName:'Rbina Abdelah'},{username:'ilham.boudil',displayName:'Ilham Boudil'}];
const encoder=new TextEncoder(),idle=30*60*1000;
const hash=value=>digest(encoder.encode(value));
const same=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
const passwordHash=(password,salt)=>scryptSync(password,salt,64,{N:32768,r:8,p:3,maxmem:64*1024*1024}).toString('hex');
const profile=row=>row?{id:row.id,username:row.username,authEmail:row.username+'@mediatheque.invalid',displayName:row.display_name,role:row.role,enabled:!!row.enabled,requiresPasswordChange:!!row.requires_password_change,version:row.version}:null;
const json=(value,status=200,origin='')=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',...(origin===portalOrigin?{'Access-Control-Allow-Origin':portalOrigin,Vary:'Origin'}:{})}});
async function body(request,max=4096){
 if(request.headers.get('content-type')?.split(';')[0]!=='application/json')throw new ServiceError('Format de requête non valide.',415);
 try{const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await readBody(request,max)));if(!value||typeof value!=='object'||Array.isArray(value))throw Error();return value;}catch(error){if(error instanceof ServiceError)throw error;throw new ServiceError('Format de requête non valide.');}
}
export class SharedStore {
 constructor(db,bucket){this.db=db;this.bucket=bucket;}
 async allow(key,limit){const now=Date.now(),window=15*60*1000;const row=await this.db.prepare('INSERT INTO attempts(key,count,reset_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN reset_at<=? THEN 1 ELSE count+1 END,reset_at=CASE WHEN reset_at<=? THEN excluded.reset_at ELSE reset_at END RETURNING count').bind(key,now+window,now,now).first();return row.count<=limit;}
 async account(username){return profile(await this.db.prepare('SELECT * FROM administrators WHERE username=?').bind(username).first());}
 async createSession(id,account,expiresAt){await this.db.batch([this.db.prepare('DELETE FROM sessions WHERE expires_at<=? OR last_seen<=?').bind(Date.now(),Date.now()-idle),this.db.prepare('INSERT INTO sessions(id,account_id,account_version,expires_at,last_seen) VALUES(?,?,?,?,?)').bind(id,account.id,account.version,Date.parse(expiresAt),Date.now())]);}
 async session(id){
  const now=Date.now(),row=await this.db.prepare('SELECT a.* FROM sessions s JOIN administrators a ON a.id=s.account_id WHERE s.id=? AND s.expires_at>? AND s.last_seen>? AND s.account_version=a.version AND a.enabled=1').bind(id,now,now-idle).first();
  if(!row)return null;const result=await this.db.prepare('UPDATE sessions SET last_seen=? WHERE id=? AND account_version=?').bind(now,id,row.version).run();return result.meta.changes?profile(row):null;
 }
 async revokeSession(id){await this.db.prepare('DELETE FROM sessions WHERE id=?').bind(id).run();}
 async revokeAccountSessions(id){await this.db.batch([this.db.prepare('UPDATE administrators SET version=version+1 WHERE id=?').bind(id),this.db.prepare('DELETE FROM sessions WHERE account_id=?').bind(id)]);}
 async passwordChanged(id){await this.db.prepare('UPDATE administrators SET requires_password_change=0 WHERE id=?').bind(id).run();return profile(await this.db.prepare('SELECT * FROM administrators WHERE id=?').bind(id).first());}
 async putUpload(upload,bytes){await this.bucket.put('uploads/'+upload.path,bytes,{httpMetadata:{contentType:contentType(upload.name)}});try{await this.db.prepare('INSERT INTO uploads(id,account_id,object_path,metadata) VALUES(?,?,?,?)').bind(upload.id,upload.accountId,'uploads/'+upload.path,JSON.stringify(upload)).run();}catch(error){await this.bucket.delete('uploads/'+upload.path);throw error;}}
 async upload(id){const row=await this.db.prepare('SELECT metadata FROM uploads WHERE id=?').bind(id).first();return row?JSON.parse(row.metadata):null;}
 async download(path){const object=await this.bucket.get('uploads/'+path);if(!object)throw new ServiceError('Le fichier transféré est indisponible.');return new Uint8Array(await object.arrayBuffer());}
 async countAccounts(){return (await this.db.prepare('SELECT COUNT(*) AS count FROM administrators WHERE enabled=1').first()).count;}
 async authenticate(request){const auth=request.headers.get('authorization')||'';if(!/^Bearer [a-f0-9]{64}$/.test(auth))throw new ServiceError('Reconnectez-vous à l’espace de gestion.',401);const value=await this.session(await hash(auth.slice(7)));if(!value)throw new ServiceError('Reconnectez-vous à l’espace de gestion.',401);return value;}
}
export function contentType(name){return {jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',mp4:'video/mp4',webm:'video/webm',pdf:'application/pdf',vtt:'text/vtt; charset=utf-8'}[name.split('.').at(-1).toLowerCase()]||'application/octet-stream';}
class SharedPasswords {
 constructor(store){this.store=store;}
 async verify(email,password){
  const username=email.replace(/@mediatheque\.invalid$/,''),row=await this.store.db.prepare('SELECT id,salt,password_hash FROM administrators WHERE username=?').bind(username).first();
  if(row?.password_hash.startsWith('pbkdf2:')){
   const derived=pbkdf2Sync(password,Buffer.from(row.salt,'hex'),600000,32,'sha256').toString('hex');if(!same(derived,row.password_hash.slice(7)))return null;
   const salt=randomBytes(16).toString('hex');await this.store.db.prepare('UPDATE administrators SET salt=?,password_hash=? WHERE id=? AND password_hash=?').bind(salt,passwordHash(password,salt),row.id,row.password_hash).run();return row.id;
  }
  const derived=passwordHash(password,row?.salt||'unavailable-account');return row&&same(derived,row.password_hash)?row.id:null;
 }
 async change(id,password){const salt=randomBytes(16).toString('hex');await this.store.db.prepare('UPDATE administrators SET salt=?,password_hash=? WHERE id=?').bind(salt,passwordHash(password,salt),id).run();}
}
class SharedPublisher {
 constructor(store){this.store=store;this.configured=true;}
 async publish(prepared,download){
  const {folder,id,record,assets}=prepared,existing=await this.store.db.prepare('SELECT record FROM publications WHERE folder=?').bind(folder).first(),serialized=JSON.stringify(record);
  if(existing){if(existing.record!==serialized)throw new ServiceError('Cette demande a déjà été enregistrée avec un contenu différent.',409);return {id,published:true};}
  for(const {path,upload} of assets){const bytes=await download(upload.path);if(bytes.length!==upload.size||await digest(bytes)!==upload.digest)throw new ServiceError('Une pièce jointe a été modifiée. Importez-la à nouveau.');validateUpload(bytes,path);}
  const files=Object.fromEntries(assets.map(({path,upload})=>[path,{key:'uploads/'+upload.path,name:upload.name}]));
  await this.store.db.prepare('INSERT INTO publications(folder,record,assets,created_at) VALUES(?,?,?,?) ON CONFLICT(folder) DO NOTHING').bind(folder,serialized,JSON.stringify(files),new Date().toISOString()).run();
  const saved=await this.store.db.prepare('SELECT record FROM publications WHERE folder=?').bind(folder).first();if(saved.record!==serialized)throw new ServiceError('Cette demande existe avec un contenu différent.',409);
  return {id,published:true};
 }
}
async function activation(store,env,request){
 const value=request.headers.get('authorization')||'',token=/^Activation [a-f0-9]{64}$/.test(value)?value.slice(11):'';
 if(!token)return null;
 const tokenHash=await hash(token);
 if(env.OWNER_SETUP_SECRET&&same(tokenHash,await hash(env.OWNER_SETUP_SECRET))&&await store.countAccounts()===0)return {owner:true};
 const invite=await store.db.prepare('SELECT username,display_name FROM invitations WHERE token_hash=? AND expires_at>?').bind(tokenHash,Date.now()).first();
 return invite?{...invite,tokenHash}:null;
}
async function catalogue(store,url){
 const output=emptyCatalogue(),rows=await store.db.prepare('SELECT folder,record FROM publications ORDER BY created_at DESC LIMIT 2000').all();
 const convert=value=>typeof value==='string'&&value.startsWith('./medias/')?url.origin+'/api/media/'+value.slice(9):value;
 for(const row of rows.results){const record=publicationToCatalogue(JSON.parse(row.record),row.folder);if(!record.published)continue;output.events.push(...record.events);output.items.push(...record.items.map(item=>({...item,thumbnailUrl:convert(item.thumbnailUrl),mediaUrl:convert(item.mediaUrl),fileUrl:convert(item.fileUrl),captionsUrl:convert(item.captionsUrl),photos:item.photos.map(photo=>({...photo,url:convert(photo.url)}))})));}
 return output;
}
async function media(store,request,url){
 const path=decodeURIComponent(url.pathname.slice('/api/media/'.length)),index=path.indexOf('/'),folder=path.slice(0,index),file=path.slice(index+1);
 if(index<0||!/^[a-z0-9-]{3,80}$/.test(folder))throw new ServiceError('Fichier indisponible.',404);
 const row=await store.db.prepare('SELECT assets FROM publications WHERE folder=?').bind(folder).first(),asset=row?JSON.parse(row.assets)[file]:null;
 if(!asset)throw new ServiceError('Fichier indisponible.',404);
 const object=await store.bucket.head(asset.key);if(!object)throw new ServiceError('Fichier indisponible.',404);
 const headers=new Headers({'Content-Type':contentType(asset.name),'Cache-Control':'public,max-age=3600,immutable','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Accept-Ranges':'bytes','Access-Control-Allow-Origin':portalOrigin,'ETag':object.httpEtag});
 let status=200,range;
 const requested=request.headers.get('range');
 if(requested){const match=/^bytes=(\d*)-(\d*)$/.exec(requested);if(!match||(!match[1]&&!match[2]))return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+object.size}});const start=match[1]?Number(match[1]):Math.max(0,object.size-Number(match[2])),end=match[1]&&match[2]?Math.min(Number(match[2]),object.size-1):object.size-1;if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=object.size||end<start)return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+object.size}});range={offset:start,length:end-start+1};headers.set('Content-Range','bytes '+start+'-'+end+'/'+object.size);status=206;}
 headers.set('Content-Length',String(range?range.length:object.size));if(request.method==='HEAD')return new Response(null,{status,headers});
 const data=await store.bucket.get(asset.key,range?{range}:undefined);return new Response(data.body,{status,headers});
}
export function createSharedHandler(env){
 const store=new SharedStore(env.DB,env.BUCKET),normal=createAdminHandler({store,passwords:new SharedPasswords(store),publisher:new SharedPublisher(store)});
 return async request=>{
  const url=new URL(request.url),origin=request.headers.get('origin')||'',path=url.pathname;
  try{
   if(path==='/api/health'&&request.method==='GET'){await store.countAccounts();return json({configured:true,shared:true},200,origin);}
   if(path==='/api/catalogue'&&request.method==='GET')return json(await catalogue(store,url),200,origin);
   if(path.startsWith('/api/media/')&&['GET','HEAD'].includes(request.method))return await media(store,request,url);
   if(origin!==portalOrigin)return normal(request);
   if(request.method==='OPTIONS')return normal(request);
   if(path==='/api/auth/options'&&request.method==='GET'){const allowed=await activation(store,env,request);return json({configured:true,shared:true,canSetup:!!allowed,registrationUsername:allowed?.username||'',registrationDisplayName:allowed?.display_name||''},200,origin);}
   if(path==='/api/auth/register'&&request.method==='POST'){
    const ip=(request.headers.get('cf-connecting-ip')||'unknown').slice(0,128);if(!await store.allow(await hash('setup:'+ip),10))throw new ServiceError('Trop de tentatives. Patientez avant de réessayer.',429);
    const allowed=await activation(store,env,request);if(!allowed)throw new ServiceError('Ce lien d’activation n’est plus valide. Demandez un nouveau lien au responsable de la médiathèque.',403);
    const value=await body(request),username=typeof value.username==='string'?value.username.trim().toLowerCase():'';if(!/^[a-z0-9][a-z0-9._@-]{2,59}$/.test(username))throw new ServiceError('Choisissez un identifiant de 3 à 60 caractères, sans espace ni accent.');
    if(allowed.owner&&roster.some(item=>item.username===username))throw new ServiceError('Cet identifiant est réservé à un autre administrateur.');
    if(!allowed.owner&&username!==allowed.username)throw new ServiceError('Utilisez l’identifiant indiqué dans votre invitation.');
    let salt,verifier;
    if(allowed.owner&&value.legacyVerifier){
     const legacy=value.legacyVerifier;if(legacy.iterations!==600000||typeof legacy.salt!=='string'||!/^[a-f0-9]{32}$/.test(legacy.salt)||typeof legacy.passwordHash!=='string'||!/^[a-f0-9]{64}$/.test(legacy.passwordHash))throw new ServiceError('Cet accès local ne peut pas être transféré. Choisissez un mot de passe personnel.');
     salt=legacy.salt;verifier='pbkdf2:'+legacy.passwordHash;
    }else{const password=validateNewPassword(value.password);if(password!==value.confirmPassword)throw new ServiceError('Les deux mots de passe ne correspondent pas.');salt=randomBytes(16).toString('hex');verifier=passwordHash(password,salt);}
    const id=crypto.randomUUID(),displayName=allowed.owner?'Nachchat Mahmoud':allowed.display_name,role=allowed.owner?'owner':'admin';
    const insert=allowed.owner?store.db.prepare('INSERT INTO administrators(id,username,display_name,role,salt,password_hash) SELECT ?,?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM administrators)').bind(id,username,displayName,role,salt,verifier):store.db.prepare('INSERT INTO administrators(id,username,display_name,role,salt,password_hash) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM invitations WHERE token_hash=? AND expires_at>?)').bind(id,username,displayName,role,salt,verifier,allowed.tokenHash,Date.now());
    const result=allowed.owner?await insert.run():(await store.db.batch([insert,store.db.prepare('DELETE FROM invitations WHERE token_hash=?').bind(allowed.tokenHash)]))[0];
    if(!result.meta.changes)throw new ServiceError('Ce lien a déjà été utilisé. Connectez-vous à votre compte.',409);
    return json({created:true,username,shared:true},201,origin);
   }
   if(path==='/api/accounts'&&request.method==='GET'){
    const owner=await store.authenticate(request);if(owner.role!=='owner')throw new ServiceError('Cette opération est réservée au propriétaire.',403);
    const existing=(await store.db.prepare('SELECT username,display_name,enabled FROM administrators').all()).results;
    return json({accounts:[{username:owner.username,displayName:owner.displayName,active:true,owner:true},...roster.map(person=>({...person,active:existing.some(item=>item.username===person.username&&item.enabled)}))]},200,origin);
   }
   if(path==='/api/accounts/invite'&&request.method==='POST'){
    const owner=await store.authenticate(request);if(owner.role!=='owner')throw new ServiceError('Cette opération est réservée au propriétaire.',403);
    if(!await store.allow(await hash('invite:'+owner.id),20))throw new ServiceError('Trop de demandes. Patientez avant de réessayer.',429);
    const value=await body(request),person=roster.find(item=>item.username===value.username);if(!person)throw new ServiceError('Administrateur non prévu.');
    if(await store.account(person.username))throw new ServiceError('Ce compte est déjà activé.');
    const token=randomBytes(32).toString('hex'),expiresAt=Date.now()+7*24*60*60*1000;
    await store.db.prepare('INSERT INTO invitations(username,display_name,token_hash,expires_at) VALUES(?,?,?,?) ON CONFLICT(username) DO UPDATE SET token_hash=excluded.token_hash,expires_at=excluded.expires_at').bind(person.username,person.displayName,await hash(token),expiresAt).run();
    return json({username:person.username,activationToken:token,expiresAt:new Date(expiresAt).toISOString()},201,origin);
   }
   return normal(request);
  }catch(error){return json({error:error instanceof ServiceError?error.message:'Le service est momentanément indisponible. Réessayez.'},error instanceof ServiceError?error.status:503,origin);}
 };
}
