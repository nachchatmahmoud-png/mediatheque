import {ServiceError,digest,validateUpload,type PreparedPublication} from './publication.ts';

const repository='nachchatmahmoud-png/mediatheque';
const base='/repos/'+repository;
type GitHubResult={status:number;data:any};
export class GitHubPublisher {
  private key:string;
  private fetcher:typeof fetch;
  constructor(key:string,fetcher:typeof fetch=fetch){this.key=key;this.fetcher=fetcher;}
  get configured(){return !!this.key;}
  private async api(path:string,method='GET',body?:unknown,optional=false):Promise<GitHubResult>{
    if(!this.key)throw new ServiceError('Le service de publication n’est pas encore configuré.',503);
    if(path!==base&&!path.startsWith(base+'/'))throw new ServiceError('Opération non autorisée.',403);
    let response;
    try{response=await this.fetcher('https://api.github.com'+path,{method,headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+this.key,'X-GitHub-Api-Version':'2026-03-10','Content-Type':'application/json','User-Agent':'Mediatheque-Administration'},...(body===undefined?{}:{body:JSON.stringify(body)}),redirect:'error'});}catch{throw new ServiceError('La connexion au service de publication est momentanément indisponible.',503);}
    const data=await response.json().catch(()=>({}));
    if(optional&&response.status===404)return {status:404,data:null};
    if(!response.ok){const error=new ServiceError([409,422].includes(response.status)?'Une autre publication est en cours. Réessayez.':'La publication n’a pas pu être enregistrée. Réessayez.',[409,422].includes(response.status)?409:503);throw error;}
    return {status:response.status,data};
  }
  async verify(){const {data}=await this.api(base);if(data.permissions?.push!==true)throw new ServiceError('Le service ne dispose pas du droit de publication.',503);return true;}
  async publish(prepared:PreparedPublication,download:(path:string)=>Promise<Uint8Array>){
    const {folder,id,record,assets}=prepared,blobs:{path:string;sha:string}[]=[];
    // Validate every file before the first repository mutation.
    for(const {path,upload} of assets){const bytes=await download(upload.path);if(bytes.length!==upload.size||await digest(bytes)!==upload.digest)throw new ServiceError('Une pièce jointe a été modifiée. Importez-la à nouveau.');try{validateUpload(bytes,path);}catch(error){throw new ServiceError(error instanceof Error?error.message:'Fichier non valide.');}}
    for(let attempt=0;attempt<3;attempt++){
      const head=(await this.api(base+'/git/ref/heads/main')).data.object.sha;
      const existing=(await this.api(base+'/contents/publications/'+folder+'/publication.json?ref='+head,'GET',undefined,true)).data;
      if(existing){
        let same=false;
        try{const bytes=Uint8Array.from(atob(existing.content.replace(/\s/g,'')),char=>char.charCodeAt(0));same=JSON.stringify(JSON.parse(new TextDecoder().decode(bytes)))===JSON.stringify(record);}catch{}
        if(!same)throw new ServiceError('Cette demande a déjà été enregistrée avec un contenu différent. Préparez une nouvelle publication.',409);
        return {id,commitSha:head};
      }
      if(!blobs.length&&assets.length){
        for(const {path,upload} of assets){
          const bytes=await download(upload.path);
          if(bytes.length!==upload.size||await digest(bytes)!==upload.digest)throw new ServiceError('Une pièce jointe a été modifiée. Importez-la à nouveau.');
          let binary='';for(let index=0;index<bytes.length;index+=16384)binary+=String.fromCharCode(...bytes.subarray(index,index+16384));
          const result=await this.api(base+'/git/blobs','POST',{content:btoa(binary),encoding:'base64'});
          blobs.push({path,sha:result.data.sha});
        }
      }
      const parent=(await this.api(base+'/git/commits/'+head)).data;
      const entries:any[]=blobs.map(blob=>({path:'publications/'+folder+'/'+blob.path,mode:'100644',type:'blob',sha:blob.sha}));
      entries.push({path:'publications/'+folder+'/publication.json',mode:'100644',type:'blob',content:JSON.stringify(record,null,2)+'\n'});
      const tree=(await this.api(base+'/git/trees','POST',{base_tree:parent.tree.sha,tree:entries})).data;
      const commit=(await this.api(base+'/git/commits','POST',{message:'Publier : '+String(record.title).slice(0,100),tree:tree.sha,parents:[head]})).data;
      try{await this.api(base+'/git/refs/heads/main','PATCH',{sha:commit.sha,force:false});return {id,commitSha:commit.sha};}
      catch(error){if(!(error instanceof ServiceError)||error.status!==409||attempt===2)throw error;}
    }
    throw new ServiceError('La publication n’a pas été confirmée.',503);
  }
}
