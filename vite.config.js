import {fileURLToPath} from 'node:url';
import { defineConfig } from 'vite';
import { localAuthoring } from './server/localAuthoring.js';
export default defineConfig({base:'/NAMARI-app/',plugins:[localAuthoring()],build:{rollupOptions:{input:Object.fromEntries(['index.html','scripts/all-stroke-preview.html','scripts/ichibu-stroke-preview.html'].map(path=>[path,fileURLToPath(new URL(path,import.meta.url))]))}},server:{watch:{ignored:['**/public/uploads/**','**/public/content/**','**/authoring-backups/**']}}});
