/**
 * OnyxThorn welcome flow controller.
 *
 * Lives at chrome://onyxthorn/content/welcome/welcome.js
 *
 * Talks to the host browser via `window.OnyxThornBridge`, which is injected
 * by `chrome/overlay/welcome-bridge.js` (a chrome-script that has access to
 * about:config prefs and Services.* APIs). When run outside a privileged
 * context (e.g. when the page is opened in another browser for development),
 * the bridge falls back to localStorage so the UI is still fully testable.
 */

const Bridge = (function () {
  if (window.OnyxThornBridge) return window.OnyxThornBridge;
  const KEY = "onyxthorn.devbridge.v1";
  const state = JSON.parse(localStorage.getItem(KEY) || "{}");
  const save = () => localStorage.setItem(KEY, JSON.stringify(state));
  return {
    isPrivileged: false,
    getPref: (name, fallback) => (name in state ? state[name] : fallback),
    setPref: (name, value) => { state[name] = value; save(); },
    setLocale: (lang) => { state["onyxthorn.ui.language"] = lang; save(); },
    setAccent: (color) => { state["onyxthorn.theme.accent"] = color; save(); },
    setTheme: (mode) => { state["onyxthorn.theme.mode"] = mode; save(); },
    setTabsOrientation: (o) => { state["onyxthorn.tabs.orientation"] = o; save(); },
    finishWelcome: () => { state["onyxthorn.welcome.completed"] = true; save(); },
    openHome: () => { /* dev fallback */ window.location.href = "about:blank"; },
    syncSignIn: async (email, password) => {
      // dev fallback — always succeeds against a fake account.
      if (email && password.length >= 8) return { ok: true, account: { email } };
      return { ok: false, error: "Неверный email или пароль" };
    },
    syncRegister: async (email, password) => {
      if (email && password.length >= 8) return { ok: true, account: { email } };
      return { ok: false, error: "Не удалось создать аккаунт" };
    },
    getSyncServerUrl: () => state["onyxthorn.sync.server"] || "https://sync.onyxthorn.example",
  };
})();

const STRINGS = {
  ru: {
    "brand.name": "OnyxThorn",
    "brand.tag": "Чистый и минималистичный браузер",
    "progress.welcome": "Приветствие",
    "progress.theme": "Тема",
    "progress.accent": "Цвет",
    "progress.features": "Функции",
    "progress.layout": "Вкладки",
    "progress.account": "Аккаунт",

    "step1.title": "Добро пожаловать в OnyxThorn",
    "step1.lede":  "Чистый и минималистичный браузер, заточенный под анонимность и удобство. Несколько шагов — и он станет точно таким, как тебе нравится.",
    "step1.card1.title": "Анонимность",
    "step1.card1.text":  "DuckDuckGo по умолчанию, защита от трекинга и отпечатков пальцев, нулевой телеметрический трафик.",
    "step1.card2.title": "Минимализм",
    "step1.card2.text":  "Только то, что нужно. Никаких Pocket, Mozilla VPN или рекламы в новой вкладке.",
    "step1.card3.title": "Удобство",
    "step1.card3.text":  "Горизонтальные или вертикальные вкладки, кастомный акцент, темная/светлая тема, RU/EN.",

    "step2.title": "Выбери тему",
    "step2.lede":  "Это можно изменить в любой момент в Настройках → Основные.",
    "step2.light": "Светлая",
    "step2.auto":  "Системная",
    "step2.dark":  "Тёмная",

    "step3.title": "Выбери акцентный цвет",
    "step3.lede":  "Этот цвет будет использоваться для кнопок, ссылок и активных вкладок.",
    "step3.custom":"Или свой:",

    "step4.title": "Какие функции включить?",
    "step4.lede":  "По умолчанию OnyxThorn максимально приватный. Здесь можно ослабить или усилить настройки.",
    "step4.tp.title": "Усиленная защита от трекинга",
    "step4.tp.text":  "Блокирует сторонние трекеры, криптомайнеры и сборщиков отпечатков.",
    "step4.fp.title": "Защита от снятия отпечатка",
    "step4.fp.text":  "Подгоняет canvas, шрифты и таймеры. Может ломать редкие сайты — поэтому опционально.",
    "step4.fpi.title":"Изоляция первого партнёра (FPI)",
    "step4.fpi.text": "Cookie и кеш привязаны к домену вкладки. Очень сильная защита, ломает редкие сайты с SSO.",
    "step4.https.title":"HTTPS-Only во всех окнах",
    "step4.https.text": "Принудительно использует HTTPS, спрашивает разрешение при HTTP-сайтах.",
    "step4.dnt.title":"Do Not Track",
    "step4.dnt.text": "Отправляет сайтам сигнал «не отслеживать меня».",

    "step5.title":"Как ты любишь вкладки?",
    "step5.lede": "Можно поменять в Настройках → Основные → Кастомизация.",
    "step5.horizontal":"Горизонтальные",
    "step5.vertical":  "Вертикальные",

    "step6.title": "Аккаунт OnyxThorn",
    "step6.lede":  "Аккаунт нужен только для синхронизации между устройствами. Без него браузер работает полностью локально.",
    "step6.skip":  "Не входить — продолжить как есть",
    "step6.signin":"Войти в OnyxThorn",
    "step6.or":    "или",
    "step6.tip.title": "Что будет синхронизироваться",
    "step6.tip.text":  "Полная синхронизация: настройки, закладки, история, пароли (с E2E-шифрованием), открытые вкладки и резервная копия профиля. Данные уходят на твой сервер:",
    "step6.tip.foot":  "Синхронизация запускается только когда ты сам нажмёшь «Синхронизировать сейчас» в настройках.",

    "signin.title":   "Войти в OnyxThorn",
    "signin.email":   "Email",
    "signin.password":"Пароль",
    "signin.submit":  "Войти",
    "signin.register":"Создать аккаунт",

    "nav.back":   "Назад",
    "nav.next":   "Продолжить",
    "nav.finish": "Готово",
  },
  en: {
    "brand.name":"OnyxThorn",
    "brand.tag": "A clean & minimalist browser",
    "progress.welcome":"Welcome",
    "progress.theme":  "Theme",
    "progress.accent": "Accent",
    "progress.features":"Features",
    "progress.layout": "Tabs",
    "progress.account":"Account",

    "step1.title":"Welcome to OnyxThorn",
    "step1.lede": "A clean & minimalist browser focused on anonymity and convenience. A few steps and it'll feel exactly the way you like.",
    "step1.card1.title":"Anonymity",
    "step1.card1.text": "DuckDuckGo by default, tracking & fingerprint protection, zero telemetry traffic.",
    "step1.card2.title":"Minimalism",
    "step1.card2.text": "Only what you need. No Pocket, Mozilla VPN, or ads on new tab.",
    "step1.card3.title":"Convenience",
    "step1.card3.text": "Horizontal or vertical tabs, custom accent, light/dark theme, RU/EN.",

    "step2.title":"Pick a theme",
    "step2.lede": "You can change it anytime under Settings → General.",
    "step2.light":"Light",
    "step2.auto": "System",
    "step2.dark": "Dark",

    "step3.title":"Pick an accent colour",
    "step3.lede": "Used for buttons, links and the active tab indicator.",
    "step3.custom":"Custom:",

    "step4.title":"Which features to turn on?",
    "step4.lede": "OnyxThorn is private by default. Loosen or strengthen the settings below.",
    "step4.tp.title":"Strict tracking protection",
    "step4.tp.text": "Blocks 3rd-party trackers, cryptominers and fingerprinters.",
    "step4.fp.title":"Fingerprint resistance",
    "step4.fp.text": "Normalises canvas, fonts and timers. May break a few sites — optional.",
    "step4.fpi.title":"First-Party Isolation",
    "step4.fpi.text": "Cookies and cache scoped to the tab's domain. Very strong — breaks some SSO sites.",
    "step4.https.title":"HTTPS-Only mode",
    "step4.https.text": "Forces HTTPS and prompts before downgrading to HTTP.",
    "step4.dnt.title":"Do Not Track",
    "step4.dnt.text": "Sends the DNT signal to sites you visit.",

    "step5.title":"How do you like your tabs?",
    "step5.lede": "Change anytime under Settings → General → Customization.",
    "step5.horizontal":"Horizontal",
    "step5.vertical":  "Vertical",

    "step6.title":"OnyxThorn Account",
    "step6.lede": "An account is only needed to sync across devices. Without one, the browser is fully local.",
    "step6.skip": "Don't sign in — keep going",
    "step6.signin":"Sign in to OnyxThorn",
    "step6.or":   "or",
    "step6.tip.title":"What will be synchronised",
    "step6.tip.text": "Full sync: settings, bookmarks, history, passwords (end-to-end encrypted), open tabs and a profile backup. Data goes to your server:",
    "step6.tip.foot": "Sync only fires when you press \"Sync now\" in settings.",

    "signin.title":"Sign in to OnyxThorn",
    "signin.email":"Email",
    "signin.password":"Password",
    "signin.submit":"Sign in",
    "signin.register":"Create account",

    "nav.back":"Back",
    "nav.next":"Continue",
    "nav.finish":"Done",
  },
};

const STEP_COUNT = 6;
let state = {
  step: 1,
  lang: Bridge.getPref("onyxthorn.ui.language", "ru"),
  theme: Bridge.getPref("onyxthorn.theme.mode", "auto"),
  accent: Bridge.getPref("onyxthorn.theme.accent", "#8B2BE2"),
  layout: Bridge.getPref("onyxthorn.tabs.orientation", "horizontal"),
  prefs: {},
};

function applyLocale(lang) {
  state.lang = lang;
  document.documentElement.lang = lang;
  for (const el of document.querySelectorAll("[data-i18n]")) {
    const key = el.dataset.i18n;
    if (STRINGS[lang][key]) el.textContent = STRINGS[lang][key];
  }
  for (const btn of document.querySelectorAll(".lang__btn")) {
    btn.setAttribute("aria-pressed", btn.dataset.lang === lang ? "true" : "false");
  }
  Bridge.setLocale(lang);
}

function applyAccent(color) {
  state.accent = color;
  document.body.style.setProperty("--accent", color);
  document.body.dataset.accent = color;
  document.getElementById("accent-code").textContent = color;
  Bridge.setAccent(color);
}

function applyTheme(mode) {
  state.theme = mode;
  document.body.dataset.theme = mode;
  Bridge.setTheme(mode);
}

function applyLayout(layout) {
  state.layout = layout;
  Bridge.setTabsOrientation(layout);
}

function gotoStep(step) {
  step = Math.max(1, Math.min(STEP_COUNT, step));
  state.step = step;
  document.body.dataset.step = step;
  Bridge.setPref("onyxthorn.welcome.last-step", step);

  for (const s of document.querySelectorAll(".step")) {
    s.classList.toggle("is-active", Number(s.dataset.step) === step);
  }
  for (const p of document.querySelectorAll(".progress__step")) {
    const n = Number(p.dataset.step);
    p.classList.toggle("is-active", n === step);
    p.classList.toggle("is-done",   n  <  step);
  }
  document.getElementById("step-now").textContent = step;
  document.getElementById("back").hidden = step === 1;
  document.getElementById("next").hidden = step === STEP_COUNT;
  document.getElementById("finish").hidden = step !== STEP_COUNT;
}

function init() {
  applyLocale(state.lang);
  applyAccent(state.accent);
  applyTheme(state.theme);

  // Language
  for (const btn of document.querySelectorAll(".lang__btn")) {
    btn.addEventListener("click", () => applyLocale(btn.dataset.lang));
  }

  // Theme cards
  for (const card of document.querySelectorAll(".theme-card")) {
    card.addEventListener("click", () => {
      for (const c of document.querySelectorAll(".theme-card")) c.classList.remove("is-selected");
      card.classList.add("is-selected");
      card.querySelector("input").checked = true;
      applyTheme(card.dataset.value);
    });
  }

  // Accent swatches
  for (const sw of document.querySelectorAll(".sw input")) {
    sw.addEventListener("change", () => {
      applyAccent(sw.value);
      document.getElementById("accent-custom").value = sw.value;
    });
  }
  document.getElementById("accent-custom").addEventListener("input", (e) => {
    applyAccent(e.target.value);
    for (const r of document.querySelectorAll(".sw input")) r.checked = false;
  });

  // Features
  for (const fx of document.querySelectorAll(".feature [data-pref]")) {
    fx.addEventListener("change", () => {
      Bridge.setPref(fx.dataset.pref, fx.checked);
      state.prefs[fx.dataset.pref] = fx.checked;
    });
    // initialise from prefs
    fx.checked = Bridge.getPref(fx.dataset.pref, fx.checked);
  }

  // Layout
  for (const card of document.querySelectorAll(".layout-card")) {
    card.addEventListener("click", () => {
      for (const c of document.querySelectorAll(".layout-card")) c.classList.remove("is-selected");
      card.classList.add("is-selected");
      card.querySelector("input").checked = true;
      applyLayout(card.dataset.value);
    });
  }

  // Navigation
  document.getElementById("back").addEventListener("click",   () => gotoStep(state.step - 1));
  document.getElementById("next").addEventListener("click",   () => gotoStep(state.step + 1));
  document.getElementById("finish").addEventListener("click", finish);

  // Sync URL in tip
  document.getElementById("sync-server-url").textContent = Bridge.getSyncServerUrl();

  // Account actions (step 6)
  document.getElementById("account-skip").addEventListener("click", () => finish({ skipSignIn: true }));
  document.getElementById("account-signin").addEventListener("click", openSignIn);

  // Sign-in modal
  const modal = document.getElementById("signin-modal");
  document.getElementById("signin-close").addEventListener("click", () => modal.close());
  modal.querySelector("form").addEventListener("submit", onSignInSubmit);
  document.getElementById("signin-register").addEventListener("click", onRegister);
}

function openSignIn() {
  document.getElementById("signin-err").hidden = true;
  document.getElementById("signin-modal").showModal();
}

async function onSignInSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const email = form.email.value.trim();
  const password = form.password.value;
  const err = document.getElementById("signin-err");
  err.hidden = true;

  const result = await Bridge.syncSignIn(email, password);
  if (!result.ok) {
    err.textContent = result.error || "Не удалось войти";
    err.hidden = false;
    return;
  }
  document.getElementById("signin-modal").close();
  finish({ signedIn: true, account: result.account });
}

async function onRegister() {
  const form = document.querySelector("#signin-modal form");
  const email = form.email.value.trim();
  const password = form.password.value;
  const err = document.getElementById("signin-err");
  err.hidden = true;
  if (!email || password.length < 8) {
    err.textContent = "Введи email и пароль не короче 8 символов";
    err.hidden = false;
    return;
  }
  const result = await Bridge.syncRegister(email, password);
  if (!result.ok) {
    err.textContent = result.error || "Не удалось создать аккаунт";
    err.hidden = false;
    return;
  }
  document.getElementById("signin-modal").close();
  finish({ signedIn: true, account: result.account });
}

function finish(extra = {}) {
  Bridge.finishWelcome();
  Bridge.setPref("onyxthorn.welcome.completed", true);
  if (extra.signedIn) {
    Bridge.setPref("onyxthorn.sync.signed-in", true);
    if (extra.account?.email) {
      Bridge.setPref("onyxthorn.sync.account-email", extra.account.email);
    }
  }
  Bridge.openHome();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
