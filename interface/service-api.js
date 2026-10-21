// Sessions and mutations remain on the administration service's origin.
// Public GitHub Pages visitors only request the public catalogue.
async function cL() {
  if(!er){
    const live=MX_ON_SERVICE||MX_SERVICE.publicFeedEnabled;
    const url=live?new URL('/api/library',MX_API_ORIGIN):new URL('./catalogue.json',document.baseURI);
    if(live)url.searchParams.set('lang',MX_LOCALE);
    er=fetch(url,{cache:'no-store',credentials:MX_ON_SERVICE?'include':'omit'}).then(async response=>{if(!response.ok)throw new Error('Le catalogue est momentanément indisponible.');return mxLocaleCatalogue(await response.json());}).catch(error=>{er=undefined;throw error;});
  }
  return er;
}

async function Ho(path,options={}) {
  const method=options.method||'GET';
  if(path.startsWith('/api/search?'))return pL(await cL(),new URL(path,'https://local.invalid').searchParams.get('q')||'');
  if(method==='GET'&&path.startsWith('/api/library')&&!new URL(path,'https://local.invalid').searchParams.has('manage'))return cL();
  if(!MX_ON_SERVICE){
    if(path==='/api/auth/session')return {...$n,configured:true};
    if(method!=='GET')throw new Error('Connectez-vous dans l’espace administrateur pour publier.');
    if(path.startsWith('/api/library'))return cL();
    throw new Error('Opération non disponible depuis l’accueil public.');
  }
  const response=await fetch(new URL(path,MX_API_ORIGIN),{...options,credentials:'include',cache:'no-store'});
  const result=await response.json().catch(()=>({error:'Le service est momentanément indisponible.'}));
  if(!response.ok){
    if(response.status===403&&method!=='GET'&&!path.startsWith('/api/auth/'))window.dispatchEvent(new Event('management-session-expired'));
    throw new Error(typeof result.error==='string'?mxT(result.error):'L’opération n’a pas abouti.');
  }
  if(method!=='GET')er=undefined;
  return result;
}
