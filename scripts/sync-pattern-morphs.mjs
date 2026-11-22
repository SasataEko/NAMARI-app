import fs from 'node:fs/promises';
import path from 'node:path';
// Run from the project root after replacing authored A / RN SVGs.
const file='public/content/library.json';
const library=JSON.parse(await fs.readFile(file,'utf8'));
const groups=new Set(library.groups.filter(g=>['pattern-A','pattern-RN'].includes(g.folderName)).map(g=>g.id));
const writes=new Map(),sources=new Set();let count=0;
for(const glyph of library.glyphs){for(const pattern of glyph.patterns.filter(p=>groups.has(p.groupId))){
 const source=pattern.sourceSvg||pattern.svg.replace(/-morph\.svg$/,'.svg');
 const normal=await fs.readFile('public/'+glyph.normal,'utf8'),svg=await fs.readFile('public/'+source,'utf8');
 const tags=[...svg.matchAll(/<path\b[^>]*\bd="([^"]+)"[^>]*\/?\s*>/g)];
 const normalCount=[...normal.matchAll(/<path\b/g)].length;
 if(normalCount!==1||!tags.length||/<(?:rect|circle|ellipse|line|polyline|polygon|use|mask|clipPath|image)\b|\btransform\s*=/.test(svg))throw Error('Unsupported outline structure: '+source);
 if(normal.match(/viewBox="([^"]+)"/)?.[1]!==svg.match(/viewBox="([^"]+)"/)?.[1])throw Error('Canvas mismatch: '+source);
 const attributes=tag=>tag.replace(/\bd="[^"]*"/,'').replace(/\s+/g,' ').replace(/\s*\/?>$/,'').trim();
 if(tags.some(t=>attributes(t[0])!==attributes(tags[0][0])))throw Error('Path styles differ: '+source);
 let target=source;
 if(tags.length>1){
  target=source.replace(/\.svg$/,'-morph.svg');let first=true;
  const compound=tags.map(t=>t[1]).join(' ');
  const merged=svg.replace(/<path\b[^>]*\bd="([^"]+)"[^>]*\/?\s*>/g,tag=>{if(!first)return '';first=false;return tag.replace(/\bd="[^"]*"/,'d="'+compound+'"');});
  writes.set(target,merged);
 }
 pattern.sourceSvg=source;pattern.svg=target;sources.add(source);count++;
}}
for(const [target,svg]of writes){await fs.mkdir(path.dirname('public/'+target),{recursive:true});await fs.writeFile('public/'+target,svg);}
library.revision=(library.revision||0)+1;library.updatedAt=new Date().toISOString();
await fs.writeFile(file,JSON.stringify(library,null,2)+'\n');
console.log('Synced '+sources.size+' authored SVGs, '+count+' kana Pattern associations, '+writes.size+' derived compound SVGs.');
