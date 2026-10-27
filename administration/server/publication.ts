import {publicationToCatalogue,validateAsset,MIB} from '../../github-pages/catalogue.ts';
import {topics,youtubeEmbed,validatePublicationTranslations} from '../../app/lib/model.ts';
import {validateDocumentaryKeywords} from '../../app/lib/keyword-catalog.ts';

export class ServiceError extends Error {
  status:number;
  constructor(message:string,status=400){super(message);this.status=status;}
}
export const uuid=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value);
export type Upload={id:string;accountId:string;path:string;name:string;size:number;digest:string;createdAt:string};
export type Asset={path:string;upload:Upload};
export type PreparedPublication={folder:string;id:string;record:Record<string,unknown>;assets:Asset[]};
export const digest=async(bytes:Uint8Array)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes)))).map(value=>value.toString(16).padStart(2,'0')).join('');
const text=(value:unknown,max:number,required=false)=>{const result=typeof value==='string'?value.trim():'';if((required&&!result)||result.length>max)throw new ServiceError('Un champ est vide ou dépasse la longueur autorisée.');return result;};
const https=(value:unknown)=>{try{const url=new URL(text(value,2000,true));if(url.protocol!=='https:'||url.username||url.password)throw new Error();return url.href;}catch{throw new ServiceError('Utilisez un lien vidéo HTTPS valide.');}};
const extensions={photo:['jpg','jpeg','png','webp'],video:['mp4','webm'],press:['pdf'],captions:['vtt']};
export function validateUpload(bytes:Uint8Array,name:string){
  validateAsset(bytes,name);
  if(/\.vtt$/i.test(name)){
    const content=new TextDecoder('utf-8',{fatal:true}).decode(bytes).replace(/^\uFEFF/,'');
    if(!/^WEBVTT(?:[ \t][^\r\n]*)?\r?\n/.test(content)||!/(?:\d{2}:)?\d{2}:\d{2}\.\d{3}\s+-->\s+(?:\d{2}:)?\d{2}:\d{2}\.\d{3}/.test(content))throw new ServiceError('Le sous-titrage doit être un fichier WebVTT contenant des repères temporels.');
  }
}

export async function preparePublication(input:unknown,accountId:string,findUpload:(id:string)=>Promise<Upload|null>):Promise<PreparedPublication>{
  if(!uuid(accountId)||!input||typeof input!=='object'||Array.isArray(input))throw new ServiceError('Fiche de publication non valide.');
  const v=input as Record<string,any>;
  if(!uuid(v.requestId)||!['photo','video','press'].includes(v.type)||!['fr','ar'].includes(v.language)||!topics.includes(v.topic))throw new ServiceError('Vérifiez le type, la langue et la rubrique de la publication.');
  const date=text(v.date,10,true);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw new ServiceError('La date de publication est non valide.');
  const folder='publication-'+date.replaceAll('-','')+'-'+accountId.slice(0,8)+'-'+v.requestId;
  const assets:Asset[]=[],paths=new Map<string,string>();
  const asset=async(ref:unknown,kind:keyof typeof extensions,name:string)=>{
    if(typeof ref!=='string'||!ref.startsWith('admin-upload:')||!uuid(ref.slice(13)))throw new ServiceError('Référence de fichier non valide.');
    if(paths.has(ref))return paths.get(ref)!;
    const upload=await findUpload(ref.slice(13));
    if(!upload||upload.accountId!==accountId||!uuid(upload.id)||!upload.path.startsWith(accountId+'/'+upload.id+'/')||Date.parse(upload.createdAt)<Date.now()-24*60*60*1000)throw new ServiceError('Ce fichier n’est plus disponible pour votre compte. Sélectionnez-le à nouveau.');
    const ext=upload.name.split('.').at(-1)!.toLowerCase();
    if(!extensions[kind].includes(ext))throw new ServiceError('Le format du fichier ne correspond pas au support demandé.');
    const path=name+'.'+ext;paths.set(ref,path);assets.push({path,upload});return path;
  };
  let keywords:string[];
  try{keywords=validateDocumentaryKeywords(v.topic,v.keywords);}catch(error){throw new ServiceError(error instanceof Error?error.message:'Vérifiez les mots-clés documentaires.');}
  const record:Record<string,any>={version:1,status:'published',title:text(v.title,180,true),date,topic:v.topic,language:v.language,description:text(v.description,1200),credit:text(v.credit,200),keywords};
  if(v.translations!==undefined){
    try{record.translations=validatePublicationTranslations(v.translations,v.type);}catch(error){throw new ServiceError(error instanceof Error?error.message:'Vérifiez les textes des pages sélectionnées.');}
    const primary=record.translations[v.language];if(!primary)throw new ServiceError('La page principale doit être sélectionnée.');
    Object.assign(record,primary);
  }
  if(v.type==='photo'){
    record.location=record.translations?record.location:text(v.location,150);
    if(!Array.isArray(v.photos)||!v.photos.length||v.photos.length>30||v.photos.some((p:any)=>!p||typeof p!=='object'))throw new ServiceError('Sélectionnez entre 1 et 30 photographies.');
    if(record.translations&&Object.values(record.translations).some((fields:any)=>fields.captions.length&&fields.captions.length!==v.photos.length))throw new ServiceError('Vérifiez les légendes de chaque photographie.');
    record.photos=[];
    for(let i=0;i<v.photos.length;i++)record.photos.push({file:await asset(v.photos[i].url,'photo','photos/photo-'+String(i+1).padStart(2,'0')),caption:record.translations?record.captions[i]||'':text(v.photos[i].caption,300)});
    record.cover=paths.get(v.thumbnailUrl)||record.photos[0].file;
  }
  if(v.type==='video'){
    const uploaded=typeof v.mediaUrl==='string'&&v.mediaUrl.startsWith('admin-upload:');
    const media=uploaded?{file:await asset(v.mediaUrl,'video','videos/video')}:{url:https(v.mediaUrl)};
    const isYoutube=!!youtubeEmbed('url' in media?media.url||'':'');
    if(!['ar','fr','mixed'].includes(v.spokenLanguage))throw new ServiceError('Choisissez la langue parlée dans la vidéo.');
    if(!record.translations&&v.language==='fr'&&v.spokenLanguage!=='fr'&&!record.description)throw new ServiceError('Ajoutez un bref résumé en français.');
    const video:Record<string,unknown>={...media,title:record.title,spokenLanguage:v.spokenLanguage,captionsLanguage:v.captionsLanguage||'',captionsSource:v.captionsSource||'',captionsValidated:v.captionsValidated===true};
    if(typeof v.thumbnailUrl==='string'&&v.thumbnailUrl.startsWith('admin-upload:'))video.cover=await asset(v.thumbnailUrl,'photo','photos/miniature');
    else if(!isYoutube)throw new ServiceError('Ajoutez une miniature pour cette vidéo.');
    if(v.captionsSource==='file'){
      if(isYoutube)throw new ServiceError('Pour YouTube, publiez les sous-titres dans YouTube Studio.');
      video.captions=await asset(v.captionsUrl,'captions','videos/sous-titres-'+text(v.captionsLanguage,2,true));
    }
    record.videos=[video];
  }
  if(v.type==='press'){
    let press:Record<string,string>;
    if(record.translations){
      const fallback=Object.keys(record.translations).map(locale=>v.translations[locale].fileUrl).find(Boolean);
      for(const [locale,fields] of Object.entries(record.translations) as [string,Record<string,any>][]){
        delete fields.file;
        const ref=v.translations[locale].fileUrl||fallback;
        if(ref)fields.file=await asset(ref,'press','communiques/communique-'+locale);
        if(!fields.content&&!fields.file)throw new ServiceError(locale==='fr'?'Joignez le PDF en français ou saisissez le texte en français.':'Joignez le PDF en arabe ou saisissez le texte en arabe.');
      }
      const primary=record.translations[v.language];
      press={text:primary.content,...(primary.file?{file:primary.file}:{})};
    }else{
      press={text:text(v.content,40000)};
      if(v.fileUrl)press.file=await asset(v.fileUrl,'press','communiques/communique');
    }
    if(!press.text&&!press.file)throw new ServiceError('Joignez un PDF ou saisissez le texte du communiqué.');
    record.press=[press];
  }
  if(assets.reduce((total,entry)=>total+entry.upload.size,0)>100*MIB)throw new ServiceError('La publication ne peut pas dépasser 100 Mio.');
  let catalogue;
  try{catalogue=publicationToCatalogue(record,folder);}catch(error){throw new ServiceError(error instanceof Error?error.message:'Fiche non valide.');}
  if(catalogue.assets.some(path=>!assets.some(entry=>entry.path===path)))throw new ServiceError('Une pièce jointe est manquante.');
  return {folder,record,assets,id:catalogue.items[0].id};
}
