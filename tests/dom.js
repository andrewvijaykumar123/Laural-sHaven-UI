'use strict';
/*
 * Minimal browser globals so the browser-first shared scripts (core.js) can be required in Node.
 * core.js only touches window.top/window.self at load time, so this is all it needs.
 */
function installGlobals() {
  if (!global.window) {
    global.window = {};
    global.window.self = global.window;
    global.window.top = global.window;
  }
  if (!global.crypto) global.crypto = require('node:crypto').webcrypto;
  return global.window;
}

function loadCore() {
  installGlobals();
  require('../core.js');
  return global.window.LH;
}

module.exports = { installGlobals, loadCore };
