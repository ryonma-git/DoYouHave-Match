import { Game, PHASE, formatTime, sentence } from './game.js';

const game = new Game();
const root = document.querySelector('#app');
let noticeTimeout;

function cards() {
  return `<div class="cards">${game.items.map((item, index) => {
    const open = game.faceUp[index];
    const interactive = game.phase === PHASE.PLAYING;
    return `<button class="card ${open ? 'face-up' : 'face-down'}" data-flip="${index}" ${interactive ? '' : 'disabled'} aria-label="Card ${index + 1}, ${open ? item.name : 'face down'}">
      <span class="card-index">${index + 1}</span>
      <span class="card-content">${open ? `<span class="card-icon" aria-hidden="true">${item.icon}</span><span class="card-name">${item.name}</span>` : '<span class="question">?</span>'}</span>
    </button>`;
  }).join('')}</div>`;
}

function button(label, action, extra = '') {
  return `<button class="action ${extra}" data-action="${action}">${label}</button>`;
}

function render() {
  let content;
  switch (game.phase) {
    case PHASE.SETUP:
      content = `<section class="welcome"><div class="brand-mark">✏️ <span>?</span> 📏</div><p class="eyebrow">LET'S TALK!</p><h1>Do You Have?</h1><p class="subtitle">Ask. Remember. Match.</p>${button('LET’S PLAY', 'begin', 'primary')}</section>`;
      break;
    case PHASE.MEMORIZE:
      content = `<header><p class="eyebrow">LOOK & REMEMBER</p><h1>YOUR ITEMS</h1></header>${cards()}<footer>${button("I'm ready!", 'ready', 'primary')}</footer>`;
      break;
    case PHASE.READY:
      content = `<header><p class="eyebrow">TIME TO TALK</p><h1>Remember your items?</h1></header>${cards()}<footer>${button('START', 'start', 'primary')}</footer>`;
      break;
    case PHASE.PLAYING:
      content = `<header class="play-header"><div class="time-badge"><span>TIME</span><strong id="timer">${formatTime(game.elapsedSeconds)}</strong></div><div class="match-count"><strong>${game.matchCount} / 3</strong><span>MATCH</span></div></header>${cards()}<div class="penalty ${game.penaltyNotice ? 'visible' : ''}" role="status">+5 sec</div><footer class="dual">${button('NEXT PERSON', 'next', 'secondary')}${button('MATCH!', 'match', `primary ${game.matchCount < 3 ? 'inactive' : ''}`)}</footer>`;
      break;
    case PHASE.RESULT:
      content = `<section class="result"><div class="celebration" aria-hidden="true">✦ ✧ ✦</div><h1>MATCH!</h1><p class="eyebrow">YOU BOTH HAVE...</p><div class="result-items">${game.matchedItems.map(item => `<div class="result-item"><span aria-hidden="true">${item.icon}</span><strong>${item.name}</strong></div>`).join('')}</div><p class="sentence">${sentence(game.matchedItems)}</p><div class="result-time">TIME <strong>${formatTime(game.elapsedSeconds)}</strong></div>${button('PLAY AGAIN', 'reset', 'primary')}</section>`;
  }
  root.innerHTML = `<div class="shell ${game.phase}">${content}</div>`;
  const matchButton = root.querySelector('[data-action="match"]');
  if (matchButton) matchButton.disabled = game.matchCount < 3;
}

root.addEventListener('click', event => {
  const flip = event.target.closest('[data-flip]');
  if (flip) {
    game.flip(Number(flip.dataset.flip));
    render();
    if (game.penaltyNotice) {
      clearTimeout(noticeTimeout);
      noticeTimeout = setTimeout(() => { game.penaltyNotice = false; render(); }, 1100);
    }
    return;
  }
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (!action) return;
  clearTimeout(noticeTimeout);
  ({ begin: () => game.begin(), ready: () => game.ready(), start: () => game.start(), next: () => game.nextPerson(), match: () => game.match(), reset: () => game.reset() })[action]();
  render();
});

setInterval(() => {
  if (game.phase === PHASE.PLAYING) {
    const timer = document.querySelector('#timer');
    if (timer) timer.textContent = formatTime(game.elapsedSeconds);
  }
}, 200);

render();
