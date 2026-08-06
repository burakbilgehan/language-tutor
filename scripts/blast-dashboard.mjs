// Lokal blast kontrol paneli: http://127.0.0.1:4646  (node scripts/blast-dashboard.mjs)
// Sol: konu kataloğu (dil çifti x seviye blokları, doluluk oranıyla).
// Sağ: sıralı kuyruk (sürükle-bırak). Başlat'ta kuyruğun EN ÜSTTEKİ bloğu
// scripts/blast-runner.ts ile seçilen concurrency'de üretilir; biten blok
// kuyruktan düşer, sıradaki otomatik başlar. Kuyruk data/blast-queue.json'da
// kalıcıdır (panel restart'ı koşuyu kaybetmez).
// Blok türleri:
//   grammar|kanji|vocab (native=tr): DB'deki pending/error satırlar
//   grammar-mt (native=en): tr grammar seed'inin MT çevirisi (T-064)
import { createServer } from "node:http";
import { execSync, spawn } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, readdirSync, openSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DB_PATH = join(ROOT, "data", "app.db");
const QUEUE_PATH = join(ROOT, "data", "blast-queue.json");
const LOG_PATH = join(ROOT, "data", `blast-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.log`);
const PORT = Number(process.env.PORT) || 4646;

// Vocab: sadece statik indexi olan diller (reddedilen T-030'un ölü ja
// satırları iş değildir; eski panelle aynı kural).
const VOCAB_LANGS = readdirSync(join(ROOT, "src", "lib", "vocab-index"))
  .map((f) => f.match(/^([a-z]{2})-data\.json$/)?.[1])
  .filter(Boolean);

const LEVEL_ORDER = ["N5", "N4", "N3", "N2", "N1", "HSK1", "HSK2", "HSK3", "HSK4", "HSK5", "HSK6", "A1", "A2", "B1", "B2", "C1", "C2"];
const lvIdx = (lv) => {
  const i = LEVEL_ORDER.indexOf(lv);
  return i === -1 ? 99 : i;
};
const KIND_LABEL = { grammar: "Gramer", kanji: "Kanji", vocab: "Sözlük" };

// ---- katalog -------------------------------------------------------------

const blockId = (kind, target, native, level) => [kind, target, native, level].join("|");
const parseBlockId = (id) => {
  const [kind, target, native, level] = String(id).split("|");
  return { kind, target, native, level };
};

function readCatalog() {
  const db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
  try {
    const blocks = new Map(); // id -> block
    const bump = (kind, target, native, level, status, c) => {
      const id = blockId(kind, target, native, level);
      const b = blocks.get(id) ?? {
        id, kind, target, native, level, total: 0, done: 0, busy: 0, pending: 0,
      };
      b.total += c;
      if (status === "ready") b.done += c;
      else if (status === "generating") b.busy += c;
      else b.pending += c; // pending + error
      blocks.set(id, b);
    };
    for (const r of db.prepare(
      "SELECT target_language t, level, status, COUNT(*) c FROM grammar_topics GROUP BY 1,2,3"
    ).all()) bump("grammar", r.t, "tr", r.level, r.status, r.c);
    for (const r of db.prepare(
      "SELECT target_language t, level, status, COUNT(*) c FROM kanji_entries GROUP BY 1,2,3"
    ).all()) bump("kanji", r.t, "tr", r.level, r.status, r.c);
    if (VOCAB_LANGS.length) {
      const ph = VOCAB_LANGS.map(() => "?").join(",");
      for (const r of db.prepare(
        `SELECT target_language t, level, status, COUNT(*) c FROM vocab_entries WHERE target_language IN (${ph}) GROUP BY 1,2,3`
      ).all(...VOCAB_LANGS)) bump("vocab", r.t, "tr", r.level, r.status, r.c);
    }
    // en blokları: aynı satırların İngilizce yarısı (sıfırdan native üretim,
    // MT DEĞİL; MT katmanı kaldırıldı). Doluluk = content map'inde 'en'
    // anahtarı; status'un konuyla ilgisi yok, tr yaşam döngüsünü anlatır.
    const bumpEn = (kind, table, where = "1", params = []) => {
      for (const r of db.prepare(
        `SELECT target_language t, level, COUNT(*) c,
                SUM(CASE WHEN content IS NOT NULL
                     AND json_extract(content,'$.en') IS NOT NULL
                    THEN 1 ELSE 0 END) e
         FROM ${table} WHERE ${where} GROUP BY 1,2`
      ).all(...params)) {
        bump(kind, r.t, "en", r.level, "ready", r.e);
        if (r.c - r.e > 0) bump(kind, r.t, "en", r.level, "pending", r.c - r.e);
      }
    };
    bumpEn("grammar", "grammar_topics");
    bumpEn("kanji", "kanji_entries");
    if (VOCAB_LANGS.length) {
      bumpEn(
        "vocab",
        "vocab_entries",
        `target_language IN (${VOCAB_LANGS.map(() => "?").join(",")})`,
        VOCAB_LANGS
      );
    }
    return [...blocks.values()].sort(
      (a, b) =>
        a.kind.localeCompare(b.kind) ||
        a.target.localeCompare(b.target) ||
        lvIdx(a.level) - lvIdx(b.level)
    );
  } finally {
    db.close();
  }
}

// ---- kuyruk --------------------------------------------------------------

function loadQueue() {
  try {
    const q = JSON.parse(readFileSync(QUEUE_PATH, "utf8"));
    return {
      order: q.order ?? [], attempts: q.attempts ?? {}, current: q.current ?? null,
      conc: q.conc ?? 8, quotaUntil: q.quotaUntil ?? null,
    };
  } catch {
    return { order: [], attempts: {}, current: null, conc: 8, quotaUntil: null };
  }
}
function saveQueue(q) {
  writeFileSync(QUEUE_PATH, JSON.stringify(q, null, 2));
}

let active = false;
let notes = []; // {msg, at} panel olay notları (takılan blok vb.)
const note = (msg) => {
  notes.unshift({ msg, at: new Date().toTimeString().slice(0, 8) });
  notes = notes.slice(0, 10);
};

// ---- runner süreç yönetimi ----------------------------------------------

function sh(cmd) {
  try { return execSync(cmd, { encoding: "utf8" }).trim(); } catch { return ""; }
}
function runnerPids() {
  return sh("pgrep -f 'scripts/blast-runner.ts'").split("\n").filter(Boolean).map(Number);
}
function resetGenerating() {
  const db = new Database(DB_PATH);
  try {
    db.prepare("UPDATE kanji_entries SET status='pending' WHERE status='generating'").run();
    db.prepare("UPDATE grammar_topics SET status='pending' WHERE status='generating'").run();
    db.prepare("UPDATE vocab_entries SET status='pending' WHERE status='generating'").run();
  } finally { db.close(); }
}

function spawnRunner(ids, conc) {
  resetGenerating();
  const log = openSync(LOG_PATH, "a");
  const child = spawn(
    "npx",
    ["tsx", "--tsconfig", "tsconfig.json", "scripts/blast-runner.ts",
      "--blocks", ids.join(","), "--conc", String(conc)],
    {
      cwd: ROOT,
      env: { ...process.env, LLM_CONCURRENCY: String(conc) },
      detached: true,
      stdio: ["ignore", log, log],
    }
  );
  child.unref();
}

// Biten blokların içeriğini pakete akıt: seed + başlık export'u. Fire and
// forget; export scriptleri DB'yi readonly açar, koşan runner'la çakışmaz.
const EXPORT_SCRIPT = {
  grammar: "scripts/export-grammar-seed.ts",
  kanji: "scripts/export-kanji-seed.ts",
  vocab: "scripts/export-vocab-seed.ts",
};
function spawnSeedExport(kinds) {
  for (const kind of new Set(kinds)) {
    const script = EXPORT_SCRIPT[kind];
    if (!script) continue;
    const log = openSync(LOG_PATH, "a");
    const child = spawn("npx", ["tsx", "--tsconfig", "tsconfig.json", script], {
      cwd: ROOT,
      detached: true,
      stdio: ["ignore", log, log],
    });
    child.unref();
  }
}

function stopAll() {
  active = false;
  sh("pkill -f 'scripts/blast-runner.ts'");
  sh("sleep 1; pkill -f 'claude -p --output-format json'");
  const q = loadQueue();
  q.current = null;
  saveQueue(q);
  setTimeout(resetGenerating, 1500);
}

// Kuyruk ilerletici: 2 sn'de bir; runner ölmüşse önceki bloğu değerlendir,
// sıradakini başlat. Bir blok 2 denemede bitmediyse "takıldı" notuyla düşer
// (kota yakan sonsuz retry döngüsü olmasın).
function tick() {
  if (!active) return;
  if (runnerPids().length) return;
  const q = loadQueue();
  // Kota bekleme modu: süre dolana kadar hiçbir şey spawn etme. Süre dolunca
  // sıradaki blok normal spawn edilir; kota hâlâ kapalıysa runner saniyeler
  // içinde QUOTA ile döner ve pencere yeniden kurulur (ucuz probe döngüsü).
  if (q.quotaUntil && Date.now() < q.quotaUntil) return;
  const catalog = readCatalog();
  const pendingOf = (id) => {
    const b = catalog.find((x) => x.id === id);
    return b ? b.pending + b.busy : 0;
  };
  // current eski kayıtlarda string olabilir; her yerde dizi olarak ele al
  const current = q.current ? (Array.isArray(q.current) ? q.current : [q.current]) : [];
  if (current.length && readRunProgress().progress?.quota) {
    q.quotaUntil = Date.now() + 15 * 60_000;
    q.current = null;
    saveQueue(q);
    note(
      `kota/limit dolu; blok düşürülmedi, ${new Date(q.quotaUntil)
        .toTimeString()
        .slice(0, 5)}'te yeniden denenecek`
    );
    return;
  }
  if (current.length) {
    const completedKinds = [];
    let blamed = false;
    for (const id of current) {
      if (pendingOf(id) === 0) {
        q.order = q.order.filter((x) => x !== id);
        delete q.attempts[id];
        completedKinds.push(parseBlockId(id).kind);
      } else if (!blamed) {
        // sadece sıradaki ilk eksik blok deneme yer; arkadakiler bu koşuda
        // sıra kendilerine gelmemiş olabilir
        blamed = true;
        q.attempts[id] = (q.attempts[id] ?? 0) + 1;
        if (q.attempts[id] >= 2) {
          note(`takıldı, kuyruktan düştü: ${id} (2 deneme, hâlâ ${pendingOf(id)} eksik)`);
          q.order = q.order.filter((x) => x !== id);
          delete q.attempts[id];
        }
      }
    }
    if (completedKinds.length) spawnSeedExport(completedKinds);
    q.current = null;
    saveQueue(q);
  }
  // Lookahead: kuyruğun başından, toplam item sayısı conc'un ~2 katına
  // ulaşana kadar blok topla — küçük seviye blokları tek başına conc'u
  // dolduramıyor, slotlar boş kalıyordu (32 conc'ta 5-6/dk gözlendi).
  const batch = [];
  let itemEstimate = 0;
  for (const id of q.order) {
    const p = pendingOf(id);
    if (p === 0) continue;
    batch.push(id);
    itemEstimate += p;
    if (itemEstimate >= q.conc * 2) break;
  }
  if (!batch.length) {
    if (q.order.length) {
      // sırada sadece zaten dolu bloklar kaldıysa temizle
      q.order = q.order.filter((id) => pendingOf(id) > 0);
      saveQueue(q);
    }
    active = false;
    note("kuyruk bitti");
    return;
  }
  q.current = batch;
  q.quotaUntil = null;
  saveQueue(q);
  spawnRunner(batch, q.conc);
}
setInterval(tick, 2000);

// Panel restart'ı: runner hâlâ yaşıyorsa koşuya kaldığı yerden sahip çık.
if (runnerPids().length && loadQueue().current) active = true;

// ---- log'dan koşu ilerlemesi + olay akışı --------------------------------

function readRunProgress() {
  if (!existsSync(LOG_PATH)) return { progress: null, events: [], ratePerMin: 0 };
  const lines = readFileSync(LOG_PATH, "utf8").split("\n");
  const lastRun = lines.map((l, i) => (l.startsWith("RUN ") ? i : -1)).filter((x) => x >= 0).pop();
  let progress = null;
  if (lastRun != null) {
    const run = lines.slice(lastRun);
    const total = Number(run[0].match(/total=(\d+)/)?.[1] ?? 0);
    const okN = run.filter((l) => / OK /.test(l)).length;
    const failN = run.filter((l) => / FAIL /.test(l)).length;
    const doneLine = run.find((l) => l.startsWith("DONE"));
    progress = {
      total, ok: okN, fail: failN, finished: Boolean(doneLine),
      // runner kota/limit yüzünden kesildi: FAIL değil, "bekle ve dene" sinyali
      quota: run.some((l) => /\] QUOTA /.test(l)),
    };
  }
  const evLines = lines.filter((l) => /^\[\d\d:\d\d:\d\d\] (OK|FAIL) /.test(l));
  const events = evLines.slice(-30).reverse().map((l) => {
    const m = l.match(/^\[(\d\d:\d\d:\d\d)\] (OK|FAIL) (.*)$/);
    return { at: m[1], outcome: m[2] === "OK" ? "ready" : "error", label: m[3] };
  });
  // ok/dk: son 5 dakikadaki OK satırları (gün içi; gece yarısı kenarı umursanmaz)
  const now = new Date();
  const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const ok5 = evLines.filter((l) => {
    const m = l.match(/^\[(\d\d):(\d\d):(\d\d)\] OK /);
    if (!m) return false;
    const s = Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
    return nowSec - s >= 0 && nowSec - s <= 300;
  }).length;
  return { progress, events, ratePerMin: Math.round((ok5 / 5) * 10) / 10 };
}

// ---- state ---------------------------------------------------------------

function readState() {
  const catalog = readCatalog();
  const q = loadQueue();
  const inQueue = new Set(q.order);
  const running = runnerPids().length > 0;
  const { progress, events, ratePerMin } = readRunProgress();
  let avgDurSec = null;
  try {
    const db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
    avgDurSec = db.prepare(
      "SELECT ROUND(AVG(duration_ms)/1000,1) s FROM llm_calls WHERE created_at > ?"
    ).get(Math.floor(Date.now() / 1000) - 600).s;
    db.close();
  } catch { /* llm_calls yoksa boş geç */ }
  // katalog gruplama: (kind, target, native)
  const groups = [];
  for (const b of catalog) {
    const key = `${b.kind}:${b.target}:${b.native}`;
    let g = groups.find((x) => x.key === key);
    if (!g) {
      g = {
        key,
        title: `${KIND_LABEL[b.kind] ?? b.kind} · ${b.target} → ${b.native}`,
        blocks: [],
      };
      groups.push(g);
    }
    g.blocks.push({ ...b, inQueue: inQueue.has(b.id) });
  }
  groups.sort((a, b) => {
    // tr (owner-native) blokları önce, en blokları sonra
    const en = (k) => (k.endsWith(":en") ? 1 : 0);
    return en(a.key) - en(b.key) || a.key.localeCompare(b.key);
  });
  const byId = new Map(catalog.map((b) => [b.id, b]));
  const queue = q.order.map((id) => {
    const b = byId.get(id);
    const { kind, target, native, level } = parseBlockId(id);
    return {
      id,
      label: `${KIND_LABEL[kind] ?? kind} · ${target} → ${native} · ${level}`,
      pending: b ? b.pending + b.busy : 0,
      total: b ? b.total : 0,
      done: b ? b.done : 0,
      running:
        active && running &&
        (Array.isArray(q.current) ? q.current.includes(id) : q.current === id),
      attempts: q.attempts[id] ?? 0,
    };
  });
  return {
    active, running, conc: q.conc, groups, queue, progress, events, notes,
    ratePerMin, avgDurSec,
    current: q.current,
    quotaUntil: q.quotaUntil,
    now: new Date().toTimeString().slice(0, 8),
  };
}

// ---- HTTP ----------------------------------------------------------------

const HTML = `<!doctype html><html lang="tr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Blast kontrol</title>
<style>
:root{--bg:#faf4e8;--surface:#fffdf7;--ink:#3d3428;--soft:#7a6f5d;--line:#e8dcc8;
--accent:#c0603a;--good:#6b7f4f;--warn:#b98a2e;--bad:#a84632;--chip:#f3e9d7}
@media(prefers-color-scheme:dark){:root{--bg:#221e18;--surface:#2b261f;--ink:#ece3d2;
--soft:#a99c85;--line:#3d362b;--accent:#d97b52;--good:#93a874;--warn:#d4a94a;--bad:#cf6a52;--chip:#352f26}}
body{background:var(--bg);color:var(--ink);font-family:"Nunito Sans","Avenir Next","Segoe UI",sans-serif;
margin:0;padding:1.2rem 1rem 3rem;line-height:1.45}
main{max-width:1180px;margin:0 auto;display:flex;flex-direction:column;gap:1rem}
h1{font-family:Fraunces,Georgia,serif;font-size:1.4rem;margin:0}
h2{font-family:Fraunces,Georgia,serif;font-size:.98rem;margin:0 0 .55rem}
.card{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:.9rem 1rem}
.row{display:flex;align-items:center;gap:.7rem;flex-wrap:wrap}
.cols{display:grid;grid-template-columns:1.15fr .85fr;gap:1rem;align-items:start}
@media(max-width:900px){.cols{grid-template-columns:1fr}}
.pill{padding:.15rem .7rem;border-radius:999px;font-size:.78rem;font-weight:700}
.pill.on{background:color-mix(in srgb,var(--good) 18%,transparent);color:var(--good)}
.pill.off{background:color-mix(in srgb,var(--bad) 16%,transparent);color:var(--bad)}
button{font:inherit;font-weight:700;border:none;border-radius:8px;padding:.45rem 1rem;cursor:pointer}
button.stop{background:var(--bad);color:#fff}button.start{background:var(--good);color:#fff}
button:disabled{opacity:.4;cursor:default}
input[type=number]{font:inherit;width:4.2rem;padding:.35rem .5rem;border:1px solid var(--line);
border-radius:8px;background:var(--bg);color:var(--ink)}
.group{margin-bottom:.85rem}
.group h3{font-size:.84rem;margin:0 0 .3rem;color:var(--ink)}
.lvrow{display:grid;grid-template-columns:3.6rem 1fr 6.2rem 2rem;align-items:center;gap:.5rem;
font-size:.78rem;padding:.22rem .35rem;border-radius:7px;cursor:grab}
.lvrow:hover{background:var(--chip)}
.lvrow.full,.lvrow.queued{opacity:.5;cursor:default}
.lvrow .lvname{color:var(--soft);font-weight:700}
.lvrow .n{text-align:right;color:var(--soft);font-variant-numeric:tabular-nums}
.bar{height:7px;border-radius:5px;background:var(--chip);overflow:hidden}
.bar div{height:100%;background:var(--good);transition:width .6s}
.lvrow button{padding:.05rem .45rem;border-radius:6px;background:var(--chip);color:var(--accent);font-size:.9rem}
.q{display:flex;flex-direction:column;gap:.4rem;min-height:5rem}
.qi{display:flex;align-items:center;gap:.55rem;border:1px solid var(--line);border-radius:9px;
padding:.45rem .6rem;background:var(--bg);font-size:.82rem;cursor:grab}
.qi.running{border-color:var(--good);box-shadow:0 0 0 1px var(--good)}
.qi.dragover{border-top:2px solid var(--accent)}
.qi .grip{color:var(--soft);cursor:grab}
.qi .lbl{flex:1}
.qi .n{color:var(--soft);font-variant-numeric:tabular-nums;font-size:.75rem}
.qi .x{background:none;color:var(--bad);padding:0 .3rem;font-size:1rem}
.qi .spin{width:.8rem;height:.8rem;border:2px solid var(--good);border-top-color:transparent;
border-radius:50%;animation:sp 1s linear infinite}
@keyframes sp{to{transform:rotate(360deg)}}
.q.dragover{outline:2px dashed var(--accent);outline-offset:3px;border-radius:9px}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(105px,1fr));gap:.6rem}
.tile{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:.55rem .8rem}
.tile b{font-size:1.25rem;font-variant-numeric:tabular-nums}
.tile span{display:block;font-size:.64rem;letter-spacing:.06em;text-transform:uppercase;color:var(--soft)}
.g b{color:var(--good)}.b b{color:var(--bad)}.a b{color:var(--accent)}
.feed{display:flex;flex-direction:column;gap:.25rem;font-size:.78rem;max-height:230px;overflow-y:auto;
font-variant-numeric:tabular-nums}
.feed .ok{color:var(--good);font-weight:700}.feed .er{color:var(--bad);font-weight:700}
.feed time{color:var(--soft);font-size:.72rem;margin-right:.4rem}
.note{font-size:.8rem;color:var(--soft)}
.notes{font-size:.78rem;color:var(--warn);display:flex;flex-direction:column;gap:.2rem}
</style></head><body><main>
<div class="row" style="justify-content:space-between">
<h1>Blast kontrol</h1>
<div class="row"><span id="status" class="pill off">—</span><span class="note" id="clock"></span></div>
</div>
<div class="card"><div class="row">
<label>Concurrency <input id="conc" type="number" min="1" max="32" value="8"></label>
<button id="btnStart" class="start">Başlat</button>
<button id="btnStop" class="stop">Durdur</button>
<span class="note">Kuyruğun en üstündeki blok koşar; biten düşer, sıradaki
başlar. Concurrency değişikliği bir sonraki bloktan itibaren geçerlidir
(hemen istiyorsan Yeniden başlat). 2 denemede bitmeyen blok "takıldı" diye
düşer.</span>
</div><div id="notes" class="notes"></div></div>
<div class="cols">
<div class="card"><h2>Katalog</h2><div id="catalog"></div>
<div class="note">Satırı sürükleyip kuyruğa bırak (veya ＋). Soluk = dolu ya
da zaten kuyrukta.</div></div>
<div style="display:flex;flex-direction:column;gap:1rem">
<div class="card"><h2>Kuyruk</h2><div id="queue" class="q"></div></div>
<div class="tiles">
<div class="tile g"><b id="tOk">—</b><span>Bu koşu ok</span></div>
<div class="tile b"><b id="tFail">—</b><span>Bu koşu fail</span></div>
<div class="tile a"><b id="tRate">—</b><span>ok / dk</span></div>
<div class="tile"><b id="tDur">—</b><span>Ort. çağrı</span></div>
</div>
<div class="card"><h2>Son olaylar</h2><div id="feed" class="feed"><span class="note">Henüz olay yok.</span></div></div>
</div></div>
</main><script>
let dragging = false;
let dragPayload = null; // {type:'add'|'move', id}
const api = (url, body) => fetch(url, {method:"POST",headers:{"content-type":"application/json"},
  body: JSON.stringify(body || {})}).then(poll);

function renderCatalog(groups){
  const el = document.getElementById("catalog");
  el.innerHTML = groups.map(g =>
    '<div class="group"><h3>' + g.title + '</h3>' + g.blocks.map(b => {
      const pct = b.total ? (100 * b.done / b.total).toFixed(1) : 0;
      const cls = b.pending + b.busy === 0 ? "full" : (b.inQueue ? "queued" : "");
      const canAdd = !cls;
      return '<div class="lvrow ' + cls + '" ' + (canAdd ? 'draggable="true"' : "") +
        ' data-id="' + b.id + '">' +
        '<span class="lvname">' + b.level + '</span>' +
        '<div class="bar"><div style="width:' + pct + '%"></div></div>' +
        '<span class="n">' + b.done + ' / ' + b.total + '</span>' +
        (canAdd ? '<button title="Kuyruğa ekle">＋</button>' :
          '<span class="n">' + (b.inQueue ? "↪" : "✓") + '</span>') +
        '</div>';
    }).join("") + '</div>'
  ).join("");
  el.querySelectorAll(".lvrow[draggable]").forEach(row => {
    row.addEventListener("dragstart", e => {
      dragging = true; dragPayload = { type: "add", id: row.dataset.id };
      e.dataTransfer.effectAllowed = "copy";
    });
    row.addEventListener("dragend", () => { dragging = false; dragPayload = null; });
    row.querySelector("button")?.addEventListener("click", () =>
      api("/api/queue", { op: "add", id: row.dataset.id }));
  });
}

function renderQueue(queue){
  if (dragging) return; // sürükleme sırasında DOM'u yeniden kurma
  const el = document.getElementById("queue");
  el.innerHTML = queue.length ? queue.map((it, i) =>
    '<div class="qi' + (it.running ? " running" : "") + '" draggable="true" data-i="' + i +
    '" data-id="' + it.id + '">' +
    (it.running ? '<span class="spin"></span>' : '<span class="grip">⠿</span>') +
    '<span class="lbl">' + it.label + (it.attempts ? ' <span class="n">(deneme ' + (it.attempts + 1) + ')</span>' : '') + '</span>' +
    '<span class="n">' + it.pending + ' eksik</span>' +
    '<button class="x" title="Çıkar">✕</button></div>'
  ).join("") : '<span class="note">Kuyruk boş. Soldan blok sürükle.</span>';
  el.querySelectorAll(".qi").forEach(item => {
    item.addEventListener("dragstart", e => {
      dragging = true; dragPayload = { type: "move", id: item.dataset.id };
      e.dataTransfer.effectAllowed = "move";
    });
    item.addEventListener("dragend", () => { dragging = false; dragPayload = null; });
    item.addEventListener("dragover", e => { e.preventDefault(); item.classList.add("dragover"); });
    item.addEventListener("dragleave", () => item.classList.remove("dragover"));
    item.addEventListener("drop", e => {
      e.preventDefault(); e.stopPropagation();
      item.classList.remove("dragover");
      if (!dragPayload) return;
      api("/api/queue", { op: dragPayload.type, id: dragPayload.id, to: Number(item.dataset.i) });
      dragging = false; dragPayload = null;
    });
    item.querySelector(".x").addEventListener("click", () =>
      api("/api/queue", { op: "remove", id: item.dataset.id }));
  });
}
const qEl = document.getElementById("queue");
qEl.addEventListener("dragover", e => { e.preventDefault(); qEl.classList.add("dragover"); });
qEl.addEventListener("dragleave", () => qEl.classList.remove("dragover"));
qEl.addEventListener("drop", e => {
  e.preventDefault(); qEl.classList.remove("dragover");
  if (!dragPayload) return;
  api("/api/queue", { op: dragPayload.type, id: dragPayload.id });
  dragging = false; dragPayload = null;
});

async function poll(){
  let s; try { s = await (await fetch("/api/state")).json(); } catch { return; }
  document.getElementById("clock").textContent = s.now;
  const st = document.getElementById("status");
  const inQuotaWait = s.active && s.quotaUntil && s.quotaUntil > Date.now();
  st.textContent = inQuotaWait
    ? "kota bekleniyor · deneme " + new Date(s.quotaUntil).toTimeString().slice(0, 5)
    : s.active ? (s.running ? "çalışıyor · conc " + s.conc : "sıradaki blok bekleniyor")
    : (s.running ? "runner yaşıyor (sahipsiz)" : "durdu");
  st.className = "pill " + (s.active || s.running ? "on" : "off");
  document.getElementById("btnStart").textContent = s.active ? "Yeniden başlat" : "Başlat";
  document.getElementById("btnStop").disabled = !(s.active || s.running);
  if (document.activeElement !== conc) conc.value = s.conc;
  renderCatalog(s.groups);
  renderQueue(s.queue);
  tOk.textContent = s.progress ? s.progress.ok : "—";
  tFail.textContent = s.progress ? s.progress.fail : "—";
  tRate.textContent = s.ratePerMin ?? "—";
  tDur.textContent = s.avgDurSec != null ? s.avgDurSec + " sn" : "—";
  document.getElementById("notes").innerHTML =
    (s.notes || []).map(n => '<span>' + n.at + ' · ' + n.msg + '</span>').join("");
  const feed = document.getElementById("feed");
  if (s.events.length) feed.innerHTML = s.events.map(e =>
    '<span><time>' + e.at + '</time><span class="' +
    (e.outcome === "ready" ? 'ok">✓' : 'er">✕') +
    '</span> ' + e.label + '</span>').join("");
}
btnStart.onclick = () => api("/api/start", { conc: Number(conc.value) || 8 });
btnStop.onclick = () => api("/api/stop");
poll(); setInterval(poll, 2000);
</script></body></html>`;

createServer((req, res) => {
  const json = (code, obj) => {
    res.writeHead(code, { "content-type": "application/json" });
    res.end(JSON.stringify(obj));
  };
  const withBody = (fn) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try { fn(JSON.parse(body || "{}")); } catch (e) { json(400, { error: String(e) }); }
    });
  };
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(HTML);
  } else if (req.method === "GET" && req.url === "/api/state") {
    try { json(200, readState()); } catch (e) { json(500, { error: String(e) }); }
  } else if (req.method === "POST" && req.url === "/api/queue") {
    withBody((b) => {
      const q = loadQueue();
      if (b.op === "add") {
        const blk = readCatalog().find((x) => x.id === b.id);
        if (!blk) return json(404, { error: "blok yok" });
        if (blk.pending + blk.busy === 0) return json(409, { error: "blok zaten dolu" });
        if (!q.order.includes(b.id)) {
          const to = Number.isInteger(b.to) ? b.to : q.order.length;
          q.order.splice(Math.max(0, Math.min(to, q.order.length)), 0, b.id);
        }
      } else if (b.op === "remove") {
        q.order = q.order.filter((x) => x !== b.id);
        delete q.attempts[b.id];
      } else if (b.op === "move") {
        const from = q.order.indexOf(b.id);
        if (from === -1) return json(404, { error: "kuyrukta yok" });
        q.order.splice(from, 1);
        const to = Number.isInteger(b.to) ? b.to : q.order.length;
        q.order.splice(Math.max(0, Math.min(to, q.order.length)), 0, b.id);
      } else {
        return json(400, { error: "bilinmeyen op" });
      }
      saveQueue(q);
      json(200, { ok: true });
    });
  } else if (req.method === "POST" && req.url === "/api/start") {
    withBody(async (b) => {
      const q = loadQueue();
      q.conc = Math.max(1, Math.min(32, Number(b.conc) || 8));
      saveQueue(q);
      // yeniden başlat semantiği: koşan runner'ı kes, tick sıradakini
      // yeni concurrency ile kaldırır
      if (runnerPids().length) {
        sh("pkill -f 'scripts/blast-runner.ts'");
        sh("pkill -f 'claude -p --output-format json'");
        for (let i = 0; i < 16 && runnerPids().length; i++)
          await new Promise((r) => setTimeout(r, 500));
        const q2 = loadQueue();
        q2.current = null;
        saveQueue(q2);
      }
      active = true;
      tick();
      json(200, { ok: true, conc: q.conc });
    });
  } else if (req.method === "POST" && req.url === "/api/stop") {
    stopAll();
    json(200, { ok: true });
  } else {
    json(404, { error: "not found" });
  }
}).listen(PORT, "127.0.0.1", () => {
  console.log(`blast dashboard: http://127.0.0.1:${PORT}`);
});
