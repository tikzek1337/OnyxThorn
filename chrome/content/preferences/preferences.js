/**
 * about:preferences controller for OnyxThorn.
 * chrome://onyxthorn/content/preferences/preferences.js
 *
 * Uses the same OnyxThornBridge object as the welcome page.
 */

const Bridge = window.OnyxThornBridge || (() => {
  const KEY = "onyxthorn.devbridge.v1";
  const state = JSON.parse(localStorage.getItem(KEY) || "{}");
  const save = () => localStorage.setItem(KEY, JSON.stringify(state));
  return {
    isPrivileged: false,
    getPref: (n, fb) => (n in state ? state[n] : fb),
    setPref: (n, v) => { state[n] = v; save(); },
    setAccent: c => { state["onyxthorn.theme.accent"] = c; save(); applyAccentToDoc(c); },
    setTheme:  m => { state["onyxthorn.theme.mode"] = m; save(); document.body.dataset.theme = m; },
    setTabsOrientation: o => { state["onyxthorn.tabs.orientation"] = o; save(); },
    makeDefaultBrowser: async () => ({ ok: false, error: "Доступно только из самого OnyxThorn" }),
    chooseDownloadDir:  async () => null,
    chooseAvatar:       async (file) => URL.createObjectURL(file),
    triggerImportFromBrowser: async () => ({ ok: false, error: "Доступно только из самого OnyxThorn" }),
    triggerImportFromCloud:   async () => ({ ok: false, error: "Сначала войди в аккаунт" }),
    checkForUpdate:     async () => ({ ok: true, status: "Установлена последняя версия" }),
    syncSignIn:         async (e, p) => ({ ok: !!(e && p.length >= 8), account: { email: e, nick: e?.split("@")[0] } }),
    syncRegister:       async (e, p) => ({ ok: !!(e && p.length >= 8), account: { email: e, nick: e?.split("@")[0] } }),
    syncNow:            async () => ({ ok: true, when: new Date().toISOString() }),
    backupNow:          async () => ({ ok: true, when: new Date().toISOString(), size: "12.3 MB" }),
    restoreBackup:      async () => ({ ok: true }),
    signOut:            async () => ({ ok: true }),
    updateProfile:      async (p) => ({ ok: true, profile: p }),
    setSyncServer:      async (url) => ({ ok: true, url }),
    listCustomEngines:  () => Bridge.getPref("onyxthorn.search.custom", []) || [],
    addCustomEngine:    (engine) => {
      const arr = Bridge.listCustomEngines();
      arr.push(engine);
      Bridge.setPref("onyxthorn.search.custom", arr);
    },
    removeCustomEngine: (i) => {
      const arr = Bridge.listCustomEngines();
      arr.splice(i, 1);
      Bridge.setPref("onyxthorn.search.custom", arr);
    },
    appVersion: "0.1.0",
    buildId:    "dev",
  };
})();

function applyAccentToDoc(color) {
  document.body.style.setProperty("--accent", color);
}

function gotoPane(name) {
  document.body.dataset.pane = name;
  for (const p of document.querySelectorAll(".pane")) {
    p.classList.toggle("is-active", p.dataset.pane === name);
  }
  for (const n of document.querySelectorAll(".nav")) {
    n.classList.toggle("is-active", n.dataset.pane === name);
  }
  history.replaceState(null, "", "#" + name);
}

function bindPrefCheckbox(id, prefName, opts = {}) {
  const el = document.getElementById(id);
  if (!el) return;
  const current = Bridge.getPref(prefName, opts.default ?? el.checked);
  el.checked = !!current;
  el.addEventListener("change", () => Bridge.setPref(prefName, el.checked));
}
function bindPrefValue(id, prefName, opts = {}) {
  const el = document.getElementById(id);
  if (!el) return;
  const current = Bridge.getPref(prefName, opts.default ?? el.value);
  el.value = current;
  el.addEventListener("change", () => {
    let v = el.value;
    if (el.type === "number") v = Number(v);
    Bridge.setPref(prefName, v);
    opts.onchange?.(v);
  });
}
function bindRadioGroup(name, prefName, opts = {}) {
  const radios = document.querySelectorAll(`input[name="${name}"]`);
  const current = Bridge.getPref(prefName, opts.default);
  if (current) {
    for (const r of radios) r.checked = r.value === current;
  }
  for (const r of radios) {
    r.addEventListener("change", () => {
      if (r.checked) {
        Bridge.setPref(prefName, r.value);
        opts.onchange?.(r.value);
      }
    });
  }
}

function setupNav() {
  for (const n of document.querySelectorAll(".nav")) {
    n.addEventListener("click", (e) => {
      e.preventDefault();
      gotoPane(n.dataset.pane);
    });
  }
  const initial = location.hash.replace("#", "") || "general";
  gotoPane(initial);
}

function setupGeneral() {
  // Accent
  bindPrefValue("pref-accent", "onyxthorn.theme.accent", {
    onchange: c => Bridge.setAccent(c),
  });
  applyAccentToDoc(Bridge.getPref("onyxthorn.theme.accent", "#8B2BE2"));

  bindRadioGroup("tabs-orient", "onyxthorn.tabs.orientation", {
    onchange: o => Bridge.setTabsOrientation(o),
  });
  bindRadioGroup("theme-mode", "onyxthorn.theme.mode", {
    onchange: m => Bridge.setTheme(m),
  });

  bindPrefValue("pref-font",       "onyxthorn.font.family", { default: "Times New Roman" });
  bindPrefValue("pref-font-size",  "onyxthorn.font.size",   { default: 16 });
  bindPrefValue("pref-language",   "onyxthorn.ui.language", { default: "ru" });
  bindPrefValue("pref-download-dir", "browser.download.dir", { default: "C:\\onyxthorn\\downloads" });
  bindPrefCheckbox("pref-ask-download", "browser.download.useDownloadDir", { default: true });
  // Note: useDownloadDir=true means *don't* ask. We invert in the bridge but keep UX simple here.

  // Zoom
  let zoom = Math.round((Bridge.getPref("onyxthorn.zoom.default", 1) * 100));
  const zoomVal = document.getElementById("zoom-val");
  const setZoom = (v) => {
    zoom = Math.max(50, Math.min(300, v));
    zoomVal.textContent = zoom + "%";
    Bridge.setPref("onyxthorn.zoom.default", zoom / 100);
  };
  setZoom(zoom);
  document.getElementById("zoom-minus").addEventListener("click", () => setZoom(zoom - 10));
  document.getElementById("zoom-plus") .addEventListener("click", () => setZoom(zoom + 10));
  document.getElementById("zoom-reset").addEventListener("click", () => setZoom(100));

  // Folder picker
  document.getElementById("browse-download-dir").addEventListener("click", async () => {
    const dir = await Bridge.chooseDownloadDir();
    if (dir) {
      document.getElementById("pref-download-dir").value = dir;
      Bridge.setPref("browser.download.dir", dir);
    }
  });

  document.getElementById("make-default").addEventListener("click", async () => {
    const r = await Bridge.makeDefaultBrowser();
    alert(r.ok ? "OnyxThorn теперь основной браузер!" : (r.error || "Не удалось"));
  });
  document.getElementById("import-other").addEventListener("click", async () => {
    const r = await Bridge.triggerImportFromBrowser();
    if (!r.ok) alert(r.error || "Не удалось");
  });
  document.getElementById("import-cloud").addEventListener("click", async () => {
    const r = await Bridge.triggerImportFromCloud();
    if (!r.ok) alert(r.error || "Не удалось");
  });

  // Version + update
  const versionString = `OnyxThorn ${Bridge.appVersion} (build ${Bridge.buildId})`;
  document.getElementById("version-string").textContent = versionString;
  document.getElementById("app-version").textContent = Bridge.appVersion;

  const update = async () => {
    const status = document.getElementById("update-status");
    status.textContent = "Проверка…";
    const r = await Bridge.checkForUpdate();
    status.textContent = r.status || (r.ok ? "Готово" : "Ошибка");
  };
  document.getElementById("check-update").addEventListener("click", update);
  document.getElementById("check-update-2").addEventListener("click", update);
}

function setupHome() {
  bindPrefValue("pref-homepage-mode", "browser.homepage.mode", {
    default: "onyxthorn",
    onchange: mode => {
      document.getElementById("pref-homepage-url-row").hidden = mode !== "custom";
    },
  });
  bindPrefValue("pref-homepage-url",  "browser.homepage.url");
  bindPrefValue("pref-newtab-mode",   "browser.newtab.mode", { default: "onyxthorn" });
  bindPrefCheckbox("pref-newtab-bookmarks", "onyxthorn.newtab.bookmarks", { default: true });
  bindPrefCheckbox("pref-newtab-search",    "onyxthorn.newtab.search",    { default: true });

  // Trigger initial visibility
  const mode = Bridge.getPref("browser.homepage.mode", "onyxthorn");
  document.getElementById("pref-homepage-url-row").hidden = mode !== "custom";
}

function setupSearch() {
  bindPrefValue("pref-search-engine", "browser.search.defaultenginename", { default: "duckduckgo" });
  bindPrefCheckbox("pref-search-suggest", "browser.search.suggest.enabled", { default: false });
  bindPrefCheckbox("pref-search-bar",     "browser.urlbar.suggest.searches", { default: true });

  const tbody = document.getElementById("custom-engines-list");
  const render = () => {
    tbody.innerHTML = "";
    for (const [i, e] of Bridge.listCustomEngines().entries()) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${escapeHtml(e.name)}</td><td><code>${escapeHtml(e.url)}</code></td><td><code>${escapeHtml(e.alias || "")}</code></td><td><button class="link" data-i="${i}">Удалить</button></td>`;
      tbody.appendChild(tr);
    }
    for (const btn of tbody.querySelectorAll("button[data-i]")) {
      btn.addEventListener("click", () => { Bridge.removeCustomEngine(Number(btn.dataset.i)); render(); });
    }
  };
  render();

  document.getElementById("add-engine").addEventListener("click", () => {
    const name = prompt("Название");
    if (!name) return;
    const url = prompt("URL с %s для запроса (например https://example.com/search?q=%s)");
    if (!url) return;
    const alias = prompt("Алиас (необязательно)", "");
    Bridge.addCustomEngine({ name, url, alias: alias || "" });
    render();
  });
}

function setupPrivacy() {
  bindRadioGroup("tp-level",        "privacy.trackingprotection.level", { default: "strict" });
  bindPrefCheckbox("pref-block-crypto",      "privacy.trackingprotection.cryptomining.enabled");
  bindPrefCheckbox("pref-block-fingerprint", "privacy.trackingprotection.fingerprinting.enabled");
  bindPrefCheckbox("pref-block-social",      "privacy.trackingprotection.socialtracking.enabled");
  bindPrefCheckbox("pref-block-3pcookies",   "network.cookie.cookieBehavior5", { default: true });

  bindPrefCheckbox("pref-rfp",        "privacy.resistFingerprinting");
  bindPrefCheckbox("pref-fpi",        "privacy.firstparty.isolate");
  bindPrefCheckbox("pref-https-only", "dom.security.https_only_mode", { default: true });
  bindPrefCheckbox("pref-dnt",        "privacy.donottrackheader.enabled", { default: true });
  bindPrefCheckbox("pref-gpc",        "privacy.globalprivacycontrol.enabled", { default: true });
  bindPrefCheckbox("pref-webrtc-leak","media.peerconnection.ice.no_host", { default: false });
  bindPrefValue   ("pref-doh",        "network.trr.mode", { default: "cf" });

  bindPrefValue   ("pref-history-mode", "places.history.expiration.mode", { default: "remember" });
  bindPrefCheckbox("pref-clear-on-exit", "privacy.sanitize.sanitizeOnShutdown");

  bindPrefCheckbox("pref-popups",      "dom.disable_open_during_load", { default: true });
  bindPrefCheckbox("pref-safebrowsing","browser.safebrowsing.malware.enabled", { default: true });
  bindPrefCheckbox("pref-dl-warn",     "browser.safebrowsing.downloads.enabled", { default: true });
}

function setupSync() {
  const signedOut = document.getElementById("sync-signedout");
  const signedIn  = document.getElementById("sync-signedin");
  const updateUI  = () => {
    const isIn = Bridge.getPref("onyxthorn.sync.signed-in", false);
    signedOut.hidden = isIn;
    signedIn.hidden  = !isIn;
    if (isIn) {
      document.getElementById("profile-email").value = Bridge.getPref("onyxthorn.sync.account-email", "");
      document.getElementById("profile-nick").value  = Bridge.getPref("onyxthorn.sync.account-nick", "");
      document.getElementById("sync-server").textContent = Bridge.getPref("onyxthorn.sync.server", "https://sync.onyxthorn.example");
      const last = Bridge.getPref("onyxthorn.sync.lastrun", null);
      document.getElementById("sync-last").textContent = last
        ? "Последняя синхронизация: " + new Date(last).toLocaleString()
        : "Последняя синхронизация: никогда";
    }
  };
  updateUI();

  bindPrefCheckbox("sync-bookmarks", "onyxthorn.sync.collections.bookmarks", { default: true });
  bindPrefCheckbox("sync-history",   "onyxthorn.sync.collections.history",   { default: true });
  bindPrefCheckbox("sync-passwords", "onyxthorn.sync.collections.passwords", { default: true });
  bindPrefCheckbox("sync-settings",  "onyxthorn.sync.collections.settings",  { default: true });
  bindPrefCheckbox("sync-tabs",      "onyxthorn.sync.collections.tabs",      { default: false });
  bindPrefCheckbox("sync-addons",    "onyxthorn.sync.collections.addons",    { default: false });

  const openModal = () => {
    document.getElementById("signin-err").hidden = true;
    document.getElementById("signin-modal").showModal();
  };
  document.getElementById("sync-signin").addEventListener("click", openModal);
  document.getElementById("sync-register").addEventListener("click", openModal);
  document.getElementById("signin-close").addEventListener("click",
    () => document.getElementById("signin-modal").close());
  document.querySelector("#signin-modal form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target;
    const r = await Bridge.syncSignIn(f.email.value.trim(), f.password.value);
    if (!r.ok) {
      const err = document.getElementById("signin-err");
      err.textContent = r.error || "Не удалось войти";
      err.hidden = false;
      return;
    }
    Bridge.setPref("onyxthorn.sync.signed-in", true);
    Bridge.setPref("onyxthorn.sync.account-email", r.account.email);
    Bridge.setPref("onyxthorn.sync.account-nick",  r.account.nick || "");
    document.getElementById("signin-modal").close();
    updateUI();
  });
  document.getElementById("modal-register").addEventListener("click", async () => {
    const f = document.querySelector("#signin-modal form");
    const r = await Bridge.syncRegister(f.email.value.trim(), f.password.value);
    if (!r.ok) {
      const err = document.getElementById("signin-err");
      err.textContent = r.error || "Не удалось создать аккаунт";
      err.hidden = false;
      return;
    }
    Bridge.setPref("onyxthorn.sync.signed-in", true);
    Bridge.setPref("onyxthorn.sync.account-email", r.account.email);
    Bridge.setPref("onyxthorn.sync.account-nick", r.account.nick || "");
    document.getElementById("signin-modal").close();
    updateUI();
  });

  document.getElementById("sign-out").addEventListener("click", async () => {
    if (!confirm("Выйти из OnyxThorn? Локальные данные останутся.")) return;
    await Bridge.signOut();
    Bridge.setPref("onyxthorn.sync.signed-in", false);
    updateUI();
  });

  document.getElementById("sync-now").addEventListener("click", async () => {
    const btn = document.getElementById("sync-now");
    btn.disabled = true;
    btn.textContent = "Синхронизация…";
    try {
      const r = await Bridge.syncNow();
      Bridge.setPref("onyxthorn.sync.lastrun", r.when);
      updateUI();
    } catch (e) {
      alert("Ошибка синхронизации: " + (e?.message || e));
    } finally {
      btn.disabled = false;
      btn.textContent = "Синхронизировать сейчас";
    }
  });

  document.getElementById("backup-now").addEventListener("click", async () => {
    const r = await Bridge.backupNow();
    alert(r.ok ? `Резервная копия создана (${r.size})` : "Не удалось");
  });
  document.getElementById("restore-backup").addEventListener("click", async () => {
    if (!confirm("Восстановить профиль из последней резервной копии? Текущие локальные данные будут перезаписаны.")) return;
    const r = await Bridge.restoreBackup();
    alert(r.ok ? "Восстановлено" : "Не удалось");
  });

  document.getElementById("change-password").addEventListener("click", () => {
    alert("Откройся диалог смены пароля — реализация в about:sync-password");
  });
  document.getElementById("change-server").addEventListener("click", async () => {
    const url = prompt("Адрес твоего sync-сервера", Bridge.getPref("onyxthorn.sync.server", "https://sync.onyxthorn.example"));
    if (!url) return;
    if (!/^https:\/\/.+/.test(url)) { alert("Должен быть HTTPS"); return; }
    await Bridge.setSyncServer(url);
    Bridge.setPref("onyxthorn.sync.server", url);
    updateUI();
  });

  document.getElementById("avatar-file").addEventListener("change", async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const u = await Bridge.chooseAvatar(f);
    if (u) document.getElementById("avatar-img").src = u;
  });

  document.getElementById("profile-nick").addEventListener("change", () => {
    Bridge.setPref("onyxthorn.sync.account-nick", document.getElementById("profile-nick").value);
  });
  document.getElementById("profile-email").addEventListener("change", () => {
    Bridge.setPref("onyxthorn.sync.account-email", document.getElementById("profile-email").value);
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>'"]/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;",
  }[c]));
}

function bootPreferences() {
  setupNav();
  setupGeneral();
  setupHome();
  setupSearch();
  setupPrivacy();
  setupSync();

  // Apply theme/accent from prefs at boot
  const mode = Bridge.getPref("onyxthorn.theme.mode", "auto");
  document.body.dataset.theme = mode;
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootPreferences);
} else {
  bootPreferences();
}
