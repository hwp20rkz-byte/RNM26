// The JS scorer must reproduce the Python scorer bit for bit (vectors written by backend/tests/test_scoring.py).
const assert = require('assert');
const path = require('path');
const QS = require('../web/score-core.js');
const vectors = require(path.join(__dirname, '../backend/tests/vectors.json'));

for (const v of vectors) {
  const r = QS.assess(v.hyp, v.target, v.conf == null ? undefined : v.conf);
  assert.strictEqual(r.score, v.score, `score for "${v.hyp}" vs "${v.target}"`);
  assert.strictEqual(r.accuracy, v.accuracy, `accuracy for "${v.hyp}"`);
  assert.strictEqual(r.passed, v.passed);
  assert.deepStrictEqual(r.missed, v.missed);
  assert.strictEqual(r.hypothesis, v.hypothesis);
}
const diff = QS.assess('онга бурыл', 'Оңға бұрыл!');
assert.deepStrictEqual(diff.ops.filter((o) => o.op !== 'ok').map((o) => o.t), ['ң', 'ғ', 'ұ']);
console.log(`score-core: ${vectors.length} shared vectors OK`);
