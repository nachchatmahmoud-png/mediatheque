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
  const limits = { photo: 12, video: 25, press: 20, captions: 1 };
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

// Capture a local video frame; every exit releases the decoder and object URL.
function mxVideoThumbnail(file, signal) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    let settled = false;
    const finish = (error, result) => {
      if (settled) return; settled = true;
      clearTimeout(timer); signal?.removeEventListener('abort', abort);
      video.onloadedmetadata = video.onloadeddata = video.onseeked = video.onerror = null;
      video.removeAttribute('src'); video.load(); URL.revokeObjectURL(url);
      error ? reject(error) : resolve(result);
    };
    const abort = () => finish(new DOMException('Opération annulée', 'AbortError'));
    const timer = setTimeout(() => finish(new Error('Ajoutez une image pour la miniature de cette vidéo.')), 12000);
    const capture = () => {
      try {
        if (!video.videoWidth || !video.videoHeight) throw new Error('Image vidéo indisponible.');
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 1280 / video.videoWidth, 720 / video.videoHeight);
        canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
        canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => blob ? finish(null, new File([blob], 'miniature-video.jpg', {type: 'image/jpeg', lastModified: file.lastModified})) : finish(new Error('Ajoutez une image pour la miniature de cette vidéo.')), 'image/jpeg', .88);
      } catch { finish(new Error('Ajoutez une image pour la miniature de cette vidéo.')); }
    };
    video.muted = true; video.playsInline = true; video.preload = 'auto';
    video.onerror = () => finish(new Error('La miniature automatique est indisponible. Importez une image.'));
    video.onloadedmetadata = () => { video.currentTime = Number.isFinite(video.duration) && video.duration > .2 ? Math.min(1, video.duration / 10) : 0; };
    video.onseeked = capture;
    video.onloadeddata = () => { if (video.currentTime === 0) capture(); };
    signal?.addEventListener('abort', abort, {once: true});
    if (signal?.aborted) { abort(); return; }
    video.src = url; video.load();
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

function MxThumbnailField({source, pending, custom, fromVideo=false, videoFile=null, onFrame, note, onChange, onReset}) {
  const h = mxElement;
  return h('section', {className: 'mx-thumbnail-field', 'aria-labelledby': 'thumbnail-heading'},
    h('div', {className: 'mx-thumbnail-heading'}, h('div', null, h('h3', {id: 'thumbnail-heading'}, 'Miniature de la vidéo *'), h('p', null, 'L’image qui présentera votre vidéo dans la médiathèque.')), source && !pending && h('span', {className: 'mx-thumbnail-status'}, h(zl, {size: 13}), fromVideo?'Image de la vidéo':custom ? 'Personnalisée' : 'Automatique')),
    h('div', {className: 'mx-thumbnail-layout'}, h(MxThumbnailImage, {source}),
      h('div', {className: 'mx-thumbnail-options'}, h('p', {role: pending ? 'status' : undefined}, pending ? 'Extraction d’une image de la vidéo…' : fromVideo?'L’image choisie dans la vidéo sera utilisée dans l’accueil.':custom ? 'Votre image personnalisée sera utilisée dans l’accueil.' : note || 'La miniature s’affichera ici dès la sélection de votre vidéo.'),
        h('label', {className: 'button secondary mx-thumbnail-upload'}, h(pa, {size: 16}), source ? 'Changer la miniature' : 'Importer une miniature', h('input', {type: 'file', accept: 'image/jpeg,image/png,image/webp', 'aria-label': 'Importer une miniature de la vidéo', onChange: event => {onChange(event.target.files?.[0]); event.target.value = '';}})),
        h('small', null, 'JPG, PNG ou WebP · 12 Mio maximum'), custom && h('button', {type: 'button', className: 'mx-thumbnail-reset', onClick: onReset}, 'Revenir à la miniature automatique'))),
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
      h('input', { id: 'hero-query', type: 'search', value, onChange: event => onChange(event.target.value), maxLength: 240, placeholder: 'Un événement, un thème, un mot-clé…', dir: 'auto' }),
      h('button', { className: 'button primary', type: 'submit' }, 'Rechercher', h(wl, { size: 17 }))),
    h('p', { className: 'mx-search-hint' }, 'Vidéos, albums photo, communiqués et dossiers d’événements.'));
}

function MxLatestPublications({ items, events, onOpen, onEvent, onExplore }) {
  const h = mxElement;
  if (!items.length) return null;
  const latest = [...items].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  const recentEvent = [...events].sort((a, b) => b.date.localeCompare(a.date))[0];
  return h('section', { className: 'container mx-latest', 'aria-labelledby': 'latest-heading' },
    h('div', { className: 'mx-section-title' },
      h('div', null, h('div', { className: 'eyebrow' }, 'À DÉCOUVRIR'), h('h2', { id: 'latest-heading' }, 'Les dernières publications')),
      h('button', { className: 'button secondary', onClick: onExplore }, 'Tout consulter', h(wl, { size: 16 }))),
    h('div', { className: 'media-grid' }, latest.map(item => h(su, { key: item.id, item, onOpen }))),
    recentEvent && h('button', { className: 'mx-event-spotlight', onClick: () => onEvent(recentEvent) },
      h(Qa, { size: 24 }), h('span', null, h('small', null, 'LES SUPPORTS D’UN MÊME ÉVÉNEMENT'), h('strong', { dir: 'auto' }, recentEvent.title)),
      h('span', { className: 'mx-event-count' }, mxPlural(items.filter(item => item.eventId === recentEvent.id).length, 'publication')), h(Oe, { size: 21 })));
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
        h('input', { ref: inputRef, type: 'search', value: query, onChange: event => onQuery(event.target.value), placeholder: 'Rechercher un titre, un mot-clé ou un événement…', maxLength: 240, 'aria-label': 'Rechercher dans les publications', dir: 'auto' }),
        query && h('button', { 'aria-label': 'Effacer la recherche', onClick: () => onQuery('') }, h(xa, { size: 16 }))),
      h('button', { className: 'button secondary mx-refine', 'aria-expanded': expanded, 'aria-controls': 'advanced-filters', onClick: () => setExpanded(!expanded) }, h(lu, { size: 17 }), 'Affiner', active > 0 && h('span', { className: 'mx-count' }, active), h(Zi, { size: 16 }))),
    h('div', { className: 'mx-advanced-filters', id: 'advanced-filters', hidden: !expanded },
      select('Rubrique', topic, onTopic, [['', 'Toutes les rubriques'], ...el.map(value => [value, value])]),
      select('Année', year, onYear, [['', 'Toutes les années'], ...years.map(value => [value, value])])));
}

function MxPhotoPreview({ file, caption, index, total, cover, onCover, onCaption, onRemove, onMove }) {
  const h = mxElement;
  const [url, setUrl] = O.useState('');
  O.useEffect(() => { const next = URL.createObjectURL(file); setUrl(next); return () => URL.revokeObjectURL(next); }, [file]);
  return h('article', { className: 'mx-photo-preview'+(cover?' mx-photo-cover':'') },
    h('div', { className: 'mx-photo-thumb' }, url && h('img', { src: url, alt: caption || file.name }),
      cover && h('span', null, h(zl,{size:12}), 'Miniature de l’album')),
    h('div', { className: 'mx-photo-info' }, h('strong', { title: file.name }, file.name), h('small', null, mxSize(file.size)),
      h('label', { htmlFor: 'mx-caption-' + index }, 'Légende de la photo ' + (index + 1)),
      h('input', { id: 'mx-caption-' + index, value: caption, onChange: event => onCaption(event.target.value), maxLength: 300, placeholder: 'Décrire brièvement la photographie…' }),
      h('button', {type:'button',className:'mx-cover-choice','aria-pressed':cover,onClick:onCover},h(cover?zl:pa,{size:15}),cover?'Miniature sélectionnée':'Choisir comme miniature'),
      h('div', { className: 'mx-photo-actions' },
        h('button', { type: 'button', disabled: index === 0, onClick: () => onMove(index - 1), 'aria-label': 'Déplacer la photo ' + (index + 1) + ' vers le début' }, '← Monter'),
        h('button', { type: 'button', disabled: index === total - 1, onClick: () => onMove(index + 1), 'aria-label': 'Déplacer la photo ' + (index + 1) + ' vers la fin' }, 'Descendre →'),
        h('button', { type: 'button', className: 'mx-remove', onClick: onRemove, 'aria-label': 'Retirer ' + file.name }, 'Retirer'))));
}

function MxPublicationPreview({ type, title, date, topic, description, credit, location, language, photos, captions, video, videoUrl, thumbnail, videoLanguages, captionsFile, press, pressText, onClose }) {
  const h = mxElement;
  const [urls, setUrls] = O.useState({ photos: [], video: '', press: '' });
  const poster = mxUseObjectUrl(thumbnail);
  const subtitles = mxUseObjectUrl(captionsFile);
  O.useEffect(() => {
    const next = { photos: photos.map(file => URL.createObjectURL(file)), video: video ? URL.createObjectURL(video) : '', press: press ? URL.createObjectURL(press) : '' };
    setUrls(next);
    return () => [...next.photos, next.video, next.press].filter(Boolean).forEach(url => URL.revokeObjectURL(url));
  }, [photos, video, press]);
  return h(Ul, { label: 'Aperçu de la publication', onClose, wide: true },
    h('div', { className: 'mx-publication-preview' },
      h('div', { className: 'eyebrow' }, 'APERÇU AVANT PUBLICATION'),
      h('h2', { dir: 'auto' }, title || 'Titre à renseigner'),
      h('p', { className: 'mx-preview-meta' }, date && Ya(date), ' · ', topic),
      videoLanguages&&h(MxVideoLanguage,{item:videoLanguages}),
      thumbnail && h('div',{className:'mx-preview-cover'},h('span',{className:'eyebrow'},'MINIATURE DANS L’ACCUEIL'),h(MxThumbnailImage,{source:thumbnail,title})),
      description && h('p', { dir: language === 'ar' ? 'rtl' : 'auto' }, description),
      (credit||location)&&h('dl',{className:'mx-preview-details'},location&&h('div',null,h('dt',null,'Lieu des prises de vue'),h('dd',{dir:'auto'},location)),credit&&h('div',null,h('dt',null,MX_PUBLICATION_FORMS[type]?.creditLabel||'Crédits'),h('dd',{dir:'auto'},credit))),
      urls.photos.length > 0 && h('div', { className: 'mx-preview-gallery' }, urls.photos.map((url, index) => h('figure', { key: url }, h('img', { src: url, alt: captions[index] || 'Photo ' + (index + 1) }), captions[index] && h('figcaption', null, captions[index])))),
      urls.video && h('video', { controls: true, preload: 'metadata', src: urls.video, poster, 'aria-label': title || 'Vidéo à publier' },subtitles&&videoLanguages?.captionsValidated&&h('track',{kind:'subtitles',src:subtitles,srcLang:videoLanguages.captionsLanguage,label:videoLanguages.captionsLanguage==='fr'?'Français':'العربية',default:true})),
      mxHttps(videoUrl) && h('a', { className: 'button secondary', href: mxHttps(videoUrl), target: '_blank', rel: 'noreferrer' }, 'Vérifier le lien vidéo', h(Oe, { size: 16 })),
      urls.press && h('a', { className: 'button secondary', href: urls.press, target: '_blank', rel: 'noreferrer' }, 'Ouvrir le PDF sélectionné', h(Oe, { size: 16 })),
      pressText && h('div', { className: 'mx-preview-text', dir: language === 'ar' ? 'rtl' : 'auto' }, pressText),
      h('p', { className: 'mx-preview-note' }, mxManagementClient().current().localMode?'Le contenu sera visible dans l’accueil de ce navigateur après votre clic sur « Valider et publier ».':MxTestAdministration?'Cet essai sera visible dans l’accueil de ce navigateur après votre clic sur « Valider et publier ».':'Le contenu sera mis en ligne après votre clic sur « Valider et publier ».'),
      h('button', { className: 'button primary', onClick: onClose }, 'Revenir au formulaire')));
}

function MxPublishedList({ items, onOpen }) {
  const h = mxElement;
  const [query, setQuery] = O.useState('');
  const [contentLanguage,setContentLanguage]=O.useState('fr');
  const published = items.filter(item => item.status === 'published'&&item.language===contentLanguage);
  const filtered = published.filter(item => Ea([item.title, item.topic, ...item.keywords].join(' ')).includes(Ea(query)));
  return h('section', { className: 'mx-published', 'aria-labelledby': 'published-heading' },
    h('div', { className: 'mx-section-title' }, h('div', null, h('div', { className: 'eyebrow' }, 'SUIVI DES CONTENUS'), h('h2', { id: 'published-heading' }, mxManagementClient().current().localMode?'Publications':MxTestAdministration?'Publications et essais locaux':'Publications en ligne')), h('span', { className: 'mx-count' }, mxPlural(published.length, 'publication'))),
    h('div',{className:'mx-management-languages',role:'group','aria-label':'Langue des publications'},h('button',{type:'button','aria-pressed':contentLanguage==='fr',onClick:()=>setContentLanguage('fr')},'Français'),h('button',{type:'button','aria-pressed':contentLanguage==='ar',onClick:()=>setContentLanguage('ar')},'العربية')),
    published.length ? h(O.Fragment, null,
      h('label', { className: 'mx-management-search' }, 'Rechercher une publication', h('input', { type: 'search', value: query, onChange: event => setQuery(event.target.value), placeholder: 'Titre, thème ou mot-clé…' })),
      h('div', { className: 'mx-published-list' }, filtered.slice(0, 30).map(item => h('article', { key: item.id },
        h('div', null, h('small', null, nu[item.type], ' · ', Ya(item.date), item.localOnly?' · Ce navigateur':item.testOnly?' · Contenu de test':''), h('strong', { dir: 'auto' }, item.title)),
        h('div', null, h('button', { className: 'button secondary', onClick: () => onOpen(item) }, 'Consulter'),
          null)))),

      !filtered.length && h('p', { role: 'status' }, 'Aucune publication ne correspond à ces termes.'),
      filtered.length > 30 && h('p', null, 'Les 30 premiers résultats sont affichés. Précisez votre recherche.'))
      : h('p', { className: 'mx-management-empty' }, 'Aucun contenu n’est encore publié. Préparez votre première publication ci-dessus.'));
}
