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
