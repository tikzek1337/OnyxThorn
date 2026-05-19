/*
 * OnyxThornUpdater.sys.mjs
 *
 * Thin wrapper around the Mozilla update service that points at OnyxThorn's
 * release infrastructure (defined in branding/pref/firefox-branding.js).
 * Installed at services/onyxthorn/OnyxThornUpdater.sys.mjs.
 */

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  Services: "resource://gre/modules/Services.sys.mjs",
});

class _Updater {
  async checkForUpdate() {
    try {
      const url = Services.prefs.getStringPref("app.update.url", "");
      if (!url) return { ok: true, status: "Сервер обновлений не настроен" };
      const r = await fetch(url, { method: "GET" });
      if (!r.ok) return { ok: false, error: `HTTP ${r.status}` };
      const data = await r.json().catch(() => ({}));
      if (data.update?.version) {
        return { ok: true, status: `Доступна версия ${data.update.version}` };
      }
      return { ok: true, status: "Установлена последняя версия" };
    } catch (e) {
      return { ok: false, error: e?.message || String(e) };
    }
  }
}

export const OnyxThornUpdater = new _Updater();
