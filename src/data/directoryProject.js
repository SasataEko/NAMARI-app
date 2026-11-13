// Browser-authorized local project editing; no remote write endpoint or credentials.
let active=null;
const urls=new Map();
export const directoryConnected=()=>!!active;
export const directoryName=()=>active?.name||'';
export const directoryAsset=p=>urls.get(p);
export const directoryLibrary=()=>active?.storage.read();
function parts(path){if(typeof path!=='string'||!path||path.split('/').some(p=>!p||p==='.'||p==='..')||!/^[a-zA-Z0-9_./-]+$/.test(path))throw new Error('ファイルの保存先が不正です。');return path.split('/');}
async function fileAt(root,path,create=false){const names=parts(path);let dir=root;for(const name of names.slice(0,-1))dir=await dir.getDirectoryHandle(name,{create});return dir.getFileHandle(names.at(-1),{create});}
async function textAt(root,path){return (await (await fileAt(root,path)).getFile()).text();}
async function put(root,path,data){const file=await fileAt(root,path,true);const stream=await file.createWritable();try{await stream.write(data);await stream.close();}catch(e){await stream.abort().catch(()=>{});throw e;}}
const references=data=>[...data.glyphs.flatMap(g=>[g.normal,...g.patterns.map(p=>p.svg)]),...data.levels.map(l=>l.audio)].filter(Boolean);
function validateLibrary(data){if(!Number.isInteger(data.revision)||!Array.isArray(data.glyphs)||!Array.isArray(data.groups)||!Array.isArray(data.levels))throw new Error('プロジェクトの素材設定を確認してください。');for(const path of references(data)){parts(path);if(!/^(assets|uploads)\//.test(path))throw new Error('素材の保存先が不正です。');}}
export function validateUpload(name,source,size){const ext=name.slice(name.lastIndexOf('.')).toLowerCase();if(!['.svg','.mp3','.wav','.ogg','.m4a','.webm'].includes(ext))throw new Error('SVGまたはMP3・WAV・OGG・M4A・WebMを選んでください。');if(size>32*1024*1024)throw new Error('ファイルは32MB以内にしてください。');if(ext==='.svg'){if(!/<svg[\s>]/i.test(source)||!/<path[\s>]/i.test(source)||!/viewBox\s*=/i.test(source))throw new Error('SVGにはviewBoxと輪郭pathが必要です。');if(/<!DOCTYPE|<!ENTITY|<\s*(?:script|foreignObject|image|use|iframe|animate|set)\b|\bon\w+\s*=|(?:href|src)\s*=|url\s*\(|@import|<\s*(?:mask|clipPath|filter)\b|\btransform\s*=/i.test(source))throw new Error('外部参照や変換を含まない、輪郭化したSVGを選んでください。');}return ext;}
export async function createDirectoryStorage(handle){
 await fileAt(handle,'package.json');
 const read=async()=>{const data=JSON.parse((await textAt(handle,'public/content/library.json')).replace(/^\uFEFF/,''));validateLibrary(data);return data;};
 await read();let queue=Promise.resolve();
 const serial=fn=>{const result=queue.then(fn);queue=result.catch(()=>{});return result;};
 return {read,file:async path=>(await fileAt(handle,'public/'+path)).getFile(),
 upload:file=>serial(async()=>{const ext=validateUpload(file.name,file.name.toLowerCase().endsWith('.svg')?await file.text():'',file.size);const path='uploads/'+(ext==='.svg'?'glyphs':'audio')+'/'+crypto.randomUUID()+ext;await put(handle,'public/'+path,file);return path;}),
 save:data=>serial(async()=>{validateLibrary(data);const current=await read();if(current.revision!==data.revision)throw new Error('別の画面で更新されています。プロジェクトを開き直してください。');for(const path of references(data))await fileAt(handle,'public/'+path);await put(handle,'authoring-backups/library-'+current.revision+'-'+crypto.randomUUID()+'.json',JSON.stringify(current,null,2)+'\n');const saved={...data,revision:current.revision+1,updatedAt:new Date().toISOString()};await put(handle,'public/content/library.json',JSON.stringify(saved,null,2)+'\n');return saved;})};
}
async function previewAsset(storage,path){const file=await storage.file(path);urls.set(path,URL.createObjectURL(file));}
export async function connectDirectory(){
 if(!globalThis.showDirectoryPicker)throw new Error('この機能はパソコンのChromeまたはEdgeで開いてください。');
 const handle=await showDirectoryPicker({id:'namari-project',mode:'readwrite'});
 const storage=await createDirectoryStorage(handle);const data=await storage.read();
 // Validate every referenced file before activating the folder.
 const previews=await Promise.all([...new Set(references(data))].map(async path=>[path,await storage.file(path)]));
 for(const [path,file]of previews)urls.set(path,URL.createObjectURL(file));
 active={storage,name:handle.name};return data;
}
export function disconnectDirectory(){active=null;for(const url of urls.values())URL.revokeObjectURL(url);urls.clear();}
export async function directoryUpload(file){const path=await active.storage.upload(file);await previewAsset(active.storage,path);return path;}
export const directorySave=data=>active.storage.save(data);
