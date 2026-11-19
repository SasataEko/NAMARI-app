
import {verifyRegistry} from './registry-integrity.mjs';
const result=await verifyRegistry(process.cwd());console.log('Verified committed client/server registries and '+result.assets+' assets.');
