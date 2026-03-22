/**
 * darkmode.js
 *
 * Manages the dark-mode preference for the application.
 *
 * Behaviour
 * ---------
 * 1. On first visit the user's OS preference (prefers-color-scheme) is used.
 * 2. Once the user explicitly toggles the switch their choice is persisted in
 *    localStorage so it survives page reloads and new tabs on the same origin.
 * 3. Dark mode is applied by adding/removing the class "dark" on <html>.
 *
 * Public API
 * ----------
 *   DarkMode.init(toggleInputEl)   – wire up the checkbox; call once on DOMContentLoaded
 *   DarkMode.enable()              – programmatically enable dark mode
 *   DarkMode.disable()             – programmatically disable dark mode
 *   DarkMode.toggle()              – programmatically toggle dark mode
 *   DarkMode.isDark()              – returns true when dark mode is currently active
 */

const DarkMode = (() => {
  "use strict";

  const STORAGE_KEY = "darkMode";
  const DARK_CLASS  = "dark";

  // ── Internal helpers ────────────────────────────────────────────────────────

  /**
   * Read the persisted preference from localStorage.
   * Returns "true", "false", or null (never set).
   */
  function _getStoredPreference() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      // Private-browsing environments may throw on localStorage access.
      return null;
    }
  }

  /** Persist the current preference. */
  function _setStoredPreference(enabled) {
    try {
      localStorage.setItem(STORAGE_KEY, String(enabled));
    } catch {
      /* ignore */
    }
  }

  /** Return true when the OS prefers dark colour scheme. */
  function _systemPrefersDark() {
    return (
      typeof window !== "undefined" &&
      window.matchMedia != null &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    );
  }

  /** Apply or remove the dark class on <html> and sync the checkbox (if any). */
  function _apply(enabled, inputEl) {
    if (typeof document === "undefined") return;

    if (enabled) {
      document.documentElement.classList.add(DARK_CLASS);
    } else {
      document.documentElement.classList.remove(DARK_CLASS);
    }

    if (inputEl) {
      inputEl.checked = enabled;
      // Update the accessible label text
      const toggle = inputEl.closest(".dark-mode-toggle");
      if (toggle) {
        const label = toggle.querySelector(".dark-mode-toggle__label");
        if (label) {
          label.textContent = enabled ? "Light mode" : "Dark mode";
        }
      }
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  /** Determine initial state and wire the checkbox to future changes. */
  function init(inputEl) {
    const stored = _getStoredPreference();
    const enabled =
      stored !== null ? stored === "true" : _systemPrefersDark();

    _apply(enabled, inputEl);

    if (!inputEl) return;

    inputEl.addEventListener("change", () => {
      const nowEnabled = inputEl.checked;
      _apply(nowEnabled, inputEl);
      _setStoredPreference(nowEnabled);

      // Dispatch a custom event so other parts of the app can react.
      document.dispatchEvent(
        new CustomEvent("darkmodechange", { detail: { enabled: nowEnabled } })
      );
    });

    // Keep in sync when the OS preference changes at runtime (e.g. system
    // switching to night mode) — only when the user has NOT yet set a manual
    // preference.
    if (typeof window !== "undefined" && window.matchMedia) {
      window
        .matchMedia("(prefers-color-scheme: dark)")
        .addEventListener("change", (e) => {
          if (_getStoredPreference() === null) {
            _apply(e.matches, inputEl);
          }
        });
    }
  }

  function enable() {
    _apply(true, _activeInput());
    _setStoredPreference(true);
  }

  function disable() {
    _apply(false, _activeInput());
    _setStoredPreference(false);
  }

  function toggle() {
    isDark() ? disable() : enable();
  }

  function isDark() {
    return (
      typeof document !== "undefined" &&
      document.documentElement.classList.contains(DARK_CLASS)
    );
  }

  /** Find the toggle input currently in the page (if any). */
  function _activeInput() {
    if (typeof document === "undefined") return null;
    return document.getElementById("dark-mode-input");
  }

  return { init, enable, disable, toggle, isDark };
})();

// Auto-initialise when used as a plain <script> tag in a browser.
if (typeof window !== "undefined" && typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("dark-mode-input");
    DarkMode.init(input);
  });
}

// Support CommonJS / Node.js (used by the test suite).
if (typeof module !== "undefined" && module.exports) {
  module.exports = DarkMode;
}
