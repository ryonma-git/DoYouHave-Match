import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { unlock, attemptCount, hasAccess, canAttempt, revokeAccess } from '../docs/teacher-access.js';

function setup() {
  const makeStorage = () => {
    const values = new Map();
    return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key), clear: () => values.clear() };
  };
  globalThis.document = { _cookie: '', get cookie() { return this._cookie; }, set cookie(value) { this._cookie = value.split(';')[0]; } };
  globalThis.location = { href: 'https://example.org/game/', protocol: 'https:' };
  globalThis.localStorage = makeStorage();
  globalThis.sessionStorage = makeStorage();
  if (!globalThis.crypto) globalThis.crypto = webcrypto;
}

test('every attempt is counted and the sixth attempt cannot authenticate', async () => {
  setup();
  assert.equal(await unlock('0000'), false);
  assert.equal(attemptCount(), 1);
  assert.equal(await unlock('2891'), true);
  assert.equal(hasAccess(), true);
  assert.equal(await unlock('9999'), false);
  assert.equal(hasAccess(), false);
  assert.equal(await unlock('0000'), false);
  assert.equal(await unlock('2891'), true);
  assert.equal(attemptCount(), 5);
  assert.equal(canAttempt(), false);
  assert.equal(await unlock('2891'), false);
  assert.equal(hasAccess(), false);
});

test('reload/tab change does not reset counts; play revokes access', async () => {
  setup();
  await unlock('2891');
  revokeAccess();
  assert.equal(hasAccess(), false);
  sessionStorage.clear();
  assert.equal(attemptCount(), 1);
  document.cookie = '';
  assert.equal(attemptCount(), 1);
  await unlock('2891');
  localStorage.clear();
  assert.equal(attemptCount(), 2);
});
