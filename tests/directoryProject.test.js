import test from 'node:test';
import assert from 'node:assert/strict';
import { createDirectoryStorage, validateUpload } from '../src/data/directoryProject.js';
// In-memory File System Access handles exercise the same read/write API as the browser.
function folder(files){
 const writes=[];
 const dir=prefix=>({name:'project',async getDirectoryHandle(name){return dir(prefix+name+'/');},async getFileHandle(name,{create=false}={}){const path=prefix+name;if(!files.has(path)&&!create)throw Object.assign(new Error(path),{name:'NotFoundError'});return {async getFile(){const body=files.get(path);return new Blob([body]);},async createWritable(){let body;return {async write(data){body=data instanceof Blob?await data.text():data;},async close(){files.set(path,body);writes.push(path);},async abort(){}};}};}});
 return {handle:dir(''),writes};
}
const initial=()=>({revision:1,groups:[],glyphs:[{kana:'あ',normal:'assets/normal/a.svg',patterns:[]}],levels:[]});
const filesFor=data=>new Map([['package.json','{}'],['public/content/library.json',JSON.stringify(data)],['public/assets/normal/a.svg','<svg viewBox="0 0 10 10"><path d="M0 0L1 1Z"/></svg>']]);
test('directory upload persists SVG and audio; configuration save keeps an original backup and rejects stale revisions',async()=>{
 const data=initial(),files=filesFor(data),{handle,writes}=folder(files),store=await createDirectoryStorage(handle);
 const svg=new Blob(['<svg viewBox="0 0 10 10"><path d="M0 0L2 2Z"/></svg>']);svg.name='a.svg';const path=await store.upload(svg);assert.match(path,/^uploads\/glyphs\/.*\.svg$/);assert.equal(await (await store.file(path)).text(),await svg.text());
 const audio=new Blob(['audio']);audio.name='voice.wav';assert.match(await store.upload(audio),/^uploads\/audio\/.*\.wav$/);
 data.glyphs[0].patterns=[{svg:path}];const saved=await store.save(data);assert.equal(saved.revision,2);assert.equal((await store.read()).glyphs[0].patterns[0].svg,path);
 const backup=writes.find(p=>p.startsWith('authoring-backups/'));assert.deepEqual(JSON.parse(files.get(backup)),initial());
 await assert.rejects(store.save(data),/別の画面/);assert.equal((await store.read()).revision,2);
});
test('folder editor rejects unsafe SVG, unsupported formats, large uploads and paths outside public assets',async()=>{
 assert.throws(()=>validateUpload('a.svg','<svg viewBox="0 0 1 1"><script/><path d="M0 0L1 1Z"/></svg>',99),/輪郭化/);
 assert.throws(()=>validateUpload('a.exe','',2),/選んで/);
 assert.throws(()=>validateUpload('a.wav','',33*1024*1024),/32MB/);
 const data=initial(),{handle,writes}=folder(filesFor(data)),store=await createDirectoryStorage(handle);data.glyphs[0].normal='../private.svg';await assert.rejects(store.save(data),/不正/);assert.equal(writes.length,0);
});
test('missing referenced assets prevent configuration writes and incomplete folders cannot be opened',async()=>{
 const data=initial(),{handle,writes}=folder(filesFor(data)),store=await createDirectoryStorage(handle);data.glyphs[0].normal='uploads/glyphs/missing.svg';await assert.rejects(store.save(data));assert.equal(writes.length,0);
 const missing=folder(new Map());await assert.rejects(createDirectoryStorage(missing.handle));
});
