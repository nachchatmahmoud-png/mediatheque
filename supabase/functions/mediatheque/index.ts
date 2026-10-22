import {createClient} from 'npm:@supabase/supabase-js@2.118.0';
import {SupabaseAdminStore,SupabasePasswords} from './generated/supabase.ts';
import {GitHubPublisher} from './generated/github.ts';
import {createAdminHandler} from './generated/service.ts';

const env=(name:string)=>Deno.env.get(name)||'';
const namedKey=(group:string)=>{try{const keys=JSON.parse(env(group)||'{}');return keys.default||Object.values(keys)[0]||'';}catch{return '';}};
const url=env('SUPABASE_URL');
const secret=String(namedKey('SUPABASE_SECRET_KEYS')||env('SUPABASE_SECRET_KEY')||env('SUPABASE_SERVICE_ROLE_KEY'));
const publicKey=String(namedKey('SUPABASE_PUBLISHABLE_KEYS')||env('SUPABASE_PUBLISHABLE_KEY')||env('SUPABASE_ANON_KEY'));
const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
if(!url||!secret||!publicKey)throw new Error('Configuration du service administrateur incomplète.');
const admin=createClient(url,secret,options);
const handler=createAdminHandler({store:new SupabaseAdminStore(admin),passwords:new SupabasePasswords(admin,()=>createClient(url,publicKey,options)),publisher:new GitHubPublisher(env('MEDIATHEQUE_GITHUB_TOKEN'))});
Deno.serve(handler);
