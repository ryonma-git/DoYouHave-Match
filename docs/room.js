import { ITEMS } from './items.js';

export const PATTERN_SEEDS = [1729, 4093, 7919, 12347, 24593, 49157, 65537, 99991];
export const defaultConfig = () => ({ version: 1, selected: ITEMS.slice(0, 5).map(item => item.id), present: Array.from({ length: 40 }, (_, i) => i + 1), pattern: 0 });

export function validateConfig(input) {
  if (!input || input.version !== 1 || !Array.isArray(input.selected) || !Array.isArray(input.present)) throw new Error('授業設定を読み込めません。先生のURLを開き直してください。');
  const selected = ITEMS.filter(item => input.selected.includes(item.id)).map(item => item.id);
  const present = [...input.present].sort((a, b) => a - b);
  if (selected.length < 4 || selected.length !== input.selected.length || selected.length > 10 || new Set(input.selected).size !== input.selected.length) throw new Error('アイテムは4〜10種類を選んでください。');
  if (present.length < 2 || present.length > 40 || new Set(present).size !== present.length || present.some(n => !Number.isInteger(n) || n < 1 || n > 40)) throw new Error('出席者を2〜40人選んでください。');
  if (!Number.isInteger(input.pattern) || input.pattern < 0 || input.pattern >= PATTERN_SEEDS.length) throw new Error('配布パターンが正しくありません。');
  return { version: 1, selected, present, pattern: input.pattern };
}

export function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffled(values, random) {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function assignments(input) {
  const config = validateConfig(input);
  const seed = PATTERN_SEEDS[config.pattern];
  const random = seededRandom(seed);
  const roster = shuffled(config.present, random);
  const pool = ITEMS.filter(item => config.selected.includes(item.id));
  // Balanced groups contain 5–9 students (or all students when fewer than 5).
  // Each group draws four out of the same five items, so every group pair matches.
  const groupCount = Math.max(1, Math.floor(roster.length / 5));
  const baseSize = Math.floor(roster.length / groupCount);
  const extra = roster.length % groupCount;
  const result = new Map();
  let offset = 0;
  for (let group = 0; group < groupCount; group++) {
    const members = roster.slice(offset, offset + baseSize + (group < extra ? 1 : 0));
    offset += members.length;
    const groupPool = shuffled(pool, random).slice(0, 5);
    members.forEach((number, index) => {
      const cards = groupPool.filter((_, i) => groupPool.length === 4 || i !== (index + config.pattern) % 5);
      const cardRandom = seededRandom(seed ^ Math.imul(number, 2654435761));
      result.set(number, shuffled(cards, cardRandom));
    });
  }
  return result;
}

export function overlap(first, second) {
  const ids = new Set(first.map(item => item.id));
  return second.filter(item => ids.has(item.id)).length;
}

export function statistics(config, excluded = []) {
  const deals = assignments(config);
  const present = config.present.filter(number => !excluded.includes(number));
  const partners = new Map(present.map(number => [number, []]));
  let matches = 0;
  for (let i = 0; i < present.length; i++) for (let j = i + 1; j < present.length; j++) {
    if (overlap(deals.get(present[i]), deals.get(present[j])) >= 3) {
      matches++;
      partners.get(present[i]).push(present[j]);
      partners.get(present[j]).push(present[i]);
    }
  }
  const pairCount = present.length * (present.length - 1) / 2;
  const minPartners = present.length ? Math.min(...[...partners.values()].map(list => list.length)) : 0;
  return { partners, matches, pairCount, rate: pairCount ? matches / pairCount : 0, minPartners, isolated: present.filter(number => partners.get(number).length === 0) };
}

export function randomMatchProbability(itemCount) {
  if (!Number.isInteger(itemCount) || itemCount < 4 || itemCount > 10) throw new Error('Invalid item count');
  const combinations = itemCount * (itemCount - 1) * (itemCount - 2) * (itemCount - 3) / 24;
  return (1 + 4 * (itemCount - 4)) / combinations;
}

export function encodeConfig(config) {
  return btoa(JSON.stringify(validateConfig(config))).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}
export function decodeConfig(encoded) {
  if (!encoded || encoded.length > 2000) throw new Error('授業URLが正しくありません。');
  try { return validateConfig(JSON.parse(atob(encoded.replaceAll('-', '+').replaceAll('_', '/')))); }
  catch { throw new Error('授業URLが正しくありません。先生のURLを開き直してください。'); }
}
export function loadConfig() {
  const hash = new URLSearchParams(location.hash.slice(1));
  if (hash.has('class')) return decodeConfig(hash.get('class'));
  return defaultConfig();
}
export function classURL(config) {
  const url = new URL('./', location.href);
  url.hash = `class=${encodeConfig(config)}`;
  return url.href;
}
