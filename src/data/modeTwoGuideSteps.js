export const modeTwoGuideSteps=['listen','kana','shape-tab','pattern','pitch-tab','pitch','emphasis','beat-tab','beat','undo','free'];
const expected=['listened','kana','tab:patterns','pattern','tab:pitch','pitch','emphasis','tab:duration','beat','undo'];
export function nextModeTwoGuideStep(step,event){
 const index=modeTwoGuideSteps.indexOf(step);if(index<0||index>=expected.length)return step;
 if(event===expected[index]||(event==='next'&&['pattern','emphasis'].includes(step)))return modeTwoGuideSteps[index+1];
 return step;
}
