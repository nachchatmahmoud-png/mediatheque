// Operator-only setup. Supply the verified project URL and server secret on
// stdin. Capture stdout privately: it contains the one-time initial passwords.
// Never run this script in a public workflow or commit its output.
import {createClient} from '@supabase/supabase-js';
import {randomBytes} from 'node:crypto';
import {accounts} from './accounts.mjs';
let input='';for await(const chunk of process.stdin){input+=chunk;if(Buffer.byteLength(input)>16000)throw new Error('Entrée trop volumineuse.');}
const credentials=[],existing=[],pending=[];
try{
  const settings=JSON.parse(input),url=new URL(settings.url);
  if(url.protocol!=='https:'||!url.hostname.endsWith('.supabase.co')||url.username||url.password||url.search||url.hash||typeof settings.secret!=='string'||settings.secret.length<30)throw new Error('Configuration non valide.');
  const admin=createClient(url.origin,settings.secret,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const users=[];
  for(let page=1;page<=100;page++){
    const result=await admin.auth.admin.listUsers({page,perPage:1000});if(result.error)throw new Error('Lecture des comptes impossible.');
    users.push(...result.data.users);if(result.data.users.length<1000)break;
    if(page===100)throw new Error('Vérification manuelle des comptes nécessaire.');
  }
  for(const profile of accounts){
    const current=await admin.from('mediatheque_admins').select('user_id,role,display_name').eq('username',profile.username).maybeSingle();
    if(current.error)throw new Error('Appliquez d’abord la migration de la médiathèque.');
    if(current.data){existing.push(profile.username);continue;}
    const email=profile.username+'@mediatheque.invalid',password=randomBytes(24).toString('base64url');
    let user=users.find(value=>value.email===email);
    if(user){
      if(user.app_metadata?.mediatheque!==true||user.app_metadata?.username!==profile.username)throw new Error('Un identifiant existe déjà hors de cette application.');
      // Resume an interrupted setup only when no application profile exists.
      const update=await admin.auth.admin.updateUserById(user.id,{password});if(update.error)throw new Error('Reprise de la création impossible.');
    }else{
      const created=await admin.auth.admin.createUser({email,password,email_confirm:true,app_metadata:{mediatheque:true,username:profile.username}});
      if(created.error||!created.data.user)throw new Error('Création d’un compte impossible.');user=created.data.user;
    }
    const inserted=await admin.from('mediatheque_admins').insert({user_id:user.id,username:profile.username,auth_email:email,display_name:profile.displayName,role:profile.role,enabled:true,requires_password_change:true});
    if(inserted.error){pending.push(profile.username);throw new Error('Un profil reste à initialiser. Une nouvelle exécution peut reprendre la création.');}
    credentials.push({name:profile.displayName,username:profile.username,password,mustChangePassword:true});
  }
  process.stdout.write(JSON.stringify({credentials,existing,pending})+'\n');
}catch{
  process.stdout.write(JSON.stringify({credentials,existing,pending,error:'La création n’est pas complète. Conservez en privé les accès déjà générés et vérifiez la configuration avant de reprendre.'})+'\n');
  process.exitCode=1;
}
