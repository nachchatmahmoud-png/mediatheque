// The page path fixes the consultation language. Content itself is not translated.
const MX_LOCALE=document.documentElement.lang==='ar'?'ar':'fr';
/*__MX_MESSAGES__*/
function mxT(value){return MX_LOCALE==='ar'?(MX_MESSAGES[value]||value):value;}
function mxPageUrl(language,origin){
 const root=origin?new URL('/',origin):new URL('.',document.baseURI);
 return new URL((language==='ar'?'ar':'fr')+'/',root);
}
function mxManagementUrl(){const url=mxPageUrl('fr',MX_SERVICE.origin);url.searchParams.set('view','manage');return url;}
function mxDetectedLanguage(value){return /[\u0600-\u06ff]/u.test(value||'')?'ar':/[a-zA-ZÀ-ÿ]/u.test(value||'')?'fr':null;}
function mxLocaleCatalogue(catalogue){
 const items=(catalogue.items||[]).filter(item=>item.language===MX_LOCALE).map(item=>({...item,topic:mxT(item.topic),keywords:(item.keywords||[]).map(mxT)}));
 const eventIds=new Set(items.map(item=>item.eventId));
 const events=(catalogue.events||[]).filter(event=>eventIds.has(event.id)).map(event=>({...event,topic:mxT(event.topic),keywords:(event.keywords||[]).map(mxT)}));
 return {...catalogue,items,events,settings:{...catalogue.settings,ministryName:MX_LOCALE==='ar'?'وزارة إعداد التراب الوطني والتعمير والإسكان وسياسة المدينة':catalogue.settings?.ministryName||'Médiathèque'}};
}
function MxLanguageSwitch(){
 const h=mxElement;
 return h('nav',{className:'mx-language-switch','aria-label':MX_LOCALE==='ar'?'اختيار اللغة':'Choisir la langue'},
  h('a',{href:String(mxPageUrl('fr')),lang:'fr',hrefLang:'fr','aria-current':MX_LOCALE==='fr'?'page':undefined},'Français'),
  h('span',{'aria-hidden':true},'|'),
  h('a',{href:String(mxPageUrl('ar')),lang:'ar',hrefLang:'ar','aria-current':MX_LOCALE==='ar'?'page':undefined},'العربية'));
}
function MxLanguageFeature({onExplore}){
 const h=mxElement;
 return h('section',{className:'mx-language-feature'},h('div',{className:'eyebrow'},'VOTRE MÉDIATHÈQUE'),h('div',{className:'mx-feature-symbol','aria-hidden':true},h(Ta,{size:32}),h(pa,{size:30}),h(ma,{size:29})),h('h2',null,'L’information, sous toutes ses formes.'),h('p',null,'Retrouvez les vidéos, les photographies et les communiqués de cette version de la médiathèque.'),h('button',{className:'button primary',onClick:onExplore},'Explorer les publications',h(wl,{size:17})));
}
