const assert = require('assert'); const P = require('./pricing.js');
assert.strictEqual(P.quote({ booths: 8, days: 3 }).total, 4266);
assert.strictEqual(P.quote({ booths: 8, days: 10 }).total, 11000);
assert.strictEqual(P.quote({ booths: 4, days: 2, craft: true }).total, 1122 * 2 + 400);
assert.strictEqual(P.quote({ booths: 10, days: 10, craft: true }).total, 12880 + 400);
assert.strictEqual(P.quote({ booths: 6, days: 4, discount: 100 }).deposit, (1272 * 4 - 100) * 0.25);
assert.throws(() => P.quote({ booths: 5, days: 1 }));
console.log('pricing ok');
