import {markTutorial} from './data/researchState.js';
import { createTutorialGuide } from './tutorialGuide.js';
export function createModeTwoGuide(root,{level,state,getMode,getSelected}){
  const guide=createTutorialGuide();let step='listen',disposed=false;
  const transitions={listen:['listened','segment-tab'],'segment-tab':['mode:segment','kana'],kana:['kana','pattern'],pattern:['pattern','pitch-tab'],'pitch-tab':['mode:pitch','pitch'],pitch:['pitch','duration-tab'],'duration-tab':['mode:duration','stretch'],stretch:['stretch','gap'],gap:['gap','free']};
  const cue=root.querySelector('[data-mode2-cue]'),end=root.querySelector('[data-guide-end]');
  const text={listen:'まず録音を最後まで聞いてみよう。', 'segment-tab':'「母音/子音」を押すと、文字の音を表現できます。',kana:'試しに「か」を選んでみよう。',pattern:'カードを選んで字形の変化を試してみよう。これは正解の指定ではありません。','pitch-tab':'次は「アクセント」を押してみよう。',pitch:'「か」の高低を変えて、背景の丸を動かしてみよう。','duration-tab':'次は「拍」を押してみよう。',stretch:'最後の「む」を2拍にのばしてみよう。',gap:'「か」の後に「＋」で空白拍の「ッ」を加えてみよう。',free:'操作の練習はここまで！ここからは自由に組み合わせて、聞こえたかたちをつくってみよう。送るタイミングも自由です。'};
  end.onclick=()=>{markTutorial('mode2','exploration','skipped');step='free';refresh();};
  function refresh(){
    if(disposed||!root.isConnected)return;cue.textContent=text[step];end.hidden=step==='free';
    if(step==='free'){guide.hide();return;}
    const audio=root.querySelector('audio');if(step==='listen'){guide.set(audio,{text:text.listen,step:'MODE 2 / 操作を試す'});return;}
    const work=root.querySelector('[data-mode2-workarea]'),highlight=work?[work]:[];
    const opts={highlight,showNote:false};let target;
    const tab=mode=>root.querySelector('[data-mode="'+mode+'"]');
    if(step==='segment-tab')target=tab('segment');
    else if(step==='pitch-tab')target=tab('pitch');
    else if(step==='duration-tab')target=tab('duration');
    else if(['kana','pattern'].includes(step)){
      if(getMode()!=='segment')target=tab('segment');
      else if(step==='kana')target=root.querySelector('[data-kana="0"]');
      else if(getSelected()===null)target=root.querySelector('[data-kana="0"]');
      else target=root.querySelector('.explore-feature');
    }else if(step==='pitch')target=getMode()!=='pitch'?tab('pitch'):root.querySelector('.explore-tone-control button[aria-pressed="false"]');
    else if(step==='stretch')target=getMode()!=='duration'?tab('duration'):root.querySelectorAll('.explore-beat-toggle')[level.characters.length-1];
    else if(step==='gap')target=getMode()!=='duration'?tab('duration'):root.querySelector('.explore-gap button');
    if(target)guide.set(target,opts);else guide.hide();
  }
  return {refresh,notify(event){if(disposed)return;const transition=transitions[step];if(transition?.[0]===event){step=transition[1];if(step==='free')markTutorial('mode2','exploration','completed');}refresh();},playing(){if(step==='listen')guide.set(root.querySelector('audio'),{text:'聞き終わるまで、そのまま聞いてみよう。',step:'MODE 2 / 録音を聞く',point:false});},dispose(){disposed=true;guide.dispose();}};
}
