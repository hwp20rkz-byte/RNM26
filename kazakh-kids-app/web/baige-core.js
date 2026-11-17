/* «Мектеп Бәйгесі» — class race without a server (master plan, sprint 6). A pupil shows a result code (and its QR);
 * the teacher pastes the codes on one phone and gets the rating of pupils and classes. The check digits catch typos,
 * not cheating — it is a game, not an exam (UMD: window.QBAIGE). Code: «QV1-<payload>-<check>». */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.QBAIGE = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  function b64e(s) { var u = unescape(encodeURIComponent(s)); var b = typeof btoa === 'function' ? btoa(u) : Buffer.from(u, 'binary').toString('base64'); return b.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function b64d(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; var u = typeof atob === 'function' ? atob(s) : Buffer.from(s, 'base64').toString('binary'); return decodeURIComponent(escape(u)); }
  function check(s) { var h = 0x811c9dc5; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return ((h >>> 0) % 46656).toString(36).padStart(3, '0').toUpperCase(); }
  function clean(x) { return String(x || '').replace(/[|\n\r]/g, ' ').trim().slice(0, 24); }
  /** { name, cls, xp, lessons, day } → «QV1-…-ABC» */
  function encode(r) {
    var p = b64e([clean(r.name), clean(r.cls).toUpperCase(), r.xp | 0, r.lessons | 0, clean(r.day)].join('|'));
    return 'QV1-' + p + '-' + check(p);
  }
  function decode(code) {
    var m = /^QV1-([A-Za-z0-9_-]+)-([0-9A-Z]{3})$/.exec(String(code || '').trim());
    if (!m || check(m[1]) !== m[2]) return null;
    try { var f = b64d(m[1]).split('|'); if (f.length !== 5) return null; return { name: f[0], cls: f[1], xp: +f[2], lessons: +f[3], day: f[4] }; } catch (e) { return null; }
  }
  /** Pasted text (any separators) → { pupils (best result per name+class, by XP), classes (sum of XP, avg), bad } */
  function board(text) {
    var codes = String(text || '').match(/QV1-[A-Za-z0-9_-]+-[0-9A-Z]{3}/g) || [], bad = 0, by = {};
    codes.forEach(function (c) { var r = decode(c); if (!r) { bad++; return; } var k = r.name.toLowerCase() + '|' + r.cls; if (!by[k] || r.xp > by[k].xp) by[k] = r; });
    var pupils = Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return b.xp - a.xp || b.lessons - a.lessons; });
    var cl = {};
    pupils.forEach(function (p) { var c = cl[p.cls] || (cl[p.cls] = { cls: p.cls, xp: 0, n: 0 }); c.xp += p.xp; c.n++; });
    var classes = Object.keys(cl).map(function (k) { var c = cl[k]; c.avg = Math.round(c.xp / c.n); return c; }).sort(function (a, b) { return b.avg - a.avg; });
    return { pupils: pupils, classes: classes, bad: bad };
  }
  return { encode: encode, decode: decode, board: board };
});
