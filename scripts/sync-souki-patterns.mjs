import fs from 'node:fs/promises';
// Discover authored files, retaining IDs and the original unmodified SVGs.
const folder='assets/namari/pattern-souki',file='public/content/library.json';
const kana={ka:'か',ki:'き',ku:'く',ke:'け',ko:'こ',sa:'さ',shi:'し',su:'す',se:'せ',so:'そ',ta:'た',chi:'ち',tsu:'つ',te:'て',to:'と',da:'だ',ha:'は',hi:'ひ',fu:'ふ',he:'へ',ho:'ほ',pa:'ぱ',pi:'ぴ',pu:'ぷ',pe:'ぺ',po:'ぽ'};
const library=JSON.parse(await fs.readFile(file,'utf8')),group=library.groups.find(g=>g.folderName==='pattern-souki');if(!group)throw Error('送気Patternのグループがありません。');
const files=(await fs.readdir('public/'+folder)).filter(f=>f.endsWith('.svg')&&!f.endsWith('-morph.svg')),seen=new Set();let added=0;
for(const name of files){
 const stem=name.split('-')[0],text=kana[stem];if(!text)throw Error('未対応のファイル名：'+name);if(seen.has(text))throw Error('同じ文字の原稿が複数あります：'+text);seen.add(text);
 const glyph=library.glyphs.find(g=>g.kana===text);if(!glyph?.normal)throw Error('通常字形がありません：'+text);
 const matches=glyph.patterns.filter(p=>p.groupId===group.id);if(matches.length>1)throw Error('送気Patternが重複しています：'+text);
 let pattern=matches[0];if(!pattern){pattern={id:'pattern-souki-'+stem,groupId:group.id,title:'送気の強い「'+text+'」',description:group.description};glyph.patterns.push(pattern);added++;}
 pattern.sourceSvg=folder+'/'+name;pattern.svg=pattern.sourceSvg;
}
// Fail rather than silently leaving a deleted source linked to a broken preview.
for(const glyph of library.glyphs)for(const pattern of glyph.patterns.filter(p=>p.groupId===group.id))if(!seen.has(glyph.kana))await fs.access('public/'+(pattern.sourceSvg||pattern.svg));
await fs.writeFile(file,JSON.stringify(library,null,2)+'\n');
console.log('Matched '+files.length+' aspiration SVGs; '+added+' new kana associations.');
await import('./sync-pattern-morphs.mjs');
