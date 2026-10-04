import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { unlock, failureCount, hasAccess, canAttempt, revokeAccess } from '../docs/teacher-access.js';

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

test('successful logins do not consume or reset failures; five wrong codes lock access', async () => {
  setup();
  for (let i = 0; i < 8; i++) {
    assert.equal(await unlock('2891'), true);
    assert.equal(failureCount(), 0);
  }
  for (let count = 1; count <= 4; count++) {
    assert.equal(await unlock('0000'), false);
    assert.equal(hasAccess(), false);
    assert.equal(failureCount(), count);
    assert.equal(await unlock('2891'), true);
    assert.equal(failureCount(), count);
  }
  assert.equal(await unlock('9999'), false);
  assert.equal(failureCount(), 5);
  assert.equal(canAttempt(), false);
  assert.equal(await unlock('2891'), false);
  assert.equal(hasAccess(), false);
});

test('failure counts survive reload and one cleared store; play revokes access', async () => {
  setup();
  await unlock('0000');
  await unlock('2891');
  revokeAccess();
  assert.equal(hasAccess(), false);
  sessionStorage.clear();
  assert.equal(failureCount(), 1);
  document.cookie = '';
  assert.equal(failureCount(), 1);
  await unlock('0000');
  localStorage.clear();
  assert.equal(failureCount(), 2);
});

test('legacy successful-attempt lockouts do not block the new failure-only counter', async () => {
  setup();
  document.cookie = 'dyhm_teacher_attempts_v1=5';
  localStorage.setItem('dyhm_teacher_attempts_v1', '5');
  assert.equal(failureCount(), 0);
  assert.equal(await unlock('2891'), true);
  assert.equal(failureCount(), 0);
});
