import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {seidakuFamilies} from '../src/data/seidakuFamilies.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),file=path.join(root,'public/content/library.json');
const original=await fs.readFile(file,'utf8'),library=JSON.parse(original.replace(/^\uFEFF/,''));
const group=library.groups.find(g=>g.title==='清濁の混同')||{id:'pattern-seidaku',title:'清濁の混同',folderName:'pattern-seidaku',color:'#fe9ab8'};
group.description='清音・濁音・半濁音の間で、別のかなのように聞こえる変化。';
if(!library.groups.includes(group))library.groups.push(group);
const folder='assets/namari/'+group.folderName;await fs.mkdir(path.join(root,'public',folder),{recursive:true});
const stem=g=>path.basename(g.normal,'.svg').replace(/^ba_1$/,'bo');
let added=0,total=0;const skipped=[],canvases=[];
for(const family of seidakuFamilies){
 const glyphs=family.map(k=>library.glyphs.find(g=>g.kana===k));
 for(let i=0;i<family.length;i++)for(let j=0;j<family.length;j++){
  if(i===j)continue;const source=glyphs[i],target=glyphs[j];if(!source?.normal||!target?.normal){skipped.push(family[i]+'→'+family[j]);continue;}
  const [a,b]=await Promise.all([source,target].map(g=>fs.readFile(path.join(root,'public',g.normal),'utf8')));
  const boxes=[a,b].map(s=>s.match(/viewBox="([^"]+)"/)?.[1]);if(boxes.some(v=>!v))throw Error('Missing viewBox');if(boxes[0]!==boxes[1])canvases.push(source.kana+'→'+target.kana);
  let pattern=source.patterns.find(p=>p.groupId===group.id&&p.renderMode==='symbol-switch'&&p.targetKana===target.kana);
  if(!pattern){const id='seidaku-'+stem(source)+'-to-'+stem(target);if(library.glyphs.some(g=>g.patterns.some(p=>p.id===id)))throw Error('Duplicate pattern ID: '+id);
    pattern={id,groupId:group.id,title:'「'+source.kana+'」が「'+target.kana+'」に聞こえる',description:'「'+target.kana+'」のように聞こえる。',svg:folder+'/'+stem(source)+'-to-'+stem(target)+'.svg',renderMode:'symbol-switch',targetKana:target.kana};
    await fs.copyFile(path.join(root,'public',target.normal),path.join(root,'public',pattern.svg));source.patterns.push(pattern);added++;
  }
  total++;
 }
}
if(await fs.readFile(file,'utf8')!==original)throw Error('Library changed during sync');
await fs.mkdir(path.join(root,'authoring-backups'),{recursive:true});await fs.writeFile(path.join(root,'authoring-backups','library-before-seidaku-families-'+Date.now()+'.json'),original);
library.revision++;library.updatedAt=new Date().toISOString();await fs.writeFile(file,JSON.stringify(library,null,2)+'\n');
console.log(JSON.stringify({families:seidakuFamilies.length,glyphs:new Set(seidakuFamilies.flat()).size,added,total,skipped,differentCanvas:canvases}));
