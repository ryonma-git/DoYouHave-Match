import { loadConfig, assignments, statistics, classURL } from './room.js?v=3';

const root = document.querySelector('#roster-page');
try {
  const config = loadConfig();
  const deals = assignments(config);
  const stats = statistics(config);
  root.innerHTML = `<header class="heading"><a class="back" href="${classURL(config)}">← タイトルへ戻る</a><h1>配布一覧（99）</h1><p class="intro">パターン ${config.pattern + 1} · ${config.selected.length}種類 · ${config.present.length}人</p></header><section class="panel"><p>カード1〜4は左上・右上・左下・右下の順です。この画面では設定を変更できません。</p><div class="table-wrap"><table><thead><tr><th>番号</th><th>カード1</th><th>カード2</th><th>カード3</th><th>カード4</th><th>3枚以上共通する相手</th></tr></thead><tbody>${Array.from({ length: 40 }, (_, i) => i + 1).map(number => {
    const cards = deals.get(number);
    if (!cards) return `<tr class="absent-row"><th>${number}</th><td colspan="5">欠席・対象外</td></tr>`;
    return `<tr><th>${number}</th>${cards.map(item => `<td lang="en">${item.name}</td>`).join('')}<td class="partner-list">${stats.partners.get(number).join(', ')}</td></tr>`;
  }).join('')}</tbody></table></div></section>`;
} catch {
  root.textContent = '授業URLが正しくありません。先生のURLを開き直してください。';
}
