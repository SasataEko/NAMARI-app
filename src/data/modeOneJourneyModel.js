export const modeOneJourneyVersion='2026.11.28-mode1-cards-v5';
export function createModeOneJourneyModel(question){
 const vowel=question.mode==='diyVowel',rhythm=question.mode==='diyMora',stage=vowel?'.morph-stage':rhythm?'.lesson-beat-stage':'.pitch-builder',protect='.morph-stage,.lesson-answer,.m3-audio-rail,[data-judge],.mode-one-next,.mode-one-pattern-card,.correct-dialog',highlight=[stage],steps=[];
 const add=s=>steps.push({anchor:stage,highlight,protect,...s});
 add({text:'まずは録音を最後まで聞いてみよう。',event:'listened',waitForClick:true,anchor:stage,highlight:vowel?[stage,'.m3-audio-rail']:[stage]});
 if(vowel)add({text:vowel?'このボタンでいつでも聞き直せるよ！':'このボタンで、いつでも聞き直せるよ。タップして、もう一度聞いてみよう！',event:'replay',anchor:'.m3-audio-rail',point:'.m3-audio-rail',highlight:[stage,'.m3-audio-rail'],allow:['.m3-audio-button'],replay:true});
 add({text:vowel?'母音・子音の訛りを見つけよう！':rhythm?'モーラというのは拍のことだよ。拍の感覚を掴めよう！':'アクセントの訛りを聞き分けてみよう！'});
 if(vowel){
  const i=(question.targetIndexes||[0])[0],text=question.reading[i];
  add({text:'さっきの「'+text+'」の発音がちょっときになるね。タップしてみよう！',event:'kana:'+i,allow:['.character-button[data-kana-index="'+i+'"]'],point:stage,regionPoint:true});
  add({event:'cardReady',hideVisual:true});
  add({text:'文字が変形し、カードが出てきた！こんな訛りパターンがあるのね！',anchor:'.mode-one-pattern-card',placement:'above',protect:'.mode-one-pattern-card .card-glyph-preview,.mode-one-pattern-card img,.mode-one-pattern-card b,.mode-one-pattern-card h2,.mode-one-pattern-card p',highlight:[stage,'.mode-one-pattern-card']});
  add({event:'correctReady',action:'closeCard',hideVisual:true});
 }else{
  if(rhythm){const i=(question.beats||[]).findIndex(b=>b!==1),target=i<0?question.reading.length-1:i,text=question.reading[target];
   add({text:'さっきの「'+text+'」が長く聞こえたよね？タップしてみよう！',event:'select:'+target,allow:['[data-beat-kana="'+target+'"]'],point:stage,regionPoint:true});
   add({text:'「一拍を増やす」を選んでみよう！',event:'beat',allow:['[data-beat-choice="long"]'],point:'[data-beat-choice=long]',highlight:[stage,'.beat-choice-list']});
   add({text:'これで「'+text+'ー」となり、二拍になったね！'});
  }else{
   add({text:'ここに表示されているのは元々の読み方だよ'});
   add({text:'さっきの発音だと、低高高ではなく、高低低かも！'});
   add({text:'それじゃ一個ずつ選んでいこう！'});
   (question.pattern||[]).forEach((pitch,i)=>{const selector='.pitch-choice[data-mora-index="'+i+'"][data-pitch="'+pitch+'"]';
    add({text:['まずは「か」は高で','次は「ら」は低','最後は「だ」も低だね！'][i],event:'pitch:'+i+':'+pitch,allow:[selector],point:selector,highlight:[stage]});
   });
  }
  add({text:rhythm?'では早速判定してもらおう！':'できたね！では早速判定してもらおう！',event:'judge',allow:['[data-judge]'],point:'[data-judge]',highlight:[stage,'[data-judge]']});
  add({event:'correctReady',action:'showCorrect',hideVisual:true});
 }
 add({text:'正解おめでとう！この調子で次に挑んでみよう！',portal:'.correct-dialog',anchor:'.correct-dialog',placement:'above',protect:'.correct-dialog h2,.correct-dialog button',highlight:['.correct-dialog'],allow:['.correct-next'],finished:true});
 let index=0,ready=false,finished=false,blocked=false;
 return {get step(){if(finished)return {free:true};let s=steps[index];if(index===0&&blocked)s={...s,text:'録音ボタンを押して、まずは一度聞いてみよう。',allow:['.m3-audio-button'],point:'.m3-audio-rail'};return ready?{...s,event:undefined}:s;},get index(){return index;},get finished(){return finished;},audioBlocked(){blocked=true;},audioStarted(){blocked=false;},advance(){if(finished||steps[index].event&&!ready)return false;ready=false;if(++index>=steps.length)finished=true;return true;},notify(event){if(finished||steps[index].event!==event)return false;if(steps[index].waitForClick)ready=true;else{ready=false;if(++index>=steps.length)finished=true;}return true;},skip(){finished=true;}};
}
