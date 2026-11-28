import {hiragana} from './patternLibrary.js';
const columns={あ:'あかさたなはまやらわがざだばぱぁゃゎ',い:'いきしちにひみりぎじぢびぴぃ',う:'うくすつぬふむゆるぐずづぶぷぅゅゔ',え:'えけせてねへめれげぜでべぺぇ',お:'おこそとのほもよろをごぞどぼぽぉょ'};
export const normalizeKanaSearch=value=>hiragana(String(value||'').normalize('NFKC')).replace(/\s+/g,'');
export function kanaColumn(kana){const last=[...normalizeKanaSearch(kana)].at(-1);return Object.keys(columns).find(key=>columns[key].includes(last))||'その他';}
export function findKanaGlyphs(glyphs,query){const q=normalizeKanaSearch(query);if(!q)return [];const exact=glyphs.filter(g=>g.kana===q);return exact.length?exact:glyphs.filter(g=>g.kana.includes(q));}
