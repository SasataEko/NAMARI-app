// Explicit correspondence of separated contours inside the existing single SVG.
// Normal: left, centre, top, dakuten-left, right, dakuten-right.
// Pattern U: centre, right, left, top, dakuten-left, dakuten-right.
export function ichibuMorphOptions(question,character){
 return question.word==='いちぶ'&&character.text==='ぶ'&&character.pattern?.id==='pattern-u-bu'
  ?{strokeMap:[[2,0,3,4,1,5]]}:{};
}
