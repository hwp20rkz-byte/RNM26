// Sprint 6: pets (grow with lessons, fed by Дастархан Master, neon accessories) and «Мектеп Бәйгесі» codes
const assert = require('assert'); const P = require('../web/pets-core.js'), B = require('../web/baige-core.js');
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
// pets
ok(P.stage(0).kk === 'Кішкентай' && P.stage(5).kk === 'Жас' && P.stage(29).kk === 'Ширақ' && P.stage(60).kk === 'Батыр', 'stages by lessons');
ok(P.progress(10).left === 5 && P.progress(10).pct === 50 && P.progress(99).next === null, 'progress to the next stage');
let r = P.adopt(null, 'tazy', 0); ok(r.ok && r.coins === 0 && r.st.id === 'tazy', 'Құмай-тазы is free');
ok(!P.adopt(r.st, 'barys', 100).ok && P.adopt(r.st, 'barys', 100).why === 'coins', 'the snow leopard costs 500');
let r2 = P.adopt(r.st, 'barys', 600); ok(r2.ok && r2.coins === 100 && r2.st.owned.join() === 'tazy,barys', 'adopt the snow leopard for 500');
let r3 = P.adopt(r2.st, 'tazy', 0); ok(r3.ok && r3.coins === 0, 'switching back to an owned pet is free');
let a = P.buyAcc(r3.st, 'crown', 299); ok(!a.ok && a.why === 'coins', 'the crown costs 300');
a = P.buyAcc(r3.st, 'crown', 300); ok(a.ok && a.coins === 0 && a.st.acc[0] === 'crown', 'buy the crown');
ok(P.buyAcc(a.st, 'crown', 999).why === 'already', 'an accessory is bought once');
ok(P.hungry(a.st, '2026-11-14'), 'hungry when not fed today');
let f = P.feed(a.st, '2026-11-14'); ok(f.bonus === 10 && !P.hungry(f.st, '2026-11-14'), 'fed today: +10 once');
ok(P.feed(f.st, '2026-11-14').bonus === 0 && P.hungry(f.st, '2026-11-15'), 'no second bonus the same day; hungry again tomorrow');
ok(P.PETS.every((p) => p.kk && p.ru && p.en && p.e) && P.ACC.every((x) => x.kk && x.price > 0), 'pets and accessories described');
// Бәйге codes
const me = { name: 'Әлібек', cls: '4ә', xp: 1234, lessons: 42, day: '2026-11-14' };
const code = B.encode(me); ok(/^QV1-[A-Za-z0-9_-]+-[0-9A-Z]{3}$/.test(code), 'code format: ' + code);
const back = B.decode(code); ok(back.name === 'Әлібек' && back.cls === '4Ә' && back.xp === 1234 && back.lessons === 42, 'Kazakh names survive the code');
ok(B.decode(code.slice(0, -1) + (code.slice(-1) === 'A' ? 'B' : 'A')) === null, 'a typo in the check is caught');
ok(B.decode(code.replace('QV1-', 'QV1-x')) === null, 'a typo in the payload is caught');
const codes = [B.encode({ name: 'Әнел', cls: '4А', xp: 900, lessons: 30, day: 'd' }), B.encode({ name: 'Әнел', cls: '4А', xp: 950, lessons: 31, day: 'd' }), code,
  B.encode({ name: 'Дана', cls: '4А', xp: 300, lessons: 10, day: 'd' }), 'QV1-zzz-AAA'].join('\n  ;');
const bd = B.board(codes);
ok(bd.pupils.length === 3 && bd.pupils[0].name === 'Әлібек' && bd.pupils[1].xp === 950, 'pupils: best result each, sorted by XP');
ok(bd.classes.length === 2 && bd.classes[0].cls === '4Ә' && bd.classes[1].avg === 625 && bd.bad === 1, 'classes by average XP; a broken code counted');
console.log('pets + бәйге: ' + n + ' checks passed');
