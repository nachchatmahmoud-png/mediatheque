import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const output=join(root,'supabase/functions/mediatheque/generated');
await rm(output,{recursive:true,force:true});await mkdir(output,{recursive:true});
for(const name of ['service.ts','publication.ts','github.ts','supabase.ts']){
  const source=(await readFile(join(root,'administration/server',name),'utf8')).replaceAll('../../github-pages/catalogue.ts','./catalogue.ts').replaceAll('../../app/lib/model.ts','./model.ts');
  await writeFile(join(output,name),source);
}
await writeFile(join(output,'catalogue.ts'),(await readFile(join(root,'github-pages/catalogue.ts'),'utf8')).replace('../app/lib/model.ts','./model.ts'));
for(const name of ['model.ts','keyword-catalog.ts'])await writeFile(join(output,name),await readFile(join(root,'app/lib',name),'utf8'));
console.log(JSON.stringify({directory:output,files:7}));
