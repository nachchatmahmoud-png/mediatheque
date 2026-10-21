import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// Translate known UI string literals, including escaped Unicode in the retained
// runtime. Values, identifiers, URLs and user content keep their original form.
export function localizeJavaScriptStrings(source,messages){
  const escapes={n:'\n',r:'\r',t:'\t',b:'\b',f:'\f',v:'\v','0':'\0'};
  return source.replace(/"(?:\\[\s\S]|[^"\\\r\n])*"|'(?:\\[\s\S]|[^'\\\r\n])*'/g,literal=>{
    const value=literal.slice(1,-1).replace(/\\(?:u\{([0-9a-f]+)\}|u([0-9a-f]{4})|x([0-9a-f]{2})|(\r?\n)|([\s\S]))/gi,(_,wide,unicode,hex,line,char)=>wide||unicode||hex?String.fromCodePoint(parseInt(wide||unicode||hex,16)):line?'':(escapes[char]??char));
    // Section IDs remain stable; compact counts use the runtime dictionary.
    if(value==='publication'||value==='publications')return literal;
    return Object.hasOwn(messages,value)?JSON.stringify(messages[value]):literal;
  });
}

// Retain the licensed React runtime and the existing media readers. The
// editable interface sources replace only their three component boundaries.
export async function buildInterface(root, output) {
  let bundle = await readFile(join(root, 'site/assets/app.js'), 'utf8');
  const baseMarker = 'var $s="/mediatheque".replace(/\\/$/,"");';
  if (!bundle.includes(baseMarker)) throw new Error('Base du portail introuvable.');
  bundle = bundle.replace(baseMarker, 'var $s=new URL(".",document.baseURI).pathname.replace(/\\/$/,"");');
  // Bundle the last verified official video so the first render needs no request.
  const latest=JSON.parse(await readFile(join(root,'site/latest-video.json'),'utf8'));
  if(latest.channelId!=='UCIKc_HXIZnAmfO9ulxf80EQ'||latest.channelUrl!=='https://www.youtube.com/@Matnuhpv'||!/^[-\w]{11}$/.test(latest.videoId)||typeof latest.title!=='string'||!latest.title.trim()||Number.isNaN(Date.parse(latest.publishedAt)))throw new Error('La dernière vidéo officielle est non valide.');
  bundle=bundle.replace(/var ar=\{[\s\S]*?\};var ge=/,()=> 'var ar='+JSON.stringify(latest)+';var ge=');
  bundle=bundle.replaceAll('e.language.toUpperCase()','(e.language==="ar"?"العربية":"Français")');
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
  const helpers = await readFile(join(root, 'interface/i18n.js'), 'utf8')+'\n'+await readFile(join(root, 'interface/components.js'), 'utf8')+'\n'+await readFile(join(root,'interface/accounts.js'),'utf8');
  const config=JSON.parse(await readFile(join(root,'interface/service-config.json'),'utf8'));
  const configuration='const MX_SERVICE='+JSON.stringify(config)+'; const MX_ON_SERVICE=document.querySelector(\'meta[name="mediatheque-service"]\')?.content==="enabled"||window.location.origin===new URL(MX_SERVICE.origin).origin; const MX_API_ORIGIN=MX_ON_SERVICE?window.location.origin:MX_SERVICE.origin;\n';
  bundle = bundle.replace('function rf()', configuration+helpers + '\nfunction rf()');
  const messages=JSON.parse(await readFile(join(root,'interface/translations-ar.json'),'utf8'));
  const french=bundle.replace('/*__MX_MESSAGES__*/','const MX_MESSAGES='+JSON.stringify(messages)+';');
  let arabic=localizeJavaScriptStrings(bundle,messages);
  arabic=arabic.replaceAll('"/images/cover.svg"','"/images/cover-ar.svg"');
  arabic=arabic.replace('/*__MX_MESSAGES__*/','const MX_MESSAGES='+JSON.stringify(messages)+';');
  await writeFile(join(output,'assets/app.js'),french);
  await writeFile(join(output,'assets/app-fr.js'),french);
  await writeFile(join(output,'assets/app-ar.js'),arabic);
}
