import { defineConfig } from 'vite';
import { localAuthoring } from './server/localAuthoring.js';
export default defineConfig({base:'/NAMARI-app/',plugins:[localAuthoring()],server:{watch:{ignored:['**/public/uploads/**','**/public/content/**','**/authoring-backups/**']}}});
