'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Mail = require('../mailtpl.js');

test('rupeesInWords covers the Indian numbering system', () => {
  assert.equal(Mail.rupeesInWords(0), 'Zero Rupees Only');
  assert.equal(Mail.rupeesInWords(1), 'One Rupees Only');
  assert.equal(Mail.rupeesInWords(100), 'One Hundred Rupees Only');
  assert.equal(Mail.rupeesInWords(1100), 'One Thousand One Hundred Rupees Only');
  assert.equal(Mail.rupeesInWords(3500), 'Three Thousand Five Hundred Rupees Only');
  assert.equal(Mail.rupeesInWords(100000), 'One Lakh Rupees Only');
});

test('cafe details are present for invoices and call links', () => {
  assert.equal(Mail.SHOP, "Laural's Haven");
  assert.equal(typeof Mail.CAFE.phone, 'string');
  assert.ok(Mail.CAFE.phone.replace(/\D/g, '').length >= 10);
});
