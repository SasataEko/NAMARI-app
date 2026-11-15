import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {Readable} from 'node:stream';
import {localAuthoring} from '../server/localAuthoring.js';
test('local uploads persist, saves back up and reject stale or unsafe writes',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'namari-author-'));await fs.mkdir(path.join(root,'public/content'),{recursive:true});await fs.writeFile(path.join(root,'public/content/library.json'),JSON.stringify({revision:1,glyphs:[],groups:[],levels:[]}));let handle;
 localAuthoring().configureServer({config:{root,base:'/NAMARI-app/'},middlewares:{use:fn=>handle=fn}});
 const call=async(url,body='',origin='http://127.0.0.1:5173',method='POST')=>{const req=Readable.from([Buffer.from(body)]);req.url=url;req.method=method;req.headers={host:'127.0.0.1:5173',origin,'x-local-authoring':'1'};req.socket={remoteAddress:'127.0.0.1'};let output;const res={statusCode:200,setHeader(){},end(v){output=v;}};await handle(req,res,()=>{});return {code:res.statusCode,data:JSON.parse(String(output))};};
 const svg='<svg viewBox="0 0 10 10"><path d="M0 0L10 0L10 10Z"/></svg>';
 const upload=await call('/__author/upload?name=sample.svg',svg);assert.equal(upload.code,200);assert.equal(await fs.readFile(path.join(root,'public',upload.data.path),'utf8'),svg);
 assert.equal((await call('/__author/upload?name=bad.svg','<svg viewBox="0 0 10 10"><script>x</script><path/></svg>')).code,400);
 assert.equal((await call('/__author/upload?name=sample.svg',svg,'https://other.example')).code,403);
 const data={revision:1,glyphs:[{kana:'あ',normal:upload.data.path,patterns:[]}],groups:[],levels:[]};assert.equal((await call('/__author/save',JSON.stringify(data))).data.revision,2);assert.equal((await fs.readdir(path.join(root,'authoring-backups'))).filter(n=>n.startsWith('library-')).length,1);
 assert.equal((await call('/__author/save',JSON.stringify(data))).code,409);
 assert.equal((await call('/__author/save',JSON.stringify({...data,revision:2,glyphs:[{normal:'uploads/../../private',patterns:[]}]}))).code,400);
 assert.equal(JSON.parse(await fs.readFile(path.join(root,'public/content/library.json'),'utf8')).revision,2);
});


test('new Mode1 manifests are served as JSON even when created after the server starts',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'namari-manifest-'));await fs.mkdir(path.join(root,'public/content'),{recursive:true});let handle;localAuthoring().configureServer({config:{root,base:'/NAMARI-app/'},middlewares:{use:fn=>handle=fn}});
 const expected=[{levelId:'kusuri',levelVersion:'v1'}];await fs.writeFile(path.join(root,'public/content/mode-one-manifest.json'),JSON.stringify(expected));
 const req={method:'GET',url:'/NAMARI-app/content/mode-one-manifest.json'},headers={};let body,forwarded=false;const res={statusCode:200,setHeader:(k,v)=>headers[k]=v,end:v=>body=v};await handle(req,res,()=>forwarded=true);assert.equal(forwarded,false);assert.equal(res.statusCode,200);assert.match(headers['Content-Type'],/^application\/json/);assert.equal(headers['Cache-Control'],'no-store');assert.deepEqual(JSON.parse(body.toString()),expected);
});


test('server saves staged SVGs into normal and pattern folders, renames references, and serves new assets immediately',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'namari-organize-'));await fs.mkdir(path.join(root,'public/content'),{recursive:true});await fs.writeFile(path.join(root,'public/content/library.json'),JSON.stringify({revision:1,glyphs:[],groups:[],levels:[]}));let handle;localAuthoring().configureServer({config:{root,base:'/NAMARI-app/'},middlewares:{use:fn=>handle=fn}});
 const call=async(url,body='',method='POST')=>{const req=Readable.from([Buffer.from(body)]);Object.assign(req,{url,method,headers:{host:'127.0.0.1:5173',origin:'http://127.0.0.1:5173','x-local-authoring':'1'},socket:{remoteAddress:'127.0.0.1'}});let output,headers={};const res={statusCode:200,setHeader:(k,v)=>headers[k]=v,end:v=>output=v};await handle(req,res,()=>{});return {code:res.statusCode,output:String(output),headers};};
 const svg='<svg viewBox="0 0 10 10"><path d="M0 0L1 0L1 1Z"/></svg>';const normal=JSON.parse((await call('/__author/upload?name=a.svg',svg)).output).path,custom=JSON.parse((await call('/__author/upload?name=a-custom.svg',svg)).output).path;
 const input={revision:1,groups:[{id:'g',folderName:'pattern-U'}],glyphs:[{kana:'あ',normal,patterns:[{id:'variant-a',groupId:'g',svg:custom}]}],levels:[]};const result=JSON.parse((await call('/__author/save',JSON.stringify(input))).output);assert.equal(result.glyphs[0].normal,'assets/normal/a.svg');assert.equal(result.glyphs[0].patterns[0].svg,'assets/namari/pattern-U/a-variant-a.svg');assert.equal(result.assetMoves.length,2);await assert.rejects(fs.access(path.join(root,'public',normal)));
 const served=await call('/NAMARI-app/'+result.glyphs[0].patterns[0].svg,'','GET');assert.equal(served.output,svg);assert.equal(served.headers['Content-Type'],'image/svg+xml');assert.equal(served.headers['Cache-Control'],'no-store');
 delete result.assetMoves;result.groups[0].folderName='pattern-Round';const renamed=JSON.parse((await call('/__author/save',JSON.stringify(result))).output);assert.equal(renamed.glyphs[0].patterns[0].svg,'assets/namari/pattern-Round/a-variant-a.svg');assert.equal(await fs.readFile(path.join(root,'public',renamed.glyphs[0].patterns[0].svg),'utf8'),svg);await assert.rejects(fs.access(path.join(root,'public/assets/namari/pattern-U/a-variant-a.svg')));
});

test('server rolls back a replaced normal SVG when a later organized asset cannot be written',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'namari-rollback-'));await fs.mkdir(path.join(root,'public/content'),{recursive:true});await fs.mkdir(path.join(root,'public/assets/normal'),{recursive:true});await fs.mkdir(path.join(root,'public/uploads/glyphs'),{recursive:true});await fs.writeFile(path.join(root,'public/assets/normal/a.svg'),'original');await fs.writeFile(path.join(root,'public/assets/namari'),'blocking-file');await fs.writeFile(path.join(root,'public/uploads/glyphs/new.svg'),'replacement');await fs.writeFile(path.join(root,'public/content/library.json'),JSON.stringify({revision:1,glyphs:[{kana:'あ',normal:'assets/normal/a.svg',patterns:[]}],groups:[],levels:[]}));let handle;localAuthoring().configureServer({config:{root,base:'/NAMARI-app/'},middlewares:{use:fn=>handle=fn}});
 const input={revision:1,groups:[{id:'g',folderName:'pattern-U'}],glyphs:[{kana:'あ',normal:'uploads/glyphs/new.svg',patterns:[{id:'p',groupId:'g',svg:'uploads/glyphs/new.svg'}]}],levels:[]};const req=Readable.from([Buffer.from(JSON.stringify(input))]);Object.assign(req,{url:'/__author/save',method:'POST',headers:{host:'127.0.0.1:5173',origin:'http://127.0.0.1:5173','x-local-authoring':'1'},socket:{remoteAddress:'127.0.0.1'}});const res={statusCode:200,setHeader(){},end(){}};await handle(req,res,()=>{});assert.equal(res.statusCode,400);assert.equal(await fs.readFile(path.join(root,'public/assets/normal/a.svg'),'utf8'),'original');assert.equal(JSON.parse(await fs.readFile(path.join(root,'public/content/library.json'),'utf8')).revision,1);
});
