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
  const helpers = await readFile(join(root, 'interface/components.js'), 'utf8');
  bundle = bundle.replace('function rf()', helpers + '\nfunction rf()');
  await writeFile(join(output, 'assets/app.js'), bundle);
}
