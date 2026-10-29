// Components share the retained React runtime and media readers in app.js.
// No external service, additional framework or runtime dependency is required.
const mxElement = (...args) => O.createElement(...args);
function MxPreviewIcon({size=18}) {
  return mxElement('svg',{width:size,height:size,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true},mxElement('path',{d:'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z'}),mxElement('circle',{cx:12,cy:12,r:3}));
}
const mxStorage = {
  get(key, fallback = '') { try { return localStorage.getItem(key) || fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch {} },
};
const mxSize = bytes => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(bytes / 1048576) + ' Mio';
const mxPlural = (count, singular, plural = singular + 's') => count + ' ' + (MX_LOCALE==='ar'?(MX_MESSAGES[singular]||singular):(count > 1 ? plural : singular));
function mxValidateFile(file, kind) {
  const extensions = { photo: /\.(jpe?g|png|webp)$/i, video: /\.(mp4|webm)$/i, press: /\.pdf$/i, captions: /\.vtt$/i };
  const limits = { photo: 12, video: 50, press: 20, captions: 1 };
  if (!extensions[kind].test(file.name)) throw new Error(file.name + ' : format non accepté.');
  if (!file.size || file.size > limits[kind] * 1048576) throw new Error(file.name + ' : le fichier doit contenir entre 1 octet et ' + limits[kind] + ' Mio.');
}

function mxHttps(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''; } catch { return ''; }
}

function mxYoutubeThumbnail(value) {
  try {
    const url = new URL(mxHttps(value));
    const host = url.hostname.toLowerCase();
    const parts = url.pathname.split('/').filter(Boolean);
    const id = host === 'youtu.be' ? parts[0] : ['youtube.com','www.youtube.com','m.youtube.com','youtube-nocookie.com','www.youtube-nocookie.com'].includes(host) ? (url.pathname === '/watch' ? url.searchParams.get('v') : ['embed','shorts','live'].includes(parts[0]) ? parts[1] : '') : '';
    return /^[\w-]{11}$/.test(id || '') ? 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg' : '';
  } catch { return ''; }
}

function mxUseObjectUrl(source) {
  const [url, setUrl] = O.useState('');
  O.useEffect(() => {
    if (!source || typeof source === 'string') { setUrl(typeof source === 'string' ? source : ''); return; }
    const next = URL.createObjectURL(source); setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [source]);
  return url;
}

// Sample the local video with one decoder; every exit releases its object URL.
function mxVideoThumbnails(file, signal) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    const choices=[];
    let settled=false,capturing=false,timer,positions=[],index=0;
    const finish = error => {
      if (settled) return; settled = true;
      clearTimeout(timer); signal?.removeEventListener('abort', abort);
      video.onloadedmetadata = video.onloadeddata = video.onseeked = video.onerror = null;
      video.removeAttribute('src'); video.load(); URL.revokeObjectURL(url);
      error ? reject(error) : resolve(choices);
    };
    const abort = () => finish(new DOMException('Opération annulée', 'AbortError'));
    const fail=error=>finish(choices.length?null:error);
    const arm=()=>{clearTimeout(timer);timer=setTimeout(()=>fail(new Error('Les miniatures automatiques sont indisponibles. Choisissez une image dans le lecteur ou importez une photo.')),12000);};
    const seek=()=>{
      arm();
      try{if(Math.abs(video.currentTime-positions[index])>.001)video.currentTime=positions[index];else capture();}
      catch(error){fail(error);}
    };
    const capture = async () => {
      if(settled||capturing||!positions.length||video.seeking||video.readyState<2||Math.abs(video.currentTime-positions[index])>.05)return;
      capturing=true;
      try {
        const time=video.currentTime,image=await mxCaptureVideoFrame(video);
        if(settled)return;
        choices.push({file:image,time});capturing=false;index++;
        index===positions.length?finish():seek();
      } catch(error) { fail(error); }
    };
    video.muted = true; video.playsInline = true; video.preload = 'auto';
    video.onerror = () => fail(new Error('Le navigateur ne peut pas lire cette vidéo. Vous pouvez importer une miniature.'));
    video.onloadedmetadata = () => {
      const duration=video.duration;
      positions=Number.isFinite(duration)&&duration>0?[...new Set([.1,.26,.42,.58,.74,.9].map(fraction=>Number((duration*fraction).toFixed(3))))]:[0];
      seek();
    };
    video.onseeked = capture;
    video.onloadeddata = capture;
    signal?.addEventListener('abort', abort, {once: true});
    if (signal?.aborted) { abort(); return; }
    arm();video.src = url; video.load();
  });
}

function MxThumbnailImage({source, title, className = ''}) {
  const h = mxElement, url = mxUseObjectUrl(source);
  const [failed, setFailed] = O.useState(false);
  O.useEffect(() => setFailed(false), [url]);
  return h('div', {className: 'mx-thumbnail-image ' + className}, url && !failed ? h('img', {src: url, alt: title || 'Miniature de la publication', onError: () => setFailed(true)}) : h('span', null, h(pa, {size: 30}), failed ? 'Aperçu indisponible' : 'Votre miniature'));
}

function MxVideoFramePicker({file,onCapture}) {
  const h=mxElement,url=mxUseObjectUrl(file),video=O.useRef(null);
  const [ready,setReady]=O.useState(false),[busy,setBusy]=O.useState(false),[error,setError]=O.useState('');
  O.useEffect(()=>{setReady(false);setError('');},[file]);
  const capture=async()=>{
    if(!ready||busy)return;setBusy(true);setError('');
    try{video.current.pause();const image=await mxCaptureVideoFrame(video.current);onCapture(image);}
    catch(exception){setError(exception.message);}finally{setBusy(false);}
  };
  return h('details',{className:'mx-video-frame-picker'},h('summary',null,'Choisir une autre image dans la vidéo'),
    h('p',null,'Déplacez le curseur du lecteur jusqu’à l’image souhaitée, puis utilisez-la comme miniature.'),
    h('video',{ref:video,src:url,controls:true,playsInline:true,preload:'auto','aria-label':'Choisir l’image de couverture de la vidéo',onLoadedData:()=>setReady(true),onError:()=>{setReady(false);setError('Le navigateur ne peut pas lire cette vidéo. Vous pouvez importer une miniature.');}}),
    h('button',{type:'button',className:'button secondary',disabled:!ready||busy,onClick:capture},h(pa,{size:16}),busy?'Création de l’image…':'Utiliser cette image comme miniature'),error&&h('p',{role:'alert',className:'gh-error'},error));
}

function mxCaptureVideoFrame(video) {
  return new Promise((resolve,reject)=>{
    try{
      if(video.readyState<2||!video.videoWidth||!video.videoHeight)throw new Error('Attendez le chargement de l’image vidéo, puis réessayez.');
      const canvas=document.createElement('canvas'),scale=Math.min(1,1280/video.videoWidth,720/video.videoHeight);
      canvas.width=Math.max(1,Math.round(video.videoWidth*scale));canvas.height=Math.max(1,Math.round(video.videoHeight*scale));
      canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
      canvas.toBlob(blob=>blob?resolve(new File([blob],'miniature-video-'+Math.round(video.currentTime*1000)+'.jpg',{type:'image/jpeg',lastModified:Date.now()})):reject(new Error('L’image n’a pas pu être extraite. Réessayez.')),'image/jpeg',.88);
    }catch(error){reject(error);}
  });
}

function MxVideoThumbnailChoice({choice,index,selected,onSelect}){
  const h=mxElement,url=mxUseObjectUrl(choice.file),seconds=Math.floor(choice.time);
  const time=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
  return h('button',{type:'button',className:'mx-video-thumbnail-choice','aria-pressed':selected,'aria-label':mxT('Choisir la miniature')+' '+(index+1)+' · '+time,onClick:()=>onSelect(choice)},
    h('img',{src:url,alt:'',loading:'lazy'}),h('span',null,h('span',null,mxT('Miniature')+' '+(index+1)),h('time',null,time)),
    selected&&h('strong',null,h(zl,{size:12}),mxT('Sélectionnée')));
}

function MxThumbnailField({source, pending, generating=false, choices=[], onSelect, custom, fromVideo=false, videoFile=null, onFrame, note, onChange, onReset}) {
  const h = mxElement;
  return h('section', {className: 'mx-thumbnail-field', 'aria-labelledby': 'thumbnail-heading'},
    h('div', {className: 'mx-thumbnail-heading'}, h('div', null, h('h3', {id: 'thumbnail-heading'}, 'Miniature de la vidéo *'), h('p', null, 'L’image qui présentera votre vidéo dans la médiathèque.')), source && !pending && h('span', {className: 'mx-thumbnail-status'}, h(zl, {size: 13}), fromVideo?'Image de la vidéo':custom ? 'Personnalisée' : 'Automatique')),
    h('div', {className: 'mx-thumbnail-layout'}, h(MxThumbnailImage, {source}),
      h('div', {className: 'mx-thumbnail-options'}, h('p', {role: generating ? 'status' : undefined,'aria-live':'polite'}, generating ? 'Préparation des miniatures à partir de votre vidéo…' : fromVideo?'L’image choisie dans la vidéo sera utilisée dans l’accueil.':custom ? 'Votre image personnalisée sera utilisée dans l’accueil.' : note || 'La miniature s’affichera ici dès la sélection de votre vidéo.'),
        h('label', {className: 'button secondary mx-thumbnail-upload'}, h(pa, {size: 16}), source ? 'Changer la miniature' : 'Importer une miniature', h('input', {type: 'file', accept: 'image/jpeg,image/png,image/webp', 'aria-label': 'Importer une miniature de la vidéo', onChange: event => {onChange(event.target.files?.[0]); event.target.value = '';}})),
        h('small', null, 'JPG, PNG ou WebP · 12 Mio maximum'), custom && h('button', {type: 'button', className: 'mx-thumbnail-reset', onClick: onReset}, 'Revenir à la miniature automatique'))),
    choices.length>0&&h('div',{className:'mx-video-thumbnail-suggestions',role:'group','aria-label':mxT('Miniatures proposées')},
      h('h4',null,mxT('Choisissez une miniature')),h('p',null,mxT('Cliquez sur l’image à afficher dans l’accueil. Ces miniatures sont extraites de différents moments de votre vidéo.')),
      h('div',{className:'mx-video-thumbnail-grid'},...choices.map((choice,index)=>h(MxVideoThumbnailChoice,{key:choice.file.name,choice,index,selected:source===choice.file,onSelect})))),
    videoFile&&h(MxVideoFramePicker,{key:videoFile.name+'-'+videoFile.size+'-'+videoFile.lastModified,file:videoFile,onCapture:onFrame}));
}

function mxPublicationSuffix() {
  return Array.from(crypto.getRandomValues(new Uint8Array(6)), value => value.toString(16).padStart(2, '0')).join('');
}

function mxUuid() {
  if(typeof crypto.randomUUID==='function')return crypto.randomUUID();
  const bytes=crypto.getRandomValues(new Uint8Array(16));
  bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
  const hex=Array.from(bytes,value=>value.toString(16).padStart(2,'0')).join('');
  return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
}

async function mxCopyLink(onToast) {
  try {
    await navigator.clipboard.writeText(window.location.href);
    onToast('Le lien de cette recherche a été copié.');
  } catch {
    onToast('Vous pouvez copier l’adresse de cette page pour partager votre recherche.');
  }
}

function MxHeroSearch({ value, onChange, onSubmit }) {
  const h = mxElement;
  return h('form', { className: 'mx-hero-search', role: 'search', onSubmit: event => { event.preventDefault(); onSubmit(); } },
    h('label', { htmlFor: 'hero-query' }, 'Que souhaitez-vous consulter ?'),
    h('div', { className: 'mx-hero-search-box' }, h($t, { size: 20 }),
      h('input', { id: 'hero-query', type: 'search', value, onChange: event => onChange(event.target.value), maxLength: 240, placeholder: 'Un titre, un thème, un mot-clé…', dir: 'auto' }),
      h('button', { className: 'button primary', type: 'submit' }, 'Rechercher', h(wl, { size: 17 }))),
    h('p', { className: 'mx-search-hint' }, 'Vidéos, albums photo et communiqués de presse.'));
}

function MxLatestPublications({ items, onOpen, onExplore }) {
  const h = mxElement;
  if (!items.length) return null;
  const latest = [...items].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  return h('section', { className: 'container mx-latest', 'aria-labelledby': 'latest-heading' },
    h('div', { className: 'mx-section-title' },
      h('div', null, h('div', { className: 'eyebrow' }, 'À DÉCOUVRIR'), h('h2', { id: 'latest-heading' }, 'Les dernières publications')),
      h('button', { className: 'button secondary', onClick: onExplore }, 'Tout consulter', h(wl, { size: 16 }))),
    h('div', { className: 'media-grid' }, latest.map(item => h(su, { key: item.id, item, onOpen }))));
}

function MxCataloguePagination({page,pageCount,total,onPageChange}){
  const h=mxElement;
  return h('nav',{className:'mx-catalog-pagination','aria-label':mxT('Pagination des publications')},
    h('button',{type:'button',className:'button secondary',disabled:page===1,onClick:()=>onPageChange(page-1)},mxT('Précédente')),
    h('span',{'aria-live':'polite'},mxT('Page')+' '+page+' / '+pageCount+' · '+mxPlural(total,'publication')),
    h('button',{type:'button',className:'button secondary',disabled:page===pageCount,onClick:()=>onPageChange(page+1)},mxT('Suivante')));
}

function MxCatalogueFilters({ query, onQuery, topic, onTopic, year, onYear, language, onLanguage, years, inputRef }) {
  const h = mxElement;
  const [expanded, setExpanded] = O.useState(true);
  const active = [topic, year].filter(Boolean).length;
  const select = (label, value, onChange, options) => h('label', { className: 'mx-filter-field' }, h('span', null, label),
    h('select', { value, onChange: event => onChange(event.target.value), 'aria-label': 'Filtrer par ' + label.toLowerCase() },
      options.map(([id, text]) => h('option', { key: id, value: id }, text))));
  return h('div', { className: 'mx-catalog-filters' },
    h('div', { className: 'mx-search-row' },
      h('div', { className: 'search-field' }, h($t, { size: 21 }),
        h('input', { ref: inputRef, type: 'search', value: query, onChange: event => onQuery(event.target.value), placeholder: 'Rechercher un titre ou un mot-clé…', maxLength: 240, 'aria-label': 'Rechercher dans les publications', dir: 'auto' }),
        query && h('button', { 'aria-label': 'Effacer la recherche', onClick: () => onQuery('') }, h(xa, { size: 16 }))),
      h('button', { className: 'button secondary mx-refine', 'aria-expanded': expanded, 'aria-controls': 'advanced-filters', onClick: () => setExpanded(!expanded) }, h(lu, { size: 17 }), 'Affiner', active > 0 && h('span', { className: 'mx-count' }, active), h(Zi, { size: 16 }))),
    h('div', { className: 'mx-advanced-filters', id: 'advanced-filters', hidden: !expanded },
      select('Rubrique', topic, onTopic, [['', 'Toutes les rubriques'], ...el.map(value => [value, value])]),
      select('Année', year, onYear, [['', 'Toutes les années'], ...years.map(value => [value, value])])));
}

function MxPhotoPreview({ file, editions, index, total, cover, onCover, onCaption, onRemove, onMove }) {
  const h = mxElement;
  const caption=Object.values(editions||{})[0]?.captions?.[index]||'';
  const [url, setUrl] = O.useState('');
  O.useEffect(() => { const next = URL.createObjectURL(file); setUrl(next); return () => URL.revokeObjectURL(next); }, [file]);
  return h('article', { className: 'mx-photo-preview'+(cover?' mx-photo-cover':'') },
    h('div', { className: 'mx-photo-thumb' }, url && h('img', { src: url, alt: caption || file.name }),
      cover && h('span', null, h(zl,{size:12}), 'Miniature de l’album')),
    h('div', { className: 'mx-photo-info' }, h('strong', { title: file.name }, file.name), h('small', null, mxSize(file.size)),
      ...Object.entries(editions||{}).map(([locale,fields])=>h('label',{key:locale,htmlFor:'mx-caption-'+index+'-'+locale},locale==='fr'?'Légende en français (facultatif)':'Légende en arabe (facultatif)',h('input',{id:'mx-caption-'+index+'-'+locale,value:fields.captions[index]||'',onChange:event=>onCaption(locale,event.target.value),maxLength:300,lang:locale,dir:locale==='ar'?'rtl':'ltr'}))),
      h('button', {type:'button',className:'mx-cover-choice','aria-pressed':cover,onClick:onCover},h(cover?zl:pa,{size:15}),cover?'Miniature sélectionnée':'Choisir comme miniature'),
      h('div', { className: 'mx-photo-actions' },
        h('button', { type: 'button', disabled: index === 0, onClick: () => onMove(index - 1), 'aria-label': 'Déplacer la photo ' + (index + 1) + ' vers le début' }, '← Monter'),
        h('button', { type: 'button', disabled: index === total - 1, onClick: () => onMove(index + 1), 'aria-label': 'Déplacer la photo ' + (index + 1) + ' vers la fin' }, 'Descendre →'),
        h('button', { type: 'button', className: 'mx-remove', onClick: onRemove, 'aria-label': 'Retirer ' + file.name }, 'Retirer'))));
}

function MxPublicationPreview({ type, title, date, topic, keywords=[], description, credit, location, language, editions, photos, captions, video, videoUrl, thumbnail, videoLanguages, captionsFile, press, pressFiles, pressText, onClose }) {
  const h = mxElement;
  const [urls, setUrls] = O.useState({ photos: [], video: '', press: '' });
  const [previewLanguage,setPreviewLanguage]=O.useState(language==='ar'?'ar':'fr');
  const currentLanguage=editions?(editions[previewLanguage]?previewLanguage:Object.keys(editions)[0]||language):language;
  const currentEdition=editions?.[currentLanguage],currentTitle=currentEdition?.title??title,currentDescription=currentEdition?.description??description,currentCredit=currentEdition?.credit??credit;
  const currentLocation=currentEdition?.location??location,currentCaptions=currentEdition?.captions??captions,currentPressText=currentEdition?.content??pressText;
  const currentPress=pressFiles?(pressFiles[currentLanguage]||Object.keys(editions||{}).map(locale=>pressFiles[locale]).find(Boolean)):press;
  const pressUrl=mxUseObjectUrl(currentPress);
  const poster = mxUseObjectUrl(thumbnail);
  const subtitles = mxUseObjectUrl(captionsFile);
  O.useEffect(() => {
    const next = { photos: photos.map(file => URL.createObjectURL(file)), video: video ? URL.createObjectURL(video) : '', press: '' };
    setUrls(next);
    return () => [...next.photos, next.video, next.press].filter(Boolean).forEach(url => URL.revokeObjectURL(url));
  }, [photos, video]);
  return h(Ul, { label: 'Aperçu de la publication', onClose, wide: true },
    h('div', { className: 'mx-publication-preview' },
      h('div', { className: 'eyebrow' }, 'APERÇU AVANT PUBLICATION'),
      editions&&Object.keys(editions).length>1&&h('div',{className:'mx-preview-language-choices',role:'group','aria-label':'Langue de l’aperçu'},...Object.keys(editions).map(locale=>h('button',{key:locale,type:'button','aria-pressed':locale===currentLanguage,onClick:()=>setPreviewLanguage(locale),lang:locale},locale==='fr'?'Français':'العربية'))),
      h('h2', { dir: currentLanguage==='ar'?'rtl':'auto',lang:currentLanguage }, currentTitle || 'Titre à renseigner'),
      h('p', { className: 'mx-preview-meta' }, date && Ya(date), ' · ', currentLanguage==='ar'?(MX_DOC_RUNTIME.documentaryTranslations[topic]||topic):topic),
      keywords.length>0&&h('ul',{className:'mx-documentary-preview',dir:currentLanguage==='ar'?'rtl':'ltr','aria-label':currentLanguage==='ar'?'الكلمات المفتاحية':'Mots-clés'},...keywords.map(label=>h('li',{key:label},currentLanguage==='ar'?(MX_DOC_RUNTIME.documentaryTranslations[label]||label):label))),
      videoLanguages&&h(MxVideoLanguage,{item:videoLanguages}),
      thumbnail && h('div',{className:'mx-preview-cover'},h('span',{className:'eyebrow'},'MINIATURE DANS L’ACCUEIL'),h(MxThumbnailImage,{source:thumbnail,title:currentTitle})),
      currentDescription && h('p', { dir: currentLanguage === 'ar' ? 'rtl' : 'auto',lang:currentLanguage }, currentDescription),
      (currentCredit||currentLocation)&&h('dl',{className:'mx-preview-details'},currentLocation&&h('div',null,h('dt',null,'Lieu des prises de vue'),h('dd',{dir:currentLanguage==='ar'?'rtl':'ltr',lang:currentLanguage},currentLocation)),currentCredit&&h('div',null,h('dt',null,MX_PUBLICATION_FORMS[type]?.creditLabel||'Crédits'),h('dd',{dir:currentLanguage==='ar'?'rtl':'ltr',lang:currentLanguage},currentCredit))),
      urls.photos.length > 0 && h('div', { className: 'mx-preview-gallery',dir:currentLanguage==='ar'?'rtl':'ltr',lang:currentLanguage }, urls.photos.map((url, index) => h('figure', { key: url }, h('img', { src: url, alt: currentCaptions[index] || 'Photo ' + (index + 1) }), currentCaptions[index] && h('figcaption', null, currentCaptions[index])))),
      urls.video && h('video', { controls: true, preload: 'metadata', src: urls.video, poster, 'aria-label': currentTitle || 'Vidéo à publier' },subtitles&&videoLanguages?.captionsValidated&&h('track',{kind:'subtitles',src:subtitles,srcLang:videoLanguages.captionsLanguage,label:videoLanguages.captionsLanguage==='fr'?'Français':'العربية',default:true})),
      mxHttps(videoUrl) && h('a', { className: 'button secondary', href: mxHttps(videoUrl), target: '_blank', rel: 'noreferrer' }, 'Vérifier le lien vidéo', h(Oe, { size: 16 })),
      pressUrl && h('a', { className: 'button secondary', href: pressUrl, target: '_blank', rel: 'noreferrer' }, 'Ouvrir le PDF sélectionné', h(Oe, { size: 16 })),
      currentPressText && h('div', { className: 'mx-preview-text', dir: currentLanguage === 'ar' ? 'rtl' : 'ltr',lang:currentLanguage }, currentPressText),
      h('p', { className: 'mx-preview-note' }, mxManagementClient().current().localMode?'Le contenu sera visible dans l’accueil de ce navigateur après votre clic sur « Valider et publier ».':MxTestAdministration?'Cet essai sera visible dans l’accueil de ce navigateur après votre clic sur « Valider et publier ».':'Le contenu sera mis en ligne après votre clic sur « Valider et publier ».'),
      h('button', { className: 'button primary', onClick: onClose }, 'Revenir au formulaire')));
}

function MxPublishedList({ items, onOpen, onRefresh, onEditingChange }) {
  const h = mxElement;
  const [query, setQuery] = O.useState('');
  const [editing,setEditing]=O.useState(()=>{const folder=new URLSearchParams(window.location.search).get('edit');return items.find(item=>item.publicationFolder===folder)||null;});
  O.useEffect(()=>{onEditingChange?.(!!editing);},[!!editing,onEditingChange]);
  const [contentLanguage,setContentLanguage]=O.useState('fr');
  const [deleting,setDeleting]=O.useState(null),[deleteBusy,setDeleteBusy]=O.useState(false),[deleteError,setDeleteError]=O.useState('');
  const deleteDialog=O.useRef(null);
  O.useEffect(()=>{if(deleting){deleteDialog.current?.scrollIntoView({block:'center',behavior:'smooth'});deleteDialog.current?.querySelector('button')?.focus({preventScroll:true});}},[deleting?.id]);
  const remove=async()=>{if(!deleting||deleteBusy)return;setDeleteBusy(true);setDeleteError('');try{const current=await MxAdministration.publication(deleting.publicationFolder);await MxAdministration.updatePublication(deleting.publicationFolder,{revision:current.revision,action:'delete'});setEditing(null);setDeleting(null);await onRefresh();}catch(exception){setDeleteError(exception.message);}finally{setDeleteBusy(false);}};
  const published = items.filter(item => item.status === 'published'&&item.language===contentLanguage);
  const filtered = published.filter(item => Ea([item.title, item.topic, ...item.keywords].join(' ')).includes(Ea(query)));
  const [page,setPage]=O.useState(1),pageSize=25;
  const pageCount=Math.max(1,Math.ceil(filtered.length/pageSize)),currentPage=Math.min(page,pageCount);
  O.useEffect(()=>{setPage(1);},[query,contentLanguage]);
  const shown=filtered.slice((currentPage-1)*pageSize,currentPage*pageSize);
  const listRef=O.useRef(null);
  const turnPage=next=>{setPage(Math.max(1,Math.min(pageCount,next)));listRef.current?.scrollIntoView({block:'start',behavior:'smooth'});};
  return h('section', { className: 'mx-published', 'aria-labelledby': 'published-heading' },
    h('div', { className: 'mx-section-title' }, h('div', null, h('div', { className: 'eyebrow' }, 'SUIVI DES CONTENUS'), h('h2', { id: 'published-heading' }, mxManagementClient().current().localMode?'Publications':MxTestAdministration?'Publications et essais locaux':'Publications en ligne')), h('span', { className: 'mx-count' }, mxPlural(published.length, 'publication'))),
    h('div',{className:'mx-management-languages',role:'group','aria-label':'Langue des publications'},h('button',{type:'button','aria-pressed':contentLanguage==='fr',onClick:()=>setContentLanguage('fr')},'Français'),h('button',{type:'button','aria-pressed':contentLanguage==='ar',onClick:()=>setContentLanguage('ar')},'العربية')),
    h(MxPublicationTrash,{onRefresh}),
    deleteError&&h('p',{className:'gh-error',role:'alert'},deleteError),
    deleting&&h('section',{ref:deleteDialog,role:'alertdialog','aria-label':mxT('Confirmer la suppression'),className:'gh-form'},h('h3',null,'Supprimer ce contenu ?'),h('p',{dir:'auto'},deleting.title),h('p',null,'Le contenu sera retiré des pages française et arabe. Vous pourrez le restaurer depuis la corbeille.'),h('button',{type:'button',className:'button secondary',disabled:deleteBusy,onClick:()=>setDeleting(null)},'Annuler'),h('button',{type:'button',className:'button primary',disabled:deleteBusy,onClick:remove},deleteBusy?'Suppression…':'Confirmer la suppression')),
    editing&&h(MxPublicationCorrection,{key:editing.publicationFolder,item:editing,onClose:()=>setEditing(null),onRefresh}),
    published.length ? h(O.Fragment, null,
      h('label', { className: 'mx-management-search' }, 'Rechercher une publication', h('input', { type: 'search', value: query, onChange: event => setQuery(event.target.value), placeholder: 'Titre, thème ou mot-clé…' })),
      h('div', { className: 'mx-published-list',ref:listRef }, shown.map(item => h('article', { key: item.id },
        h('div', null, h('small', null, nu[item.type], ' · ', Ya(item.date), item.localOnly?' · Ce navigateur':item.testOnly?' · Contenu de test':''), h('strong', { dir: 'auto' }, item.title)),
        h('div', null, h('button', { className: 'button secondary', onClick: () => onOpen(item) }, 'Consulter'),
          item.publicationFolder&&h('button',{className:'button secondary',onClick:()=>setEditing(item)},'Modifier'),item.publicationFolder&&h('button',{type:'button',className:'button secondary',disabled:deleteBusy,onClick:()=>{setDeleteError('');setDeleting(item);}},h(MxTrashIcon,{size:16}),'Supprimer'))))),

      !filtered.length && h('p', { role: 'status' }, 'Aucune publication ne correspond à ces termes.'),
      filtered.length>0&&h('nav',{'aria-label':mxT('Pagination des publications'),className:'mx-management-pagination',style:{display:'flex',flexWrap:'wrap',alignItems:'center',justifyContent:'center',gap:'16px',marginBlock:'24px'}},h('button',{type:'button',className:'button secondary',disabled:currentPage===1,onClick:()=>turnPage(currentPage-1)},'Précédente'),h('span',{'aria-live':'polite',style:{fontSize:'13px',lineHeight:1.4}},mxT('Page')+' '+currentPage+' / '+pageCount+' · '+filtered.length+' '+mxT('publications')),h('button',{type:'button',className:'button secondary',disabled:currentPage===pageCount,onClick:()=>turnPage(currentPage+1)},'Suivante')))
      : h('p', { className: 'mx-management-empty' }, 'Aucun contenu n’est encore publié. Préparez votre première publication ci-dessus.'));
}

function MxPublicationCorrection({item,onClose,onRefresh}){
 const h=mxElement;
 const [draft,setDraft]=O.useState(null),[revision,setRevision]=O.useState(''),[error,setError]=O.useState(''),[busy,setBusy]=O.useState(false),[saved,setSaved]=O.useState(false);
 O.useEffect(()=>{let active=true;MxAdministration.publication(item.publicationFolder).then(result=>{if(active){setDraft(result.record);setRevision(result.revision);}}).catch(exception=>{if(active)setError(exception.message);});return()=>{active=false;};},[item.publicationFolder]);
 const change=(field,value)=>{setDraft(previous=>({...previous,[field]:value}));setSaved(false);};
 const text=(locale,field,value)=>{setDraft(previous=>locale?{...previous,translations:{...previous.translations,[locale]:{...previous.translations[locale],[field]:value}}}:{...previous,[field]:value});setSaved(false);};
 const save=async event=>{event.preventDefault();if(busy)return;setBusy(true);setError('');try{MX_DOC_RUNTIME.validateDocumentaryKeywords(draft.topic,draft.keywords);await MxAdministration.updatePublication(item.publicationFolder,{revision,changes:draft});const result=await MxAdministration.publication(item.publicationFolder);setRevision(result.revision);setDraft(result.record);await onRefresh();setSaved(true);}catch(exception){setError(exception.message);}finally{setBusy(false);}};
 const field=(label,value,update,props={})=>h('label',{className:'field'},label,h('input',{value:value||'',onChange:event=>update(event.target.value),...props}));
 const area=(label,value,update,props={})=>h('label',{className:'field gh-wide'},label,h('textarea',{rows:3,value:value||'',onChange:event=>update(event.target.value),...props}));
 const correctionRef=O.useRef(null);
 O.useEffect(()=>{if(draft)correctionRef.current?.scrollIntoView({block:'start',behavior:'smooth'});},[!!draft]);
 const type=draft?.videos?.length?'video':draft?.photos?.length?'photo':'press';
 return h('section',{className:'mx-publication-correction gh-form',ref:correctionRef,'aria-label':'Modifier la publication'},h('h3',null,'Modifier la publication'),h('p',null,'Corrigez les renseignements, puis enregistrez. Les fichiers déjà transférés sont conservés.'),
 error&&h('p',{className:'gh-error',role:'alert'},error),saved&&h('p',{role:'status'},'Les modifications sont en ligne dans les pages concernées.'),
 !draft?h('p',{role:'status'},'Chargement de la fiche…'):h('form',{onSubmit:save},h(MxExistingPublicationMedia,{item}),h('fieldset',{disabled:busy},
 field('Date de publication *',draft.date,value=>change('date',value),{type:'date',required:true}),
 h('label',{className:'field'},'Domaine principal *',h('select',{value:draft.topic,required:true,onChange:event=>{change('topic',event.target.value);change('keywords',[]);}},...el.map(value=>h('option',{key:value,value},value)))),
 h(MxDocumentaryFields,{topic:draft.topic,value:draft.keywords,onChange:value=>change('keywords',value)}),
 ...Object.entries(draft.translations||{'':draft}).map(([locale,values])=>h('fieldset',{key:locale,lang:locale||draft.language,dir:locale==='ar'?'rtl':'ltr'},h('legend',null,locale==='ar'?'العربية':locale==='fr'?'Français':'Renseignements'),
 field('Titre *',values.title,value=>text(locale,'title',value),{required:true,maxLength:180}),
 area('Bref résumé',values.description,value=>text(locale,'description',value),{maxLength:1200}),
 field(type==='photo'?'Photographe / crédit photo':type==='press'?'Service émetteur':'Crédits de la vidéo',values.credit,value=>text(locale,'credit',value),{maxLength:200}),
 type==='photo'&&field('Lieu',values.location,value=>text(locale,'location',value),{maxLength:150}),
 type==='photo'&&draft.photos.map((photo,index)=>field('Légende de la photo '+(index+1),values.captions?.[index]||photo.caption,value=>{const captions=[...(values.captions||draft.photos.map(photo=>photo.caption||''))];captions[index]=value;text(locale,'captions',captions);},{maxLength:300})),
 type==='press'&&area('Texte du communiqué',values.content||(!locale?draft.press[0]?.text:''),value=>text(locale,'content',value),{maxLength:40000,rows:6})
 )),h('button',{type:'submit',className:'button primary',disabled:busy},busy?'Enregistrement…':'Enregistrer les modifications'))),
 h('button',{type:'button',className:'button secondary',disabled:busy,onClick:onClose},'Fermer'));
}

function MxExistingPublicationMedia({item}){
 const h=mxElement;
 return h('section',{className:'mx-existing-media','aria-label':mxT('Médias déjà publiés'),style:{marginBlock:'20px',padding:'20px',border:'1px solid #dce4df',borderRadius:'12px'}},
 h('h4',null,mxT('Médias déjà publiés')),h('p',null,mxT('Ces fichiers sont conservés lorsque vous enregistrez vos modifications.')),
 item.type==='video'&&h(O.Fragment,null,item.thumbnailUrl&&h('figure',null,h('img',{src:je(item.thumbnailUrl),alt:mxT('Miniature actuelle de la vidéo'),style:{display:'block',maxWidth:'320px',width:'100%',maxHeight:'200px',objectFit:'contain'}}),h('figcaption',null,mxT('Miniature actuelle de la vidéo'))),h(MxVideoReader,{item})),
 item.type==='photo'&&h('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'16px'}},...item.photos.map((photo,index)=>h('figure',{key:photo.url,style:{margin:0}},h('a',{href:je(photo.url),target:'_blank',rel:'noreferrer','aria-label':mxT('Ouvrir la photographie')+' '+(index+1)},h('img',{src:je(photo.url),alt:photo.caption||mxT('Photographie')+' '+(index+1),loading:'lazy',style:{width:'100%',height:'160px',objectFit:'contain',background:'#f5f7f3',borderRadius:'8px'}})),h('figcaption',null,(index+1)+' / '+item.photos.length,photo.caption?' · '+photo.caption:'')))),
 item.type==='press'&&item.fileUrl&&h('a',{className:'button secondary',href:je(item.fileUrl),target:'_blank',rel:'noreferrer'},mxT('Ouvrir le PDF déjà publié')));
}

function MxPublicationTrash({onRefresh}){
 const h=mxElement,[items,setItems]=O.useState([]),[error,setError]=O.useState(''),[busy,setBusy]=O.useState(false),[open,setOpen]=O.useState(false);
 const load=async()=>{setError('');try{setItems((await MxAdministration.trash()).items);}catch(exception){setError(exception.message);}};
 const restore=async item=>{if(busy)return;setBusy(true);setError('');try{await MxAdministration.updatePublication(item.folder,{revision:item.revision,action:'restore'});await load();await onRefresh();}catch(exception){setError(exception.message);}finally{setBusy(false);}};
 return h('section',null,h('button',{type:'button',className:'button secondary','aria-expanded':open,onClick:()=>{setOpen(!open);if(!open)load();}},'Corbeille'),open&&h('div',null,error&&h('p',{role:'alert',className:'gh-error'},error),!items.length&&!error&&h('p',null,'La corbeille est vide.'),...items.map(item=>h('article',{key:item.folder},h('strong',{dir:'auto'},item.title),h('button',{type:'button',className:'button secondary',disabled:busy,onClick:()=>restore(item)},'Restaurer')))));
}

function MxTrashIcon({size=16}){
 return mxElement('svg',{width:size,height:size,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true},mxElement('path',{d:'M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6M14 10v6'}));
}
