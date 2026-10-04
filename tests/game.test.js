import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, ITEMS, PHASE, sentence } from '../docs/game.js';

test('game flow, penalties, timer, rounds, result and reset', () => {
  let now = 0;
  const game = new Game({ now: () => now });
  game.begin(1);
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


test('attendance number validation and fixed card positions', () => {
  const game = new Game();
  for (const number of [0, 41, 99, NaN, 1.5, undefined]) {
    assert.equal(game.begin(number), false);
    assert.equal(game.phase, PHASE.SETUP);
  }
  game.begin(12);
  const cards = game.items.map(item => item.id);
  game.ready(); game.start(); game.flip(2); game.nextPerson();
  assert.deepEqual(game.items.map(item => item.id), cards);
  game.reset(); game.begin(12);
  assert.deepEqual(game.items.map(item => item.id), cards);
});
