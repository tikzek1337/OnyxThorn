/*
 * OnyxThorn → page bridge.
 *
 * Loaded into every chrome://onyxthorn/content/* page from
 * browser.xhtml's <script src> hook (added by patch
 * 0006-onyxthorn-load-bridge.patch). It exposes a privileged
 * `window.OnyxThornBridge` that the page scripts use, hiding the
 * difference between "real" Firefox APIs and the dev-mode
 * localStorage fallback.
 *
 * In page context this file *must* be loaded as a chrome script
 * (Components.utils.* are available). In dev-mode the file is loaded
 * as a normal <script>; the `Components` check then makes it fall
 * back to localStorage.
 */

(function () {
  "use strict";

  const havePrivileged = (typeof Components !== "undefined")
                      && ("classes" in Components)
                      && (typeof Services !== "undefined");

  if (!havePrivileged) {
    // Dev / preview fallback. The page scripts have their own fallback
    // too — this just makes sure a real bridge is _attempted_ first.
    return;
  }

  const { AppConstants } = ChromeUtils.importESModule("resource://gre/modules/AppConstants.sys.mjs");
  const { DownloadsCommon } = ChromeUtils.importESModule("resource:///modules/DownloadsCommon.sys.mjs");
  const { Downloads } = ChromeUtils.importESModule("resource://gre/modules/Downloads.sys.mjs");
  const { OS } = ChromeUtils.importESModule("resource://gre/modules/osfile.sys.mjs");
  const { OnyxThornSync } = ChromeUtils.importESModule("resource:///modules/OnyxThornSync.sys.mjs");
  const { OnyxThornUpdater } = ChromeUtils.importESModule("resource:///modules/OnyxThornUpdater.sys.mjs");

  const Bridge = {
    isPrivileged: true,
    appVersion: AppConstants.MOZ_APP_VERSION_DISPLAY,
    buildId: AppConstants.MOZ_BUILDID,

    getPref(name, fallback) {
      const t = Services.prefs.getPrefType(name);
      switch (t) {
        case Services.prefs.PREF_BOOL:   return Services.prefs.getBoolPref(name, fallback);
        case Services.prefs.PREF_INT:    return Services.prefs.getIntPref(name, fallback);
        case Services.prefs.PREF_STRING: return Services.prefs.getStringPref(name, fallback);
        default:
          if (typeof fallback === "boolean") return Services.prefs.getBoolPref(name, fallback);
          if (typeof fallback === "number")  return Services.prefs.getIntPref(name, fallback);
          return Services.prefs.getStringPref(name, fallback ?? "");
      }
    },
    setPref(name, value) {
      switch (typeof value) {
        case "boolean": Services.prefs.setBoolPref(name, value); break;
        case "number":
          if (Number.isInteger(value)) Services.prefs.setIntPref(name, value);
          else                          Services.prefs.setStringPref(name, String(value));
          break;
        case "string":  Services.prefs.setStringPref(name, value); break;
        default:        Services.prefs.setStringPref(name, JSON.stringify(value));
      }
    },

    setLocale(lang) {
      try { Services.locale.requestedLocales = [lang]; } catch (e) {}
      Bridge.setPref("intl.locale.requested", lang);
      Bridge.setPref("onyxthorn.ui.language", lang);
    },
    setAccent(color) {
      Bridge.setPref("onyxthorn.theme.accent", color);
      Services.obs.notifyObservers(null, "onyxthorn:theme-changed", color);
    },
    setTheme(mode) {
      Bridge.setPref("onyxthorn.theme.mode", mode);
      Services.obs.notifyObservers(null, "onyxthorn:theme-changed", mode);
    },
    setTabsOrientation(o) {
      Bridge.setPref("onyxthorn.tabs.orientation", o);
      Services.obs.notifyObservers(null, "onyxthorn:tabs-orientation", o);
    },

    finishWelcome() {
      Bridge.setPref("onyxthorn.welcome.completed", true);
    },
    openHome() {
      const win = Services.wm.getMostRecentWindow("navigator:browser");
      if (!win) return;
      win.openTrustedLinkIn("chrome://onyxthorn/content/home/home.html", "current");
    },
    navigate(url) {
      const win = Services.wm.getMostRecentWindow("navigator:browser");
      if (!win) { window.location.href = url; return; }
      win.openTrustedLinkIn(url, "current");
    },
    resolveSearchURL(q) {
      const engine = Services.search.defaultEngine;
      if (!engine) return "https://duckduckgo.com/?q=" + encodeURIComponent(q);
      const submission = engine.getSubmission(q);
      return submission?.uri?.spec || "https://duckduckgo.com/?q=" + encodeURIComponent(q);
    },

    async makeDefaultBrowser() {
      try {
        const shellSvc = Cc["@mozilla.org/browser/shell-service;1"].getService(Ci.nsIShellService);
        shellSvc.setDefaultBrowser(false);
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e?.message || String(e) };
      }
    },
    async chooseDownloadDir() {
      const fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
      const win = Services.wm.getMostRecentWindow("navigator:browser");
      fp.init(win, "Папка для загрузок", Ci.nsIFilePicker.modeGetFolder);
      return await new Promise(resolve => fp.open(rv => {
        if (rv === Ci.nsIFilePicker.returnOK && fp.file) resolve(fp.file.path);
        else resolve(null);
      }));
    },
    async chooseAvatar(file) {
      const profileDir = Services.dirsvc.get("ProfD", Ci.nsIFile).path;
      const avatarPath = OS.Path.join(profileDir, "onyxthorn-avatar.png");
      // file is a File object from the page; we read it.
      const buf = new Uint8Array(await file.arrayBuffer());
      await OS.File.writeAtomic(avatarPath, buf);
      return "file://" + avatarPath;
    },

    async triggerImportFromBrowser() {
      const { MigrationUtils } = ChromeUtils.importESModule("resource:///modules/MigrationUtils.sys.mjs");
      MigrationUtils.showMigrationWizard(window, { entrypoint: MigrationUtils.MIGRATION_ENTRYPOINT_PREFERENCES });
      return { ok: true };
    },
    async triggerImportFromCloud() {
      return OnyxThornSync.importProfile();
    },

    async checkForUpdate() {
      const r = await OnyxThornUpdater.checkForUpdate();
      return r;
    },

    // Sync API ─ thin wrappers
    syncSignIn:     (email, password)  => OnyxThornSync.signIn(email, password),
    syncRegister:   (email, password)  => OnyxThornSync.register(email, password),
    syncNow:        () => OnyxThornSync.syncNow(),
    backupNow:      () => OnyxThornSync.backupNow(),
    restoreBackup:  () => OnyxThornSync.restoreBackup(),
    signOut:        () => OnyxThornSync.signOut(),
    updateProfile:  (p) => OnyxThornSync.updateProfile(p),
    setSyncServer:  (url) => OnyxThornSync.setServer(url),

    listCustomEngines() {
      try { return JSON.parse(Services.prefs.getStringPref("onyxthorn.search.custom", "[]")); }
      catch { return []; }
    },
    addCustomEngine(e) {
      const arr = Bridge.listCustomEngines();
      arr.push(e);
      Services.prefs.setStringPref("onyxthorn.search.custom", JSON.stringify(arr));
    },
    removeCustomEngine(i) {
      const arr = Bridge.listCustomEngines();
      arr.splice(i, 1);
      Services.prefs.setStringPref("onyxthorn.search.custom", JSON.stringify(arr));
    },

    getSyncServerUrl: () => Services.prefs.getStringPref("onyxthorn.sync.server", "https://sync.onyxthorn.example"),
  };

  window.wrappedJSObject = window.wrappedJSObject || window;
  window.wrappedJSObject.OnyxThornBridge = Cu.cloneInto(Bridge, window, { cloneFunctions: true });
})();
