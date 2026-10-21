import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';

test('the official video is visible on both pages with labels in the page language',async()=>{
 const source=await readFile(new URL('../interface/latest-video.js',import.meta.url),'utf8');
 const video={videoId:'abcdefghijk',title:'فيديو الوزارة',publishedAt:'2026-10-20T12:00:00Z',channelUrl:'https://www.youtube.com/@Matnuhpv'};
 for(const language of ['fr','ar']){
  const jsx=(type,props)=>({type,...props});
  const result=vm.runInNewContext(source+';af()',{
   No:{useState:value=>[value,()=>{}],useEffect:()=>{}},ar:video,ge:{jsx,jsxs:jsx},MX_LOCALE:language,MX_ON_SERVICE:false,
   mxDetectedLanguage:()=>'ar',mxT:value=>language==='ar'?'أحدث فيديو للوزارة':value,je:value=>value,Ya:()=>'',Oe:'icon',Tl:'play',
  });
  assert.equal(result.className,'hero-visual ministry-video');
  const meta=result.children.find(child=>child.className==='ministry-video-meta');
  assert.equal(meta.children[0].children,language==='fr'?'Dernière vidéo du ministère':video.title);
 }
});

test('scheduled refresh selects a published video, saves its thumbnail and preserves it on feed failure',()=>{
 execFileSync('python3',['-c',String.raw`
import importlib.util,json,tempfile,sys
sys.dont_write_bytecode=True
from datetime import datetime,timezone
from pathlib import Path
spec=importlib.util.spec_from_file_location('refresh','scripts/refresh-ministry-video.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
entry=lambda id,date:f'<entry><yt:channelId>{m.CHANNEL_ID}</yt:channelId><yt:videoId>{id}</yt:videoId><title>Vidéo officielle</title><published>{date}</published></entry>'
feed=('<feed xmlns="http://www.w3.org/2005/Atom" xmlns:yt="http://www.youtube.com/xml/schemas/2015">'+entry('abcdefghijk','2020-01-01T00:00:00Z')+entry('0123456789a','2021-01-01T00:00:00Z')+entry('futurevideo','2099-01-01T00:00:00Z')+'</feed>').encode()
assert m.latest_from_feed(feed,datetime(2026,1,1,tzinfo=timezone.utc))['videoId']=='0123456789a'
with tempfile.TemporaryDirectory() as folder:
 output=Path(folder)/'latest-video.json'
 image=b'\xff\xd8\xff' + b'JPEG TEST FIXTURE'
 video,changed=m.refresh(output,fetch=lambda url:feed if url==m.FEED_URL else image)
 assert changed and video['thumbnailUrl']=='/images/youtube-0123456789a.jpg'
 assert (Path(folder)/'images/youtube-0123456789a.jpg').read_bytes()==image
 def unavailable(url):raise OSError('unavailable')
 cached,changed=m.refresh(output,fetch=unavailable)
 assert not changed and cached==video
with tempfile.TemporaryDirectory() as folder:
 output=Path(folder)/'latest-video.json'
 video,_=m.refresh(output,fetch=lambda url:feed if url==m.FEED_URL else b'<html>unavailable</html>')
 assert 'thumbnailUrl' not in video
 assert not (Path(folder)/'images/youtube-0123456789a.jpg').exists()
`],{cwd:new URL('../',import.meta.url),stdio:'pipe'});
 assert.ok(true);
});
