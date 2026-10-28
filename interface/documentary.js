// Subjects are chosen explicitly; suggestions never become keywords automatically.
function MxDocumentaryFields({topic,value,onChange}){
 const h=mxElement,[query,setQuery]=O.useState(''),[expanded,setExpanded]=O.useState(false);
 const normalize=MX_DOC_RUNTIME.normalizeKeyword,words=normalize(query).split(' ').filter(Boolean);
 const matchesTopic=term=>MX_DOC_RUNTIME.keywordMatchesTopic(term,topic);
 const terms=MX_DOC_RUNTIME.keywordCatalog.filter(term=>!value.includes(term.label)&&(words.length?words.every(word=>[term.label,...term.aliases].some(name=>normalize(name).includes(word))):matchesTopic(term))).sort((a,b)=>Number(matchesTopic(b))-Number(matchesTopic(a)));
 const subjects=terms.filter(term=>term.kind!=='organization'),organizations=terms.filter(term=>term.kind==='organization');
 const visible=words.length||expanded?subjects:subjects.slice(0,8);
 const choice=term=>h('button',{key:term.label,type:'button',disabled:value.length>=8,'aria-label':'Ajouter le mot-clé '+term.label,onClick:()=>onChange([...value,term.label])},h('span',null,term.label),!matchesTopic(term)&&h('small',null,term.topic));
 O.useEffect(()=>{setQuery('');setExpanded(false);},[topic]);
 return h('section',{className:'mx-documentary','aria-label':'Indexation documentaire'},
  h('div',{className:'mx-documentary-heading'},h('h3',null,'Mots-clés documentaires *'),h('span',null,value.length+' / 8')),
  h('p',null,'Choisissez les sujets réellement traités. Le domaine principal ne remplace pas les mots-clés.'),
  !topic?h('p',{className:'mx-documentary-empty'},'Choisissez d’abord le domaine principal pour afficher les mots-clés adaptés.'):
  h(O.Fragment,null,
   value.length>0&&h('div',{className:'mx-documentary-selected','aria-label':'Mots-clés sélectionnés'},...value.map(label=>h('button',{key:label,type:'button','aria-label':'Retirer le mot-clé '+label,onClick:()=>onChange(value.filter(item=>item!==label))},label,h('span',{'aria-hidden':true},'×')))),
   h('label',{className:'mx-documentary-search'},'Rechercher dans le référentiel',h('input',{type:'search','aria-label':'Rechercher un mot-clé documentaire',placeholder:'Ex. : logement social, SDAU, patrimoine…',value:query,onChange:event=>setQuery(event.target.value)})),
   h('div',{className:'mx-documentary-options','aria-label':'Mots-clés proposés'},...visible.map(choice)),
   organizations.length>0&&h('section',{'aria-label':'Institutions et partenaires'},h('h4',null,'Institutions et partenaires'),h('p',null,'Sélectionnez les organismes effectivement concernés par le contenu.'),h('div',{className:'mx-documentary-options'},...organizations.map(choice))),
   !visible.length&&!organizations.length&&h('p',{className:'mx-documentary-empty'},words.length?'Aucun terme correspondant. Essayez un synonyme ou un autre domaine.':'Tous les mots-clés proposés sont sélectionnés.'),
   !words.length&&!expanded&&subjects.length>visible.length&&h('button',{type:'button',className:'mx-documentary-more',onClick:()=>setExpanded(true)},'Voir tous les mots-clés du domaine'),
   h('small',null,'1 à 8 mots-clés, dont au moins un sujet du domaine principal.')));
}
