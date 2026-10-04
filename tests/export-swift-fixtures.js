import { ITEMS } from '../docs/items.js';
import { assignments, defaultConfig, shuffled, seededRandom } from '../docs/room.js';
const fixtures = [];
for (let count = 4; count <= 10; count++) for (let pattern = 0; pattern < 8; pattern++) for (const size of [2, 17, 40]) {
  const config = { ...defaultConfig(), selected: ITEMS.slice(0, count).map(item => item.id), present: shuffled(defaultConfig().present, seededRandom(size)).slice(0, size).sort((a, b) => a - b), pattern };
  const expected = Object.fromEntries([...assignments(config)].map(([number, cards]) => [String(number), cards.map(item => item.id)]));
  fixtures.push({ config, expected });
}
process.stdout.write(JSON.stringify(fixtures));
