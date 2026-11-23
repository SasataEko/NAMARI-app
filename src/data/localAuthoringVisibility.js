// The public Pages build has no authoring UI; loopback previews keep access.
export function developerModeVisible(hostname=globalThis.location?.hostname||'',development=import.meta.env?.DEV===true){
 return development||['localhost','127.0.0.1','[::1]','::1'].includes(hostname.toLowerCase());
}
