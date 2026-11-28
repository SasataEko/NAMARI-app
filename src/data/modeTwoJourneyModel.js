export const journeyVersion='2026.11.26-sequential-guide-v4';
const steps={
 listen:{text:'まずは録音を一度、最後まで聞いてみよう。',event:'listened',waitForClick:true,next:'pitchIntro'},
 pitchIntro:{text:'アクセントから調整してみよう！',centered:true,next:'pitchAudio'},
 pitchAudio:{text:'録音はここで再生できるよ',allow:['.m3-audio-button'],replay:true,point:'.m3-audio-button',highlight:['.m3-canvas','.m3-audio-button'],next:'pitchTry'},
 pitchTry:{text:'上下の点で、音の高さを変えてみよう。',event:'pitch',next:'pitchSeen',allow:['.accent-dot','.m3-audio-button','.edit-undo'],point:'.m3-pitch-grid',regionPoint:true,highlight:['.m3-canvas','.m3-pitch-grid']},
 pitchSeen:{text:'文字の背景が上下に動いたね！',next:'emphasisIntro'},
 emphasisIntro:{text:'高低だけでは表せない強さを感じたら、重音を加えてみよう。',next:'emphasisTry'},
 emphasisTry:{text:'真ん中の文字をタップして、重音をつけてみよう。',event:'emphasis',next:'emphasisSeen',allow:['.m3-kana'],point:'.m3-canvas',regionPoint:true},
 emphasisSeen:{text:'背景が変わったね！これで1つ目の重音がついたよ。',next:'emphasisLimit'},
 emphasisLimit:{text:'重音は2つまでつけられるよ。',next:'emphasisLower'},
 emphasisLower:{text:'下の文字でもつけられるよ。もう一度タップすると外せるよ！',highlight:['.m3-canvas','.m3-emphasis-kana'],anchor:'.m3-emphasis-kana',allow:['.m3-kana:has(.m3-emphasis-badge)','.m3-emphasis-kana[aria-pressed="true"]'],next:'undoIntro'},
 undoIntro:{text:'右上の矢印でも、ひとつ前に戻せるよ。',point:'.edit-undo',highlight:['.m3-canvas','.edit-undo'],allow:['.edit-undo'],next:'pitchReady'},
 pitchReady:{text:'ここからは自由に調整できるよ。決まったら「母音・子音の判断へ」進もう。',point:'.m3-save',next:'pitchFree'},
 pitchFree:{event:'next:patterns',next:'patternsIntro',free:true},
 patternsIntro:{text:'次は、母音・子音の聞こえ方をかたちにしてみよう。',next:'patternsSelect'},
 patternsSelect:{text:'気になる文字を選んでみよう。',event:'select',next:'patternsTry',allow:['.m3-kana'],point:'.m3-canvas',regionPoint:true},
 patternsTry:{text:'カードを選んで、文字の変化を見てみよう。',event:'pattern',next:'patternsAnimating',allow:['.m3-choice[data-pattern-id]:not([data-pattern-id=""])','.m3-kana','.m3-audio-button','.edit-undo'],point:'.m3-options',regionPoint:true},
 patternsAnimating:{text:'文字が変わるところを見てみよう。',event:'morphDone',waitForClick:true,next:'patternsSeen'},
 patternsSeen:{text:'文字の形が変わったね！自由に試して、決まったらモーラへ進もう。',next:'patternsFree'},
 patternsFree:{event:'next:duration',next:'durationIntro',free:true},
 durationIntro:{text:'最後に、聞こえた拍の長さをつくってみよう。',next:'durationSelect'},
 durationSelect:{text:'長さを変えたい文字を選んでみよう。',event:'select',next:'durationTry',allow:['.m3-kana'],point:'.m3-canvas',regionPoint:true},
 durationTry:{text:'「ー」か「ッ」で1拍ふやして、「−1拍」で減らせるよ。試してみよう。',event:'beat',next:'durationSeen',allow:['.beat-choice','.m3-kana','.m3-audio-button','.edit-undo'],point:'.beat-choice-list',regionPoint:true},
 durationSeen:{text:'拍が変わったね！',next:'durationSubmit'},
 durationSubmit:{point:'.m3-save',text:'自由に調整して「こう聞こえた」で提出すると、みんなの結果も見られるよ。',next:'durationFree'},
 durationFree:{finished:true,free:true}
};
export function createJourneyModel(){
 let phase='listen',ready=false;return {
 get phase(){return phase;},get step(){const s=steps[phase];return s&&ready?{...s,event:undefined}:s;},
 advance(){const s=steps[phase];if(s&&(!s.event||ready)&&!s.free&&s.next){phase=s.next;ready=false;return true;}return false;},
 notify(event){const s=steps[phase];if(s&&event===s.event&&s.next){if(s.waitForClick){ready=true;return true;}phase=s.next;ready=false;return true;}return false;},
 skip(){phase='off';ready=false;},get active(){return phase!=='off';}};
}
