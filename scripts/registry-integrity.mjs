
import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';
export const digest=value=>createHash('sha256').update(value).digest('hex');
export const canonicalAsset=(name,bytes)=>name.endsWith('.svg')?Buffer.from(bytes.toString('utf8').replace(/\r\n/g,'\n')):bytes;
export async function verifyRegistry(root){
 const read=p=>fs.readFile(path.join(root,p));const integrity=JSON.parse(await read('public/content/registry-integrity.json'));
 for(const [name,expected]of Object.entries(integrity.registries)){const actual=JSON.parse(await read(name));if(digest(JSON.stringify(actual))!==expected)throw Error('Registry changed: '+name+'; run pnpm manifest and update Apps Script before publishing.');}
 for(const [name,expected]of Object.entries(integrity.assets)){if(digest(canonicalAsset(name,await read('public/'+name)))!==expected)throw Error('Asset changed: '+name+'; run pnpm manifest before publishing.');}
 for(const [client,server]of [['study-manifest.json','levels.json'],['mode-one-manifest.json','mode-one-levels.json']]){if(JSON.stringify(JSON.parse(await read('public/content/'+client)))!==JSON.stringify(JSON.parse(await read('apps-script/'+server))))throw Error('Client/server registry mismatch: '+client);}
 return {assets:Object.keys(integrity.assets).length,registries:Object.keys(integrity.registries).length};
}
