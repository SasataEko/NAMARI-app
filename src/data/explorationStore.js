import { featuresFor } from './explorationFeatures.js';
import { studyConfig, recordingIdFor, qualityCheckFor } from './studyConfig.js';
export function defaultAccent(level) {
  if (!Array.isArray(level.defaultAccent) || level.defaultAccent.length !== level.characters.length || level.defaultAccent.some(p => !['low','high'].includes(p))) throw new Error('標準アクセントを設定してください。');
  return [...level.defaultAccent];
}
export const pitchValue = p => typeof p === 'number' ? p : p === 'high' ? 1 : 0;
const RAW_KEY = 'kotoba-exploration-raw-v3';
export function participantId() {
  let id = localStorage.getItem('kotoba-anonymous-participant-v1');
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('kotoba-anonymous-participant-v1', id); }
  return id;
}
export function readRawResponses() {
  const rows = JSON.parse(localStorage.getItem(RAW_KEY) || '[]');
  if (!Array.isArray(rows)) throw new Error('保存データを読み込めません。');
  return rows;
}
export function validResponse(r, level) {
  const n = level.characters.length;
  return ['test','research'].includes(r.studyMode) && typeof r.participantId === 'string' && !!r.participantId &&
    Array.isArray(r.noticed) && r.noticed.length === n && r.noticed.every(v => typeof v === 'boolean') &&
    Array.isArray(r.pattern) && r.pattern.length === n && r.pattern.every((v,i) => v === null || (r.noticed[i] && featuresFor(level.characters[i]).some(f => f.id === v))) &&
    Array.isArray(r.pitch) && r.pitch.length === n && r.pitch.every(p => ['high','low'].includes(p)) &&
    Array.isArray(r.beats) && r.beats.length === n && r.beats.every(b => b === 1 || b === 2) &&
    Array.isArray(r.blanks) && r.blanks.length === Math.max(0,n-1) && r.blanks.every(b => typeof b === 'boolean') &&
    Number.isFinite(r.responseDurationMs) && r.responseDurationMs >= 0 &&
    typeof r.audioPlayed === 'boolean' && Number.isFinite(r.listenedMs) && r.listenedMs >= 0 &&
    ['explored','no_difference','uncertain'].includes(r.answerStatus);
}
export function qualityFlags(r, level, rules) {
  const flags = [];
  if (!validResponse(r, level)) flags.push('invalid_response');
  if (!r.audioPlayed) flags.push('audio_not_played');
  if (r.responseDurationMs < rules.minResponseMs) flags.push('too_fast');
  if (r.responseDurationMs > rules.maxResponseMs) flags.push('long_response');
  if (r.listenedMs < rules.minListenedMs) flags.push('insufficient_listening');
  const check = r.qualityCheck;
  if (check) flags.push('control_trial');
  if (check?.type === 'normal_control' && typeof check.expectedNoticed === 'boolean' && r.noticed?.some(Boolean) !== check.expectedNoticed) flags.push('control_review');
  // These flags never depend on agreement with the majority.
  return flags;
}
export async function saveExploration(record, level) {
  const rows = readRawResponses(), rules = structuredClone(studyConfig.qualityRules);
  const saved = { ...structuredClone(record), schemaVersion:3, recordingId:recordingIdFor(level), qualityCheck:qualityCheckFor(level), qualityRulesVersion:rules.version, qualityRulesSnapshot:rules, quality_flag:qualityFlags({...record,qualityCheck:qualityCheckFor(level)},level,rules) };
  const check=saved.qualityCheck;
  if(check?.type==='repeat'){
    const reference=[...rows].reverse().find(r=>r.participantId===saved.participantId&&r.studyMode===saved.studyMode&&r.recordingId===check.referenceRecordingId&&!r.qualityCheck);
    saved.referenceResponseId=reference?.id||null;
    saved.repeatComparison=reference?{noticedChanged:JSON.stringify(reference.noticed)!==JSON.stringify(saved.noticed),patternChanged:JSON.stringify(reference.pattern)!==JSON.stringify(saved.pattern),pitchChanged:JSON.stringify(reference.pitch)!==JSON.stringify(saved.pitch),beatsChanged:JSON.stringify(reference.beats)!==JSON.stringify(saved.beats),blanksChanged:JSON.stringify(reference.blanks)!==JSON.stringify(saved.blanks)}:null;
    if(!reference)saved.quality_flag.push('repeat_reference_missing');
  }
  rows.push(saved); // Append-only revisions preserve original answers, including flagged ones.
  localStorage.setItem(RAW_KEY,JSON.stringify(rows));
  return saved;
}
export function includedResponses(records, level, { studyMode = 'test', excludeParticipantId = null, rules = studyConfig.qualityRules } = {}) {
  const latest = new Map();
  for (const r of records) {
    if (r.schemaVersion !== 3 || r.studyMode !== studyMode || r.recordingId !== recordingIdFor(level) || r.participantId === excludeParticipantId) continue;
    // Repeat controls have their own slot so they cannot overwrite the main recording response.
    const slot = `${r.participantId}:${r.qualityCheck ? r.levelId : 'main'}`;
    latest.set(slot,r);
  }
  const eligible=[...latest.values()].filter(r => {
    if (!validResponse(r,level) || r.qualityRulesVersion !== rules.version || JSON.stringify(r.qualityRulesSnapshot) !== JSON.stringify(rules)) return false;
    const flags = qualityFlags(r,level,rules);
    return !flags.some(f => rules.excludeFlags.includes(f)) && (rules.includeSkipped || !r.skipped) && (rules.includeUncertain || r.answerStatus !== 'uncertain');
  });
  return [...new Map(eligible.map(r=>[r.participantId,r])).values()];
}
export function aggregateExplorations(records, level, options = {}) {
  const defaults = defaultAccent(level), rows = includedResponses(records,level,options), count = rows.length;
  const result = { count, features:[], noticed:[], noticedRates:[], unspecifiedRates:[], pattern:[], intensity:[], featureRates:[], pitch:[], beats:[], blanks:[], aggregation:'mean' };
  const mean = (values,fallback) => count ? values.reduce((a,b)=>a+b,0)/count : fallback;
  level.characters.forEach((c,i) => {
    const rates = Object.fromEntries(featuresFor(c).map(v => [v.id,mean(rows.map(r=>!r.skipped&&r.pattern[i]===v.id?1:0),0)]));
    result.featureRates.push(rates); result.features.push(null); result.pattern.push(null);
    result.intensity.push(Object.values(rates).reduce((a,b)=>a+b,0));
    result.noticedRates.push(mean(rows.map(r=>!r.skipped&&r.noticed[i]?1:0),0));
    result.unspecifiedRates.push(mean(rows.map(r=>!r.skipped&&r.noticed[i]&&r.pattern[i]===null?1:0),0));
    result.noticed.push(result.noticedRates[i]>0);
    result.pitch.push(mean(rows.map(r=>pitchValue(r.skipped?defaults[i]:r.pitch[i])),pitchValue(defaults[i])));
    result.beats.push(mean(rows.map(r=>r.skipped?1:r.beats[i]),1));
    if(i<level.characters.length-1)result.blanks.push(mean(rows.map(r=>!r.skipped&&r.blanks[i]?1:0),0));
  }); return result;
}
export async function getExplorationAggregate(level, options = {}) {
  return { ...aggregateExplorations(readRawResponses(),level,options), source:'local', studyMode:options.studyMode || 'test', qualityRulesVersion:studyConfig.qualityRules.version };
}
