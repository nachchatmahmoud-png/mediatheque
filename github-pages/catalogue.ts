import {validateEvent,type MediaItem,type MediaEvent,defaultSettings} from '../app/lib/model.ts';

export const MIB=1024*1024;
const text=(v:unknown,max:number,label:string)=>{if(v===undefined)return '';if(typeof v!=='string'||v.length>max)throw new Error(label+' non valide.');return v.trim();};
function records(value:unknown,label:string,max:number):Record<string,unknown>[]{
 if(value===undefined)return [];if(!Array.isArray(value)||value.length>max||value.some(v=>!v||typeof v!=='object'||Array.isArray(v)))throw new Error(label+' non valide.');return value;
}
export function assetPath(value:unknown,kind:'photo'|'video'|'press'|'captions'){
 const pattern={photo:/^photos\/[a-z0-9][a-z0-9_-]*\.(jpg|jpeg|png|webp)$/i,video:/^videos\/[a-z0-9][a-z0-9_-]*\.(mp4|webm)$/i,press:/^communiques\/[a-z0-9][a-z0-9_-]*\.pdf$/i,captions:/^videos\/[a-z0-9][a-z0-9_-]*\.vtt$/i};
 if(typeof value!=='string'||!pattern[kind].test(value))throw new Error('Chemin du fichier '+kind+' non valide.');return value;
}
export function validateAsset(bytes:Uint8Array,file:string){
 const ext=file.split('.').at(-1)!.toLowerCase(),limit={jpg:12,jpeg:12,png:12,webp:12,mp4:25,webm:25,pdf:20,vtt:1}[ext];
 if(!limit||!bytes.length||bytes.length>limit*MIB)throw new Error(file+' : taille non valide ou supérieure à '+limit+' Mio.');
 const head=new TextDecoder('latin1').decode(bytes.subarray(0,16));
 const valid=ext==='jpg'||ext==='jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:ext==='png'?bytes[0]===137&&head.slice(1,4)==='PNG'&&bytes[4]===13&&bytes[5]===10&&bytes[6]===26&&bytes[7]===10:ext==='webp'?head.startsWith('RIFF')&&head.slice(8,12)==='WEBP':ext==='mp4'?head.slice(4,8)==='ftyp':ext==='webm'?bytes[0]===0x1a&&bytes[1]===0x45&&bytes[2]===0xdf&&bytes[3]===0xa3:ext==='pdf'?head.startsWith('%PDF-'):new TextDecoder().decode(bytes.subarray(0,100)).replace(/^\uFEFF/,'').startsWith('WEBVTT');
 if(!valid)throw new Error(file+' : le contenu ne correspond pas au format annoncé.');
}
export function publicationToCatalogue(raw:unknown,id:string){
 if(!/^[a-z0-9][a-z0-9-]{2,79}$/.test(id))throw new Error('Le nom du dossier doit comporter 3 à 80 lettres minuscules, chiffres ou tirets.');
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Fiche de publication non valide.');
 const v=raw as Record<string,unknown>;
 if(v.version!==1||!['draft','published'].includes(String(v.status)))throw new Error('Version ou état de la publication non valide.');
 const event:MediaEvent={...validateEvent(v,{requireDescription:false}),id};
 if(v.language!==undefined&&!['fr','ar'].includes(String(v.language)))throw new Error('Langue non valide.');
 const credit=text(v.credit,200,'Crédit'),language=v.language==='ar'?'ar':'fr',assets=new Set<string>();
 const file=(value:unknown,kind:'photo'|'video'|'press'|'captions')=>{const path=assetPath(value,kind);assets.add(path);return './medias/'+id+'/'+path;};
 const common={description:event.description,date:event.date,topic:event.topic,language,location:event.location,credit,keywords:event.keywords,eventId:id,eventTitle:event.title,eventDate:event.date,status:'published' as const,duration:'',thumbnailUrl:'',mediaUrl:'',fileUrl:'',captionsUrl:'',photos:[],content:'',transcript:''};
 const items:MediaItem[]=[],photos=records(v.photos,'Photographies',30).map(p=>({url:file(p.file,'photo'),caption:text(p.caption,300,'Légende')}));
 if(photos.length)items.push({...common,id:id+'-photos',type:'photo',title:event.title,photos,thumbnailUrl:photos[0].url});
 records(v.videos,'Vidéos',10).forEach((video,index)=>{
  let url='';if(video.file)url=file(video.file,'video');else{const source=text(video.url,2000,'Adresse vidéo');let parsed:URL;try{parsed=new URL(source);}catch{throw new Error('Adresse vidéo HTTPS obligatoire.');}if(parsed.protocol!=='https:'||parsed.username||parsed.password)throw new Error('Adresse vidéo HTTPS obligatoire.');url=parsed.href;}
  const thumbnailUrl=video.cover?file(video.cover,'photo'):photos[0]?.url||'';
  items.push({...common,id:id+'-video-'+(index+1),type:'video',title:text(video.title,180,'Titre vidéo')||event.title,mediaUrl:url,thumbnailUrl,transcript:text(video.transcript,60000,'Transcription'),captionsUrl:video.captions?file(video.captions,'captions'):''});
 });
 records(v.press,'Communiqués',10).forEach((press,index)=>{
  const content=text(press.text,40000,'Texte du communiqué'),fileUrl=press.file?file(press.file,'press'):'';if(!content&&!fileUrl)throw new Error('Ajoutez le PDF ou le texte du communiqué.');
  items.push({...common,id:id+'-press-'+(index+1),type:'press',title:text(press.title,180,'Titre du communiqué')||event.title,content,fileUrl});
 });
 if(v.status==='published'&&!items.length)throw new Error('Ajoutez au moins une vidéo, un album ou un communiqué.');
 return {event,items,assets:[...assets],published:v.status==='published'};
}
export const emptyCatalogue=()=>({items:[] as MediaItem[],events:[] as MediaEvent[],settings:{...defaultSettings},isAdmin:false as const});
