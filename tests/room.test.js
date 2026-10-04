import test from 'node:test';
import assert from 'node:assert/strict';
import { ITEMS } from '../docs/items.js';
import { assignments, defaultConfig, validateConfig, statistics, randomMatchProbability, overlap, encodeConfig, decodeConfig, shuffled, seededRandom } from '../docs/room.js';

function combinations(list, count) {
  if (count === 0) return [[]];
  return list.flatMap((value, index) => combinations(list.slice(index + 1), count - 1).map(tail => [value, ...tail]));
}

test('all item selections and 8 patterns give 40 unique four-card deals with 4+ partners each', () => {
  for (let count = 4; count <= 10; count++) for (const subset of combinations(ITEMS.map(item => item.id), count)) for (let pattern = 0; pattern < 8; pattern++) {
    const config = { ...defaultConfig(), selected: subset, pattern };
    const deals = assignments(config);
    assert.equal(deals.size, 40);
    for (const [number, cards] of deals) {
      assert.ok(number >= 1 && number <= 40);
      assert.equal(cards.length, 4);
      assert.equal(new Set(cards.map(item => item.id)).size, 4);
      assert.ok(cards.every(item => subset.includes(item.id)));
    }
    const stats = statistics(config);
    assert.ok(stats.minPartners >= 4);
    assert.deepEqual(stats.isolated, []);
  }
});

test('every class size and scattered absences retain a candidate for each attending child', () => {
  for (let count = 2; count <= 40; count++) for (let pattern = 0; pattern < 8; pattern++) {
    const config = { ...defaultConfig(), selected: ITEMS.map(item => item.id), pattern, present: shuffled(defaultConfig().present, seededRandom(count * 31 + pattern)).slice(0, count).sort((a, b) => a - b) };
    const deals = assignments(config);
    const stats = statistics(config);
    assert.equal(deals.size, count);
    assert.ok(stats.minPartners >= Math.min(4, count - 1));
    assert.equal(stats.isolated.length, 0);
    // Any additional absences up to minPartners-1 leave at least one candidate.
    for (const number of config.present) {
      const removed = stats.partners.get(number).slice(0, stats.minPartners - 1);
      assert.ok(statistics(config, removed).partners.get(number).length >= 1);
    }
  }
});

test('a shared class URL reproduces exact deals, and different patterns change them', () => {
  const config = { ...defaultConfig(), selected: ITEMS.map(item => item.id), present: [1, 3, 5, 7, 9, 12, 15] };
  assert.deepEqual(decodeConfig(encodeConfig(config)), config);
  assert.deepEqual(assignments(decodeConfig(encodeConfig(config))), assignments(config));
  assert.notDeepEqual(assignments({ ...config, pattern: 1 }), assignments(config));
});

test('random-match probability equals exhaustive independent draws', () => {
  for (let count = 4; count <= 10; count++) {
    const sets = combinations(ITEMS.slice(0, count), 4);
    const matches = sets.reduce((sum, a) => sum + sets.filter(b => overlap(a, b) >= 3).length, 0);
    assert.equal(randomMatchProbability(count), matches / (sets.length ** 2));
  }
  assert.equal(randomMatchProbability(5), 1);
  assert.equal(randomMatchProbability(6), 0.6);
});

test('invalid and tampered classroom configurations fail explicitly', () => {
  for (const changes of [{ present: [1] }, { present: [1, 1] }, { present: [1, 41] }, { selected: ['pencil'] }, { selected: ['pencil', 'pen', 'ruler', 'unknown'] }, { pattern: 8 }, { pattern: -1 }]) assert.throws(() => validateConfig({ ...defaultConfig(), ...changes }));
  assert.throws(() => decodeConfig('invalid'));
  assert.throws(() => decodeConfig('a'.repeat(2001)));
});
