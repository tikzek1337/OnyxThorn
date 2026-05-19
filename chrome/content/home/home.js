/* OnyxThorn home/new-tab. Stores shortcuts in pref `onyxthorn.home.shortcuts` (JSON). */

const Bridge = window.OnyxThornBridge || {
  getPref: (n, fb) => {
    try { return JSON.parse(localStorage.getItem(n)) ?? fb; }
    catch { return fb; }
  },
  setPref: (n, v) => localStorage.setItem(n, JSON.stringify(v)),
  navigate: (url) => { window.location.href = url; },
  resolveSearchURL: (q) => "https://duckduckgo.com/?q=" + encodeURIComponent(q),
};

const DEFAULT_SHORTCUTS = [
  { name: "DuckDuckGo", url: "https://duckduckgo.com/" },
  { name: "GitHub",     url: "https://github.com/" },
  { name: "Wikipedia",  url: "https://wikipedia.org/" },
  { name: "Reddit",     url: "https://www.reddit.com/" },
  { name: "YouTube",    url: "https://www.youtube.com/" },
];

let shortcuts = Bridge.getPref("onyxthorn.home.shortcuts", DEFAULT_SHORTCUTS);

function save() { Bridge.setPref("onyxthorn.home.shortcuts", shortcuts); }

function letter(name) { return (name || "?").trim().charAt(0).toUpperCase(); }

function render() {
  const root = document.getElementById("shortcuts");
  root.innerHTML = "";
  shortcuts.forEach((s, i) => {
    const a = document.createElement("a");
    a.className = "tile";
    a.href = s.url;
    a.innerHTML = `
      <button type="button" class="tile__remove" data-i="${i}" aria-label="Удалить">×</button>
      <div class="tile__icon">${letter(s.name)}</div>
      <span>${escapeHtml(s.name)}</span>`;
    root.appendChild(a);
  });

  // Add button
  const add = document.createElement("button");
  add.className = "tile tile--add";
  add.type = "button";
  add.innerHTML = `<div class="tile__icon">+</div><span>Добавить</span>`;
  add.addEventListener("click", () => document.getElementById("add-shortcut").showModal());
  root.appendChild(add);

  for (const r of root.querySelectorAll(".tile__remove")) {
    r.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      shortcuts.splice(Number(r.dataset.i), 1);
      save(); render();
    });
  }
}

document.getElementById("search-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const q = e.target.q.value.trim();
  if (!q) return;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(q) || /^[\w-]+\.[\w-]+/.test(q)) {
    Bridge.navigate(q.startsWith("http") ? q : "https://" + q);
  } else {
    Bridge.navigate(Bridge.resolveSearchURL(q));
  }
});

document.getElementById("add-shortcut").addEventListener("close", (e) => {
  const dlg = e.target;
  if (dlg.returnValue !== "ok") return;
  const form = dlg.querySelector("form");
  const name = form.name.value.trim();
  const url = form.url.value.trim();
  if (!name || !url) return;
  shortcuts.push({ name, url });
  save(); render();
  form.reset();
});
document.getElementById("add-cancel").addEventListener("click", () => {
  document.getElementById("add-shortcut").close("cancel");
});

document.getElementById("manage-shortcuts").addEventListener("click", (e) => {
  e.preventDefault();
  const ok = confirm("Сбросить ярлыки к стандартным?");
  if (ok) { shortcuts = DEFAULT_SHORTCUTS.slice(); save(); render(); }
});

function escapeHtml(s) { return String(s).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }

render();
