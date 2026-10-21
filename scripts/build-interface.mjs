import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// Retain the licensed React runtime and the existing media readers. The
// editable interface sources replace only their three component boundaries.
export async function buildInterface(root, output) {
  let bundle = await readFile(join(root, 'site/assets/app.js'), 'utf8');
  const baseMarker = 'var $s="/mediatheque".replace(/\\/$/,"");';
  if (!bundle.includes(baseMarker)) throw new Error('Base du portail introuvable.');
  bundle = bundle.replace(baseMarker, 'var $s=new URL(".",document.baseURI).pathname.replace(/\\/$/,"");');
  const sections = [
    ['latest-video.js', 'function af(){', 'var F=Y(ze(),1);'],
    ['publisher.js', 'function nf(', 'var d=Y(ze(),1),CL='],
    ['portal.js', 'function rf(){', 'var Ag=Y(ze(),1);'],
  ];
  for (const [file, start, end] of sections) {
    const from = bundle.indexOf(start);
    const until = bundle.indexOf(end, from);
    if (from < 0 || until < from || bundle.indexOf(start, from + 1) !== -1) {
      throw new Error('Structure du socle modifiée : vérifier ' + file);
    }
    const source = await readFile(join(root, 'interface', file), 'utf8');
    bundle = bundle.slice(0, from) + source + '\n' + bundle.slice(until);
  }
  const apiSource = await readFile(join(root, 'interface/service-api.js'), 'utf8');
  const apiSplit = apiSource.indexOf('async function Ho(');
  for (const [start, end, replacement] of [
    ['async function cL(){', 'function pL(', apiSource.slice(0, apiSplit)],
    ['async function Ho(', 'var fu=Y(ta(),1);', apiSource.slice(apiSplit)],
  ]) {
    const from=bundle.indexOf(start), until=bundle.indexOf(end,from);
    if(from<0||until<from)throw new Error('Limite du service introuvable : '+start);
    bundle=bundle.slice(0,from)+replacement+'\n'+bundle.slice(until);
  }
  const helpers = await readFile(join(root, 'interface/components.js'), 'utf8')+'\n'+await readFile(join(root,'interface/accounts.js'),'utf8');
  const config=JSON.parse(await readFile(join(root,'interface/service-config.json'),'utf8'));
  const configuration='const MX_SERVICE='+JSON.stringify(config)+'; const MX_ON_SERVICE=document.querySelector(\'meta[name="mediatheque-service"]\')?.content==="enabled"||window.location.origin===new URL(MX_SERVICE.origin).origin; const MX_API_ORIGIN=MX_ON_SERVICE?window.location.origin:MX_SERVICE.origin;\n';
  bundle = bundle.replace('function rf()', configuration+helpers + '\nfunction rf()');
  await writeFile(join(output, 'assets/app.js'), bundle);
}
