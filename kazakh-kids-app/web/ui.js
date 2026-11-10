/* UI layer applied to everything the app renders:
 *   1. EN → KK mode: Russian interface strings are swapped for English (dictionary in ui-en.js);
 *   2. the coin emoji is replaced by the golden asyk icon (Алтын Асық).
 * Works through a MutationObserver, so every screen, sheet and toast is covered in one place. */
(function () {
  'use strict';
  var A = window.Q.api, W = window.QWORLD, DICT = window.QUI_EN, COIN = '🪙';
  var miss = window.qUntranslated = {};

  function frags(t) {
    for (var i = 0; i < DICT.frag.length; i++) if (t.indexOf(DICT.frag[i][0]) >= 0) t = t.split(DICT.frag[i][0]).join(DICT.frag[i][1]);
    return t;
  }
  function translate(s) {
    var m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s), core = m[2];
    if (!core || !/[А-Яа-яЁё]/.test(core)) return s;
    if (Object.prototype.hasOwnProperty.call(DICT.exact, core)) return m[1] + DICT.exact[core] + m[3];
    for (var i = 0; i < DICT.rx.length; i++) {
      if (DICT.rx[i][0].test(core)) return m[1] + frags(core.replace(DICT.rx[i][0], DICT.rx[i][1])) + m[3];
    }
    var f = frags(core);
    if (f !== core) return m[1] + f + m[3];
    if (window.qFast !== undefined || window.qTrackI18n) miss[core] = 1;   // test runs only
    return s;
  }
  function fixText(n) {
    var v = n.nodeValue;
    if (!v) return;
    if (A.lang() === 'en') { var t = translate(v); if (t !== v) { n.nodeValue = t; v = t; } }
    var i = v.indexOf(COIN);
    if (i < 0 || !n.parentNode) return;
    var rest = n.splitText(i); rest.nodeValue = rest.nodeValue.slice(COIN.length);
    var span = document.createElement('span'); span.className = 'asyk-w'; span.innerHTML = W.ASYK;
    n.parentNode.insertBefore(span, rest);
    fixText(rest);
  }
  function walk(root) {
    if (root.nodeType === 3) return fixText(root);
    if (root.nodeType !== 1 || root.tagName === 'SCRIPT' || root.tagName === 'STYLE') return;
    var tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), list = [], n;
    while ((n = tw.nextNode())) list.push(n);
    list.forEach(fixText);
    if (A.lang() === 'en') {
      var els = root.querySelectorAll ? root.querySelectorAll('[placeholder],[aria-label]') : [];
      for (var k = 0; k < els.length; k++) ['placeholder', 'aria-label'].forEach(function (a) { var v = els[k].getAttribute(a); if (v) { var t = translate(v); if (t !== v) els[k].setAttribute(a, t); } });
    }
  }
  new MutationObserver(function (recs) {
    recs.forEach(function (r) {
      if (r.type === 'characterData') fixText(r.target);
      else for (var i = 0; i < r.addedNodes.length; i++) walk(r.addedNodes[i]);
    });
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
  document.documentElement.lang = A.lang() === 'en' ? 'en' : 'ru';
})();
