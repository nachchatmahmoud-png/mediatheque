import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir, mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {buildInterface} from '../scripts/build-interface.mjs';
import {buildCatalogue} from '../scripts/build-github-pages.mjs';
import {publicationToCatalogue, validateAsset} from '../github-pages/catalogue.ts';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const helpers = await readFile(join(root, 'interface/components.js'), 'utf8');
const utilities = vm.runInNewContext(helpers + ';({mxHttps,mxYoutubeThumbnail,mxValidateFile,mxPublicationSuffix,mxStorage})', {
  URL, Intl, crypto: webcrypto, Uint8Array,
  localStorage: {getItem() {throw new Error('disabled');}, setItem() {throw new Error('disabled');}},
});

test('complete assembled application parses and supports a subdirectory deployment', async () => {
  const output = await mkdtemp(join(tmpdir(), 'mediatheque-interface-'));
  try {
    await mkdir(join(output, 'assets'));
    await buildInterface(root, output);
    const bundle = await readFile(join(output, 'assets/app.js'), 'utf8');
    assert.doesNotThrow(() => new vm.Script(bundle));
    for (const [base, expected] of [['https://example.org/', ''], ['https://example.org/mediatheque/?q=test', '/mediatheque']]) {
      const expression = bundle.match(/var \$s=([^;]+);/)[1];
      assert.equal(vm.runInNewContext(expression, {URL, document: {baseURI: base}}), expected);
    }
    assert.ok(bundle.includes('Connexion administrateur'));
    assert.ok(bundle.includes('current-password'));
    assert.equal(bundle.includes('Utilisez votre clé personnelle GitHub'),false);
    assert.equal(bundle.includes('personal-access-tokens'),false);
    for(const path of ['site/index.html','interface/portal.js','interface/publisher.js','interface/accounts.js'])assert.equal((await readFile(join(root,path),'utf8')).toLowerCase().includes('chatgpt'),false);
    assert.match(bundle, /Valider et publier/);
    assert.match(bundle, /Partager la recherche/);
  } finally { await rm(output, {recursive: true, force: true}); }
});

test('file selection, safe links and storage restrictions have usable outcomes', () => {
  assert.equal(utilities.mxHttps('javascript:alert(1)'), '');
  assert.equal(utilities.mxHttps('https://user:secret@example.org/'), '');
  assert.equal(utilities.mxHttps('https://example.org/video.mp4'), 'https://example.org/video.mp4');
  assert.equal(utilities.mxYoutubeThumbnail('https://www.youtube.com/watch?v=abcdefghijk'),'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg');
  assert.equal(utilities.mxYoutubeThumbnail('https://youtu.be/abcdefghijk?t=3'),'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg');
  assert.equal(utilities.mxYoutubeThumbnail('https://youtube.com.evil.test/watch?v=abcdefghijk'),'');
  assert.equal(utilities.mxYoutubeThumbnail('https://user:secret@youtube.com/watch?v=abcdefghijk'),'');
  assert.equal(utilities.mxYoutubeThumbnail('https://www.youtube.com/watch?v=bad'),'');
  assert.throws(() => utilities.mxValidateFile({name: 'photo.exe', size: 10}, 'photo'));
  assert.throws(() => utilities.mxValidateFile({name: 'photo.jpg', size: 13 * 1048576}, 'photo'));
  assert.throws(() => utilities.mxValidateFile({name: 'empty.pdf', size: 0}, 'press'));
  assert.doesNotThrow(() => utilities.mxValidateFile({name: 'PHOTO.PNG', size: 1000}, 'photo'));
  assert.equal(utilities.mxStorage.get('media-view', 'grid'), 'grid');
  assert.doesNotThrow(() => utilities.mxStorage.set('media-view', 'list'));
  assert.match(utilities.mxPublicationSuffix(), /^[a-f0-9]{12}$/);
});

test('request identifiers remain cryptographically random when randomUUID is unavailable',()=>{
  const fallback=vm.runInNewContext(helpers+';mxUuid',{crypto:{getRandomValues:array=>webcrypto.getRandomValues(array)},Uint8Array});
  const identifiers=Array.from({length:20},()=>fallback());
  assert.equal(new Set(identifiers).size,20);
  assert.ok(identifiers.every(value=>/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value)));
});

test('browser ZIP writer produces a readable dossier accepted by the public catalogue', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'mediatheque-export-'));
  try {
    const bundle = await readFile(join(root, 'site/assets/app.js'), 'utf8');
    const zipSource = bundle.slice(bundle.indexOf('var gL='), bundle.indexOf('var uf='));
    const {Cg: zip} = vm.runInNewContext(zipSource + ';({Cg})', {TextEncoder, Uint8Array, Uint32Array, DataView});
    const folder = 'test-local-publication';
    const photo = new Uint8Array(await readFile(join(root, 'site/images/logo-ministere.png')));
    const record = {version: 1, status: 'published', title: 'TEST LOCAL', date: '2026-10-01', topic: 'Habitat et politique de la ville', keywords: ['Habitat'], language: 'fr',
      photos: [{file: 'photos/01-test.png', caption: 'Légende de test'}], videos: [{url: 'https://example.org/test.mp4'}], press: [{text: 'TEST LOCAL'}]};
    const archivePath = join(temporary, 'publication.zip');
    await writeFile(archivePath, zip([
      {name: folder + '/publication.json', data: new TextEncoder().encode(JSON.stringify(record))},
      {name: folder + '/photos/01-test.png', data: photo},
    ]));
    // An independent ZIP reader verifies signatures, CRCs and JSON round trip.
    execFileSync('python3', ['-c', 'import zipfile,json,sys; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; assert len(z.namelist())==2; r=json.loads(z.read(z.namelist()[0])); assert r["photos"][0]["caption"]=="Légende de test"; z.extractall(sys.argv[2])', archivePath, join(temporary, 'source')]);
    const catalogue = await buildCatalogue(join(temporary, 'source'), join(temporary, 'output'));
    assert.equal(catalogue.events.length, 1);
    assert.equal(catalogue.items.length, 3);
    assert.equal(catalogue.items[0].photos[0].caption, 'Légende de test');
    assert.equal(catalogue.items[0].thumbnailUrl, './medias/' + folder + '/photos/01-test.png');
    assert.throws(() => validateAsset(new TextEncoder().encode('not an image'), 'photo.png'));
    assert.throws(() => publicationToCatalogue({...record, photos: [{file: '../private.png'}]}, folder));
  } finally { await rm(temporary, {recursive: true, force: true}); }
});

test('the GitHub catalogue builds two language pages from one video dossier and one set of files',async()=>{
 const temporary=await mkdtemp(join(tmpdir(),'mediatheque-bilingual-'));
 try{
  const id='video-bilingue',folder=join(temporary,'source',id),video=new Uint8Array([0,0,0,20,102,116,121,112,0,0,0,0]);
  const cover=await readFile(join(root,'site/images/logo-ministere.png'));
  await mkdir(join(folder,'videos'),{recursive:true});await mkdir(join(folder,'photos'),{recursive:true});
  const record={version:1,status:'published',title:'Programme de logement',date:'2026-10-26',topic:'Vie institutionnelle',keywords:['Vie institutionnelle'],language:'fr',translations:{fr:{title:'Programme de logement'},ar:{title:'برنامج السكن'}},videos:[{file:'videos/video.mp4',cover:'photos/miniature.png',spokenLanguage:'ar'}]};
  await writeFile(join(folder,'publication.json'),JSON.stringify(record));await writeFile(join(folder,'videos/video.mp4'),video);await writeFile(join(folder,'photos/miniature.png'),cover);
  const normalized=publicationToCatalogue(record,id);assert.equal(normalized.assets.length,2);
  const catalogue=await buildCatalogue(join(temporary,'source'),join(temporary,'output'));
  assert.equal(catalogue.items.length,2);assert.equal(catalogue.events.length,2);
  const fr=catalogue.items.find(item=>item.language==='fr'),ar=catalogue.items.find(item=>item.language==='ar');
  assert.equal(fr.title,'Programme de logement');assert.equal(ar.title,'برنامج السكن');assert.equal(fr.mediaUrl,ar.mediaUrl);assert.equal(fr.thumbnailUrl,ar.thumbnailUrl);
  assert.equal(catalogue.events.find(event=>event.id===fr.eventId).title,fr.title);assert.equal(catalogue.events.find(event=>event.id===ar.eventId).title,ar.title);
  assert.deepEqual(new Uint8Array(await readFile(join(temporary,'output/medias',id,'videos/video.mp4'))),video);
 }finally{await rm(temporary,{recursive:true,force:true});}
});
