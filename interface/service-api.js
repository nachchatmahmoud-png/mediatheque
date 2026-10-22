// Public reads stay on GitHub Pages; the service verifies administrator writes.
async function cL() {
  if(!er){
    const url=new URL('./catalogue.json',document.baseURI);url.searchParams.set('v',String(Date.now()));
    er=fetch(url,{cache:'no-store',credentials:'omit'}).then(async response=>{
      if(!response.ok)throw new Error('Le catalogue est momentanément indisponible.');
      let catalogue=await response.json();
      if(MxTestAdministration)catalogue=await MxTestAdministration.catalogue(catalogue);
      return {...mxLocaleCatalogue(catalogue),isAdmin:mxManagementClient().current().authenticated};
    }).catch(error=>{er=undefined;throw error;});
  }
  return er;
}

async function Ho(path,options={}) {
  const method=options.method||'GET';
  const administration=mxManagementClient();
  if(path.startsWith('/api/search?'))return pL(await cL(),new URL(path,'https://local.invalid').searchParams.get('q')||'');
  if(path==='/api/auth/session')return administration.session();
  if(path==='/api/auth/login'&&method==='POST'){const result=await administration.login(JSON.parse(options.body||'{}'));er=undefined;return result;}
  if(path==='/api/auth/change-password'&&method==='POST'&&!MxTestAdministration){const result=await administration.changePassword(JSON.parse(options.body||'{}'));er=undefined;return result;}
  if(path==='/api/auth/logout'&&method==='POST'){er=undefined;return administration.logout();}
  if(path==='/api/test/reset'&&method==='POST'&&MxTestAdministration)return MxTestAdministration.reset();
  if(method==='GET'&&path.startsWith('/api/library')){
    if(new URL(path,'https://local.invalid').searchParams.has('manage')){
      administration.requireAccess();const url=new URL('./catalogue.json',document.baseURI);url.searchParams.set('v',String(Date.now()));const response=await fetch(url,{cache:'no-store',credentials:'omit'});
      if(!response.ok)throw new Error('Le catalogue est momentanément indisponible.');
      let catalogue=await response.json();if(MxTestAdministration)catalogue=await MxTestAdministration.catalogue(catalogue);
      return {...catalogue,isAdmin:true};
    }
    return cL();
  }
  administration.requireAccess();
  if(path.startsWith('/api/uploads?')&&method==='POST')return administration.stage(options.body);
  if(path==='/api/publications'&&method==='POST')return administration.publish(JSON.parse(options.body||'{}'),options.onProgress);
  throw new Error('Cette opération n’est pas disponible.');
}
