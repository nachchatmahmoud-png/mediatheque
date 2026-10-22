import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

test('Postgres enforces private records, session expiry, revocation and atomic attempt limits',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`
   create role anon;create role authenticated;create role service_role bypassrls;
   create schema auth;create schema storage;
   create table auth.users(id uuid primary key);
   create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint);
   create table storage.objects(id uuid primary key,bucket_id text,name text);
   alter table storage.objects enable row level security;
   grant usage on schema public,storage to anon,authenticated,service_role;
   grant select on storage.objects to anon,authenticated;
   create policy unrelated_permissive_policy on storage.objects for select to authenticated using(true);
  `);
  const migration=await readFile(new URL('../../supabase/migrations/202610220001_mediatheque_admin.sql',import.meta.url),'utf8');
  await db.exec(migration);await db.exec(migration);
  const id='11111111-1111-4111-8111-111111111111';
  await db.exec(`
   insert into auth.users values('${id}');
   insert into public.mediatheque_admins(user_id,username,auth_email,display_name,role)
    values('${id}','admin.test','admin.test@mediatheque.invalid','Test','admin');
   insert into storage.objects values('22222222-2222-4222-8222-222222222222','mediatheque-staging','private.png'),('33333333-3333-4333-8333-333333333333','other-bucket','other.png');
   set role authenticated;
  `);
  await assert.rejects(db.query('select * from public.mediatheque_admins'),/permission denied/);
  await assert.rejects(db.query('select * from public.mediatheque_sessions'),/permission denied/);
  await assert.rejects(db.query("select public.mediatheque_session('"+'a'.repeat(64)+"')"),/permission denied/);
  assert.deepEqual((await db.query('select bucket_id from storage.objects')).rows,[{bucket_id:'other-bucket'}]);
  await db.exec('reset role;set role service_role;');
  for(const allowed of [true,true,false])assert.equal((await db.query('select public.mediatheque_allow($1,2) as allowed',['b'.repeat(64)])).rows[0].allowed,allowed);
  await db.exec('reset role;');
  const hash='a'.repeat(64);
  await db.query("insert into public.mediatheque_sessions(token_hash,account_id,account_version,expires_at) values($1,$2,1,clock_timestamp()+interval '1 hour')",[hash,id]);
  assert.equal((await db.query('select * from public.mediatheque_session($1)',[hash])).rows.length,1);
  await db.query("update public.mediatheque_sessions set touched_at=clock_timestamp()-interval '31 minutes' where token_hash=$1",[hash]);
  assert.equal((await db.query('select * from public.mediatheque_session($1)',[hash])).rows.length,0);
  await db.query('select public.mediatheque_revoke_account($1)',[id]);
  assert.equal((await db.query('select count(*) as count from public.mediatheque_sessions')).rows[0].count,0);
  assert.equal((await db.query('select version from public.mediatheque_admins')).rows[0].version,2);
  await db.query("insert into public.mediatheque_sessions(token_hash,account_id,account_version,expires_at) values($1,$2,1,clock_timestamp()+interval '1 hour')",[hash,id]);
  assert.equal((await db.query('select * from public.mediatheque_session($1)',[hash])).rows.length,0);
  await db.query("update public.mediatheque_sessions set account_version=2 where token_hash=$1",[hash]);
  await db.exec('update public.mediatheque_admins set enabled=false;');
  assert.equal((await db.query('select * from public.mediatheque_session($1)',[hash])).rows.length,0);
 }finally{await db.close();}
});
