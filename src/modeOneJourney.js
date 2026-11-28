import {mountJourneyLayer} from './modeTwoJourney.js';
import {createModeOneJourneyModel} from './data/modeOneJourneyModel.js';
export function mountModeOneJourney(root,{question,audio,onFinish,onSkip,onCloseCard,onShowCorrect}){
 const model=createModeOneJourneyModel(question);let disposed=false,actionIndex=-1;
 const update=()=>{if(model.finished){dispose();onFinish?.();return;}layer.refresh();const action=model.step.action;if(action&&actionIndex!==model.index){actionIndex=model.index;if(action==='closeCard')onCloseCard?.();if(action==='showCorrect'){onShowCorrect?.();notify('correctReady');}}};
 const layer=mountJourneyLayer(root,{step:()=>model.step,onAdvance:()=>{if(model.advance())update();},onSkip:()=>{model.skip();dispose();onSkip?.();},onInteract:target=>{if(model.step.event==='replay'&&target.closest?.('.m3-audio-button'))notify('replay');}});
 const ended=()=>notify('listened'),started=()=>{model.audioStarted();layer.refresh();};audio.addEventListener('ended',ended);audio.addEventListener('play',started);
 function notify(event){if(!disposed&&model.notify(event))update();}
 function dispose(){if(disposed)return;disposed=true;audio.removeEventListener('ended',ended);audio.removeEventListener('play',started);layer.dispose();}
 return {notify,dispose,refresh:()=>layer.refresh(),blocked(){model.audioBlocked();layer.refresh();}};
}
