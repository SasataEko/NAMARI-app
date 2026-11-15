import { assetUrl } from './data/projectLibrary.js';
import './tutorialGuide.css';

// A viewport mask leaves the real control untouched, including native audio UI.
export function createTutorialGuide(){
  const ns='http://www.w3.org/2000/svg',id='tutorial-hole-'+crypto.randomUUID();
  const layer=document.createElement('div');layer.className='tutorial-guide';layer.hidden=true;
  layer.innerHTML='<svg class="tutorial-dimmer" aria-hidden="true"><defs><mask id="'+id+'" maskUnits="userSpaceOnUse"><rect class="guide-mask-base" fill="white"/><rect class="guide-mask-hole" fill="black" rx="16"/></mask></defs><rect class="guide-shade" fill="rgba(17,19,22,.70)" mask="url(#'+id+')"/><rect class="guide-focus-ring" fill="none" rx="16"/></svg><div class="tutorial-guide-arrow" aria-hidden="true"><img alt=""></div><div class="tutorial-guide-note" role="status" aria-live="polite"><b></b><p></p></div>';
  layer.querySelector('img').src=assetUrl('assets/tutorial-arrow.png');document.body.append(layer);
  const svg=layer.querySelector('svg'),mask=layer.querySelector('mask'),base=layer.querySelector('.guide-mask-base'),hole=layer.querySelector('.guide-mask-hole'),shade=layer.querySelector('.guide-shade'),ring=layer.querySelector('.guide-focus-ring'),arrow=layer.querySelector('.tutorial-guide-arrow'),note=layer.querySelector('.tutorial-guide-note');
  let target=null,highlighted=[],frame=0,disposed=false;
  const observer=new ResizeObserver(schedule);
  function rect(node,attributes){for(const [key,value]of Object.entries(attributes))node.setAttribute(key,String(value));}
  function layout(){
    frame=0;if(disposed||!target?.isConnected||layer.hidden)return;
    const w=document.documentElement.clientWidth,h=window.innerHeight,box=target.getBoundingClientRect();
    if(!box.width||!box.height){layer.hidden=true;return;}
    const boxes=highlighted.filter(e=>e.isConnected).map(e=>e.getBoundingClientRect()).filter(b=>b.width&&b.height);
    const area=boxes.length?{left:Math.min(...boxes.map(b=>b.left)),top:Math.min(...boxes.map(b=>b.top)),right:Math.max(...boxes.map(b=>b.right)),bottom:Math.max(...boxes.map(b=>b.bottom))}:box;
    const left=Math.max(4,area.left-10),top=Math.max(4,area.top-10),right=Math.min(w-4,area.right+10),bottom=Math.min(h-4,area.bottom+10);
    svg.setAttribute('viewBox','0 0 '+w+' '+h);rect(mask,{x:0,y:0,width:w,height:h});rect(base,{width:w,height:h});rect(shade,{width:w,height:h});
    const region={x:left,y:top,width:Math.max(0,right-left),height:Math.max(0,bottom-top)};rect(hole,region);rect(ring,region);
    // The bright region and the arrow target are intentionally independent.
    const cx=box.left+box.width/2,cy=box.top+box.height/2;
    const targetLeft=box.left-10,targetTop=box.top-10,targetBottom=box.bottom+10;
    let ax,ay,rotation,mx,my;
    if(targetLeft>=82){ax=targetLeft-72;ay=cy-26;rotation=0;mx=9;my=0;}
    else if(w-box.right>=82){ax=box.right+20;ay=cy-26;rotation=180;mx=-9;my=0;}
    else if(targetTop>=90){ax=cx-26;ay=targetTop-70;rotation=90;mx=0;my=9;}
    else{ax=cx-26;ay=targetBottom+18;rotation=-90;mx=0;my=-9;}
    arrow.style.left=Math.max(6,Math.min(w-58,ax))+'px';arrow.style.top=Math.max(6,Math.min(h-58,ay))+'px';arrow.style.setProperty('--arrow-rotation',rotation+'deg');arrow.style.setProperty('--arrow-x',mx+'px');arrow.style.setProperty('--arrow-y',my+'px');
    if(note.hidden)return;
    note.style.width=Math.min(330,w-32)+'px';
    const nh=note.getBoundingClientRect().height;
    const above=top>=nh+92;
    note.style.left=Math.max(16,Math.min(w-note.getBoundingClientRect().width-16,cx-note.getBoundingClientRect().width/2))+'px';
    note.style.top=Math.max(12,Math.min(h-nh-12,above?top-nh-86:bottom+86))+'px';
  }
  function schedule(){if(!frame&&!disposed)frame=requestAnimationFrame(layout);}
  window.addEventListener('resize',schedule);window.addEventListener('scroll',schedule,true);
  return {
    set(element,{text,step='操作のヒント',point=true,highlight=[],showNote=true,scrollTarget=null,scrollBlock='center'}={}){
      if(disposed)return;if(!element?.isConnected){this.hide();return;}
      const changed=element!==target;observer.disconnect();target=element;highlighted=highlight.filter(Boolean);layer.hidden=false;note.hidden=!showNote;ring.setAttribute('visibility',highlighted.length?'hidden':'visible');
      note.querySelector('b').textContent=step;note.querySelector('p').textContent=text||'';arrow.hidden=!point;
      for(const element of new Set([target,...highlighted]))observer.observe(element);
      if(changed){let focusArea=scrollTarget||highlighted[0]||target;if(!scrollTarget&&focusArea.getBoundingClientRect().height>window.innerHeight-220)focusArea=target;const box=focusArea.getBoundingClientRect();if(scrollTarget||box.top<120||box.bottom>window.innerHeight-140)focusArea.scrollIntoView({block:scrollBlock,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
      layout();
    },
    hide(){layer.hidden=true;target=null;highlighted=[];observer.disconnect();},
    dispose(){disposed=true;observer.disconnect();cancelAnimationFrame(frame);window.removeEventListener('resize',schedule);window.removeEventListener('scroll',schedule,true);layer.remove();},
  };
}
