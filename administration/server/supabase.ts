import {ServiceError,type Upload} from './publication.ts';
import type {Account,AdminStore,PasswordProvider} from './service.ts';
const bucket='mediatheque-staging';
const account=(row:any):Account=>({id:row.user_id,username:row.username,authEmail:row.auth_email,displayName:row.display_name,role:row.role,enabled:row.enabled,requiresPasswordChange:row.requires_password_change,version:row.version});
async function result(query:any){const response=await query;if(response.error)throw new ServiceError('Le service est momentanément indisponible. Réessayez.',503);return response;}
export class SupabaseAdminStore implements AdminStore {
  private client:any;
  constructor(client:any){this.client=client;}
  async allow(key:string,limit:number){return (await result(this.client.rpc('mediatheque_allow',{p_key:key,p_limit:limit}))).data===true;}
  async account(username:string){const {data}=await result(this.client.from('mediatheque_admins').select('*').eq('username',username).maybeSingle());return data?account(data):null;}
  async createSession(hash:string,value:Account,expiresAt:string){
    await result(this.client.from('mediatheque_sessions').delete().lt('expires_at',new Date().toISOString()));
    await result(this.client.from('mediatheque_sessions').insert({token_hash:hash,account_id:value.id,account_version:value.version,expires_at:expiresAt}));
  }
  async session(hash:string){const {data}=await result(this.client.rpc('mediatheque_session',{p_hash:hash}));return data?.[0]?account(data[0]):null;}
  async revokeSession(hash:string){await result(this.client.from('mediatheque_sessions').delete().eq('token_hash',hash));}
  async revokeAccountSessions(id:string){await result(this.client.rpc('mediatheque_revoke_account',{p_id:id}));}
  async passwordChanged(id:string){const {data}=await result(this.client.from('mediatheque_admins').update({requires_password_change:false}).eq('user_id',id).select('*').single());return account(data);}
  async countAccounts(){return (await result(this.client.from('mediatheque_admins').select('user_id',{count:'exact',head:true}).eq('enabled',true))).count||0;}
  async putUpload(upload:Upload,bytes:Uint8Array){
    const ext=upload.name.split('.').at(-1)!.toLowerCase();
    const types:Record<string,string>={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',mp4:'video/mp4',webm:'video/webm',pdf:'application/pdf',vtt:'text/vtt'};
    await result(this.client.storage.from(bucket).upload(upload.path,bytes,{contentType:types[ext],upsert:false,cacheControl:'0'}));
    try{await result(this.client.from('mediatheque_uploads').insert({id:upload.id,account_id:upload.accountId,object_path:upload.path,original_name:upload.name,size_bytes:upload.size,sha256:upload.digest,created_at:upload.createdAt}));}
    catch(error){await this.client.storage.from(bucket).remove([upload.path]);throw error;}
  }
  async upload(id:string){
    const {data}=await result(this.client.from('mediatheque_uploads').select('*').eq('id',id).maybeSingle());
    return data?{id:data.id,accountId:data.account_id,path:data.object_path,name:data.original_name,size:data.size_bytes,digest:data.sha256,createdAt:data.created_at}:null;
  }
  async download(path:string){const {data}=await result(this.client.storage.from(bucket).download(path));return new Uint8Array(await data.arrayBuffer());}
}
export class SupabasePasswords implements PasswordProvider {
  private admin:any;
  private createClient:()=>any;
  constructor(admin:any,createClient:()=>any){this.admin=admin;this.createClient=createClient;}
  async verify(email:string,password:string){
    const client=this.createClient(),{data,error}=await client.auth.signInWithPassword({email,password});
    if(error){if(error.status>=500)throw new ServiceError('Le service de connexion est momentanément indisponible.',503);return null;}
    const id=data.user?.id||null;
    // Provider tokens never leave the server. Revoke this transient provider
    // session after verification; the application issues its own revocable token.
    await client.auth.signOut({scope:'local'}).catch(()=>{});
    return id;
  }
  async change(id:string,password:string){await result(this.admin.auth.admin.updateUserById(id,{password}));}
}
