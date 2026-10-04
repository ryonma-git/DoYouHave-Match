import { ITEMS } from './game.js';

const names = { pencil: 'えんぴつ', pen: 'ペン', ruler: 'ものさし', eraser: '消しゴム', glue: 'のり' };
document.querySelector('#catalog').innerHTML = ITEMS.map((item, index) => `
  <article class="item-row">
    <div class="item-title"><span class="number">${String(index + 1).padStart(2, '0')}</span><div><h2>${item.name}</h2><p>${names[item.id]}</p></div></div>
    <div class="visuals">
      <div class="visual current"><span class="label">現在の絵</span><span class="emoji" aria-label="${item.name}の絵文字">${item.icon}</span></div>
      <div class="visual proposed"><span class="label">差し替え候補</span><img src="art/${item.id}.svg" alt="${names[item.id]}のイラスト" width="112" height="112"></div>
    </div>
  </article>
`).join('');
