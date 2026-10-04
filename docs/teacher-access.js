const COOKIE = 'dyhm_teacher_attempts_v1';
const SESSION = 'dyhm_teacher_access_v1';
const LIMIT = 5;
const PASS_DIGEST = '09c2a7bba8d858ad8cdcef6f5376da964432a866098797690c22fd25468a560f';

function parseCount(value) {
  if (value === null || value === undefined) return 0;
  return /^\d+$/.test(value) ? Math.min(LIMIT, Number(value)) : LIMIT;
}
export function attemptCount() {
  const value = document.cookie.split('; ').find(part => part.startsWith(`${COOKIE}=`))?.split('=')[1];
  let backup = null;
  try { backup = localStorage.getItem(COOKIE); } catch { /* Cookies remain the primary counter. */ }
  return Math.max(parseCount(value), parseCount(backup));
}
export function canAttempt() { return attemptCount() < LIMIT; }
export function revokeAccess() { try { sessionStorage.removeItem(SESSION); } catch { /* Already inaccessible. */ } }
export function hasAccess() {
  try { return Number(sessionStorage.getItem(SESSION)) > Date.now(); } catch { return false; }
}
export async function unlock(passcode) {
  revokeAccess();
  const count = attemptCount();
  if (count >= LIMIT) return false;
  const path = new URL('./', location.href).pathname;
  document.cookie = `${COOKIE}=${count + 1}; Path=${path}; Max-Age=31536000; SameSite=Strict${location.protocol === 'https:' ? '; Secure' : ''}`;
  try { localStorage.setItem(COOKIE, String(count + 1)); } catch { /* Cookie may still be usable. */ }
  if (attemptCount() !== count + 1) return false;
  try {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(passcode));
    const hex = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
    if (hex !== PASS_DIGEST) return false;
    // A short teacher session is scoped to this tab. Starting play revokes it.
    sessionStorage.setItem(SESSION, String(Date.now() + 30 * 60 * 1000));
    return hasAccess();
  } catch { return false; }
}
