// Fix these rules before collecting a research batch. Change the version for a new protocol.
export const studyConfig = {
  defaultMode: 'test',
  qualityRules: {
    version: '2026-11-11-v1',
    minResponseMs: 1500,
    maxResponseMs: 3600000,
    minListenedMs: 500,
    excludeFlags: ['invalid_response', 'audio_not_played', 'too_fast', 'insufficient_listening', 'control_trial'],
    includeSkipped: true,
    includeUncertain: true,
  },
  // Enable explicitly per trial, without creating or substituting a recording.
  // normal: { type:'normal_control', expectedNoticed:false }
  // repeat: { type:'repeat', referenceRecordingId:'kusuri-recording-v1' }
  qualityChecks: {},
};
export function recordingIdFor(level) { return level.recordingId || `${level.id}-recording-v1`; }
export function qualityCheckFor(level) { return level.qualityCheck || studyConfig.qualityChecks[level.id] || null; }
