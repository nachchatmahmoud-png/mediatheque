// GitHub is the authority for identity, repository access and publication.
// Access keys exist only inside this closure, for the current browser session.
const MxGitHub=(()=>{
  let key='',identity=null,idleTimer=null;
  const staged=new Map(),pending=new Map();
  const repository=MX_SERVICE.repository,base='/repos/'+repository;
  const anonymous=()=>({authenticated:false,configured:true,github:true,role:'admin',username:''});
  const expire=()=>{key='';identity=null;staged.clear();pending.clear();clearTimeout(idleTimer);};
  const touch=()=>{clearTimeout(idleTimer);idleTimer=setTimeout(()=>{expire();window.dispatchEvent(new Event('management-session-expired'));},30*60*1000);};
  const current=()=>identity?{...identity}:anonymous();
  const requireAccess=()=>{if(!key||!identity)throw new Error('Connectez-vous à l’espace de gestion avec votre accès GitHub.');touch();};
  async function api(path,{method='GET',body,optional=false,publicRead=false,credential}={}){
    if(path!=='/user'&&!path.startsWith(base+'/')&&path!==base)throw new Error('Adresse GitHub non autorisée.');
    const headers={Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2026-03-10'};
    const secret=credential===undefined?key:credential;
    if(secret&&!publicRead)headers.Authorization='Bearer '+secret;
    if(body!==undefined)headers['Content-Type']='application/json';
    let response;
    try{response=await fetch('https://api.github.com'+path,{method,headers,credentials:'omit',cache:'no-store',...(body===undefined?{}:{body:JSON.stringify(body)})});}
    catch{throw new Error('La connexion à GitHub a été interrompue. Réessayez sans fermer ce formulaire.');}
    if(optional&&response.status===404)return null;
    const result=await response.json().catch(()=>({}));
    if(!response.ok){
      if(response.status===401&&identity){expire();window.dispatchEvent(new Event('management-session-expired'));}
      const message=response.status===401?'Cette clé GitHub est invalide ou a expiré.':response.status===403?'GitHub a refusé cette opération. Vérifiez votre droit de publication et l’autorisation d’écriture du contenu du dépôt.':response.status===404?'Ce compte ou cette clé ne permet pas d’accéder au dépôt de la médiathèque.':response.status===422?'Le dépôt a changé pendant la publication. Réessayez.':'GitHub est momentanément indisponible. Réessayez.';
      const error=new Error(message);error.status=response.status;throw error;
    }
    return result;
  }
  async function login(value){
    const candidate=typeof value==='string'?value.trim():'';
    if(!candidate||candidate.length>300||/\s/.test(candidate))throw new Error('Renseignez votre clé d’accès GitHub.');
    const user=await api('/user',{credential:candidate});
    const repo=await api(base,{credential:candidate});
    if(!repo.permissions?.push)throw new Error('Ce compte GitHub ne dispose pas du droit de publication sur la médiathèque.');
    expire();key=candidate;
    identity={authenticated:true,configured:true,github:true,role:'admin',username:user.login,displayName:user.name||user.login,canManageAccess:repo.permissions.admin===true};
    touch();return current();
  }
  async function stage(file){
    requireAccess();if(!file||typeof file.arrayBuffer!=='function')throw new Error('Sélectionnez un fichier.');
    const ref='github-upload:'+crypto.randomUUID();staged.set(ref,{file,sha:''});return {url:ref,name:file.name,size:file.size};
  }
  const text=(value,max,required=false)=>{const result=typeof value==='string'?value.trim():'';if((required&&!result)||result.length>max)throw new Error('Un champ est vide ou dépasse la longueur autorisée.');return result;};
  function prepare(input){
    if(!input||!['photo','video','press'].includes(input.type)||!['fr','ar'].includes(input.language)||!el.includes(input.topic))throw new Error('Vérifiez le type, la langue et la rubrique de la publication.');
    if(!/^[a-f0-9-]{36}$/.test(input.requestId))throw new Error('Identifiant de publication non valide.');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(input.date)||Number.isNaN(Date.parse(input.date))||new Date(input.date).toISOString().slice(0,10)!==input.date)throw new Error('La date de publication est non valide.');
    const folder='publication-'+input.date.replaceAll('-','')+'-'+input.requestId;
    const assets=[],paths=new Map();
    const asset=(ref,kind,name)=>{
      if(paths.has(ref))return paths.get(ref);
      const entry=staged.get(ref);if(!entry)throw new Error('Un fichier joint n’est plus disponible. Sélectionnez-le à nouveau.');
      mxValidateFile(entry.file,kind);
      const ext=entry.file.name.split('.').at(-1).toLowerCase();
      const path=name+'.'+ext;paths.set(ref,path);assets.push({ref,path,kind,entry});return path;
    };
    const record={version:1,status:'published',title:text(input.title,180,true),date:input.date,topic:input.topic,language:input.language,description:text(input.description,1200),credit:text(input.credit,200),keywords:[input.topic]};
    if(input.type==='photo'){
      if(!Array.isArray(input.photos)||!input.photos.length||input.photos.length>30)throw new Error('Sélectionnez entre 1 et 30 photographies.');
      record.photos=input.photos.map((photo,index)=>({file:asset(photo.url,'photo','photos/photo-'+String(index+1).padStart(2,'0')),caption:text(photo.caption,300)}));
      record.cover=paths.get(input.thumbnailUrl)||record.photos[0].file;
    }
    if(input.type==='video'){
      const uploaded=staged.has(input.mediaUrl);
      const media=uploaded?{file:asset(input.mediaUrl,'video','videos/video')}:{url:mxHttps(input.mediaUrl)};
      if(!media.file&&!media.url)throw new Error('Ajoutez une vidéo ou un lien HTTPS valide.');
      const video={...media,title:record.title,spokenLanguage:input.spokenLanguage||'',captionsLanguage:input.captionsLanguage||'',captionsSource:input.captionsSource||'',captionsValidated:input.captionsValidated===true};
      if(!['ar','fr','mixed'].includes(video.spokenLanguage))throw new Error('Choisissez la langue parlée dans la vidéo.');
      if(record.language==='fr'&&video.spokenLanguage!=='fr'&&!record.description)throw new Error('Ajoutez un bref résumé en français.');
      if(staged.has(input.thumbnailUrl))video.cover=asset(input.thumbnailUrl,'photo','photos/miniature');
      else if(mxYoutubeThumbnail(media.url||''))video.thumbnailUrl=mxYoutubeThumbnail(media.url);
      else throw new Error('Ajoutez une miniature pour cette vidéo.');
      if(video.captionsSource){
        if(!video.captionsValidated||!['fr','ar'].includes(video.captionsLanguage))throw new Error('Confirmez la validation des sous-titres.');
        if(video.captionsSource==='file'&&!mxYoutubeThumbnail(media.url||''))video.captions=asset(input.captionsUrl,'captions','videos/sous-titres-'+video.captionsLanguage);
        else if(video.captionsSource!=='youtube'||!mxYoutubeThumbnail(media.url||''))throw new Error('Pour YouTube, ajoutez les sous-titres sur la chaîne.');
      }else if(video.captionsLanguage||video.captionsValidated)throw new Error('Vérifiez les sous-titres déclarés.');
      record.videos=[video];
    }
    if(input.type==='press'){
      const press={text:text(input.content,40000)};
      if(input.fileUrl)press.file=asset(input.fileUrl,'press','communiques/communique');
      if(!press.text&&!press.file)throw new Error('Joignez un PDF ou saisissez le texte du communiqué.');
      record.press=[press];
    }
    if(assets.reduce((sum,value)=>sum+value.entry.file.size,0)>100*1048576)throw new Error('La publication ne peut pas dépasser 100 Mio.');
    const suffix={photo:'photos',video:'video-1',press:'press-1'}[input.type];
    return {folder,record,assets,id:folder+'-'+suffix};
  }
  async function validateAsset(entry,kind){
    const file=entry.file;
    if(kind==='captions'){await mxReadCaptions(file);return;}
    const bytes=new Uint8Array(await file.slice(0,20).arrayBuffer()),head=new TextDecoder().decode(bytes);
    const ext=file.name.split('.').at(-1).toLowerCase();
    const valid=['jpg','jpeg'].includes(ext)?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:ext==='png'?bytes[0]===137&&head.slice(1,4)==='PNG'&&bytes[4]===13&&bytes[5]===10&&bytes[6]===26&&bytes[7]===10:ext==='webp'?head.startsWith('RIFF')&&head.slice(8,12)==='WEBP':ext==='pdf'?head.startsWith('%PDF-'):ext==='mp4'?head.slice(4,8)==='ftyp':bytes[0]===0x1a&&bytes[1]===0x45&&bytes[2]===0xdf&&bytes[3]===0xa3;
    if(!valid)throw new Error(file.name+' : le contenu ne correspond pas au format annoncé.');
  }
  function base64(bytes){let result='';for(let index=0;index<bytes.length;index+=16384)result+=String.fromCharCode(...bytes.subarray(index,index+16384));return btoa(result);}
  async function writePublication(prepared,onProgress){
    const {folder,assets,record,id}=prepared;
    const existing=await api(base+'/contents/publications/'+folder+'/publication.json?ref='+encodeURIComponent(MX_SERVICE.branch),{optional:true});
    if(existing)return {id,folder,commitSha:''};
    for(const {entry,kind} of assets)await validateAsset(entry,kind);
    for(let index=0;index<assets.length;index++){
      requireAccess();const {entry}=assets[index];
      if(!entry.sha){onProgress('Transfert vers GitHub : '+(index+1)+' / '+assets.length);const bytes=new Uint8Array(await entry.file.arrayBuffer());const blob=await api(base+'/git/blobs',{method:'POST',body:{content:base64(bytes),encoding:'base64'}});entry.sha=blob.sha;}
    }
    const entries=assets.map(({path,entry})=>({path:'publications/'+folder+'/'+path,mode:'100644',type:'blob',sha:entry.sha}));
    entries.push({path:'publications/'+folder+'/publication.json',mode:'100644',type:'blob',content:JSON.stringify(record,null,2)+'\n'});
    for(let attempt=0;attempt<2;attempt++){
      onProgress('Enregistrement de la publication dans GitHub…');
      const ref=await api(base+'/git/ref/heads/'+encodeURIComponent(MX_SERVICE.branch));
      const head=await api(base+'/git/commits/'+ref.object.sha);
      const tree=await api(base+'/git/trees',{method:'POST',body:{base_tree:head.tree.sha,tree:entries}});
      const commit=await api(base+'/git/commits',{method:'POST',body:{message:'Publier : '+record.title,tree:tree.sha,parents:[ref.object.sha]}});
      try{await api(base+'/git/refs/heads/'+encodeURIComponent(MX_SERVICE.branch),{method:'PATCH',body:{sha:commit.sha,force:false}});return {id,folder,commitSha:commit.sha};}
      catch(error){if(error.status!==422||attempt===1)throw error;}
    }
  }
  async function waitUntilPublished(publication,onProgress){
    onProgress('Publication enregistrée. Mise en ligne de l’accueil en cours…');
    const deadline=Date.now()+180000;let count=0;
    while(Date.now()<deadline){
      try{
        const url=new URL('./catalogue.json',document.baseURI);url.searchParams.set('publication',publication.folder);url.searchParams.set('v',String(Date.now()));
        const response=await fetch(url,{cache:'no-store',credentials:'omit'});
        if(response.ok){const catalogue=await response.json();if(catalogue.items?.some(item=>item.id===publication.id)){er=Promise.resolve({...mxLocaleCatalogue(catalogue),isAdmin:current().authenticated});return {...publication,published:true};}}
      }catch{}
      if(publication.commitSha&&count++%3===0){
        let runs=null;
        try{runs=await api(base+'/actions/runs?head_sha='+publication.commitSha+'&event=push&per_page=5',{publicRead:true});}catch{}
        if(runs?.workflow_runs?.some(run=>run.status==='completed'&&!['success','skipped'].includes(run.conclusion)))throw new Error('Le contenu est enregistré dans GitHub, mais la mise en ligne a échoué. Consultez le suivi des publications puis réessayez.');
      }
      await new Promise(resolve=>setTimeout(resolve,5000));
    }
    throw new Error('Votre contenu est enregistré dans GitHub. La mise en ligne se poursuit. Cliquez à nouveau sur « Valider et publier » pour vérifier son affichage, sans créer de doublon.');
  }
  async function publish(input,onProgress=()=>{}){
    requireAccess();let publication=pending.get(input.requestId);
    if(!publication){const prepared=prepare(input);publication=await writePublication(prepared,onProgress);pending.set(input.requestId,publication);}
    return waitUntilPublished(publication,onProgress);
  }
  return {current,login,stage,publish,logout:()=>{expire();return {ok:true};},requireAccess};
})();
