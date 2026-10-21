// Components share the retained React runtime and media readers in app.js.
// No external service, additional framework or runtime dependency is required.
const mxElement = (...args) => O.createElement(...args);
const mxStorage = {
  get(key, fallback = '') { try { return localStorage.getItem(key) || fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch {} },
};
const mxSize = bytes => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(bytes / 1048576) + ' Mio';
const mxPlural = (count, singular, plural = singular + 's') => count + ' ' + (MX_LOCALE==='ar'?(MX_MESSAGES[singular]||singular):(count > 1 ? plural : singular));
function mxValidateFile(file, kind) {
  const extensions = { photo: /\.(jpe?g|png|webp)$/i, video: /\.(mp4|webm)$/i, press: /\.pdf$/i };
  const limits = { photo: 12, video: 25, press: 20 };
  if (!extensions[kind].test(file.name)) throw new Error(file.name + ' : format non accepté.');
  if (!file.size || file.size > limits[kind] * 1048576) throw new Error(file.name + ' : le fichier doit contenir entre 1 octet et ' + limits[kind] + ' Mio.');
}

function mxHttps(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''; } catch { return ''; }
}

function mxPublicationSuffix() {
  return Array.from(crypto.getRandomValues(new Uint8Array(6)), value => value.toString(16).padStart(2, '0')).join('');
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

function MxPhotoPreview({ file, caption, index, total, onCaption, onRemove, onMove }) {
  const h = mxElement;
  const [url, setUrl] = O.useState('');
  O.useEffect(() => { const next = URL.createObjectURL(file); setUrl(next); return () => URL.revokeObjectURL(next); }, [file]);
  return h('article', { className: 'mx-photo-preview' },
    h('div', { className: 'mx-photo-thumb' }, url && h('img', { src: url, alt: caption || file.name }),
      index === 0 && h('span', null, 'Couverture de l’album')),
    h('div', { className: 'mx-photo-info' }, h('strong', { title: file.name }, file.name), h('small', null, mxSize(file.size)),
      h('label', { htmlFor: 'mx-caption-' + index }, 'Légende de la photo ' + (index + 1)),
      h('input', { id: 'mx-caption-' + index, value: caption, onChange: event => onCaption(event.target.value), maxLength: 300, placeholder: 'Décrire brièvement la photographie…' }),
      h('div', { className: 'mx-photo-actions' },
        h('button', { type: 'button', disabled: index === 0, onClick: () => onMove(index - 1), 'aria-label': 'Déplacer la photo ' + (index + 1) + ' vers le début' }, '← Monter'),
        h('button', { type: 'button', disabled: index === total - 1, onClick: () => onMove(index + 1), 'aria-label': 'Déplacer la photo ' + (index + 1) + ' vers la fin' }, 'Descendre →'),
        h('button', { type: 'button', className: 'mx-remove', onClick: onRemove, 'aria-label': 'Retirer ' + file.name }, 'Retirer'))));
}

function MxPublicationPreview({ title, date, topic, description, language, photos, captions, video, videoUrl, press, pressText, onClose }) {
  const h = mxElement;
  const [urls, setUrls] = O.useState({ photos: [], video: '', press: '' });
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
      description && h('p', { dir: language === 'ar' ? 'rtl' : 'auto' }, description),
      urls.photos.length > 0 && h('div', { className: 'mx-preview-gallery' }, urls.photos.map((url, index) => h('figure', { key: url }, h('img', { src: url, alt: captions[index] || 'Photo ' + (index + 1) }), captions[index] && h('figcaption', null, captions[index])))),
      urls.video && h('video', { controls: true, preload: 'metadata', src: urls.video, 'aria-label': title || 'Vidéo à publier' }),
      mxHttps(videoUrl) && h('a', { className: 'button secondary', href: mxHttps(videoUrl), target: '_blank', rel: 'noreferrer' }, 'Vérifier le lien vidéo', h(Oe, { size: 16 })),
      urls.press && h('a', { className: 'button secondary', href: urls.press, target: '_blank', rel: 'noreferrer' }, 'Ouvrir le PDF sélectionné', h(Oe, { size: 16 })),
      pressText && h('div', { className: 'mx-preview-text', dir: language === 'ar' ? 'rtl' : 'auto' }, pressText),
      h('p', { className: 'mx-preview-note' }, 'Le contenu sera mis en ligne après votre clic sur « Valider et publier ».'),
      h('button', { className: 'button primary', onClick: onClose }, 'Revenir au formulaire')));
}

function MxPublishedList({ items, onOpen }) {
  const h = mxElement;
  const [query, setQuery] = O.useState('');
  const [contentLanguage,setContentLanguage]=O.useState('fr');
  const published = items.filter(item => item.status === 'published'&&item.language===contentLanguage);
  const filtered = published.filter(item => Ea([item.title, item.topic, ...item.keywords].join(' ')).includes(Ea(query)));
  return h('section', { className: 'mx-published', 'aria-labelledby': 'published-heading' },
    h('div', { className: 'mx-section-title' }, h('div', null, h('div', { className: 'eyebrow' }, 'SUIVI DES CONTENUS'), h('h2', { id: 'published-heading' }, 'Publications en ligne')), h('span', { className: 'mx-count' }, mxPlural(published.length, 'publication'))),
    h('div',{className:'mx-management-languages',role:'group','aria-label':'Langue des publications'},h('button',{type:'button','aria-pressed':contentLanguage==='fr',onClick:()=>setContentLanguage('fr')},'Français'),h('button',{type:'button','aria-pressed':contentLanguage==='ar',onClick:()=>setContentLanguage('ar')},'العربية')),
    published.length ? h(O.Fragment, null,
      h('label', { className: 'mx-management-search' }, 'Rechercher une publication en ligne', h('input', { type: 'search', value: query, onChange: event => setQuery(event.target.value), placeholder: 'Titre, thème ou mot-clé…' })),
      h('div', { className: 'mx-published-list' }, filtered.slice(0, 30).map(item => h('article', { key: item.id },
        h('div', null, h('small', null, nu[item.type], ' · ', Ya(item.date)), h('strong', { dir: 'auto' }, item.title)),
        h('div', null, h('button', { className: 'button secondary', onClick: () => onOpen(item) }, 'Consulter'),
          null)))),

      !filtered.length && h('p', { role: 'status' }, 'Aucune publication ne correspond à ces termes.'),
      filtered.length > 30 && h('p', null, 'Les 30 premiers résultats sont affichés. Précisez votre recherche.'))
      : h('p', { className: 'mx-management-empty' }, 'Aucun contenu n’est encore publié. Préparez votre première publication ci-dessus.'));
}
