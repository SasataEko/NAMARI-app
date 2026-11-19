
export function mountTutorialSkip(container,onSkip){
 const button=document.createElement('button');button.type='button';button.className='text-action tutorial-skip';button.textContent='スキップ';button.setAttribute('aria-label','チュートリアルをスキップ');button.title='チュートリアルをスキップ';button.onclick=onSkip;container.append(button);return button;
}
