import {wordRows} from './wordLayout.js';
export function installViewportLayout(app) {
  let frame=0;
  const update=()=>{
    frame=0;const main=app.querySelector('.page-shell');if(!main)return;
    main.classList.toggle('long-content',!!main.querySelector('[data-library],[data-studio],.diy-form,.mode2-level-grid,[data-chapter-list],.diy-saved-section:not([hidden])'));
    main.classList.toggle('screen-home',!!main.querySelector('.floating-cover'));
    main.classList.toggle('screen-play',!!main.querySelector('.explore-card,.explore-results,[data-mode-one],.lesson-card'));
    // Keep the legacy DIY playback controls on the same mora-aware rows.
    main.querySelectorAll('.diy-play-morae:not(.responsive-word)').forEach(grid=>{const units=[...grid.children],tokens=units.map(e=>e.querySelector('b')?.textContent||'');grid.classList.add('responsive-word','static-choice-word');for(const indices of wordRows(tokens)){const row=document.createElement('div');row.className='word-row';row.style.gridTemplateColumns='repeat('+indices.length+',minmax(0,1fr))';indices.forEach(i=>row.append(units[i]));grid.append(row);}});
    const diyCategories=main.querySelector('.diy-categories'),saved=main.querySelector('.diy-saved-section');
    if(diyCategories&&saved&&!main.querySelector('.diy-home-tabs')){const tabs=document.createElement('div');tabs.className='settings-tabs diy-home-tabs';tabs.setAttribute('role','group');tabs.setAttribute('aria-label','DIYモードの分類');['問題をつくる','作成した問題'].forEach((text,i)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.setAttribute('aria-pressed',String(i===0));b.onclick=()=>{diyCategories.hidden=i!==0;saved.hidden=i===0;schedule();[...tabs.children].forEach((e,j)=>e.setAttribute('aria-pressed',String(i===j)));};tabs.append(b);});diyCategories.before(tabs);saved.hidden=true;}
    // Settings has two compact panels. Moving nodes keeps existing listeners intact.
    if(main.classList.contains('settings-page')&&!main.querySelector('.settings-tabs')){
      const research=main.querySelector('.study-settings'),report=main.querySelector('.delivery-report'),basic=document.createElement('div');basic.className='settings-basic';
      main.querySelectorAll('.settings-panel:not(.delivery-report),.settings-profile,.settings-footnote').forEach(e=>basic.append(e));
      const tabs=document.createElement('div');tabs.className='settings-tabs';tabs.setAttribute('role','group');tabs.setAttribute('aria-label','設定の分類');
      ['音とプロフィール','研究参加','送信レポート'].forEach((label,i)=>{const b=document.createElement('button');b.textContent=label;b.type='button';b.setAttribute('aria-pressed',String(i===0));b.onclick=()=>{basic.hidden=i!==0;if(research)research.hidden=i!==1;if(report)report.hidden=i!==2;[...tabs.children].forEach((e,j)=>e.setAttribute('aria-pressed',String(i===j)));};tabs.append(b);});
      main.querySelector('.page-heading')?.after(tabs,basic);if(research)research.hidden=true;if(report)report.hidden=true;
    }
  };
  const schedule=()=>{if(!frame){frame=1;queueMicrotask(update);}};
  const observer=new MutationObserver(schedule);observer.observe(app,{childList:true,subtree:true});window.addEventListener('resize',schedule);schedule();
}
