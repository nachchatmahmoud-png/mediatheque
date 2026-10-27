import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';

test('the official video uses its translated title in French and its original title in Arabic',async()=>{
 const source=await readFile(new URL('../interface/latest-video.js',import.meta.url),'utf8');
 const helpers=await readFile(new URL('../interface/video-languages.js',import.meta.url),'utf8');
 const video={videoId:'abcdefghijk',title:'فيديو الوزارة',publishedAt:'2026-10-20T12:00:00Z',channelUrl:'https://www.youtube.com/@Matnuhpv'};
 for(const language of ['fr','ar']){
  const jsx=(type,props)=>({type,...props});
  const result=vm.runInNewContext(helpers+'\n'+source+';af()',{
   No:{useState:value=>[value,()=>{}],useEffect:()=>{}},ar:video,ge:{jsx,jsxs:jsx},MX_LOCALE:language,MX_ON_SERVICE:false,
   mxDetectedLanguage:()=>'ar',mxT:value=>language==='ar'?'أحدث فيديو للوزارة':value,je:value=>value,Ya:()=>'',Oe:'icon',Tl:'play',
   MX_VIDEO_LOCALIZATIONS:{abcdefghijk:{fr:{title:'Vidéo du ministère'}}},MX_FRENCH_VIDEO:{...video,title:'Vidéo du ministère'},mxElement:jsx,MxVideoLanguage:'languages',mxYoutubeThumbnail:()=>true,
  });
  assert.equal(result.className,'hero-visual ministry-video');
  const meta=result.children.find(child=>child.className==='ministry-video-meta');
  assert.equal(meta.children[0].children,language==='fr'?'Vidéo du ministère':video.title);
 }
});

test('refresh excludes newer Shorts and portrait videos, preserves a verified horizontal video and keeps French titles French',()=>{
 execFileSync('python3',['-c',String.raw`
import importlib.util,json,tempfile,sys
sys.dont_write_bytecode=True
from datetime import datetime,timezone
from pathlib import Path
spec=importlib.util.spec_from_file_location('refresh','scripts/refresh-ministry-video.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
entry=lambda id,date:f'<entry><yt:channelId>{m.CHANNEL_ID}</yt:channelId><yt:videoId>{id}</yt:videoId><title>عنوان الفيديو</title><published>{date}</published></entry>'
feed=('<feed xmlns="http://www.w3.org/2005/Atom" xmlns:yt="http://www.youtube.com/xml/schemas/2015">'+entry('abcdefghijk','2020-01-01T00:00:00Z')+entry('0123456789a','2021-01-01T00:00:00Z')+entry('portrait123','2022-01-01T00:00:00Z')+entry('shortnew123','2023-01-01T00:00:00Z')+entry('futurevideo','2099-01-01T00:00:00Z')+'</feed>').encode()
channel=('var ytInitialData='+json.dumps({'contents':[{'lockupViewModel':{'contentId':'0123456789a','contentType':'LOCKUP_CONTENT_TYPE_VIDEO'}}]+[{'videoRenderer':{'videoId':id}} for id in ['portrait123','futurevideo']]+[{'shortsLockupViewModel':{'videoId':'shortnew123'}}]})+';').encode()
def watch(id,width,height):return ('var ytInitialPlayerResponse='+json.dumps({'videoDetails':{'videoId':id,'channelId':m.CHANNEL_ID,'lengthSeconds':'105'},'streamingData':{'formats':[{'width':width,'height':height}]}})+';').encode()
assert m.feed_videos(feed,datetime(2026,1,1,tzinfo=timezone.utc))[0]['videoId']=='shortnew123'
assert 'shortnew123' not in m.regular_video_ids(channel)
try:m.landscape_dimensions(watch('portrait123',1080,1920),'portrait123');assert False
except ValueError:pass
image=b'\xff\xd8\xff' + b'JPEG TEST FIXTURE'
requested=[]
def fetch(url):
 requested.append(url)
 if url==m.VIDEOS_URL:return channel
 if url==m.FEED_URL:return feed
 if 'watch?v=' in url:
  id=url.split('watch?v=')[1]
  return watch(id,1080,1920) if id=='portrait123' else watch(id,612,480)
 return image
with tempfile.TemporaryDirectory() as folder:
 output=Path(folder)/'latest-video.json'
 video,changed=m.refresh(output,fetch=fetch)
 assert changed and video['videoId']=='0123456789a' and video['format']=='landscape'
 assert (video['width'],video['height'])==(612,480)
 assert video['thumbnailUrl']=='/images/youtube-0123456789a.jpg'
 assert (Path(folder)/'images/youtube-0123456789a.jpg').read_bytes()==image
 assert not any('watch?v=shortnew123' in url or 'watch?v=futurevideo' in url for url in requested)
 def unavailable(url):raise OSError('unavailable')
 cached,changed=m.refresh(output,fetch=unavailable)
 assert not changed and cached==video
 french=Path(folder)/'latest-video-fr.json'
 translated,changed=m.refresh_french(video,french,{'0123456789a':{'fr':{'title':'Titre traduit de la vidéo'}}})
 assert changed and translated['title']=='Titre traduit de la vidéo'
 unknown={**video,'videoId':'newarabic12','publishedAt':'2024-01-01T00:00:00Z','title':'عنوان جديد'}
 retained,changed=m.refresh_french(unknown,french,{},fetch=unavailable)
 assert not changed and retained==translated
 automatic_calls=[]
 def translate(url):
  from urllib.parse import urlparse,parse_qs
  query=parse_qs(urlparse(url).query)
  assert url.startswith('https://api.mymemory.translated.net/get?')
  assert query['q']==[unknown['title']] and query['langpair']==['ar|fr']
  automatic_calls.append(url)
  return json.dumps({'responseStatus':200,'responseData':{'translatedText':'Nouveau titre &amp; programme de logement'}}).encode()
 automatic,changed=m.refresh_french(unknown,french,{},fetch=translate)
 assert changed and automatic['videoId']==unknown['videoId'] and automatic['title']=='Nouveau titre & programme de logement'
 assert automatic['titleTranslation']=='automatic' and automatic['sourceTitle']==unknown['title']
 cached,changed=m.refresh_french(unknown,french,{},fetch=translate)
 assert not changed and cached==automatic and len(automatic_calls)==1
 validated,changed=m.refresh_french(unknown,french,{unknown['videoId']:{'fr':{'title':'Titre validé par la rédaction'}}},fetch=translate)
 assert changed and validated['title']=='Titre validé par la rédaction' and 'titleTranslation' not in validated
 for response in [{'responseStatus':429,'responseData':{'translatedText':'QUOTA EXCEEDED'}},{'responseStatus':200,'responseData':{'translatedText':'عنوان عربي'}},{'responseStatus':200,'quotaFinished':True,'responseData':{'translatedText':'Titre français'}}]:
  try:m.translate_french(unknown['title'],fetch=lambda url:json.dumps(response).encode());assert False
  except ValueError:pass
with tempfile.TemporaryDirectory() as folder:
 output=Path(folder)/'latest-video.json'
 def missing_image(url):return b'<html>unavailable</html>' if 'ytimg' in url else fetch(url)
 video,_=m.refresh(output,fetch=missing_image)
 assert 'thumbnailUrl' not in video
 assert not (Path(folder)/'images/youtube-0123456789a.jpg').exists()
`],{cwd:new URL('../',import.meta.url),stdio:'pipe'});
});
