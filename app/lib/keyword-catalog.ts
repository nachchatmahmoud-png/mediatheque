type Term={label:string;topic:string;aliases:string[]};
const habitat='Habitat et politique de la ville',urbanisme='Urbanisme et aménagement du territoire',parlement='Parlement',architecture='Architecture et patrimoine architectural',cooperation='Coopération et partenariats',formation='Formation et qualification des compétences',institution='Vie institutionnelle';
const group=(topic:string,values:(string|[string,...string[]])[]):Term[]=>values.map(v=>typeof v==='string'?{label:v,topic,aliases:[]}:{label:v[0],topic,aliases:v.slice(1)});
// Documentary vocabulary: decree 2-23-751, articles 1 and 7–19, plus official programme publications.
// Sources and editorial scope are recorded in REPERTOIRE_MOTS_CLES.md.
export const keywordCatalog:Term[]=[
 ...group(habitat,[['Aide directe au logement','Daam Sakane','Daamsakane','دعم السكن'],['Accès au logement','الولوج إلى السكن'],['Logement social','السكن الاجتماعي'],['Villes sans bidonvilles','VSB','مدن بدون صفيح'],['Lutte contre l’habitat insalubre','Habitat indigne','السكن غير اللائق'],'Relogement','Promotion immobilière','Politique de la ville',['Intégration urbaine','الاندماج الحضري'],'Requalification urbaine','Villes nouvelles','Mobilisation du foncier','Qualité et sécurité des constructions',['Reconstruction post-séisme','Reconstruction après séisme','إعادة الإعمار'],'Al Haouz']),
 ...group(urbanisme,[['Aménagement du territoire','إعداد التراب الوطني'],['Planification territoriale','التخطيط الترابي'],'Développement territorial','Équité territoriale','Convergence des politiques publiques',['Développement rural','التنمية القروية'],['Documents d’urbanisme','وثائق التعمير'],['Planification urbaine','التخطيط الحضري'],'Urbanisme durable',['Urbanisme en milieu rural','Urbanisme rural'],'Urbanisme opérationnel','Agences urbaines',['Schéma directeur d’aménagement urbain (SDAU)','SDAU'],['Plan d’aménagement (PA)','Plan d’aménagement'],['Schéma régional d’aménagement du territoire (SRAT)','SRAT'],['Autorisations de construire','Permis de construire'],'Assistance architecturale et technique','Investissement territorial']),
 ...group(parlement,[['Questions orales','Question orale','الأسئلة الشفهية'],['Questions écrites','Question écrite'],'Chambre des représentants','Chambre des conseillers','Commission parlementaire',['Projet de loi de finances','PLF'],'Examen du budget','Bilan des programmes','Textes législatifs et réglementaires']),
 ...group(architecture,['Architecture','Qualité architecturale','Patrimoine architectural','Réhabilitation du patrimoine','Architecture traditionnelle','Paysage urbain','Métiers de l’architecture','Innovation dans la construction']),
 ...group(cooperation,['Conventions de partenariat','Coopération bilatérale','Coopération multilatérale',['ONU-Habitat','UN-Habitat'],'Partenariat territorial','Concertation entre acteurs']),
 ...group(formation,['Formation initiale','Formation continue','Qualification des cadres','Recherche et innovation',['Institut national d’aménagement et d’urbanisme (INAU)','INAU'],['Écoles nationales d’architecture (ENA)','ENA'],'Renforcement des compétences']),
 ...group(institution,['Visite de terrain','Réunion de coordination','Lancement de projet','Suivi et évaluation','Gouvernance','Communication institutionnelle','Transformation numérique','Observation territoriale']),
];
export const normalizeKeyword=(s:string)=>s.normalize('NFD').replace(/\p{M}/gu,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const byAlias=new Map(keywordCatalog.flatMap(t=>[t.label,...t.aliases].map(a=>[normalizeKeyword(a),t] as const)));
export function canonicalKeyword(value:string){return byAlias.get(normalizeKeyword(value))?.label||value.trim();}
export function keywordSearchText(values:string[]){return values.flatMap(v=>{const term=byAlias.get(normalizeKeyword(v));return term?[term.label,...term.aliases]:[v];}).join(' ');}
export function parseKeywordText(value:string){return Array.from(new Set(value.split(/[,;\n]+/).map(v=>canonicalKeyword(v.trim())).filter(Boolean)));}
export type KeywordTopicMatch={topic:string;keywords:string[];score:number};
const topicOrder=[habitat,urbanisme,parlement,architecture,cooperation,formation,institution];
const broadTopics=new Map(topicOrder.map(topic=>[normalizeKeyword(topic),topic]));
for(const [label,topic] of [['Habitat',habitat],['Urbanisme',urbanisme],['Aménagement du territoire',urbanisme],['Parlement',parlement],['Coopération',cooperation],['Formation',formation]])broadTopics.set(normalizeKeyword(label),topic);
export function rankKeywordTopics(values:string[]):KeywordTopicMatch[]{
 const matches=new Map<string,string[]>(),seen=new Set<string>();
 for(const raw of values){
  const label=canonicalKeyword(raw),key=normalizeKeyword(label);if(!key||seen.has(key))continue;seen.add(key);
  const topic=byAlias.get(key)?.topic||broadTopics.get(key);if(!topic)continue;
  const terms=matches.get(topic)||[];terms.push(label);matches.set(topic,terms);
 }
 return [...matches].map(([topic,keywords])=>({topic,keywords,score:keywords.length})).sort((a,b)=>b.score-a.score||topicOrder.indexOf(a.topic)-topicOrder.indexOf(b.topic));
}
export function preferredKeywordTopic(values:string[]):string|null{
 const ranked=rankKeywordTopics(values);return ranked.length&&(!ranked[1]||ranked[0].score>ranked[1].score)?ranked[0].topic:null;
}
const stopWords=new Set(['les','des','une','dans','pour','avec','sans','sur','aux','est','ses','du','de','la','le','et','au','en','un']);
export function suggestKeywords({topic,text,selected=[],query=''}:{topic:string;text:string;selected?:string[];query?:string}){
 const normalized=' '+normalizeKeyword(text.slice(0,100000))+' ',tokens=new Set(normalized.split(' ')),chosen=new Set(selected.map(v=>normalizeKeyword(canonicalKeyword(v)))),search=normalizeKeyword(query).split(' ').filter(Boolean);
 return keywordCatalog.map((term,index)=>{
  const names=[term.label,...term.aliases].map(normalizeKeyword);
  const match=Math.max(...names.map(name=>{if(normalized.includes(' '+name+' '))return 30;const words=name.split(' ').filter(w=>w.length>2&&!stopWords.has(w));return words.length>1&&words.every(w=>tokens.has(w))?15:0;}));
  return {term,index,score:match+(term.topic===topic?5:0),matchesSearch:search.every(q=>names.some(n=>n.includes(q)))};
 }).filter(x=>!chosen.has(normalizeKeyword(x.term.label))&&x.matchesSearch&&(search.length||x.score>0)).sort((a,b)=>b.score-a.score||a.index-b.index).map(x=>x.term.label);
}
