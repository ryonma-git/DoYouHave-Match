import { Game, PHASE, formatTime, sentence } from './game.js';
import { loadConfig, encodeConfig } from './room.js?v=2';
import { canAttempt, failureCount, unlock, revokeAccess } from './teacher-access.js?v=2';

const game = new Game();
const root = document.querySelector('#app');
let noticeTimeout;
let config;
let setupError = '';
let titleTaps = [];
try { config = loadConfig(); } catch (error) { setupError = error.message; }

function teacherURL() {
  const url = new URL('admin.html', location.href);
  if (!new URLSearchParams(location.hash.slice(1)).has('class')) url.searchParams.set('new', '1');
  url.hash = `class=${encodeConfig(config)}`;
  return url.href;
}

function showTeacherLogin() {
  if (!config || !canAttempt() || document.querySelector('#teacher-login')) return;
  const dialog = document.createElement('dialog');
  dialog.id = 'teacher-login';
  dialog.innerHTML = `<form id="teacher-form"><h2>先生用パスコード</h2><p>あと${5 - failureCount()}回間違えると開けなくなります。</p><input name="passcode" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="off" required aria-label="先生用パスコード"><div class="login-actions"><button type="button" id="cancel-login">閉じる</button><button type="submit">開く</button></div></form>`;
  document.body.append(dialog);
  dialog.addEventListener('close', () => dialog.remove());
  dialog.querySelector('#cancel-login').addEventListener('click', () => dialog.close());
  dialog.querySelector('form').addEventListener('submit', async event => {
    event.preventDefault();
    const submit = dialog.querySelector('[type="submit"]');
    if (submit.disabled) return;
    submit.disabled = true;
    const allowed = await unlock(dialog.querySelector('input').value);
    dialog.close();
    if (allowed) location.assign(teacherURL());
    else { titleTaps = []; }
  });
  dialog.showModal();
}


function cards() {
  return `<div class="cards">${game.items.map((item, index) => {
    const open = game.faceUp[index];
    const interactive = game.phase === PHASE.PLAYING;
    return `<button class="card ${open ? 'face-up' : 'face-down'}" data-flip="${index}" ${interactive ? '' : 'disabled'} aria-label="カード${index + 1}、${open ? item.name : 'うら向き'}">
      <span class="card-index">${index + 1}</span>
      <span class="card-content">${open ? `<span class="card-icon" aria-hidden="true">${item.icon}</span><span class="card-name" lang="en">${item.name}</span>` : '<span class="question">?</span>'}</span>
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
      content = `<section class="welcome"><div class="brand-mark">✏️ <span>?</span> 📏</div><p class="eyebrow">友だちと話そう！</p><h1><button id="game-title" type="button" lang="en">Do You Have?</button></h1><p class="subtitle">同じ持ち物の友だちを見つけよう</p><form id="attendance-form"><label for="attendance">出席番号を入れてね（1〜40）</label><input id="attendance" name="attendance" type="text" inputmode="numeric" pattern="[0-9]{1,2}" maxlength="2" autocomplete="off" required placeholder="1–40" aria-describedby="setup-error"><button class="action primary" type="submit" ${config ? '' : 'disabled'}>はじめる</button></form><p id="setup-error" class="setup-error" role="status">${setupError}</p>${config ? `<p class="class-summary">配布 ${config.pattern + 1} · ${config.selected.length}種類 · ${config.present.length}人</p>` : ''}</section>`;
      break;
    case PHASE.MEMORIZE:
      content = `<header><p class="eyebrow">カードと場所をおぼえよう</p><h1>自分の持ち物</h1></header>${cards()}<footer>${button('おぼえた！', 'ready', 'primary')}</footer>`;
      break;
    case PHASE.READY:
      content = `<header><p class="eyebrow">友だちに英語で聞いてみよう</p><h1>じゅんびはいい？</h1></header>${cards()}<footer>${button('スタート', 'start', 'primary')}</footer>`;
      break;
    case PHASE.PLAYING:
      content = `<header class="play-header"><div class="time-badge"><span>タイム</span><strong id="timer">${formatTime(game.elapsedSeconds)}</strong></div><div class="match-count"><strong>${game.matchCount} / 3</strong><span>3枚そろえよう</span></div></header>${cards()}<div class="penalty ${game.penaltyNotice ? 'visible' : ''}" role="status">+5秒</div><footer class="dual">${button('次の友だちへ', 'next', 'secondary')}${button('そろった！', 'match', `primary ${game.matchCount < 3 ? 'inactive' : ''}`)}</footer>`;
      break;
    case PHASE.RESULT:
      content = `<section class="result"><div class="celebration" aria-hidden="true">✦ ✧ ✦</div><h1>そろった！</h1><p class="eyebrow">2人が持っているもの</p><div class="result-items">${game.matchedItems.map(item => `<div class="result-item"><span aria-hidden="true">${item.icon}</span><strong lang="en">${item.name}</strong></div>`).join('')}</div><p class="sentence-hint">英語で言ってみよう</p><p class="sentence" lang="en">${sentence(game.matchedItems)}</p><div class="result-time">タイム <strong>${formatTime(game.elapsedSeconds)}</strong></div>${button('もう一度あそぶ', 'reset', 'primary')}</section>`;
  }
  root.innerHTML = `<div class="shell ${game.phase}">${content}</div>`;
  const matchButton = root.querySelector('[data-action="match"]');
  if (matchButton) matchButton.disabled = game.matchCount < 3;
}

root.addEventListener('submit', event => {
  if (event.target.id !== 'attendance-form') return;
  event.preventDefault();
  const text = document.querySelector('#attendance').value.trim();
  const number = /^\d{1,2}$/.test(text) ? Number(text) : NaN;
  if (number === 99 && config) {
    const url = new URL('roster.html', location.href);
    url.hash = `class=${encodeConfig(config)}`;
    location.assign(url.href);
    return;
  }
  if (!config) return;
  if (!game.begin(number, config)) {
    setupError = number >= 1 && number <= 40 ? 'この番号は欠席になっています。先生に聞いてね。' : '出席番号を1〜40で入れてね。';
    render();
    return;
  }
  revokeAccess();
  setupError = '';
  titleTaps = [];
  render();
});

root.addEventListener('click', event => {
  if (event.target.closest('#game-title')) {
    const now = Date.now();
    titleTaps = titleTaps.filter(time => now - time < 1800);
    titleTaps.push(now);
    if (titleTaps.length >= 3) { titleTaps = []; showTeacherLogin(); }
    return;
  }
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
  ({ ready: () => game.ready(), start: () => game.start(), next: () => game.nextPerson(), match: () => game.match(), reset: () => game.reset() })[action]();
  render();
});

setInterval(() => {
  if (game.phase === PHASE.PLAYING) {
    const timer = document.querySelector('#timer');
    if (timer) timer.textContent = formatTime(game.elapsedSeconds);
  }
}, 200);

render();
