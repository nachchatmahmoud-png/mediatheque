import {canonicalKeyword,keywordSearchText} from './keyword-catalog.ts';
export type MediaType = 'video' | 'photo' | 'press';
export type MediaItem = {
 id:string;type:MediaType;title:string;description:string;date:string;topic:string;language:string;status:'draft'|'published';
 content:string;location:string;credit:string;duration:string;thumbnailUrl:string;mediaUrl:string;fileUrl:string;captionsUrl:string;
 spokenLanguage?:string;captionsLanguage?:string;captionsSource?:string;captionsValidated?:boolean;
 photos:{url:string;caption:string}[];keywords:string[];transcript:string;eventId:string|null;eventTitle?:string;eventDate?:string;createdAt?:string;updatedAt?:string;demo?:boolean;
};
export type MediaEvent={id:string;title:string;description:string;date:string;topic:string;location:string;keywords:string[]};
export type PortalSettings={ministryName:string;subtitle:string;showDemo:boolean;contactEmail:string};
export const defaultSettings:PortalSettings={ministryName:"Ministère de l’Aménagement du Territoire National, de l’Urbanisme, de l’Habitat et de la Politique de la Ville",subtitle:'Portail institutionnel',showDemo:false,contactEmail:''};
export const topics=['Habitat et politique de la ville','Urbanisme et aménagement du territoire','Parlement','Architecture et patrimoine architectural','Coopération et partenariats','Formation et qualification des compétences','Vie institutionnelle'];
export const labels:Record<MediaType,string>={video:'Vidéothèque',photo:'Photothèque',press:'Espace médias'};
export const typeLabels:Record<MediaType,string>={video:'Vidéo',photo:'Album photo',press:'Communiqué de presse'};
export const blankMedia=():MediaItem=>({id:'',type:'video',title:'',description:'',date:new Date().toISOString().slice(0,10),topic:topics[0],language:'fr',status:'draft',content:'',location:'',credit:'',duration:'',thumbnailUrl:'',mediaUrl:'',fileUrl:'',captionsUrl:'',photos:[],keywords:[],transcript:'',eventId:null});
export const blankEvent=():MediaEvent=>({id:'',title:'',description:'',date:new Date().toISOString().slice(0,10),topic:topics[0],location:'',keywords:[]});
export const normalize=(s:string)=>s.normalize('NFD').replace(/\p{M}/gu,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').toLowerCase();
export function keywords(value:unknown):string[]{
 if(!Array.isArray(value))return [];const result:string[]=[];
 for(const v of value){const s=canonicalKeyword(bounded(v,'Mot-clé',80));if(s&&!result.some(k=>normalize(k)===normalize(s)))result.push(s);}
 if(result.length>30)throw new Error('Vous pouvez renseigner au maximum 30 mots-clés.');return result;
}
export function buildFtsQuery(value:string):string{
 const words=normalize(value).match(/[\p{L}\p{N}]+/gu)||[];
 return words.slice(0,16).map(w=>'"'+w.slice(0,60)+'"*').join(' AND ');
}
export function mediaIndexText(i:MediaItem,e?:MediaEvent|null):string{
 return normalize([i.title,i.description,i.date,i.topic,i.location,i.credit,i.content,i.transcript,keywordSearchText(i.keywords),...i.photos.map(p=>p.caption),e?.title,e?.description,e?.date,e?.topic,e?.location,keywordSearchText(e?.keywords||[])].filter(Boolean).join(' '));
}
export function safeMediaUrl(input:unknown):string{
 if(typeof input!=='string')return '';const value=input.trim();if(!value)return '';
 if(/^\/(api\/assets\/uploads\/|images\/|demo\/)[a-zA-Z0-9_./%?=&-]+$/.test(value)&&!value.includes('..')&&!value.toLowerCase().includes('%2e'))return value;
 try{const url=new URL(value);if(url.protocol==='https:'&&!url.username&&!url.password)return url.href;}catch{}
 throw new Error('Utilisez une adresse HTTPS valide ou un fichier importé.');
}
export function youtubeEmbed(value:string):string|null{
 try{const u=new URL(value);let id='';if(u.hostname==='youtu.be')id=u.pathname.slice(1);else if(['youtube.com','www.youtube.com','m.youtube.com','www.youtube-nocookie.com'].includes(u.hostname))id=u.searchParams.get('v')||u.pathname.split('/').filter(Boolean).at(-1)||'';if(/^[\w-]{11}$/.test(id))return 'https://www.youtube-nocookie.com/embed/'+id;}catch{}return null;
}
function bounded(v:unknown,name:string,max:number,required=false){const s=typeof v==='string'?v.trim():'';if((required&&!s)||s.length>max)throw new Error(name+' : '+(s.length>max?'longueur maximale de '+max+' caractères.':'champ obligatoire.'));return s;}
export function validateVideoLanguages(v:Record<string,unknown>){
 const spokenLanguage=bounded(v.spokenLanguage,'Langue parlée',10),captionsLanguage=bounded(v.captionsLanguage,'Langue des sous-titres',10),captionsSource=bounded(v.captionsSource,'Source des sous-titres',10),captionsValidated=v.captionsValidated===true;
 if(spokenLanguage&&!['ar','fr','mixed'].includes(spokenLanguage))throw new Error('La langue parlée est non valide.');
 if(captionsLanguage&&!['ar','fr'].includes(captionsLanguage))throw new Error('La langue des sous-titres est non valide.');
 if(captionsSource&&!['file','youtube'].includes(captionsSource))throw new Error('La source des sous-titres est non valide.');
 if(captionsSource||captionsLanguage||captionsValidated){
  if(v.type!=='video'||!captionsLanguage||!captionsSource||!captionsValidated)throw new Error('Vérifiez les sous-titres et confirmez leur validation avant publication.');
  const youtube=youtubeEmbed(String(v.mediaUrl||''));
  if(captionsSource==='youtube'&&(!youtube||v.captionsUrl))throw new Error('Les sous-titres YouTube doivent être publiés sur la vidéo YouTube correspondante.');
  if(captionsSource==='file'&&(!v.captionsUrl||youtube))throw new Error('Pour une vidéo YouTube, ajoutez les sous-titres dans YouTube Studio.');
 }
 return {spokenLanguage:v.type==='video'?spokenLanguage:'',captionsLanguage,captionsSource,captionsValidated};
}
export function validateMedia(input:unknown,{requireDescription=true}:{requireDescription?:boolean}={}):MediaItem{
 if(!input||typeof input!=='object')throw new Error('Publication non valide.');const v=input as Record<string,unknown>;
 if(!['video','photo','press'].includes(String(v.type)))throw new Error('Type de publication non valide.');
 if(!['draft','published'].includes(String(v.status)))throw new Error('État de publication non valide.');
 const date=bounded(v.date,'Date',10,true);if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw new Error('La date de publication est non valide.');
 const photos=Array.isArray(v.photos)?v.photos.map(p=>({url:safeMediaUrl(p?.url),caption:bounded(p?.caption,'Légende',300)})).filter(p=>p.url):[];
 if(photos.length>30)throw new Error('Un album peut contenir au maximum 30 photographies.');
 const item:MediaItem={id:'',type:v.type as MediaType,title:bounded(v.title,'Titre',180,true),description:bounded(v.description,'Description',1200,requireDescription),date,topic:bounded(v.topic,'Classification',100,true),language:bounded(v.language,'Langue',10,true),status:v.status as MediaItem['status'],content:bounded(v.content,'Texte du communiqué',40000),location:bounded(v.location,'Lieu',150),credit:bounded(v.credit,'Crédit',200),duration:bounded(v.duration,'Durée',20),thumbnailUrl:safeMediaUrl(v.thumbnailUrl),mediaUrl:safeMediaUrl(v.mediaUrl),fileUrl:safeMediaUrl(v.fileUrl),captionsUrl:safeMediaUrl(v.captionsUrl),photos,keywords:keywords(v.keywords),transcript:bounded(v.transcript,'Transcription',60000),eventId:bounded(v.eventId,'Événement',80)||null};
 Object.assign(item,validateVideoLanguages({...v,mediaUrl:item.mediaUrl,captionsUrl:item.captionsUrl}));
 if(!topics.includes(item.topic))throw new Error('Choisissez une rubrique de la classification.');
 if(item.status==='published'&&!item.keywords.length)throw new Error('Renseignez au moins un mot-clé avant de publier ce contenu.');
 if(item.type==='video'&&!item.mediaUrl)throw new Error('Ajoutez un fichier vidéo ou son adresse HTTPS.');
 if(item.type==='photo'&&!photos.length)throw new Error('Ajoutez au moins une photographie à l’album.');
 if(item.type==='press'&&!item.content&&!item.fileUrl)throw new Error('Saisissez le texte du communiqué ou joignez son PDF.');return item;
}
export function filterMedia(items:MediaItem[],f:{type:string;query:string;year:string;topic:string;sort:string;language?:string}){
 const terms=normalize(f.query.trim()).match(/[\p{L}\p{N}]+/gu)||[];return items.filter(i=>(f.type==='all'||i.type===f.type)&&(!f.year||i.date.startsWith(f.year))&&(!f.topic||i.topic===f.topic)&&(!f.language||i.language===f.language)&&terms.every(q=>normalize([mediaIndexText(i),i.eventTitle].join(' ')).includes(q))).sort((a,b)=>f.sort==='oldest'?a.date.localeCompare(b.date):f.sort==='title'?a.title.localeCompare(b.title,'fr'):b.date.localeCompare(a.date));
}
export function validateEvent(input:unknown,{requireDescription=true}:{requireDescription?:boolean}={}):MediaEvent{
 if(!input||typeof input!=='object')throw new Error('Événement non valide.');const v=input as Record<string,unknown>;
 const date=bounded(v.date,'Date',10,true);if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw new Error('La date de l’événement est non valide.');
 const topic=bounded(v.topic,'Classification',100,true);if(!topics.includes(topic))throw new Error('Choisissez une rubrique de la classification.');
 const tags=keywords(v.keywords);if(!tags.length)throw new Error('Renseignez au moins un mot-clé pour l’événement.');
 return {id:'',title:bounded(v.title,'Titre',180,true),description:bounded(v.description,'Présentation de l’événement',2000,requireDescription),date,topic,location:bounded(v.location,'Lieu',150),keywords:tags};
}
export const formatDate=(s:string)=>new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(s+'T12:00:00Z'));
export function parseByteRange(value:string|null,size:number):{offset:number;length:number}|null{
 if(!value)return null;
 const m=/^bytes=(\d*)-(\d*)$/.exec(value);if(!m||(!m[1]&&!m[2])||size<1)throw new Error('RANGE');
 let start:number,end:number;
 if(!m[1]){const suffix=Number(m[2]);if(!suffix)throw new Error('RANGE');start=Math.max(0,size-suffix);end=size-1;}
 else{start=Number(m[1]);end=m[2]?Math.min(Number(m[2]),size-1):size-1;}
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>=size||end<start)throw new Error('RANGE');
 return {offset:start,length:end-start+1};
}
