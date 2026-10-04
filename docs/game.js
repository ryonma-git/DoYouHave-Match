import { ITEMS } from './items.js';
import { assignments, defaultConfig } from './room.js?v=2';
export { ITEMS };

export const PHASE = Object.freeze({ SETUP: 'setup', MEMORIZE: 'memorize', READY: 'ready', PLAYING: 'playing', RESULT: 'result' });

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
  constructor({ now = () => Date.now() } = {}) {
    this.now = now;
    this.reset();
  }

  reset() {
    this.phase = PHASE.SETUP;
    this.attendance = 0;
    this.items = [];
    this.faceUp = [false, false, false, false];
    this.startedAt = null;
    this.penaltySeconds = 0;
    this.finishedSeconds = null;
    this.penaltyNotice = false;
  }

  begin(number, config = defaultConfig()) {
    if (this.phase !== PHASE.SETUP || !Number.isInteger(number) || number < 1 || number > 40) return false;
    const cards = assignments(config).get(number);
    if (!cards) return false;
    this.attendance = number;
    this.items = cards;
    this.faceUp = [true, true, true, true];
    this.phase = PHASE.MEMORIZE;
    return true;
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
