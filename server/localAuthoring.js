import { planAssetOrganization } from '../src/data/assetOrganization.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
export function localAuthoring(){
 let queue=Promise.resolve();
 return {name:'local-authoring',apply:'serve',configureServer(server){
 const root=server.config.root,publicRoot=path.join(root,'public'),file=path.join(publicRoot,'content/library.json');
 server.middlewares.use(async(req,res,next)=>{
 const url=new URL(req.url,'http://localhost');
 if(req.method==='GET'&&['library.json','collection.json','study-manifest.json','mode-one-manifest.json'].some(name=>url.pathname===`${server.config.base}content/${name}`)){
   try{const bytes=await fs.readFile(path.join(publicRoot,'content',path.basename(url.pathname)));res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(bytes);}catch{res.statusCode=404;res.end();}return;
 }
 const publicPrefix=server.config.base;
 if(req.method==='GET'&&(url.pathname.startsWith(publicPrefix+'assets/')||url.pathname.startsWith(publicPrefix+'uploads/'))){
 const relative=url.pathname.slice(publicPrefix.length),ext=path.extname(relative);const mime={'.png':'image/png','.svg':'image/svg+xml','.mp3':'audio/mpeg','.wav':'audio/wav','.ogg':'audio/ogg','.m4a':'audio/mp4','.webm':'audio/webm'}[ext];
 if(!mime)return next();if(!/^(assets|uploads)\/[a-zA-Z0-9_./-]+$/.test(relative)||relative.split('/').some(p=>!p||p==='.'||p==='..')){res.statusCode=404;return res.end();}
 try{const bytes=await fs.readFile(path.join(publicRoot,relative));res.setHeader('Content-Type',mime);res.setHeader('Cache-Control','no-store');res.end(bytes);}catch{res.statusCode=404;res.end();}return;
 }
 if(!url.pathname.startsWith('/__author/'))return next();
 const reply=(code,data)=>{res.statusCode=code;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(data));};
 try{
 const host=new URL(`http://${req.headers.host}`).hostname;
 const remote=req.socket.remoteAddress;
 if(!['localhost','127.0.0.1','[::1]'].includes(host)||!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(remote))return reply(403,{error:'このパソコンから開いてください。'});
 if(req.method==='GET'&&url.pathname==='/__author/status')return reply(200,{enabled:true});
 if(req.method!=='POST'||req.headers['x-local-authoring']!=='1'||!req.headers.origin||new URL(req.headers.origin).host!==req.headers.host)return reply(403,{error:'本機の編集画面から保存してください。'});
 const chunks=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>32*1024*1024)throw new Error('ファイルは32MB以内にしてください。');chunks.push(chunk);}const body=Buffer.concat(chunks);
 const task=async()=>{
 if(url.pathname==='/__author/upload'){
 const name=url.searchParams.get('name')||'',ext=path.extname(name).toLowerCase();
 if(!['.svg','.mp3','.wav','.ogg','.m4a','.webm'].includes(ext))throw new Error('SVGまたはMP3・WAV・OGG・M4A・WebMを選んでください。');
 if(ext==='.svg'){
 const source=body.toString('utf8');
 if(!/<svg[\s>]/i.test(source)||!/<path[\s>]/i.test(source)||! /viewBox\s*=/i.test(source))throw new Error('SVGにはviewBoxと輪郭pathが必要です。');
 if(/<!DOCTYPE|<!ENTITY|<\s*(?:script|foreignObject|image|use|iframe|animate|set)\b|\bon\w+\s*=|(?:href|src)\s*=|url\s*\(|@import|<\s*(?:mask|clipPath|filter)\b|\btransform\s*=/i.test(source))throw new Error('外部参照や変換を含まない、輪郭化したSVGを選んでください。');
 }
 const kind=ext==='.svg'?'glyphs':'audio',relative=`uploads/${kind}/${randomUUID()}${ext}`;
 await fs.mkdir(path.join(publicRoot,'uploads',kind),{recursive:true});await fs.writeFile(path.join(publicRoot,relative),body,{flag:'wx'});
 return reply(200,{path:relative,originalName:name,bytes:body.length});
 }
 if(url.pathname==='/__author/save'){
 const data=JSON.parse(body.toString('utf8'));const current=JSON.parse((await fs.readFile(file,'utf8')).replace(/^\uFEFF/,''));
 if(data.revision!==current.revision)return reply(409,{error:'別の画面で更新されています。プロジェクトを開き直してください。'});
 if(!Array.isArray(data.glyphs)||!Array.isArray(data.groups)||!Array.isArray(data.levels))throw new Error('素材設定が不正です。');
 const plan=planAssetOrganization(data);
 // Check every source before writing or moving anything.
 const original=[...data.glyphs.flatMap(g=>[g.normal,...g.patterns.map(p=>p.svg)]),...data.levels.map(l=>l.audio)].filter(Boolean);for(const value of original){if(typeof value!=='string'||!/^(assets|uploads)\/[a-zA-Z0-9_./-]+$/.test(value)||value.split('/').some(p=>!p||p==='.'||p==='..'))throw new Error('素材の保存先が不正です。');await fs.access(path.join(publicRoot,value));}
 const backup=path.join(root,'authoring-backups'),snapshot=randomUUID(),assetBackup=path.join(backup,'assets',snapshot);await fs.mkdir(backup,{recursive:true});await fs.copyFile(file,path.join(backup,`library-${current.revision}-${snapshot}.json`));
 const sources=new Map(await Promise.all(plan.copies.map(async move=>[move.from,await fs.readFile(path.join(publicRoot,move.from))])));
 const written=[];
 try{
 for(const move of plan.copies){const target=path.join(publicRoot,move.to);let previous=null;try{previous=await fs.readFile(target);}catch(e){if(e.code!=='ENOENT')throw e;}if(previous){const saved=path.join(assetBackup,'overwritten',move.to);await fs.mkdir(path.dirname(saved),{recursive:true});await fs.writeFile(saved,previous);}await fs.mkdir(path.dirname(target),{recursive:true});written.push({target,previous});await fs.writeFile(target,sources.get(move.from));}
 const saved={...plan.library,revision:current.revision+1,updatedAt:new Date().toISOString()};const temp=`${file}.${randomUUID()}.tmp`;await fs.writeFile(temp,JSON.stringify(saved,null,2)+'\n');await fs.rename(temp,file);
 for(const source of plan.cleanup){try{const from=path.resolve(publicRoot,source),to=path.resolve(assetBackup,'originals',source);if(!from.startsWith(path.resolve(publicRoot)+path.sep)||!to.startsWith(path.resolve(backup)+path.sep))throw new Error('Invalid archive path');await fs.mkdir(path.dirname(to),{recursive:true});await fs.rename(from,to);}catch(e){console.warn('SVG archive retained:',source,e.message);}}
 return reply(200,{...saved,assetMoves:plan.copies});
 }catch(error){for(const {target,previous}of written.reverse()){if(previous)await fs.writeFile(target,previous);else await fs.unlink(target).catch(()=>{});}throw error;}


 }
 return reply(404,{error:'保存先が見つかりません。'});
 };
 const pending=queue.then(task);queue=pending.catch(()=>{});await pending;
 }catch(e){reply(400,{error:e.message});}
 });
 }};
}
