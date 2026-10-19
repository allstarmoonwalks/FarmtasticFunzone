const C = require('../site/shared/contract.js'), assert = require('assert');
const t = C.defaults({
  org: { name: 'Loredo Annual Fair', address: '7128 E. Saunders St.', city: 'Loredo', state: 'TX', zip: '78041', phone: '(956)722-9948' },
  event: { start_date: '2027-02-24', end_date: '2027-02-27', booths: 4 },
  quote: { booths: 4, days: 4, per_day: 1122, craft_fee: 0, travel_fee: 0, discount: 224.4, discount_label: '5% Discount for Bundle with Texan Petting Zoo', total: 4263.6 },
  attractions: [{ slug: 'kernel-corn', name: 'Kernel Corn-struction Zone!' }, { slug: 'boots-scoots', name: 'Boots, Scoots, & Photo Shoots!' }],
});
assert.equal(t.retainer, 1421.2); assert.equal(t.final, 2842.4);
assert.equal(t.contractee_address, '7128 E. Saunders St., Loredo, TX 78041');
assert.equal(C.dateRange('2027-02-24', '2027-02-27'), 'February 24-27, 2027');
const h = C.render(t);
for (const s of ['2027 AGREEMENT', 'Loredo Annual Fair', '$4,488.00', '-$224.40', '$4,263.60', '$1,421.20', '$2,842.40', 'February 24-27, 2027']) assert(h.includes(s), s);
assert(!C.render({ ...t, contractee_name: '<script>x</script>' }).includes('<script>'));
console.log('contract ok');
