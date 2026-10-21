import {readFile,writeFile,mkdir,rm,readdir,lstat,cp} from 'node:fs/promises';
import {resolve,dirname,join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {publicationToCatalogue,validateAsset,emptyCatalogue} from '../github-pages/catalogue.ts';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export async function buildCatalogue(source,output){
 const result=emptyCatalogue();await mkdir(output,{recursive:true});
 const entries=await readdir(source,{withFileTypes:true});
 for(const entry of entries){
  if(entry.name==='README.md')continue;
  if(!entry.isDirectory())throw new Error('publications : chaque événement doit être un dossier, sans archive ZIP.');
  const folder=join(source,entry.name),metadata=join(folder,'publication.json');
  if(!(await lstat(metadata)).isFile())throw new Error('Fiche attendue : '+relative(root,metadata));
  const record=publicationToCatalogue(JSON.parse(await readFile(metadata,'utf8')),entry.name);
  if(!record.published)continue;
  for(const file of record.assets){
   let current=folder;
   for(const segment of file.split('/')){current=join(current,segment);if((await lstat(current)).isSymbolicLink())throw new Error('Lien symbolique interdit : '+file);}
   const info=await lstat(current);if(!info.isFile())throw new Error('Fichier absent : '+file);
   if(info.size>25*1024*1024)throw new Error('Fichier de plus de 25 Mio : '+file);
   const bytes=await readFile(current);validateAsset(bytes,file);
   const destination=join(output,'medias',entry.name,file);await mkdir(dirname(destination),{recursive:true});await writeFile(destination,bytes);
  }
  result.events.push(record.event);result.items.push(...record.items);
 }
 result.events.sort((a,b)=>b.date.localeCompare(a.date));result.items.sort((a,b)=>b.date.localeCompare(a.date));
 await writeFile(join(output,'catalogue.json'),JSON.stringify(result));return result;
}

export async function buildPages(){
 const output=join(root,'_site');await rm(output,{force:true,recursive:true});
 await cp(join(root,'site'),output,{recursive:true});
 const catalogue=await buildCatalogue(join(root,'publications'),output);
 console.log(JSON.stringify({directory:output,events:catalogue.events.length,publications:catalogue.items.length}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await buildPages();
