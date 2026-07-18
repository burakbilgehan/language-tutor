// Lokal blast kontrol paneli: http://127.0.0.1:4646
// Çalıştır: node scripts/blast-dashboard.mjs
// DB'den canlı state (2 sn poll), blast'ı durdur/başlat, concurrency seç.
// Not: 17:20 hard-stop kill-switch'i bağımsız bir süreçtir; buradan
// başlatılan koşuları da durdurur (pkill -f blast-generate).
import { createServer } from "node:http";
import { execSync, spawn } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DB_PATH = join(ROOT, "data", "app.db");
const LOG_PATH = join(ROOT, "data", `blast-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.log`);
const PORT = 4646;

let prevGenerating = null; // char -> level
let events = []; // {char, level, outcome: "ready"|"error", at}
let startedConc = null;

function sh(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function blastPids() {
  return sh("pgrep -f 'scripts/blast-generate.ts'")
    .split("\n")
    .filter(Boolean)
    .map(Number);
}

function detectConc(pids) {
  if (startedConc) return startedConc;
  for (const pid of pids) {
    const cmd = sh(`ps -o command= -p ${pid}`);
    const m = cmd.match(/BLAST_CONC=(\d+)|LLM_CONCURRENCY=(\d+)/);
    if (m) return Number(m[1] ?? m[2]);
  }
  return null;
}

function readState() {
  const db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
  try {
    const kanji = Object.fromEntries(
      db.prepare("SELECT status, COUNT(*) c FROM kanji_entries GROUP BY status").all().map((r) => [r.status, r.c])
    );
    const grammar = Object.fromEntries(
      db.prepare("SELECT status, COUNT(*) c FROM grammar_topics GROUP BY status").all().map((r) => [r.status, r.c])
    );
    const vocab = Object.fromEntries(
      db.prepare("SELECT status, COUNT(*) c FROM vocab_entries GROUP BY status").all().map((r) => [r.status, r.c])
    );
    const generating = [
      ...db
        .prepare("SELECT char, level FROM kanji_entries WHERE status='generating' ORDER BY level, char")
        .all(),
      ...db
        .prepare("SELECT word AS char, level FROM vocab_entries WHERE status='generating' ORDER BY position")
        .all(),
    ];

    // slot değişimlerini olaya çevir: generating'den çıkan char'ın yeni statüsü
    const cur = new Map(generating.map((g) => [g.char, g.level]));
    if (prevGenerating) {
      const departed = [...prevGenerating.keys()].filter((c) => !cur.has(c));
      if (departed.length) {
        const ph = departed.map(() => "?").join(",");
        const rows = [
          ...db.prepare(`SELECT char, status FROM kanji_entries WHERE char IN (${ph})`).all(...departed),
          ...db.prepare(`SELECT word AS char, status FROM vocab_entries WHERE word IN (${ph})`).all(...departed),
        ];
        for (const row of rows) {
          events.unshift({
            char: row.char,
            level: prevGenerating.get(row.char),
            outcome: row.status === "ready" ? "ready" : "error",
            at: new Date().toTimeString().slice(0, 8),
          });
        }
        events = events.slice(0, 30);
      }
    }
    prevGenerating = cur;

    const nowSec = Math.floor(Date.now() / 1000);
    const done5 = db
      .prepare(
        `SELECT (SELECT COUNT(*) FROM kanji_entries WHERE generated_at > ?) +
                (SELECT COUNT(*) FROM vocab_entries WHERE generated_at > ?) c`
      )
      .get(nowSec - 300, nowSec - 300).c;
    const avgDur = db
      .prepare("SELECT ROUND(AVG(duration_ms) / 1000, 1) s FROM llm_calls WHERE created_at > ?")
      .get(nowSec - 600).s;
    // son 15 dk, dakika başına biten içerik (sparkline)
    const buckets = new Array(15).fill(0);
    for (const r of db
      .prepare(
        `SELECT generated_at t FROM kanji_entries WHERE generated_at > ?
         UNION ALL SELECT generated_at FROM vocab_entries WHERE generated_at > ?`
      )
      .all(nowSec - 900, nowSec - 900)) {
      const idx = 14 - Math.floor((nowSec - r.t) / 60);
      if (idx >= 0 && idx < 15) buckets[idx]++;
    }

    const pids = blastPids();
    let progress = null;
    if (existsSync(LOG_PATH)) {
      const lines = readFileSync(LOG_PATH, "utf8").split("\n");
      const lastTodo = lines.map((l, idx) => (l.startsWith("todo:") ? idx : -1)).filter((x) => x >= 0).pop();
      if (lastTodo != null) {
        const run = lines.slice(lastTodo);
        const total = Number(run[0].match(/toplam=(\d+)/)?.[1] ?? 0);
        const prog = run.filter((l) => /^\d+\/\d+ ok=/.test(l)).pop();
        const done = run.find((l) => l.startsWith("BİTTİ"));
        const m = (done ?? prog)?.match(/ok=(\d+) fail=(\d+)(?: (\d+)s)?/);
        progress = {
          total,
          ok: m ? Number(m[1]) : 0,
          fail: m ? Number(m[2]) : run.filter((l) => l.startsWith("FAIL")).length,
          finished: Boolean(done),
        };
      }
    }
    return {
      running: pids.length > 0,
      conc: pids.length ? detectConc(pids) : null,
      kanji,
      vocab,
      grammar,
      generating,
      events,
      progress,
      ratePerMin: Math.round((done5 / 5) * 10) / 10,
      avgDurSec: avgDur,
      buckets,
      now: new Date().toTimeString().slice(0, 8),
    };
  } finally {
    db.close();
  }
}

function resetGenerating() {
  const db = new Database(DB_PATH);
  try {
    db.prepare("UPDATE kanji_entries SET status='pending' WHERE status='generating'").run();
    db.prepare("UPDATE grammar_topics SET status='pending' WHERE status='generating'").run();
    db.prepare("UPDATE vocab_entries SET status='pending' WHERE status='generating'").run();
  } finally {
    db.close();
  }
}

function stopBlast() {
  sh("pkill -f 'scripts/blast-generate.ts'");
  sh("sleep 1; pkill -f 'claude -p --output-format json'");
  startedConc = null;
  setTimeout(resetGenerating, 1500);
}

async function startBlast(conc) {
  if (blastPids().length) {
    // restart semantiği: önce durdur, süreçler ölene kadar bekle (max ~8s)
    sh("pkill -f 'scripts/blast-generate.ts'");
    sh("pkill -f 'claude -p --output-format json'");
    for (let i = 0; i < 16 && blastPids().length; i++)
      await new Promise((r) => setTimeout(r, 500));
    if (blastPids().length) return false;
  }
  resetGenerating();
  const child = spawn(
    "npx",
    ["tsx", "--tsconfig", "tsconfig.json", "scripts/blast-generate.ts"],
    {
      cwd: ROOT,
      env: { ...process.env, LLM_CONCURRENCY: String(conc), BLAST_CONC: String(conc) },
      detached: true,
      stdio: ["ignore", require("node:fs").openSync(LOG_PATH, "a"), require("node:fs").openSync(LOG_PATH, "a")],
    }
  );
  child.unref();
  startedConc = conc;
  return true;
}

const HTML = `<!doctype html><html lang="tr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Blast kontrol</title>
<style>
:root{--bg:#faf4e8;--surface:#fffdf7;--ink:#3d3428;--soft:#7a6f5d;--line:#e8dcc8;
--accent:#c0603a;--good:#6b7f4f;--warn:#b98a2e;--bad:#a84632;--chip:#f3e9d7}
@media(prefers-color-scheme:dark){:root{--bg:#221e18;--surface:#2b261f;--ink:#ece3d2;
--soft:#a99c85;--line:#3d362b;--accent:#d97b52;--good:#93a874;--warn:#d4a94a;--bad:#cf6a52;--chip:#352f26}}
body{background:var(--bg);color:var(--ink);font-family:"Nunito Sans","Avenir Next","Segoe UI",sans-serif;
margin:0;padding:1.5rem 1rem 3rem;line-height:1.5}
main{max-width:860px;margin:0 auto;display:flex;flex-direction:column;gap:1.1rem}
h1{font-family:Fraunces,Georgia,serif;font-size:1.45rem;margin:0}
h2{font-family:Fraunces,Georgia,serif;font-size:1rem;margin:0 0 .6rem}
.card{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:1rem 1.1rem}
.row{display:flex;align-items:center;gap:.7rem;flex-wrap:wrap}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:.7rem}
.tile{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:.7rem .9rem}
.tile b{font-size:1.45rem;font-variant-numeric:tabular-nums}
.tile span{display:block;font-size:.68rem;letter-spacing:.06em;text-transform:uppercase;color:var(--soft)}
.g b{color:var(--good)}.a b{color:var(--accent)}.w b{color:var(--warn)}.b b{color:var(--bad)}
.pill{padding:.15rem .7rem;border-radius:999px;font-size:.78rem;font-weight:700}
.pill.on{background:color-mix(in srgb,var(--good) 18%,transparent);color:var(--good)}
.pill.off{background:color-mix(in srgb,var(--bad) 16%,transparent);color:var(--bad)}
.slots{display:flex;flex-wrap:wrap;gap:.55rem;min-height:3rem}
.slot{background:var(--chip);border:1px solid var(--line);border-radius:999px;padding:.35rem .85rem;
display:flex;align-items:center;gap:.5rem;transition:opacity .5s,transform .5s}
.slot .kj{font-family:"Hiragino Sans","Noto Sans JP",sans-serif;font-size:1.3rem;line-height:1}
.slot .lv{font-size:.68rem;font-weight:700;color:var(--accent)}
.slot.enter{opacity:0;transform:scale(.6)}
.slot.exit-ready{opacity:0;transform:translateY(-14px) scale(1.15);border-color:var(--good);background:color-mix(in srgb,var(--good) 25%,var(--chip))}
.slot.exit-error{opacity:0;transform:translateY(10px);border-color:var(--bad);background:color-mix(in srgb,var(--bad) 22%,var(--chip))}
@media(prefers-reduced-motion:reduce){.slot{transition:none}}
button{font:inherit;font-weight:700;border:none;border-radius:8px;padding:.5rem 1.1rem;cursor:pointer}
button.stop{background:var(--bad);color:#fff}button.start{background:var(--good);color:#fff}
button:disabled{opacity:.45;cursor:default}
input[type=number]{font:inherit;width:4.2rem;padding:.4rem .5rem;border:1px solid var(--line);
border-radius:8px;background:var(--bg);color:var(--ink)}
.feed{display:flex;flex-direction:column;gap:.3rem;font-size:.86rem;max-height:220px;overflow-y:auto}
.feed .ev{display:flex;gap:.6rem;align-items:baseline}
.feed .kj{font-family:"Hiragino Sans","Noto Sans JP",sans-serif;font-size:1.05rem}
.feed .ok{color:var(--good);font-weight:700}.feed .er{color:var(--bad);font-weight:700}
.feed time{color:var(--soft);font-variant-numeric:tabular-nums;font-size:.78rem}
.bar{height:10px;border-radius:5px;background:var(--chip);overflow:hidden}
.bar div{height:100%;background:var(--good);transition:width .6s}
.note{font-size:.82rem;color:var(--soft)}
</style></head><body><main>
<div class="row" style="justify-content:space-between">
<h1>Blast kontrol</h1>
<div class="row"><span id="status" class="pill off">—</span>
<span class="note" id="clock"></span></div>
</div>
<div class="card"><div class="row">
<label>Concurrency <input id="conc" type="number" min="1" max="32" value="8"></label>
<button id="btnStart" class="start">Başlat</button>
<button id="btnStop" class="stop">Durdur</button>
<span class="note">Durdurma yarım kalan slotları pending'e resetler. 17:20
kill-switch'i her koşuyu keser.</span>
</div></div>
<div class="tiles">
<div class="tile g"><b id="tReady">—</b><span>Hazır kanji</span></div>
<div class="tile a"><b id="tGen">—</b><span>Üretimde</span></div>
<div class="tile w"><b id="tPend">—</b><span>Sırada</span></div>
<div class="tile b"><b id="tErr">—</b><span>Hata</span></div>
<div class="tile g"><b id="tVReady">—</b><span>Sözlük hazır</span></div>
<div class="tile w"><b id="tVPend">—</b><span>Sözlük sırada</span></div>
<div class="tile g"><b id="tOk">—</b><span>Bu koşu ok</span></div>
<div class="tile b"><b id="tFail">—</b><span>Bu koşu fail</span></div>
<div class="tile a"><b id="tRate">—</b><span>İçerik / dk</span></div>
<div class="tile"><b id="tDur">—</b><span>Ort. çağrı süresi</span></div>
<div class="tile g"><b id="tRatio">—</b><span>Başarı oranı</span></div>
</div>
<div class="card"><h2>Tempo — son 15 dk</h2>
<div id="spark" style="display:flex;align-items:flex-end;gap:3px;height:56px"></div>
<div class="note" style="margin-top:.3rem">Dakika başına biten içerik (kanji + sözlük, generated_at'ten)</div></div>
<div class="card"><h2>Toplam ilerleme</h2><div class="bar"><div id="barFill" style="width:0%"></div></div>
<div class="note" id="barLbl" style="margin-top:.4rem"></div></div>
<div class="card"><h2>Aktif slotlar</h2><div id="slots" class="slots"></div></div>
<div class="card"><h2>Son tamamlananlar</h2><div id="feed" class="feed"><span class="note">Henüz olay yok.</span></div></div>
</main><script>
const slotEls = new Map();
async function poll(){
  let s; try { s = await (await fetch("/api/state")).json(); } catch { return; }
  document.getElementById("clock").textContent = s.now;
  const st = document.getElementById("status");
  st.textContent = s.running ? "çalışıyor · conc " + (s.conc ?? "?") : "durdu";
  st.className = "pill " + (s.running ? "on" : "off");
  document.getElementById("btnStart").textContent = s.running ? "Yeniden başlat" : "Başlat";
  document.getElementById("btnStop").disabled = !s.running;
  const k = s.kanji;
  const ready = k.ready ?? 0, gen = k.generating ?? 0, pend = k.pending ?? 0, err = k.error ?? 0;
  tReady.textContent = ready; tGen.textContent = gen; tPend.textContent = pend; tErr.textContent = err;
  const v = s.vocab || {};
  tVReady.textContent = v.ready ?? 0;
  tVPend.textContent = (v.pending ?? 0) + (v.error ?? 0);
  tOk.textContent = s.progress?.ok ?? "—"; tFail.textContent = s.progress?.fail ?? "—";
  tRate.textContent = s.ratePerMin ?? "—";
  tDur.textContent = s.avgDurSec != null ? s.avgDurSec + " sn" : "—";
  const pOk = s.progress?.ok ?? 0, pFail = s.progress?.fail ?? 0;
  tRatio.textContent = pOk + pFail ? Math.round(100 * pOk / (pOk + pFail)) + "%" : "—";
  tRatio.style.color = pFail > pOk ? "var(--bad)" : "";
  const max = Math.max(1, ...s.buckets);
  spark.innerHTML = s.buckets.map(b =>
    '<div style="flex:1;border-radius:3px 3px 0 0;background:var(--good);opacity:' +
    (b ? ".9" : ".18") + ';height:' + Math.max(6, Math.round(100 * b / max)) + '%" title="' + b + '/dk"></div>'
  ).join("");
  const total = ready + gen + pend + err;
  barFill.style.width = total ? (100 * ready / total).toFixed(1) + "%" : "0";
  barLbl.textContent = ready + " / " + total + " hazır" + (s.progress?.finished ? " · koşu bitti" : "");
  // slot diff + animasyon
  const cur = new Set(s.generating.map(g => g.char));
  for (const [ch, el] of slotEls) {
    if (!cur.has(ch)) {
      const ev = s.events.find(e => e.char === ch);
      el.classList.add(ev && ev.outcome === "error" ? "exit-error" : "exit-ready");
      slotEls.delete(ch);
      setTimeout(() => el.remove(), 520);
    }
  }
  for (const g of s.generating) {
    if (!slotEls.has(g.char)) {
      const el = document.createElement("span");
      el.className = "slot enter";
      el.innerHTML = '<span class="kj" lang="ja">' + g.char + '</span><span class="lv">' + g.level + "</span>";
      document.getElementById("slots").appendChild(el);
      slotEls.set(g.char, el);
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove("enter")));
    }
  }
  const feed = document.getElementById("feed");
  if (s.events.length) feed.innerHTML = s.events.map(e =>
    '<span class="ev"><time>' + e.at + '</time><span class="kj" lang="ja">' + e.char +
    '</span><span>' + e.level + '</span><span class="' + (e.outcome === "ready" ? "ok\\">✓ hazır" : "er\\">✕ hata") +
    "</span></span>").join("");
}
btnStart.onclick = () => fetch("/api/start", {method:"POST",headers:{"content-type":"application/json"},
  body: JSON.stringify({conc: Number(conc.value) || 8})}).then(poll);
btnStop.onclick = () => fetch("/api/stop", {method:"POST"}).then(poll);
poll(); setInterval(poll, 2000);
</script></body></html>`;

createServer((req, res) => {
  const json = (code, obj) => {
    res.writeHead(code, { "content-type": "application/json" });
    res.end(JSON.stringify(obj));
  };
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(HTML);
  } else if (req.method === "GET" && req.url === "/api/state") {
    try {
      json(200, readState());
    } catch (e) {
      json(500, { error: String(e) });
    }
  } else if (req.method === "POST" && req.url === "/api/stop") {
    stopBlast();
    json(200, { ok: true });
  } else if (req.method === "POST" && req.url === "/api/start") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", async () => {
      const conc = Math.max(1, Math.min(32, Number(JSON.parse(body || "{}").conc) || 8));
      const ok = await startBlast(conc);
      json(ok ? 200 : 409, { ok, conc });
    });
  } else {
    json(404, { error: "not found" });
  }
}).listen(PORT, "127.0.0.1", () => {
  console.log(`blast dashboard: http://127.0.0.1:${PORT}`);
});
