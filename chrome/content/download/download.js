/*
 * OnyxThorn download panel & about:downloads.
 *
 * Talks to `window.OnyxThornDownloads`, a privileged controller installed
 * by patch 0008-onyxthorn-downloads.patch. The controller wraps
 * Services.downloads.* and pushes updates over `EventTarget` so the page
 * can render speed/ETA without polling.
 *
 * Falls back to a fake feed in dev-mode so the UI is fully styleable
 * out-of-tree.
 */

const Controller = window.OnyxThornDownloads || (function () {
  // Dev fallback that fabricates a couple of downloads.
  const target = new EventTarget();
  const fakes = [
    { id: "1", name: "OnyxThorn-Setup-0.1.0.exe", size: 78_000_000, downloaded: 0, rate: 4_200_000, state: "running",  source: "onyxthorn.example" },
    { id: "2", name: "tilemap.psd",                size: 540_000_000, downloaded: 80_000_000, rate: 6_500_000, state: "running", source: "figma.com" },
    { id: "3", name: "report.pdf",                 size: 1_200_000,  downloaded: 1_200_000,  rate: 0,         state: "finished", source: "docs.notion.so" },
  ];
  let running = true;
  setInterval(() => {
    if (!running) return;
    for (const f of fakes) {
      if (f.state === "running" && f.downloaded < f.size) {
        f.downloaded = Math.min(f.size, f.downloaded + f.rate * 0.5);
        if (f.downloaded >= f.size) f.state = "finished";
        target.dispatchEvent(new CustomEvent("update", { detail: f }));
      }
    }
  }, 500);
  return {
    list: () => fakes,
    on: (n, h) => target.addEventListener(n, h),
    pause:  (id) => { const f = fakes.find(x => x.id === id); if (f) f.state = "paused"; },
    resume: (id) => { const f = fakes.find(x => x.id === id); if (f) f.state = "running"; },
    cancel: (id) => { const i = fakes.findIndex(x => x.id === id); if (i >= 0) fakes.splice(i, 1); },
    open:   () => {},
    openFolder: () => {},
    clear:  () => { fakes.length = 0; },
  };
})();

const list = document.getElementById("downloads-list");
const template = document.getElementById("dl-template");
const empty = document.getElementById("empty-state");
const rows = new Map(); // id → DOM

function fmtBytes(n) {
  if (!Number.isFinite(n) || n <= 0) return "0 B";
  const u = ["B","KB","MB","GB","TB"];
  let i = 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return n.toFixed(n < 10 && i > 0 ? 1 : 0) + " " + u[i];
}
function fmtRate(bps) {
  if (!Number.isFinite(bps) || bps <= 0) return "";
  return fmtBytes(bps) + "/s";
}
function fmtEta(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  if (seconds < 60)      return `${Math.round(seconds)} с осталось`;
  if (seconds < 3600)    return `${Math.round(seconds / 60)} мин осталось`;
  return `${Math.floor(seconds/3600)} ч ${Math.round((seconds%3600)/60)} мин осталось`;
}
function ext(name) {
  const m = name.match(/\.([a-z0-9]{1,5})$/i);
  return m ? m[1] : "BIN";
}

function ensureRow(d) {
  let el = rows.get(d.id);
  if (el) return el;
  el = template.content.firstElementChild.cloneNode(true);
  el.dataset.id = d.id;
  el.querySelector(".dl__pause") .addEventListener("click", () => Controller.pause(d.id));
  el.querySelector(".dl__resume").addEventListener("click", () => Controller.resume(d.id));
  el.querySelector(".dl__cancel").addEventListener("click", () => { Controller.cancel(d.id); rows.delete(d.id); el.remove(); updateEmpty(); });
  el.querySelector(".dl__open")  .addEventListener("click", () => Controller.open(d.id));
  list.appendChild(el);
  rows.set(d.id, el);
  updateEmpty();
  return el;
}

function renderRow(d) {
  const el = ensureRow(d);
  el.dataset.state = d.state;
  el.querySelector(".dl__ext").textContent = ext(d.name);
  el.querySelector(".dl__name").textContent = d.name;
  el.querySelector(".dl__size").textContent = `${fmtBytes(d.downloaded)} / ${fmtBytes(d.size)}`;
  const pct = d.size > 0 ? (d.downloaded / d.size) * 100 : 0;
  el.querySelector(".dl__bar-fill").style.width = pct + "%";
  el.querySelector(".dl__rate").textContent =
    d.state === "running" ? fmtRate(d.rate) :
    d.state === "paused"  ? "На паузе" :
    d.state === "finished"? "Завершено" :
    d.state === "error"   ? "Ошибка" : "";
  el.querySelector(".dl__eta").textContent =
    (d.state === "running" && d.rate > 0)
      ? fmtEta((d.size - d.downloaded) / d.rate)
      : "";
  el.querySelector(".dl__source").textContent = d.source ? `← ${d.source}` : "";

  el.querySelector(".dl__pause") .hidden = d.state !== "running";
  el.querySelector(".dl__resume").hidden = d.state !== "paused";
  el.querySelector(".dl__open")  .hidden = d.state !== "finished";
}

function updateEmpty() {
  empty.hidden = rows.size > 0;
}

for (const d of Controller.list()) renderRow(d);
Controller.on("update", e => renderRow(e.detail));
Controller.on("add",    e => renderRow(e.detail));
Controller.on("remove", e => { const el = rows.get(e.detail.id); if (el) { el.remove(); rows.delete(e.detail.id); updateEmpty(); } });

document.getElementById("open-folder").addEventListener("click", () => Controller.openFolder());
document.getElementById("clear-history").addEventListener("click", () => {
  if (!confirm("Очистить историю загрузок?")) return;
  Controller.clear();
  rows.clear();
  list.querySelectorAll(".dl").forEach(el => el.remove());
  updateEmpty();
});
