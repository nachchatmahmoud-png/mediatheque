import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const source=await readFile(new URL('../interface/components.js',import.meta.url),'utf8');
function decoder({duration=100,errorAfter=0,holdCapture=false,stall=false}={}){
  const urls=[],revoked=[],frames=[],pending=[],timers=new Map();let created=0,seekCount=0,clock=0,time=0;
  const video={duration,videoWidth:1920,videoHeight:1080,readyState:0,seeking:false,
    get currentTime(){return time;},set currentTime(value){time=value;this.seeking=true;seekCount++;queueMicrotask(()=>{this.seeking=false;this.readyState=2;if(errorAfter&&seekCount===errorAfter)this.onerror?.();else this.onseeked?.();});},
    removeAttribute(name){if(name==='src')this.src='';},load(){if(this.src&&!stall)queueMicrotask(()=>{this.onloadedmetadata?.();this.readyState=2;this.onloadeddata?.();});}};
  const context=vm.createContext({File,Blob,DOMException,URL:{createObjectURL(file){urls.push(file);return 'blob:local-video';},revokeObjectURL:url=>revoked.push(url)},setTimeout(callback){timers.set(++clock,callback);return clock;},clearTimeout:id=>timers.delete(id),document:{createElement(tag){if(tag==='video'){created++;return video;}if(tag==='canvas'){const canvas={width:0,height:0,getContext:()=>({drawImage(){frames.push({time:video.currentTime,width:canvas.width,height:canvas.height});}}),toBlob(callback,type){const encode=()=>callback(new Blob(['jpeg-fixture'],{type}));holdCapture?pending.push(encode):queueMicrotask(encode);}};return canvas;}throw Error('Unexpected element '+tag);}}});
  vm.runInContext(source,context);
  return {extract:context.mxVideoThumbnails,video,urls,revoked,frames,pending,timers,created:()=>created};
}

test('six JPEG thumbnails sample the video timeline with one decoder and release all resources',async()=>{
  const d=decoder(),file=new File(['video-fixture'],'video.mp4',{type:'video/mp4'});
  const choices=await d.extract(file,new AbortController().signal);
  assert.deepEqual(Array.from(choices,choice=>choice.time),[10,26,42,58,74,90]);
  assert.equal(choices.length,6);assert.equal(new Set(choices.map(choice=>choice.file.name)).size,6);
  assert.ok(choices.every(choice=>choice.file instanceof File&&choice.file.type==='image/jpeg'&&choice.file.size>0));
  assert.ok(d.frames.every(frame=>frame.width===1280&&frame.height===720));
  assert.equal(d.created(),1);assert.deepEqual(d.urls,[file]);assert.deepEqual(d.revoked,['blob:local-video']);
  assert.equal(d.video.src,'');assert.equal(d.video.onseeked,null);assert.equal(d.timers.size,0);
});

test('unknown video duration and a partial decoding failure retain the available thumbnails',async()=>{
  const unknown=decoder({duration:NaN});
  const first=await unknown.extract(new File(['fixture'],'unknown.webm'));
  assert.equal(first.length,1);assert.equal(first[0].time,0);assert.equal(unknown.timers.size,0);
  const partial=decoder({errorAfter:3});
  const choices=await partial.extract(new File(['fixture'],'partial.mp4'));
  assert.deepEqual(Array.from(choices,choice=>choice.time),[10,26]);assert.equal(partial.revoked.length,1);assert.equal(partial.timers.size,0);
});

test('cancellation during image encoding discards late results and releases the video',async()=>{
  const d=decoder({holdCapture:true}),controller=new AbortController();
  const result=d.extract(new File(['fixture'],'cancel.mp4'),controller.signal);
  await Promise.resolve();await Promise.resolve();assert.equal(d.pending.length,1);
  controller.abort();await assert.rejects(result,error=>error.name==='AbortError');
  d.pending[0]();await Promise.resolve();await Promise.resolve();
  assert.equal(d.frames.length,1);assert.equal(d.revoked.length,1);assert.equal(d.timers.size,0);assert.equal(d.video.onloadeddata,null);
});

test('a stalled decoder fails with an actionable message and releases its resources',async()=>{
  const d=decoder({stall:true});
  const result=d.extract(new File(['fixture'],'stalled.mp4'));
  [...d.timers.values()][0]();await assert.rejects(result,/Choisissez une image dans le lecteur ou importez une photo/);
  assert.equal(d.revoked.length,1);assert.equal(d.timers.size,0);
});
