// Auction state machine: bidding rules, hammer countdown, anti-snipe, bots, 6-hour slots.
const assert = require('assert');
const { Auction, botMove, seeded, slotOf, msToNextSlot, SLOT_MS } = require('../web/auction-core.js');

// bids
let a = new Auction({ id: 'x' }, 100, 10, { step: 10, antiSnipe: 5 });
assert.deepStrictEqual(a.placeBid('me', 105), { ok: false, code: 'low' });
assert.strictEqual(a.placeBid('me', 110).ok, true);
assert.deepStrictEqual(a.placeBid('me', 200), { ok: false, code: 'leader' });
assert.strictEqual(a.placeBid('bot', 120).ok, true);
assert.strictEqual(a.leader, 'bot');

// countdown: 2 s left → «Бір!», 1 s left → «Екі!», 0 → sold
a = new Auction({}, 100, 4, { antiSnipe: 0 });
a.placeBid('me', 110);
assert.deepStrictEqual(a.tick(), []);                                   // 3
assert.deepStrictEqual(a.tick(), [{ type: 'count', n: 1 }]);            // 2
assert.deepStrictEqual(a.tick(), [{ type: 'count', n: 2 }]);            // 1
assert.deepStrictEqual(a.tick(), [{ type: 'sold', winner: 'me', price: 110 }]);
assert.deepStrictEqual(a.tick(), []);
assert.deepStrictEqual(a.placeBid('bot', 500), { ok: false, code: 'closed' });

// anti-snipe: a bid in the last seconds resets the hammer and pushes the clock back
a = new Auction({}, 100, 3, { antiSnipe: 5 });
a.tick();                                                               // 2 → «Бір!»
assert.strictEqual(a.hammer, 1);
a.placeBid('me', 110);
assert.strictEqual(a.time, 5);
assert.strictEqual(a.hammer, 0);

// nobody bids
a = new Auction({}, 100, 1);
assert.deepStrictEqual(a.tick(), [{ type: 'nosale' }]);

// bots never exceed their limit and the auction always terminates
for (let seed = 1; seed <= 200; seed++) {
  const rng = seeded(seed);
  const au = new Auction({}, 100, 30, { step: 10 });
  const bots = [{ name: 'A', limit: 180, zeal: 0.4 }, { name: 'B', limit: 260, zeal: 0.3 }, { name: 'C', limit: 140, zeal: 0.5 }];
  let ticks = 0, end = null;
  while (au.active && ticks++ < 2000) {
    const mv = botMove(au, bots, rng);
    if (mv) assert.ok(mv.amount <= mv.bot.limit, 'bot over its limit');
    au.tick().forEach((e) => { if (e.type !== 'count') end = e; });
  }
  assert.ok(end, 'auction did not finish');
  assert.ok(au.bid <= 260);
}

// slots
assert.strictEqual(slotOf(0), 0);
assert.strictEqual(slotOf(SLOT_MS), 1);
assert.strictEqual(msToNextSlot(SLOT_MS - 1000), 1000);
assert.strictEqual(seeded(42)(), seeded(42)());
console.log('auction-core: OK');
