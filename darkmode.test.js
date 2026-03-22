/**
 * darkmode.test.js
 *
 * Unit tests for darkmode.js.
 *
 * Run with:  node darkmode.test.js
 *
 * No external test framework is required — uses Node's built-in assert module.
 */

"use strict";

const assert = require("assert");

// ── Minimal DOM / browser-API shim ──────────────────────────────────────────

/**
 * Build a lightweight environment that mimics the browser APIs used by
 * darkmode.js, so we can run tests in plain Node without jsdom.
 */
function createEnv({ storedValue = null, systemDark = false } = {}) {
  const store = storedValue !== null ? { darkMode: storedValue } : {};

  const localStorage = {
    _store: { ...store },
    getItem(key)        { return Object.prototype.hasOwnProperty.call(this._store, key) ? this._store[key] : null; },
    setItem(key, value) { this._store[key] = String(value); },
    removeItem(key)     { delete this._store[key]; },
  };

  const mediaQueryListeners = [];
  const matchMedia = (query) => ({
    matches: query === "(prefers-color-scheme: dark)" ? systemDark : false,
    addEventListener(event, cb) { mediaQueryListeners.push({ event, cb, query }); },
  });

  // Minimal classList on a plain object
  const classSet = new Set();
  const htmlElement = {
    classList: {
      add:      (c) => classSet.add(c),
      remove:   (c) => classSet.delete(c),
      contains: (c) => classSet.has(c),
      _set:     classSet,
    },
  };

  const documentListeners = {};
  let _inputEl = null;

  const document = {
    documentElement: htmlElement,
    getElementById(id) { return id === "dark-mode-input" ? _inputEl : null; },
    dispatchEvent(event) {
      const handlers = documentListeners[event.type] || [];
      handlers.forEach((h) => h(event));
    },
    addEventListener(type, cb) {
      documentListeners[type] = documentListeners[type] || [];
      documentListeners[type].push(cb);
    },
    _triggerDOMContentLoaded() {
      (documentListeners["DOMContentLoaded"] || []).forEach((cb) => cb());
    },
    _fireMediaChange(matches) {
      mediaQueryListeners.forEach(({ cb }) => cb({ matches }));
    },
  };

  const window = { matchMedia, localStorage };

  return { document, window, localStorage, htmlElement, mediaQueryListeners, setInput: (el) => { _inputEl = el; } };
}

/** Fake checkbox input element. */
function createInput(checked = false) {
  const listeners = {};
  const input = {
    checked,
    id: "dark-mode-input",
    closest: () => null,   // no parent label in unit tests
    addEventListener(type, cb) {
      listeners[type] = listeners[type] || [];
      listeners[type].push(cb);
    },
    _trigger(type) {
      (listeners[type] || []).forEach((cb) => cb());
    },
    _listeners: listeners,
  };
  return input;
}

/** Load a fresh copy of DarkMode into the given env globals. */
function loadDarkMode(env) {
  // Expose globals that darkmode.js reads at the module level
  global.window   = env.window;
  global.document = env.document;
  global.localStorage = env.localStorage;

  // Delete the cached module so require() gives us a fresh instance
  delete require.cache[require.resolve("./darkmode.js")];
  const DarkMode = require("./darkmode.js");

  return DarkMode;
}

// ── Test helpers ─────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗  ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

console.log("\nDarkMode — unit tests\n");

// 1. Defaults to system preference (dark) when nothing is stored
test("init() enables dark mode when OS prefers dark and no stored preference", () => {
  const env = createEnv({ systemDark: true });
  const DarkMode = loadDarkMode(env);
  const input = createInput();
  DarkMode.init(input);
  assert.strictEqual(DarkMode.isDark(), true);
  assert.strictEqual(input.checked, true);
});

// 2. Defaults to system preference (light)
test("init() keeps light mode when OS prefers light and no stored preference", () => {
  const env = createEnv({ systemDark: false });
  const DarkMode = loadDarkMode(env);
  const input = createInput();
  DarkMode.init(input);
  assert.strictEqual(DarkMode.isDark(), false);
  assert.strictEqual(input.checked, false);
});

// 3. Stored "true" overrides system preference
test("init() enables dark mode when stored preference is 'true'", () => {
  const env = createEnv({ storedValue: "true", systemDark: false });
  const DarkMode = loadDarkMode(env);
  const input = createInput();
  DarkMode.init(input);
  assert.strictEqual(DarkMode.isDark(), true);
  assert.strictEqual(input.checked, true);
});

// 4. Stored "false" overrides system preference
test("init() disables dark mode when stored preference is 'false'", () => {
  const env = createEnv({ storedValue: "false", systemDark: true });
  const DarkMode = loadDarkMode(env);
  const input = createInput();
  DarkMode.init(input);
  assert.strictEqual(DarkMode.isDark(), false);
  assert.strictEqual(input.checked, false);
});

// 5. Checking the checkbox enables dark mode and persists the choice
test("checking the checkbox enables dark mode and persists to localStorage", () => {
  const env = createEnv({ systemDark: false });
  const DarkMode = loadDarkMode(env);
  const input = createInput(false);
  DarkMode.init(input);

  input.checked = true;
  input._trigger("change");

  assert.strictEqual(DarkMode.isDark(), true);
  assert.strictEqual(env.localStorage.getItem("darkMode"), "true");
});

// 6. Unchecking the checkbox disables dark mode and persists the choice
test("unchecking the checkbox disables dark mode and persists to localStorage", () => {
  const env = createEnv({ storedValue: "true", systemDark: false });
  const DarkMode = loadDarkMode(env);
  const input = createInput(true);
  DarkMode.init(input);

  input.checked = false;
  input._trigger("change");

  assert.strictEqual(DarkMode.isDark(), false);
  assert.strictEqual(env.localStorage.getItem("darkMode"), "false");
});

// 7. enable() / disable() / toggle() work programmatically
test("enable() adds the dark class", () => {
  const env = createEnv();
  const DarkMode = loadDarkMode(env);
  DarkMode.init(null);
  DarkMode.enable();
  assert.strictEqual(DarkMode.isDark(), true);
});

test("disable() removes the dark class", () => {
  const env = createEnv({ storedValue: "true" });
  const DarkMode = loadDarkMode(env);
  DarkMode.init(null);
  DarkMode.disable();
  assert.strictEqual(DarkMode.isDark(), false);
});

test("toggle() switches from light to dark", () => {
  const env = createEnv({ systemDark: false });
  const DarkMode = loadDarkMode(env);
  DarkMode.init(null);
  assert.strictEqual(DarkMode.isDark(), false);
  DarkMode.toggle();
  assert.strictEqual(DarkMode.isDark(), true);
});

test("toggle() switches from dark to light", () => {
  const env = createEnv({ storedValue: "true" });
  const DarkMode = loadDarkMode(env);
  DarkMode.init(null);
  assert.strictEqual(DarkMode.isDark(), true);
  DarkMode.toggle();
  assert.strictEqual(DarkMode.isDark(), false);
});

// 8. darkmodechange custom event is dispatched on checkbox change
test("darkmodechange event is dispatched with correct detail when toggled on", () => {
  const env = createEnv({ systemDark: false });
  const DarkMode = loadDarkMode(env);
  const input = createInput(false);
  DarkMode.init(input);

  let eventDetail = null;
  env.document.addEventListener("darkmodechange", (e) => { eventDetail = e.detail; });

  input.checked = true;
  input._trigger("change");

  assert.deepStrictEqual(eventDetail, { enabled: true });
});

test("darkmodechange event is dispatched with correct detail when toggled off", () => {
  const env = createEnv({ storedValue: "true" });
  const DarkMode = loadDarkMode(env);
  const input = createInput(true);
  DarkMode.init(input);

  let eventDetail = null;
  env.document.addEventListener("darkmodechange", (e) => { eventDetail = e.detail; });

  input.checked = false;
  input._trigger("change");

  assert.deepStrictEqual(eventDetail, { enabled: false });
});

// 9. OS preference change is respected when no manual preference is stored
test("OS prefers-color-scheme change is applied when no stored preference exists", () => {
  const env = createEnv({ systemDark: false });
  const DarkMode = loadDarkMode(env);
  const input = createInput(false);
  DarkMode.init(input);

  assert.strictEqual(DarkMode.isDark(), false);

  // Simulate OS switching to dark
  env.document._fireMediaChange(true);

  assert.strictEqual(DarkMode.isDark(), true);
  assert.strictEqual(input.checked, true);
});

test("OS prefers-color-scheme change is ignored when a manual preference is stored", () => {
  const env = createEnv({ storedValue: "false", systemDark: false });
  const DarkMode = loadDarkMode(env);
  const input = createInput(false);
  DarkMode.init(input);

  // Simulate OS switching to dark — should be ignored because user chose light
  env.document._fireMediaChange(true);

  assert.strictEqual(DarkMode.isDark(), false);
});

// 10. isDark() reflects the current class state
test("isDark() returns false when dark class is absent", () => {
  const env = createEnv({ systemDark: false });
  const DarkMode = loadDarkMode(env);
  DarkMode.init(null);
  assert.strictEqual(DarkMode.isDark(), false);
});

test("isDark() returns true when dark class is present", () => {
  const env = createEnv({ storedValue: "true" });
  const DarkMode = loadDarkMode(env);
  DarkMode.init(null);
  assert.strictEqual(DarkMode.isDark(), true);
});

// ── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
