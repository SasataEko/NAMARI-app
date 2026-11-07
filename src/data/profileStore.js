const PROFILE_KEY = 'kotoba-profiles-v1';
const SETTINGS_KEY = 'kotoba-settings-v1';

export const profiles = [
  { id: 'zh', initial: '中', name: '中国語話者', slot: '母語スロット A' },
  { id: 'ja', initial: '日', name: '日本語話者', slot: '母語スロット B' },
];

export function loadProfiles() {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}'); }
  catch { return {}; }
}

export function saveProfile(profileId, data) {
  const all = loadProfiles();
  all[profileId] = data;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(all));
}

export function loadSettings() {
  try { return { vibration: true, sfx: true, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }; }
  catch { return { vibration: true, sfx: true }; }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
