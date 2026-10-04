import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, ITEMS, PHASE, createItems, sentence } from '../docs/game.js';

test('every possible pair of assignments shares at least three unique items', () => {
  const sets = ITEMS.map((_, omitted) => ITEMS.filter((_, index) => index !== omitted));
  for (const first of sets) for (const second of sets) {
    assert.equal(first.length, 4);
    assert.equal(new Set(first.map(item => item.id)).size, 4);
    assert.ok(first.filter(item => second.includes(item)).length >= 3);
  }
  assert.equal(createItems(() => 0).length, 4);
});

test('game flow, penalties, timer, rounds, result and reset', () => {
  let now = 0;
  const game = new Game({ random: () => 0, now: () => now });
  game.begin();
  assert.equal(game.phase, PHASE.MEMORIZE);
  assert.equal(game.matchCount, 4);
  game.ready();
  assert.equal(game.phase, PHASE.READY);
  assert.equal(game.matchCount, 0);
  game.start();
  now = 12000;
  assert.equal(game.elapsedSeconds, 12);
  game.flip(0);
  assert.equal(game.penaltySeconds, 0);
  game.flip(0);
  assert.equal(game.penaltySeconds, 5);
  assert.equal(game.elapsedSeconds, 17);
  game.flip(0);
  game.flip(1);
  game.match();
  assert.equal(game.phase, PHASE.PLAYING);
  game.nextPerson();
  assert.equal(game.matchCount, 0);
  assert.equal(game.penaltySeconds, 5);
  now = 20000;
  assert.equal(game.elapsedSeconds, 25);
  game.flip(0);
  game.flip(1);
  game.flip(2);
  game.match();
  assert.equal(game.phase, PHASE.RESULT);
  assert.equal(game.matchedItems.length, 3);
  assert.equal(game.elapsedSeconds, 25);
  now = 90000;
  assert.equal(game.elapsedSeconds, 25);
  game.reset();
  assert.equal(game.phase, PHASE.SETUP);
  assert.equal(game.elapsedSeconds, 0);
});

test('sentence uses natural article phrases', () => {
  assert.equal(sentence([ITEMS[0], ITEMS[2], ITEMS[3]]), 'I have a pencil, a ruler, and an eraser.');
  assert.equal(sentence([ITEMS[0], ITEMS[2], ITEMS[3], ITEMS[4]]), 'I have a pencil, a ruler, an eraser, and glue.');
});
