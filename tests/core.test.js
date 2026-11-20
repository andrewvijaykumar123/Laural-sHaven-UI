'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadCore } = require('./dom.js');

const LH = loadCore();

test('menu builds with unique ids and the expected size', () => {
  assert.ok(LH.ITEMS.size >= 85, 'at least the 85 base items are present');
  assert.ok(LH.MENU.length >= 18, 'at least the 18 base categories are present');
  const ids = [...LH.ITEMS.keys()];
  assert.equal(new Set(ids).size, ids.length, 'every item id is unique');
});

test('fmt formats Indian rupees', () => {
  assert.equal(LH.fmt(0), '₹0');
  assert.equal(LH.fmt(1234), '₹1,234');
  assert.equal(LH.fmt(1234567), '₹12,34,567');
});

test('deliveryFee matches the published bands', () => {
  assert.equal(LH.deliveryFee(0), 0);
  assert.equal(LH.deliveryFee(3), 0);
  assert.equal(LH.deliveryFee(5), 0);
  assert.equal(LH.deliveryFee(7), 30);   // Rs 15/km over 5 km
  assert.equal(LH.deliveryFee(10), 75);  // 5 km * Rs 15
  assert.equal(LH.deliveryFee(15), 175); // Rs 75 + 5 km * Rs 20
});

test('eventQuote adds rent, cleaning and optional decoration', () => {
  assert.deepEqual(LH.eventQuote(3, false), { hours: 3, rent: 3000, clean: 500, decor: 0, total: 3500 });
  assert.deepEqual(LH.eventQuote(2, true), { hours: 2, rent: 2000, clean: 500, decor: 500, total: 3000 });
  assert.equal(LH.eventQuote(2.9, false).hours, 2, 'hours are whole');
});

test('validateOrder accepts a good order and rejects bad input', () => {
  const id = 'LH-ABCDEFGHIJ';
  const ts = Date.now();
  const ok = LH.validateOrder({ id, ts, n: 'Anita', p: '9876543210', it: [['masala-tea', 2]], pay: 'upi', svc: 'dine', tbl: '4' });
  assert.ok(ok);
  assert.equal(ok.total, 50, '2 x Rs 25');
  assert.equal(ok.svc, 'dine');
  assert.equal(ok.tbl, '4');

  assert.equal(LH.validateOrder({ id, ts, n: '', p: '9876543210', it: [['masala-tea', 1]], svc: 'dine' }), null, 'name required');
  assert.equal(LH.validateOrder({ id, ts, n: 'A', p: '9876543210', it: [], svc: 'dine' }), null, 'cart required');
  assert.equal(LH.validateOrder({ id: 'nope', ts, n: 'A', p: '9876543210', it: [['masala-tea', 1]], svc: 'dine' }), null, 'id shape required');
});

test('validateFeedback needs a 1-5 service rating', () => {
  assert.ok(LH.validateFeedback({ id: 'LH-ABCDEFGHIJ', sr: 5, n: 'Anita', svc: 'dine', ir: [] }));
  assert.equal(LH.validateFeedback({ id: 'LH-ABCDEFGHIJ', sr: 0 }), null);
  assert.equal(LH.validateFeedback({ id: 'LH-ABCDEFGHIJ', sr: 6 }), null);
});

test('clock and event-date helpers', () => {
  assert.equal(LH.clock(0), '12:00 AM');
  assert.equal(LH.clock(480), '8:00 AM');
  assert.equal(LH.clock(720), '12:00 PM');
  assert.equal(LH.clock(1380), '11:00 PM');
  assert.equal(LH.validDateKey('2026-01-01'), true);
  assert.equal(LH.validDateKey('2026-13-01'), false);
  assert.equal(LH.validDateKey('2026-02-30'), false);
});

/* ---------- menu management ---------- */
const edit = (op) => { const next = LH.menuAfter(op); if (next) LH.applyMenu(next); return next; };
const fresh = () => LH.applyMenu(null);

test('built-in products can be fully edited and reset', () => {
  fresh();
  edit({ op: 'edit', id: 'masala-tea', name: 'Kadak Chai', diet: 'v', icon: '🫖', desc: 'Strong, spiced, sweet', best: false, cat: 'sandwiches' });
  const it = LH.ITEMS.get('masala-tea');
  assert.equal(it.name, 'Kadak Chai');
  assert.equal(it.icon, '🫖');
  assert.equal(it.desc, 'Strong, spiced, sweet');
  assert.equal(it.best, false);
  assert.equal(it.cat, 'sandwiches');
  assert.ok(LH.MENU.find((c) => c.id === 'sandwiches').items.includes(it));
  assert.equal(it.price, 25, 'price is untouched');
  edit({ op: 'edit', id: 'masala-tea', name: 'Masala Tea', icon: '', desc: '', best: true, cat: 'tea-and-coffee' });
  assert.deepEqual(LH.getMenuDoc().ov, {}, 'resetting to the built-in values leaves no override');
  fresh();
});

test('custom products take every edit in place', () => {
  fresh();
  edit({ op: 'add', name: 'Rasmalai Cup', cat: 'milk-based-drinks-300ml', price: 120, desc: 'Cold and creamy', best: true });
  edit({ op: 'edit', id: 'rasmalai-cup', name: 'Rasmalai Jar', cat: 'haven-s-specials', diet: 'e', best: false });
  const it = LH.ITEMS.get('rasmalai-jar') || LH.ITEMS.get('rasmalai-cup');
  assert.equal(it.name, 'Rasmalai Jar');
  assert.equal(it.cat, 'haven-s-specials');
  assert.equal(it.best, false);
  assert.equal(it.desc, 'Cold and creamy');
  assert.equal(LH.getMenuDoc().items.length, 1);
  fresh();
});

test('sections can be renamed, reordered and deleted with their products moved', () => {
  fresh();
  edit({ op: 'editcat', id: 'maggie', name: 'Noodles', icon: '🍝', tagline: 'Slurp' });
  assert.equal(LH.MENU.find((c) => c.id === 'maggie').name, 'Noodles');
  const order = LH.MENU.map((c) => c.id).reverse();
  edit({ op: 'ordcat', ids: order });
  assert.deepEqual(LH.MENU.map((c) => c.id), order);
  assert.equal(LH.menuAfter({ op: 'ordcat', ids: order }), null, 'same order is not a change');
  const n = LH.MENU.find((c) => c.id === 'omelettes').items.length;
  const before = LH.MENU.find((c) => c.id === 'maggie').items.length;
  edit({ op: 'delcat', id: 'omelettes', moveTo: 'maggie' });
  assert.ok(!LH.MENU.some((c) => c.id === 'omelettes'));
  assert.equal(LH.MENU.find((c) => c.id === 'maggie').items.length, before + n);
  assert.equal(LH.GONE_CATS.length, 1);
  fresh();
});

test('deleting a section without moving hides its products until restored', () => {
  fresh();
  const ids = LH.MENU.find((c) => c.id === 'momo-s').items.map((i) => i.id);
  edit({ op: 'delcat', id: 'momo-s' });
  assert.ok(ids.every((id) => LH.ITEMS.get(id).gone && LH.ITEMS.get(id).hide), 'products are gone and not orderable with their section');
  assert.throws(() => LH.menuAfter({ op: 'restore', id: ids[0] }), /Unknown item/, 'a product is only restored through its section');
  edit({ op: 'restorecat', id: 'momo-s' });
  assert.ok(ids.every((id) => !LH.ITEMS.get(id).gone));
  assert.equal(LH.MENU.find((c) => c.id === 'momo-s').items.length, ids.length);
  fresh();
});

test('deleted products can be restored, and orders keep their prices', () => {
  fresh();
  const ts = Date.now() - 1000;
  edit({ op: 'remove', id: 'masala-tea' });
  assert.ok(LH.ITEMS.get('masala-tea').gone);
  assert.equal(LH.priceAt('masala-tea', ts), 25);
  edit({ op: 'restore', id: 'masala-tea' });
  assert.ok(!LH.ITEMS.get('masala-tea').gone);
  edit({ op: 'price', id: 'masala-tea', price: 40 });
  assert.equal(LH.priceAt('masala-tea', ts), 25, 'an old order keeps the old price');
  fresh();
});

test('bad menu input is refused or cleaned', () => {
  fresh();
  assert.throws(() => LH.menuAfter({ op: 'edit', id: 'nope', name: 'X' }), /Unknown item/);
  assert.throws(() => LH.menuAfter({ op: 'edit', id: 'masala-tea', name: '  ' }), /name/);
  assert.throws(() => LH.menuAfter({ op: 'edit', id: 'masala-tea', cat: 'nope' }), /section/);
  assert.throws(() => LH.menuAfter({ op: 'delcat', id: 'maggie', moveTo: 'maggie' }), /another section/);
  assert.throws(() => LH.menuAfter({ op: 'ordcat', ids: ['maggie'] }), /order/);
  LH.applyMenu({ ts: 1, px: {}, ov: { 'masala-tea': { name: '<b>Chai</b>', cat: 'nope', diet: 'x', best: 'yes' }, ghost: { name: 'Boo' } }, cov: { maggie: { name: '' }, ghost: { name: 'x' } }, dcat: ['ghost', 'maggie'], ord: ['maggie', 'maggie', 'zzz'] });
  assert.equal(LH.ITEMS.get('masala-tea').name, 'b Chai /b');
  assert.ok(!LH.ITEMS.get('masala-tea').name.includes('<'));
  assert.equal(LH.ITEMS.get('masala-tea').cat, 'tea-and-coffee');
  assert.ok(!('ghost' in LH.getMenuDoc().ov));
  assert.deepEqual(LH.getMenuDoc().dcat, ['maggie']);
  fresh();
});
