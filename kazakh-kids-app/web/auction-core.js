/* Auction state machine — pure logic, no DOM. Used by the game (arena.js), by the Node tests
 * (tests/auction.test.js) and mirrored 1:1 in blueprints/AuctionController.luau.
 *
 * Timeline of the last seconds:  2 s left → «Бір!»   1 s left → «Екі!»   0 → «Сатылды!»
 * A bid placed inside the anti-snipe window pushes the clock back, so nobody can win on the last tick. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.QAuction = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function Auction(item, startPrice, durationSeconds, opts) {
    opts = opts || {};
    this.item = item;
    this.bid = startPrice;
    this.startPrice = startPrice;
    this.leader = null;
    this.time = durationSeconds;
    this.hammer = 0;
    this.active = true;
    this.bids = 0;
    this.step = opts.step || 10;
    this.antiSnipe = opts.antiSnipe == null ? 5 : opts.antiSnipe;
    this.history = [];
  }

  /** Smallest amount the next bidder must offer. */
  Auction.prototype.minNext = function () { return this.bid + this.step; };

  /** @returns {{ok: boolean, code: string}} code: ok | closed | low | leader */
  Auction.prototype.placeBid = function (bidder, amount) {
    if (!this.active) return { ok: false, code: 'closed' };            // «Аукцион аяқталды!»
    if (bidder === this.leader) return { ok: false, code: 'leader' };  // already winning
    if (!(amount >= this.minNext())) return { ok: false, code: 'low' }; // «Баға жоғары болуы керек!»
    this.bid = amount;
    this.leader = bidder;
    this.hammer = 0;                                                   // the hammer goes back up
    this.bids++;
    if (this.time < this.antiSnipe) this.time = this.antiSnipe;
    this.history.push({ bidder: bidder, amount: amount });
    return { ok: true, code: 'ok' };                                   // «Бәс қабылданды!»
  };

  /** Advance one second. @returns {Array<{type: 'count'|'sold'|'nosale', n?: number, winner?: *, price?: number}>} */
  Auction.prototype.tick = function () {
    if (!this.active) return [];
    this.time -= 1;
    if (this.time <= 0) {
      this.active = false;
      this.hammer = 3;
      return [this.leader == null ? { type: 'nosale' } : { type: 'sold', winner: this.leader, price: this.bid }];
    }
    if (this.time <= 2) {
      this.hammer = 3 - this.time;                                     // 2 s left → 1 («Бір!»), 1 s left → 2 («Екі!»)
      return [{ type: 'count', n: this.hammer }];
    }
    return [];
  };

  /**
   * Bot behaviour for one tick: at most one bot bids. Each bot: {name, limit, zeal}.
   * rng() must return a number in [0, 1). @returns {{bot, amount}|null}
   */
  function botMove(auction, bots, rng) {
    if (!auction.active) return null;
    var late = auction.time <= 4;
    var order = bots.slice().sort(function () { return rng() - 0.5; });
    for (var i = 0; i < order.length; i++) {
      var b = order[i];
      if (b.name === auction.leader) continue;
      var raise = auction.step * (1 + Math.floor(rng() * 4));
      var amount = auction.bid + raise;
      if (amount > b.limit) { amount = auction.minNext(); if (amount > b.limit) continue; }
      if (rng() < (late ? b.zeal * 1.6 : b.zeal)) {
        return auction.placeBid(b.name, amount).ok ? { bot: b, amount: amount } : null;
      }
    }
    return null;
  }

  /** Deterministic RNG (mulberry32) so a 6-hour slot always offers the same lot. */
  function seeded(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var SLOT_MS = 6 * 60 * 60 * 1000;
  function slotOf(ms) { return Math.floor(ms / SLOT_MS); }
  function msToNextSlot(ms) { return (slotOf(ms) + 1) * SLOT_MS - ms; }

  return { Auction: Auction, botMove: botMove, seeded: seeded, slotOf: slotOf, msToNextSlot: msToNextSlot, SLOT_MS: SLOT_MS };
});
