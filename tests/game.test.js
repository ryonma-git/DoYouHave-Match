import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, ITEMS, PHASE, sentence } from '../docs/game.js';

test('reveals and every skip cost points without adding time; results freeze and reset', () => {
  let now = 0;
  const game = new Game({ now: () => now });
  game.begin(1);
  assert.equal(game.matchCount, 4);
  game.flip(0); game.nextPerson();
  assert.equal(game.revealCount, 0); // Memorizing is free.
  assert.equal(game.nextCount, 0);
  game.ready(); game.start();
  now = 12000;
  assert.equal(game.score, 1168);
  for (let i = 0; i < 4; i++) game.flip(i);
  assert.equal(game.score, 1128);
  game.nextPerson();
  assert.equal(game.score, 1108); // All four reveals + skip cost 60.
  assert.equal(game.matchCount, 0);
  assert.equal(game.elapsedSeconds, 12);
  game.nextPerson();
  assert.equal(game.score, 1088); // Even skipping without revealing costs points.
  game.flip(0); game.flip(0);
  assert.equal(game.revealCount, 5); // Closing is free, reopening is not.
  game.flip(0); game.flip(1);
  game.match();
  assert.equal(game.phase, PHASE.PLAYING);
  game.flip(2);
  now = 20000;
  game.match();
  assert.equal(game.phase, PHASE.RESULT);
  assert.equal(game.score, 1040);
  assert.equal(game.elapsedSeconds, 20);
  now = 900000;
  game.flip(3); game.nextPerson(); game.match();
  assert.equal(game.score, 1040);
  assert.equal(game.elapsedSeconds, 20);
  game.reset();
  assert.equal(game.phase, PHASE.SETUP);
  assert.equal(game.elapsedSeconds, 0);
  assert.equal(game.score, 1180);
  assert.equal(game.revealCount, 0);
  assert.equal(game.nextCount, 0);
});

test('countdown, overtime boundary, continued play and zero-point floor', () => {
  let now = 0;
  const game = new Game({ now: () => now });
  game.begin(1); game.ready(); game.start();
  now = 179999;
  assert.equal(game.remainingSeconds, 1);
  assert.equal(game.score, 1001);
  now = 180000;
  assert.equal(game.remainingSeconds, 0);
  assert.equal(game.overtimeSeconds, 0);
  assert.equal(game.score, 1000);
  now = 181000;
  assert.equal(game.overtimeSeconds, 1);
  assert.equal(game.score, 998);
  assert.equal(game.phase, PHASE.PLAYING);
  game.flip(0); game.flip(1); game.flip(2);
  now = 1000000;
  assert.equal(game.score, 0);
  game.match();
  assert.equal(game.phase, PHASE.RESULT);
  assert.equal(game.score, 0);
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
