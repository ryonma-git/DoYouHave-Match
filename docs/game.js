export const ITEMS = Object.freeze([
  { id: 'pencil', name: 'pencil', icon: '✏️', phrase: 'a pencil' },
  { id: 'pen', name: 'pen', icon: '🖊️', phrase: 'a pen' },
  { id: 'ruler', name: 'ruler', icon: '📏', phrase: 'a ruler' },
  { id: 'eraser', name: 'eraser', icon: '🧽', phrase: 'an eraser' },
  { id: 'glue', name: 'glue', icon: '🧴', phrase: 'glue' },
]);

export const PHASE = Object.freeze({ SETUP: 'setup', MEMORIZE: 'memorize', READY: 'ready', PLAYING: 'playing', RESULT: 'result' });

export function createItems(random = Math.random) {
  const omit = Math.floor(random() * ITEMS.length);
  const picked = ITEMS.filter((_, index) => index !== omit);
  for (let i = picked.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [picked[i], picked[j]] = [picked[j], picked[i]];
  }
  return picked;
}

export function sentence(items) {
  const phrases = items.map(item => item.phrase);
  if (phrases.length === 0) return '';
  if (phrases.length === 1) return `I have ${phrases[0]}.`;
  if (phrases.length === 2) return `I have ${phrases[0]} and ${phrases[1]}.`;
  return `I have ${phrases.slice(0, -1).join(', ')}, and ${phrases.at(-1)}.`;
}

export function formatTime(seconds) {
  const whole = Math.floor(seconds);
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
}

export class Game {
  constructor({ random = Math.random, now = () => Date.now() } = {}) {
    this.random = random;
    this.now = now;
    this.reset();
  }

  reset() {
    this.phase = PHASE.SETUP;
    this.items = [];
    this.faceUp = [false, false, false, false];
    this.startedAt = null;
    this.penaltySeconds = 0;
    this.finishedSeconds = null;
    this.penaltyNotice = false;
  }

  begin() {
    if (this.phase !== PHASE.SETUP) return;
    this.items = createItems(this.random);
    this.faceUp = [true, true, true, true];
    this.phase = PHASE.MEMORIZE;
  }

  ready() {
    if (this.phase !== PHASE.MEMORIZE) return;
    this.faceUp.fill(false);
    this.phase = PHASE.READY;
  }

  start() {
    if (this.phase !== PHASE.READY) return;
    this.startedAt = this.now();
    this.phase = PHASE.PLAYING;
  }

  get elapsedSeconds() {
    if (this.phase === PHASE.RESULT) return this.finishedSeconds;
    if (this.startedAt === null) return 0;
    return Math.floor((this.now() - this.startedAt) / 1000) + this.penaltySeconds;
  }

  get matchCount() { return this.faceUp.filter(Boolean).length; }

  get matchedItems() { return this.items.filter((_, index) => this.faceUp[index]); }

  flip(index) {
    if (this.phase !== PHASE.PLAYING || !Number.isInteger(index) || index < 0 || index >= 4) return;
    if (this.faceUp[index]) {
      this.penaltySeconds += 5;
      this.penaltyNotice = true;
    }
    this.faceUp[index] = !this.faceUp[index];
  }

  nextPerson() {
    if (this.phase !== PHASE.PLAYING) return;
    this.faceUp.fill(false);
    this.penaltyNotice = false;
  }

  match() {
    if (this.phase !== PHASE.PLAYING || this.matchCount < 3) return;
    this.finishedSeconds = this.elapsedSeconds;
    this.phase = PHASE.RESULT;
  }
}
