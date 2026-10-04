import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { webcrypto } from 'node:crypto';
import { defaultConfig, encodeConfig, decodeConfig } from '../docs/room.js';
import { attemptCount } from '../docs/teacher-access.js';

let pageNumber = 0;
function environment(path = '', authenticated = false) {
  const { window, document } = parseHTML('<html><body><main id="app"></main><main id="teacher-page"></main></body></html>');
  const storage = () => {
    const values = new Map();
    return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) };
  };
  Object.defineProperty(window.HTMLInputElement.prototype, 'checked', { configurable: true, get() { return this.hasAttribute('checked'); }, set(value) { this.toggleAttribute('checked', value); } });
  Object.defineProperty(window.HTMLSelectElement.prototype, 'value', { configurable: true, get() { return [...this.options].find(option => option.hasAttribute('selected'))?.value ?? this.options[0]?.value; }, set(value) { [...this.options].forEach(option => option.toggleAttribute('selected', option.value === String(value))); } });
  window.HTMLElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  window.HTMLElement.prototype.close = function () { this.dispatchEvent(new window.Event('close')); };
  let cookie = '';
  Object.defineProperty(document, 'cookie', { get: () => cookie, set: value => { cookie = value.split(';')[0]; } });
  const env = { window, document, navigation: null };
  globalThis.document = document;
  globalThis.window = window;
  globalThis.localStorage = storage();
  globalThis.sessionStorage = storage();
  if (authenticated) sessionStorage.setItem('dyhm_teacher_access_v1', Date.now() + 60000);
  if (!globalThis.crypto) globalThis.crypto = webcrypto;
  const setURL = value => {
    const url = new URL(value, globalThis.location?.href ?? 'https://example.org/DoYouHave-Match/');
    globalThis.location = { href: url.href, hash: url.hash, search: url.search, pathname: url.pathname, protocol: url.protocol, assign: next => { env.navigation = next; }, replace: next => { env.navigation = next; } };
  };
  setURL(`https://example.org/DoYouHave-Match/${path}`);
  globalThis.history = { replaceState: (_state, _unused, url) => setURL(url) };
  globalThis.setInterval = () => 0;
  env.click = selector => {
    const element = document.querySelector(selector);
    assert.ok(element, selector);
    element.dispatchEvent(new window.Event('click', { bubbles: true }));
  };
  env.submit = selector => document.querySelector(selector).dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  env.change = selector => document.querySelector(selector).dispatchEvent(new window.Event('change', { bubbles: true }));
  env.load = async name => import(`../docs/${name}.js?test=${++pageNumber}`);
  return env;
}
async function waitFor(predicate) {
  for (let i = 0; i < 100; i++) {
    if (predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  assert.fail('Async UI transition did not finish');
}

function tripleTap(env) { for (let i = 0; i < 3; i++) env.click('#game-title'); }

test('title needs three taps; wrong code closes the menu and five attempts exhaust access', async () => {
  const env = environment();
  await env.load('main');
  assert.equal(document.querySelector('a[href="admin.html"]'), null);
  env.click('#game-title'); env.click('#game-title');
  assert.equal(document.querySelector('#teacher-login'), null);
  env.click('#game-title');
  for (let attempt = 1; attempt <= 5; attempt++) {
    document.querySelector('#teacher-login input').value = '0000';
    env.submit('#teacher-form');
    await waitFor(() => !document.querySelector('#teacher-login'));
    assert.equal(attemptCount(), attempt);
    tripleTap(env);
  }
  assert.equal(document.querySelector('#teacher-login'), null);
  assert.equal(env.navigation, null);
});

test('99 requires authentication and successful login carries its roster request', async () => {
  const env = environment();
  await env.load('main');
  document.querySelector('#attendance').value = '99';
  env.submit('#attendance-form');
  assert.equal(env.navigation, null);
  assert.ok(document.querySelector('#game-title'));
  assert.equal(document.querySelector('table'), null);
  tripleTap(env);
  document.querySelector('#teacher-login input').value = '2891';
  env.submit('#teacher-form');
  await waitFor(() => env.navigation !== null);
  const target = new URL(env.navigation);
  assert.equal(target.searchParams.get('roster'), '99');
  assert.ok(target.hash.startsWith('#class='));
});

test('direct admin and roster URLs show no content without authorization', async () => {
  const env = environment('admin.html?roster=99');
  await env.load('admin');
  assert.equal(document.querySelector('#teacher-page').innerHTML, '');
  assert.equal(env.navigation, 'https://example.org/DoYouHave-Match/');
});

test('ordinary teacher menu hides the roster and recalculates settings into the shared URL', async () => {
  const env = environment('admin.html', true);
  await env.load('admin');
  assert.equal(document.querySelectorAll('[name=item]').length, 10);
  assert.equal(document.querySelectorAll('[name=present]').length, 40);
  assert.equal(document.querySelector('table'), null);
  document.querySelector('[name=item][value=scissors]').checked = true;
  document.querySelector('[name=present][value="2"]').checked = false;
  env.change('[name=present][value="2"]');
  const url = new URL(document.querySelector('#share-url').value);
  const config = decodeConfig(new URLSearchParams(url.hash.slice(1)).get('class'));
  assert.equal(config.selected.length, 6);
  assert.equal(config.present.includes(2), false);
  assert.match(document.querySelector('#metrics').textContent, /最少/);
  for (const box of document.querySelectorAll('[name=item]')) box.checked = false;
  env.change('[name=item]');
  assert.ok(document.querySelector('#copy-url').disabled);
  assert.equal(document.querySelector('#share-url').value, '');
});

test('authorized 99 table lists all forty numbers with absences and four exact positions', async () => {
  const config = { ...defaultConfig(), present: [1, 3, 7, 8, 12] };
  const env = environment(`admin.html?roster=99#class=${encodeConfig(config)}`, true);
  await env.load('admin');
  assert.equal(document.querySelectorAll('tbody tr').length, 40);
  assert.equal(document.querySelectorAll('tbody .absent-row').length, 35);
  assert.equal(document.querySelector('tbody tr').querySelectorAll('td').length, 5);
});

test('a pupil receives the configured deal and an absent number cannot start', async () => {
  const config = { ...defaultConfig(), present: [1, 3, 7, 8, 12] };
  const env = environment(`#class=${encodeConfig(config)}`, true);
  await env.load('main');
  document.querySelector('#attendance').value = '2';
  env.submit('#attendance-form');
  assert.match(document.querySelector('#setup-error').textContent, /欠席/);
  document.querySelector('#attendance').value = '3';
  env.submit('#attendance-form');
  assert.equal(document.querySelectorAll('.card.face-up').length, 4);
  assert.equal(sessionStorage.getItem('dyhm_teacher_access_v1'), null);
  env.click('[data-action=ready]');
  assert.equal(document.querySelectorAll('.card.face-down').length, 4);
  env.click('[data-action=start]');
  assert.equal(document.querySelector('[data-action=match]').disabled, true);
  env.click('[data-flip="0"]'); env.click('[data-flip="1"]'); env.click('[data-flip="2"]');
  assert.equal(document.querySelector('[data-action=match]').disabled, false);
  env.click('[data-action=match]');
  assert.equal(document.querySelectorAll('.result-item').length, 3);
});
