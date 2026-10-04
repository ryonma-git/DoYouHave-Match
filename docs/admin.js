import { ITEMS } from './items.js';
import { PATTERN_SEEDS, loadConfig, validateConfig, statistics, randomMatchProbability, classURL, encodeConfig } from './room.js?v=2';
import { hasAccess, revokeAccess } from './teacher-access.js?v=2';

const root = document.querySelector('#teacher-page');
let config;

function guard() {
  if (hasAccess()) return true;
  root.replaceChildren();
  location.replace(new URL('./' + location.hash, location.href).href);
  return false;
}

function render() {
  if (!guard()) return;
  root.innerHTML = `<header class="heading"><a class="back" href="${classURL(config)}">← タイトルへ戻る</a><button class="small-button exit" id="lock">閉じてロック</button><p class="eyebrow">TEACHER MENU</p><h1>授業の準備</h1><p class="intro">使うアイテムと出席者を選び、同じ授業URLを全員に配ってください。</p></header>
  <section class="panel"><h2>1. 使用するアイテム</h2><p>4〜10種類から選択。交流には10種類がおすすめです。児童にはそのうち4種類を配布します。画像は仮表示です。</p><button class="small-button" id="use-all-items">10種類すべて使う</button><div id="catalog" class="item-options">${ITEMS.map(item => `<label class="item-option"><input type="checkbox" name="item" value="${item.id}" ${config.selected.includes(item.id) ? 'checked' : ''}><span class="item-emoji" aria-hidden="true">${item.icon}</span><span><strong>${item.name}</strong><small>${item.japanese}</small></span></label>`).join('')}</div></section>
  <section class="panel"><h2>2. 出席者</h2><p>チェックを外した番号は欠席・対象外です。変更すると出席者だけで組み直します。</p><label class="class-size">最後の出席番号 <input type="number" id="last-number" min="2" max="40" value="${Math.max(...config.present)}"><button class="small-button" id="set-size">1〜この番号を出席にする</button></label><div class="attendance-grid">${Array.from({ length: 40 }, (_, i) => i + 1).map(number => `<label><input type="checkbox" name="present" value="${number}" ${config.present.includes(number) ? 'checked' : ''}><span>${number}</span></label>`).join('')}</div></section>
  <section class="panel"><h2>3. 配布パターン</h2><div class="pattern-control"><select id="pattern" aria-label="配布パターン">${PATTERN_SEEDS.map((_, i) => `<option value="${i}" ${config.pattern === i ? 'selected' : ''}>パターン ${i + 1}</option>`).join('')}</select><button id="random-pattern" class="small-button">ランダムに選び直す</button></div><p>出席番号とパターンが同じなら、同じカード・同じ位置になります。</p><div id="metrics"></div><p class="error" id="config-error" role="status"></p></section>
  <section class="panel"><h2>4. 授業URLを配る</h2><p>このURLにアイテム・出席者・パターンが入っています。変更したら、新しいURLを全員に配り直してください。</p><textarea id="share-url" readonly aria-label="児童用の授業URL" rows="3"></textarea><div class="share-actions"><button class="primary-button" id="copy-url">URLをコピー</button><a id="open-game" class="small-button" href="${classURL(config)}">この設定でゲームを開く</a></div><p id="copy-status" role="status"></p><p class="note">誰に何が配られるかは、タイトル画面で <strong>99</strong> を入力すると確認できます。一覧の閲覧にパスコードは不要です。</p></section>`;
  updateMetrics();
}

function readDraft() {
  return { version: 1, selected: [...root.querySelectorAll('[name=item]:checked')].map(input => input.value), present: [...root.querySelectorAll('[name=present]:checked')].map(input => Number(input.value)), pattern: Number(root.querySelector('#pattern').value) };
}

function updateMetrics() {
  if (!guard()) return;
  const draft = readDraft();
  const error = root.querySelector('#config-error');
  const metrics = root.querySelector('#metrics');
  const copy = root.querySelector('#copy-url');
  const link = root.querySelector('#open-game');
  try {
    config = validateConfig(draft);
    const stats = statistics(config);
    const expectedContacts = [...stats.partners.values()].reduce((sum, partners) => sum + config.present.length / (partners.length + 1), 0) / config.present.length;
    const percentage = value => `${(value * 100).toFixed(1)}%`;
    metrics.innerHTML = `<div class="metrics"><div><strong>${config.selected.length}種類 / ${config.present.length}人</strong><span>今回の設定</span></div><div><strong>${percentage(randomMatchProbability(config.selected.length))}</strong><span>完全に無作為に配った場合の目安</span></div><div><strong>${percentage(stats.rate)}</strong><span>最初の相手とマッチする目安（${stats.matches} / ${stats.pairCount}組）</span></div><div><strong>最少 ${stats.minPartners}人</strong><span>1人あたりのマッチ相手候補</span></div></div>${config.selected.length <= 5 ? '<p class="status">4〜5種類では、どの相手とも3枚以上そろいます。何人かに聞いて探す活動には、10種類を使ってください。</p>' : ''}<p>別の相手に順に聞くと、マッチまで平均 <strong>${expectedContacts.toFixed(1)}人</strong>。相手を無作為に選ぶ場合の目安です。</p><p class="balance-note">現在の出席者は全員に相手がいます。最大${Math.max(0, stats.minPartners - 1)}人の追加欠席でも、各児童に少なくとも1人の候補が残ります（配布を変えない場合）。</p>`;
    const url = classURL(config);
    root.querySelector('#share-url').value = url;
    link.href = url;
    root.querySelector('.back').href = url;
    link.removeAttribute('aria-disabled');
    copy.disabled = false;
    error.textContent = '';
    history.replaceState(null, '', `${location.pathname}${location.search}#class=${encodeConfig(config)}`);
  } catch (issue) {
    error.textContent = issue.message;
    metrics.replaceChildren();
    root.querySelector('#share-url').value = '';
    copy.disabled = true;
    link.removeAttribute('href');
    link.setAttribute('aria-disabled', 'true');
  }
  root.querySelector('#copy-status').textContent = '';
}

root.addEventListener('change', event => {
  if (event.target.matches('[name=item], [name=present], #pattern')) updateMetrics();
});
root.addEventListener('click', async event => {
  if (!guard()) return;
  if (event.target.id === 'use-all-items') {
    root.querySelectorAll('[name=item]').forEach(box => { box.checked = true; });
    updateMetrics();
  }
  if (event.target.id === 'random-pattern') {
    const old = Number(root.querySelector('#pattern').value);
    const value = crypto.getRandomValues(new Uint32Array(1))[0] % (PATTERN_SEEDS.length - 1);
    root.querySelector('#pattern').value = String(value >= old ? value + 1 : value);
    updateMetrics();
  }
  if (event.target.id === 'set-size') {
    const input = root.querySelector('#last-number');
    if (!input.reportValidity() || !input.value) return;
    root.querySelectorAll('[name=present]').forEach(box => { box.checked = Number(box.value) <= Number(input.value); });
    updateMetrics();
  }
  if (event.target.id === 'copy-url') {
    try { await navigator.clipboard.writeText(root.querySelector('#share-url').value); root.querySelector('#copy-status').textContent = 'コピーしました。全員に同じURLを配ってください。'; }
    catch { root.querySelector('#share-url').select(); root.querySelector('#copy-status').textContent = 'URL欄を選択しました。長押ししてコピーしてください。'; }
  }
  if (event.target.id === 'lock') {
    revokeAccess();
    location.replace(classURL(config));
  }
});

if (guard()) {
  try {
    config = loadConfig();
    const params = new URLSearchParams(location.search);
    if (params.get('new') === '1') {
      config.pattern = crypto.getRandomValues(new Uint32Array(1))[0] % PATTERN_SEEDS.length;
      params.delete('new');
      history.replaceState(null, '', `${location.pathname}${params.toString() ? '?' + params.toString() : ''}${location.hash}`);
    }
    render();
  }
  catch { root.textContent = '授業URLが正しくありません。タイトルから開き直してください。'; }
}
setInterval(guard, 5000);
window.addEventListener('pagehide', () => root.replaceChildren());
window.addEventListener('pageshow', event => { if (event.persisted && guard()) render(); });
window.addEventListener('visibilitychange', guard);
