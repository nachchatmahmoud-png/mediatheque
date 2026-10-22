// Explicit demonstration client. Files and publications never leave this browser.
function mxBrowserTestStorage() {
  let connection;
  const unavailable='Le stockage de ce navigateur est indisponible. Autorisez les données du site pour conserver vos essais.';
  const failure=error=>new Error(error?.name==='QuotaExceededError'?'Le stockage de ce navigateur est plein. Effacez les contenus de test ou choisissez des fichiers plus petits.':unavailable);
  async function open() {
    if(!connection)connection=new Promise((resolve,reject)=>{
      if(typeof indexedDB==='undefined'){reject(new Error(unavailable));return;}
      const request=indexedDB.open('mediatheque-gestion-test-v1',1);
      request.onupgradeneeded=()=>{const db=request.result;db.createObjectStore('publications',{keyPath:'id'});db.createObjectStore('assets',{keyPath:'id'});};
      request.onerror=()=>reject(failure(request.error));
      request.onblocked=()=>reject(new Error('Fermez les autres onglets de la médiathèque, puis réessayez.'));
      request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();connection=undefined;};resolve(db);};
    }).catch(error=>{connection=undefined;throw error;});
    return connection;
  }
  async function run(mode,action) {
    const db=await open();
    return new Promise((resolve,reject)=>{
      const transaction=db.transaction(['publications','assets'],mode);
      let result;
      transaction.oncomplete=()=>resolve(typeof result==='function'?result():result);
      transaction.onabort=()=>reject(failure(transaction.error));
      transaction.onerror=()=>{}; // The abort handler reports a failed atomic write.
      try{result=action(transaction);}catch(error){transaction.abort();reject(failure(error));}
    });
  }
  return {
    read:()=>run('readonly',transaction=>{const items=transaction.objectStore('publications').getAll(),assets=transaction.objectStore('assets').getAll();return ()=>({items:items.result,assets:assets.result});}),
    save:(item,assets)=>run('readwrite',transaction=>{for(const asset of assets)transaction.objectStore('assets').put(asset);transaction.objectStore('publications').put(item);}),
    clear:()=>run('readwrite',transaction=>{transaction.objectStore('publications').clear();transaction.objectStore('assets').clear();}),
  };
}

function createMxTestAdministration(storage=mxBrowserTestStorage()) {
  const staged=new Map(),objectUrls=new Map();
  let storageError='';
  const current=()=>({authenticated:true,configured:true,testMode:true,role:'test',displayName:'Mode test',canManageAccess:false,requiresPasswordChange:false});
  const kind=file=>/\.(jpe?g|png|webp)$/i.test(file.name)?'photo':/\.(mp4|webm)$/i.test(file.name)?'video':/\.pdf$/i.test(file.name)?'press':/\.vtt$/i.test(file.name)?'captions':'';
  const local=ref=>typeof ref==='string'&&/^local-test:[a-f0-9-]{36}$/.test(ref);
  const bounded=(value,max,required=false)=>{const text=typeof value==='string'?value.trim():'';if((required&&!text)||text.length>max)throw new Error('Vérifiez les champs obligatoires et leur longueur.');return text;};
  async function stage(file) {
    if(!file||typeof file.arrayBuffer!=='function'||!kind(file))throw new Error('Sélectionnez un fichier vidéo, une photo, un PDF ou un fichier de sous-titres accepté.');
    mxValidateFile(file,kind(file));
    const url='local-test:'+mxUuid();staged.set(url,file);
    return {url,name:file.name,size:file.size};
  }
  async function publish(input,onProgress=()=>{}) {
    if(!input||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(input.requestId||'')||!['video','photo','press'].includes(input.type)||!['fr','ar'].includes(input.language)||!el.includes(input.topic))throw new Error('Vérifiez le type, la langue et la rubrique de la publication.');
    const existing=await storage.read();
    const id='test-'+input.requestId;
    if(existing.items.some(item=>item.id===id))return {id,published:true,testMode:true};
    const date=bounded(input.date,10,true);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw new Error('La date de publication est non valide.');
    const assets=new Map();
    const asset=(ref,expected)=>{
      const file=staged.get(ref);
      if(!local(ref)||!file||kind(file)!==expected)throw new Error('Sélectionnez à nouveau le fichier correspondant à ce support.');
      mxValidateFile(file,expected);assets.set(ref,{id:ref,blob:file,name:file.name});return ref;
    };
    const item={id,type:input.type,title:bounded(input.title,180,true),date,topic:input.topic,language:input.language,status:'published',description:bounded(input.description,1200),credit:bounded(input.credit,200),content:'',location:'',duration:'',transcript:'',thumbnailUrl:'',mediaUrl:'',fileUrl:'',captionsUrl:'',spokenLanguage:'',captionsLanguage:'',captionsSource:'',captionsValidated:false,photos:[],keywords:[input.topic],eventId:null,testOnly:true,createdAt:new Date().toISOString()};
    if(item.type==='photo'){
      if(!Array.isArray(input.photos)||!input.photos.length||input.photos.length>30)throw new Error('Sélectionnez entre 1 et 30 photographies.');
      item.photos=input.photos.map(photo=>({url:asset(photo?.url,'photo'),caption:bounded(photo?.caption,300)}));
      item.thumbnailUrl=item.photos.find(photo=>photo.url===input.thumbnailUrl)?.url||item.photos[0].url;
    }
    if(item.type==='video'){
      item.mediaUrl=local(input.mediaUrl)?asset(input.mediaUrl,'video'):mxHttps(input.mediaUrl);
      if(!item.mediaUrl)throw new Error('Sélectionnez une vidéo ou renseignez son adresse HTTPS.');
      item.thumbnailUrl=local(input.thumbnailUrl)?asset(input.thumbnailUrl,'photo'):mxYoutubeThumbnail(item.mediaUrl);
      if(!item.thumbnailUrl)throw new Error('Ajoutez une miniature pour présenter la vidéo.');
      if(!['fr','ar','mixed'].includes(input.spokenLanguage))throw new Error('Choisissez la langue parlée dans la vidéo.');
      item.spokenLanguage=input.spokenLanguage;
      if(item.language==='fr'&&item.spokenLanguage!=='fr'&&!item.description)throw new Error('Ajoutez un bref résumé en français.');
      if(input.captionsLanguage){
        if(!['fr','ar'].includes(input.captionsLanguage)||input.captionsValidated!==true)throw new Error('Vérifiez et validez les sous-titres.');
        const youtube=!!mxYoutubeThumbnail(item.mediaUrl);
        if(input.captionsSource!==(youtube?'youtube':'file'))throw new Error('Vérifiez la source des sous-titres.');
        Object.assign(item,{captionsLanguage:input.captionsLanguage,captionsSource:input.captionsSource,captionsValidated:true,captionsUrl:youtube?'':asset(input.captionsUrl,'captions')});
      }
    }
    if(item.type==='press'){
      item.content=bounded(input.content,40000);item.fileUrl=input.fileUrl?asset(input.fileUrl,'press'):'';
      if(!item.content&&!item.fileUrl)throw new Error('Sélectionnez un PDF ou saisissez le texte du communiqué.');
    }
    if([...assets.values()].reduce((total,entry)=>total+entry.blob.size,0)>100*1048576)throw new Error('La publication ne peut pas dépasser 100 Mio.');
    onProgress('Enregistrement de l’essai dans votre navigateur…');
    await storage.save(item,[...assets.values()]);storageError='';for(const ref of assets.keys())staged.delete(ref);
    er=undefined;return {id,published:true,testMode:true};
  }
  async function catalogue(base) {
    let data;
    try{data=await storage.read();storageError='';}catch(error){storageError=error.message;return base;}
    const assets=new Map(data.assets.map(entry=>[entry.id,entry.blob]));
    const hydrate=ref=>{
      if(!local(ref))return ref;
      if(!assets.has(ref))return '';
      if(!objectUrls.has(ref))objectUrls.set(ref,URL.createObjectURL(assets.get(ref)));
      return objectUrls.get(ref);
    };
    const items=data.items.map(item=>({...item,thumbnailUrl:hydrate(item.thumbnailUrl),mediaUrl:hydrate(item.mediaUrl),fileUrl:hydrate(item.fileUrl),captionsUrl:hydrate(item.captionsUrl),photos:item.photos.map(photo=>({...photo,url:hydrate(photo.url)}))}));
    return {...base,items:[...items,...(base.items||[])]};
  }
  async function reset() {
    await storage.clear();staged.clear();for(const url of objectUrls.values())URL.revokeObjectURL(url);objectUrls.clear();storageError='';er=undefined;
    return {ok:true};
  }
  return {current,session:async()=>current(),requireAccess:()=>{},stage,publish,catalogue,reset,storageError:()=>storageError,login:async()=>{throw new Error('La connexion n’est pas utilisée en mode test.');},logout:async()=>({ok:true})};
}

const MxTestAdministration=MX_SERVICE.management?.mode==='test'?createMxTestAdministration():null;
function mxManagementClient(){return MxTestAdministration||MxAdministration;}

function MxTestNotice({onReset,busy=false}) {
  const h=mxElement;
  return h('aside',{className:'mx-test-notice',role:'note','aria-label':mxT('Mode test')},
    h('span',{className:'mx-test-label'},mxT('MODE TEST')),
    h('div',null,h('strong',null,mxT('Espace de gestion ouvert sans connexion')),h('p',null,mxT('Ajoutez vos supports, vérifiez l’aperçu et cliquez sur « Valider et publier ». Vos essais apparaîtront dans l’accueil de ce navigateur uniquement.')),MxTestAdministration?.storageError()&&h('p',{className:'gh-error',role:'alert'},MxTestAdministration.storageError())),
    onReset&&h('button',{type:'button',className:'button secondary',disabled:busy,onClick:onReset},mxT('Effacer les contenus de test')));
}
