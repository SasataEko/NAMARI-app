// Optional extension: no new sheets/columns; saves visual editor fields inside payload_json.
var MODE2_VISUAL_VERSION_='mode2-make-v1';
function mode2VisualKeys_(p,l){var keys=[];l.characters.forEach(function(c,i){if(p.beats[i]>0){keys.push('base:'+i);if(p.beats[i]===2)keys.push('long:'+i);}if(p.blanks[i])keys.push('blank:'+i);});return keys;}
function validateMode2Visual_(p,l){
 if(p.interactionVersion===undefined)return;
 if(p.interactionVersion!==MODE2_VISUAL_VERSION_||!Array.isArray(p.emphasis)||p.emphasis.length>2||new Set(p.emphasis).size!==p.emphasis.length)throw new Error('INVALID_VISUAL_RESPONSE');
 var keys=mode2VisualKeys_(p,l);if(p.emphasis.some(function(k){return keys.indexOf(k)<0;}))throw new Error('INVALID_EMPHASIS');
 ['glyphAngles','backgroundAngles'].forEach(function(field){var map=p[field]||{};if(typeof map!=='object'||Array.isArray(map)||Object.keys(map).length>l.characters.length*3)throw new Error('INVALID_VISUAL_ANGLES');Object.keys(map).forEach(function(key){var index=Number(key.split(':')[1]),v=map[key];if(!/^(base|long|blank):\d+$/.test(key)||index>=l.characters.length||!Number.isFinite(v)||(field==='glyphAngles'?(v< -10||v>10):(v<0||v>=360)))throw new Error('INVALID_VISUAL_ANGLES');});});
}
function mode2VisualExtras_(p,l){validateMode2Visual_(p,l);if(p.interactionVersion!==MODE2_VISUAL_VERSION_)return {};return {interactionVersion:p.interactionVersion,emphasis:p.emphasis.slice(),glyphAngles:p.glyphAngles||{},backgroundAngles:p.backgroundAngles||{}};}
function mode2VisualStats_(g,rows,l){
 var covered=rows.filter(function(p){return p.interactionVersion===MODE2_VISUAL_VERSION_&&Array.isArray(p.emphasis);}),rates={},answers={};
 covered.forEach(function(p){if(p.skipped)return;p.emphasis.forEach(function(key,i){var r=rates[key]||(rates[key]={first:0,second:0});r[i?'second':'first']+=1/covered.length;});});
 rows.forEach(function(p){if(p.skipped)return;var key=JSON.stringify([p.pattern,p.pitch,p.beats,p.blanks,p.emphasis||[]]);if(!answers[key])answers[key]={count:0,answer:{pattern:p.pattern,pitch:p.pitch,beats:p.beats,blanks:p.blanks,emphasis:p.emphasis||[]}};answers[key].count++;});
 g.visualStatsVersion=1;g.emphasisCount=covered.length;g.emphasisRates=rates;g.longRates=l.characters.map(function(_,i){return rows.length?rows.reduce(function(s,p){return s+Number(!p.skipped&&p.beats[i]===2);},0)/rows.length:0;});
 g.commonExamples=Object.keys(answers).sort(function(a,b){return answers[b].count-answers[a].count||(a<b?-1:a>b?1:0);}).slice(0,3).map(function(k){return {count:answers[k].count,share:answers[k].count/rows.length,answer:answers[k].answer};});return g;
}
