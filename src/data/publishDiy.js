
import {readLibrary,writeLibrary,uploadAsset} from './projectLibrary.js';
import {directoryConnected} from './directoryProject.js';
import {projectModeOneDefinition,projectModeOneSnapshot} from './projectModeOne.js';
export async function publishDiyQuestions(questions,deleted=[]){
 if(!directoryConnected()){const status=await fetch('/__author/status').then(r=>r.ok?r.json():null).catch(()=>null);if(!status?.enabled)throw Error('ローカルのゲームで開くか、開発者モードでプロジェクトフォルダーを開いてください。');}
 const library=await readLibrary();
 for(const q of questions){if(!q.reading?.length||!q.audioBlob)throw Error('保存済みの録音を確認してください：'+q.word);projectModeOneDefinition(library,q);}
 const additions=[];
 for(const q of questions){const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',await q.audioBlob.arrayBuffer()))].map(b=>b.toString(16).padStart(2,'0')).join('');const existing=(library.modeOneLevels||[]).find(l=>l.id===q.id);const audio=existing?.audioHash===hash?existing.audio:await uploadAsset(new File([q.audioBlob],q.audioName||'recording.wav',{type:q.audioBlob.type}));additions.push(projectModeOneSnapshot(q,audio,hash));}
 const replaced=new Set([...questions,...deleted].map(q=>q.id));
 const saved=await writeLibrary({...library,modeOneLevels:[...(library.modeOneLevels||[]).filter(q=>!replaced.has(q.id)),...additions]});
 return {library:saved,count:additions.length};
}
