import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
export function localAuthoring(){
 let queue=Promise.resolve();
 return {name:'local-authoring',apply:'serve',configureServer(server){
 const root=server.config.root,publicRoot=path.join(root,'public'),file=path.join(publicRoot,'content/library.json');
 server.middlewares.use(async(req,res,next)=>{
 const url=new URL(req.url,'http://localhost');
 const assetPrefix=`${server.config.base}uploads/`;
 if(req.method==='GET'&&url.pathname.startsWith(assetPrefix)){
   const relative=url.pathname.slice(assetPrefix.length);
   if(!/^(glyphs|audio)\/[a-f0-9-]+\.(svg|mp3|wav|ogg|m4a|webm)$/.test(relative)){res.statusCode=404;return res.end();}
   try{const bytes=await fs.readFile(path.join(publicRoot,'uploads',relative));const ext=path.extname(relative);res.setHeader('Content-Type',({'.svg':'image/svg+xml','.mp3':'audio/mpeg','.wav':'audio/wav','.ogg':'audio/ogg','.m4a':'audio/mp4','.webm':'audio/webm'})[ext]);res.setHeader('Cache-Control','no-store');res.end(bytes);}catch{res.statusCode=404;res.end();}return;
 }
 if(!url.pathname.startsWith('/__author/'))return next();
 const reply=(code,data)=>{res.statusCode=code;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(data));};
 try{
 const host=new URL(`http://${req.headers.host}`).hostname;
 const remote=req.socket.remoteAddress;
 if(!['localhost','127.0.0.1','[::1]'].includes(host)||!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(remote))return reply(403,{error:'Local computer only'});
 if(req.method==='GET'&&url.pathname==='/__author/status')return reply(200,{enabled:true});
 if(req.method!=='POST'||req.headers['x-local-authoring']!=='1'||!req.headers.origin||new URL(req.headers.origin).host!==req.headers.host)return reply(403,{error:'Same-origin local editor required'});
 const chunks=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>32*1024*1024)throw new Error('文件超过32MB上限');chunks.push(chunk);}const body=Buffer.concat(chunks);
 const task=async()=>{
 if(url.pathname==='/__author/upload'){
 const name=url.searchParams.get('name')||'',ext=path.extname(name).toLowerCase();
 if(!['.svg','.mp3','.wav','.ogg','.m4a','.webm'].includes(ext))throw new Error('仅支持SVG及MP3/WAV/OGG/M4A/WebM');
 if(ext==='.svg'){
 const source=body.toString('utf8');
 if(!/<svg[\s>]/i.test(source)||!/<path[\s>]/i.test(source)||! /viewBox\s*=/i.test(source))throw new Error('SVG必须有viewBox及轮廓path');
 if(/<!DOCTYPE|<!ENTITY|<\s*(?:script|foreignObject|image|use|iframe|animate|set)\b|\bon\w+\s*=|(?:href|src)\s*=|url\s*\(|@import|<\s*(?:mask|clipPath|filter)\b|\btransform\s*=/i.test(source))throw new Error('SVG包含不支持的活动内容、外部引用或变换，请扩展为纯轮廓');
 }
 const kind=ext==='.svg'?'glyphs':'audio',relative=`uploads/${kind}/${randomUUID()}${ext}`;
 await fs.mkdir(path.join(publicRoot,'uploads',kind),{recursive:true});await fs.writeFile(path.join(publicRoot,relative),body,{flag:'wx'});
 return reply(200,{path:relative,originalName:name,bytes:body.length});
 }
 if(url.pathname==='/__author/save'){
 const data=JSON.parse(body.toString('utf8'));const current=JSON.parse((await fs.readFile(file,'utf8')).replace(/^\uFEFF/,''));
 if(data.revision!==current.revision)return reply(409,{error:'另一个窗口已更新项目，请重新载入后再编辑。'});
 if(!Array.isArray(data.glyphs)||!Array.isArray(data.groups)||!Array.isArray(data.levels))throw new Error('Invalid library');
 // Asset references must remain inside this project's public assets/uploads folders.
 const paths=[...data.glyphs.flatMap(g=>[g.normal,...g.patterns.map(p=>p.svg)]),...data.levels.map(l=>l.audio)].filter(Boolean);
 for(const value of paths){if(typeof value!=='string'||! /^(assets|uploads)\/[a-zA-Z0-9_./-]+$/.test(value)||value.split('/').includes('..'))throw new Error('Invalid asset path');await fs.access(path.join(publicRoot,value));}
 const backup=path.join(root,'authoring-backups');await fs.mkdir(backup,{recursive:true});await fs.copyFile(file,path.join(backup,`library-${current.revision}-${randomUUID()}.json`));
 const saved={...data,revision:current.revision+1,updatedAt:new Date().toISOString()};
 const temp=`${file}.${randomUUID()}.tmp`;await fs.writeFile(temp,JSON.stringify(saved,null,2)+'\n');await fs.rename(temp,file);return reply(200,saved);
 }
 return reply(404,{error:'Unknown authoring endpoint'});
 };
 const pending=queue.then(task);queue=pending.catch(()=>{});await pending;
 }catch(e){reply(400,{error:e.message});}
 });
 }};
}
