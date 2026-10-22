// Public reads stay on GitHub Pages; the service verifies administrator writes.
async function cL() {
  if(!er){
    const url=new URL('./catalogue.json',document.baseURI);url.searchParams.set('v',String(Date.now()));
    er=fetch(url,{cache:'no-store',credentials:'omit'}).then(async response=>{
      if(!response.ok)throw new Error('Le catalogue est momentanément indisponible.');
      return {...mxLocaleCatalogue(await response.json()),isAdmin:MxAdministration.current().authenticated};
    }).catch(error=>{er=undefined;throw error;});
  }
  return er;
}

async function Ho(path,options={}) {
  const method=options.method||'GET';
  if(path.startsWith('/api/search?'))return pL(await cL(),new URL(path,'https://local.invalid').searchParams.get('q')||'');
  if(path==='/api/auth/session')return MxAdministration.session();
  if(path==='/api/auth/login'&&method==='POST'){const result=await MxAdministration.login(JSON.parse(options.body||'{}'));er=undefined;return result;}
  if(path==='/api/auth/logout'&&method==='POST'){er=undefined;return MxAdministration.logout();}
  if(method==='GET'&&path.startsWith('/api/library')){
    if(new URL(path,'https://local.invalid').searchParams.has('manage')){
      MxAdministration.requireAccess();const url=new URL('./catalogue.json',document.baseURI);url.searchParams.set('v',String(Date.now()));const response=await fetch(url,{cache:'no-store',credentials:'omit'});
      if(!response.ok)throw new Error('Le catalogue est momentanément indisponible.');return {...await response.json(),isAdmin:true};
    }
    return cL();
  }
  MxAdministration.requireAccess();
  if(path.startsWith('/api/uploads?')&&method==='POST')return MxAdministration.stage(options.body);
  if(path==='/api/publications'&&method==='POST')return MxAdministration.publish(JSON.parse(options.body||'{}'),options.onProgress);
  throw new Error('Cette opération n’est pas disponible.');
}
