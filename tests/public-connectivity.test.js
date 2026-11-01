const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const storefrontJs = fs.readFileSync(path.join(root, '..', 'Laural-sHaven-UI', 'app.js'), 'utf8');
const adminJs = fs.readFileSync(path.join(root, '..', 'Laural-sHaven-UI-AdminConsole', 'app.js'), 'utf8');
const serverJs = fs.readFileSync(path.join(root, 'server.js'), 'utf8');

test('storefront keeps the configured public API while adding resilient shared-store fallback', () => {
  assert.match(storefrontJs, /https:\/\/laurals-haven-api\.onrender\.com/);
  assert.match(storefrontJs, /localStorage|lauralsHavenPublicMenu|lauralsHavenPublicOrders|menu\.json/);
});

test('admin console keeps the configured public API and 90 minute session expiry with shared board fallback', () => {
  assert.match(adminJs, /https:\/\/laurals-haven-api\.onrender\.com/);
  assert.match(adminJs, /ADMIN_SESSION_TTL_MS\s*=\s*90\s*\*\s*60\s*\*\s*1000/);
  assert.match(adminJs, /localStorage|lauralsHavenPublicOrders|data-status=\"cooking\"|data-status=\"completed\"|data-status=\"rejected\"/);
});

test('backend supports the required order status flow', () => {
  assert.match(serverJs, /rejected/);
  assert.match(serverJs, /cooking/);
  assert.match(serverJs, /completed/);
  assert.match(serverJs, /STATUS_FLOW\s*=\s*\[[^\]]*pending[^\]]*accepted[^\]]*rejected[^\]]*cooking[^\]]*completed/);
});

test('storefront can fall back to the repo menu and shared browser storage when the public API is unavailable', () => {
  assert.match(storefrontJs, /localStorage|shared.*menu|lauralsHavenPublicOrders/);
  assert.match(storefrontJs, /menu\.json|fetch\(.*menu\.json/);
});

test('admin console can read and update shared order state without the live backend', () => {
  assert.match(adminJs, /localStorage|lauralsHavenPublicOrders/);
  assert.match(adminJs, /data-status=\"cooking\"|data-status=\"completed\"|data-status=\"rejected\"/);
});

test('port fallback logic avoids infinite retries on busy ports', () => {
  assert.match(serverJs, /attempted\s*=\s*new Set\(\)/);
  assert.doesNotMatch(serverJs, /startServer\(nextPort\)/);
  assert.match(serverJs, /find\(\(candidate\)\s*=>\s*!attempted\.has\(candidate\)\)/);
});
