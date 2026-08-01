#!/usr/bin/env node
// llm-bridge — yerel terminal CLI'larını OpenAI-uyumlu bir HTTP endpoint'e
// çevirir. Aboneliği olan (API key'i olmayan) kullanıcılar için: uygulama
// "OpenAI uyumlu" sağlayıcı olarak http://localhost:8484/v1 adresini görür,
// istekler bu makinedeki `claude -p` / `codex exec` / `copilot -p` /
// `gemini -p` / `opencode run` sürecine gider. Hiçbir şey dışarı çıkmaz.
//
// Kullanım:
//   node scripts/llm-bridge.mjs                          # claude backend, port 8484
//   node scripts/llm-bridge.mjs --backend opencode
//   node scripts/llm-bridge.mjs --backend claude --port 9000
//   node scripts/llm-bridge.mjs --origin https://kullanici.github.io
//   node scripts/llm-bridge.mjs --token gizli   # ek: bearer token zorunlu
//   node scripts/llm-bridge.mjs --timeout 600   # CLI tavan süresi (sn, vars. 420)
//
// Zaman aşımı: tavan `--timeout` (varsayılan 420s; ders üretimi 180s'i sık
// aşıyordu). Uygulama istek gövdesinde `bridge_timeout_ms` ile daha kısa bir
// süre isteyebilir; tavanı geçemez. Aşıldığında yanıt 500 değil
// **504 + {error:{type:"timeout"}}** olur, uygulama da bunu gerçek CLI
// hatasından ayırt eder.
//
// Birincil kurulum: bu dosya sitede servis edilir (out/llm-bridge.mjs),
// kullanıcı curl/iwr ile indirip node ile çalıştırır. `npx okumo-bridge`
// bilinçli olarak publish edilmedi (2026-07-31 kararı: ikinci supply-chain
// yüzeyi + ayrı release adımı, kazanç sıfır); paket iskeleti
// packages/okumo-bridge/ altında arşiv olarak duruyor (T-059).
//
// GET /health → { ok, backend, cliFound } — aynı Host/Origin/PNA
// kapısından geçer (T-039 aynen); "cliFound" yalnız PATH taraması, CLI
// login durumu iddia edilmez.
//
// Güvenlik (T-039 — derinlemesine savunma):
//   - Sadece 127.0.0.1'e bağlanır: ağdaki başka makineler erişemez.
//   - Host allowlist: `Host` başlığı localhost/127.0.0.1[:port] değilse
//     reddedilir → DNS rebinding (attacker.com → 127.0.0.1) ölür.
//   - Origin allowlist EXECUTION'ı gate'ler (yalnız CORS yanıt başlığını
//     değil): izinsiz origin CLI'yı hiç spawn etmez → drive-by CSRF kota
//     yakması ölür. Statik deploy için sayfanın origin'ini --origin ile ekleyin.
//   - Content-Type `application/json` zorunlu → CORS "simple request"
//     (text/plain, preflight'sız) yolu kapanır.
//   - PNA başlığı yalnız izinli origin'lere gönderilir; aksi halde
//     Chromium'un rebinding savunmasını her site için devre dışı bırakırdı.
//   - --token ile isteğe bağlı bearer token (Authorization: Bearer ...).
//   - claude backend'i ANTHROPIC_API_KEY'i child env'den siler — abonelik
//     yerine API faturalanmasın (uygulamadaki korumanın aynısı).

import http from "node:http";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// ---------------------------------------------------------------- argümanlar
const argv = process.argv.slice(2);
function argOf(name, fallback) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
}
function argsOf(name) {
  const out = [];
  argv.forEach((a, i) => {
    if (a === `--${name}` && argv[i + 1]) out.push(argv[i + 1]);
  });
  return out;
}

const BACKEND = argOf("backend", "claude");
const PORT = Number(argOf("port", "8484"));
// Varsayılan 420s. Eski 180s ders üretiminin süre dağılımının İÇİNDEYDİ
// (sahibin llm_calls verisi: balanced ders üretimlerinin ~%20'si 180s'i
// aşıyor, gözlenen max 255s), yani her 5 dersten biri SIGKILL yiyordu.
// Uygulama ayrıca istek gövdesinde `bridge_timeout_ms` geçebilir (aşağı bak);
// bu bayrak o alan yokken geçerli olan tabandır ve tavanı da o alan için
// belirler.
const TIMEOUT_MS = Number(argOf("timeout", "420")) * 1000;
const EXTRA_ORIGINS = argsOf("origin");
// İsteğe bağlı bearer token. Varsayılan kapalı: açıldığında kullanıcının
// token'ı uygulamanın "API anahtarı" alanına yapıştırması gerekir.
const TOKEN = argOf("token", process.env.LLM_BRIDGE_TOKEN || "");

// Boş bir çalışma dizini: CLI'lar bu projenin (veya kullanıcının) dosya
// bağlamını asla görmesin.
const WORKDIR = mkdtempSync(path.join(tmpdir(), "llm-bridge-"));

// ---------------------------------------------------------------- adaptörler
// Her adaptör: build(prompt, system, model) → {cmd, args, stdin?, env?}
// ve parse(stdout) → metin. claude dışındakiler best-effort: CLI sürümüne
// göre bayrak ayarı gerekebilir — tablo tek yerde, düzeltmesi kolay.

const ADAPTERS = {
  claude: {
    build(prompt, system, model) {
      const args = [
        "-p",
        "--output-format", "json",
        "--model", model || "sonnet",
        "--tools", "",
        "--no-session-persistence",
        "--disable-slash-commands",
        "--setting-sources", "",
      ];
      if (system) args.push("--system-prompt", system);
      // Abonelik girişini gölgeleyip API'ye faturalandırmasın:
      const env = { ...process.env };
      delete env.ANTHROPIC_API_KEY;
      delete env.ANTHROPIC_AUTH_TOKEN;
      return { cmd: "claude", args, stdin: prompt, env };
    },
    parse(stdout) {
      const envelope = JSON.parse(stdout);
      if (envelope.is_error) throw new Error(envelope.result ?? "claude hata döndürdü");
      return {
        text: envelope.result ?? "",
        usage: envelope.usage
          ? {
              prompt_tokens: envelope.usage.input_tokens,
              completion_tokens: envelope.usage.output_tokens,
            }
          : undefined,
      };
    },
  },

  codex: {
    // OpenAI Codex CLI (ChatGPT aboneliği): `codex exec` print modu.
    build(prompt, system, model) {
      const args = ["exec", "--skip-git-repo-check", "--sandbox", "read-only"];
      if (model) args.push("--model", model);
      args.push(system ? `${system}\n\n${prompt}` : prompt);
      return { cmd: "codex", args };
    },
    parse(stdout) {
      return { text: stdout.trim() };
    },
  },

  copilot: {
    // GitHub Copilot CLI: `copilot -p` print modu. Araçlar varsayılan kapalı.
    build(prompt, system) {
      return {
        cmd: "copilot",
        args: ["-p", system ? `${system}\n\n${prompt}` : prompt],
      };
    },
    parse(stdout) {
      return { text: stdout.trim() };
    },
  },

  gemini: {
    // Google Gemini CLI: `gemini -p` (ücretsiz Google hesabıyla da çalışır).
    build(prompt, system, model) {
      const args = ["-p", system ? `${system}\n\n${prompt}` : prompt];
      if (model) args.unshift("-m", model);
      return { cmd: "gemini", args };
    },
    parse(stdout) {
      return { text: stdout.trim() };
    },
  },

  opencode: {
    // opencode: `opencode run` — model "provider/model" formatında.
    build(prompt, system, model) {
      const args = ["run", system ? `${system}\n\n${prompt}` : prompt];
      if (model && model.includes("/")) args.push("--model", model);
      return { cmd: "opencode", args };
    },
    parse(stdout) {
      return { text: stdout.trim() };
    },
  },
};

const adapter = ADAPTERS[BACKEND];
if (!adapter) {
  console.error(
    `Bilinmeyen backend: ${BACKEND}. Seçenekler: ${Object.keys(ADAPTERS).join(", ")}`
  );
  process.exit(1);
}

// Backend CLI'ının bu makinede kurulu olup olmadığı — "which"/"where" ile
// ucuz bir PATH taraması. Login/abonelik durumu bilinmez, iddia edilmez.
// Kısa TTL'li bellek: her /health isteğinde spawn etmeyip, ama kullanıcı
// CLI'yı kurup tekrar denediğinde de bayat sonuç dönmeyelim (T-060 akışı).
const CLI_FOUND_TTL_MS = 30_000;
let cliFoundCache = { value: null, checkedAt: 0 };
function checkCliFound() {
  const now = Date.now();
  if (cliFoundCache.value !== null && now - cliFoundCache.checkedAt < CLI_FOUND_TTL_MS) {
    return cliFoundCache.value;
  }
  const which = process.platform === "win32" ? "where" : "which";
  const result = spawnSync(which, [BACKEND], { stdio: "ignore" });
  const found = result.status === 0;
  cliFoundCache = { value: found, checkedAt: now };
  return found;
}

/** Zaman aşımını çağıran taraftan ayırt edilebilir kılan hata tipi:
 * sunucu bunu 504 + {error:{type:"timeout"}} olarak yanıtlar, uygulama da
 * LlmTimeoutError'a çevirip "üretim çok uzun sürdü" mesajını basar. Düz 500
 * ise gerçek CLI hatası demek. */
class BridgeTimeoutError extends Error {
  constructor(cmd, ms) {
    super(`${cmd} zaman aşımı (${ms / 1000}s)`);
    this.type = "timeout";
    this.timeoutMs = ms;
  }
}

/** İstemci bağlantıyı kopardı (fetch abort / sekme kapandı). Yanıt yazılacak
 * kimse kalmadığı için loglanır ve sessizce geçilir; 500 sayılmaz. */
class BridgeCancelledError extends Error {
  constructor(cmd) {
    super(`${cmd} iptal edildi (istemci vazgeçti)`);
    this.type = "cancelled";
  }
}

// ------------------------------------------------------------------- yardımcı
/** `cancel`: istek başına iptal durumu. İstemci bağlantıyı koparınca
 * `requested` true olur ve `kill` (varsa) çalışan CLI sürecini öldürür.
 * Bu olmadan "Vazgeç" yalnız tarayıcı tarafını keser: CLI süreci tavana
 * kadar zombi olarak koşar VE tek şeritli kuyruğu işgal eder; kullanıcının
 * yeniden başlattığı üretim zombinin arkasında dakikalarca bekler. */
function runCli({ cmd, args, stdin, env }, timeoutMs = TIMEOUT_MS, cancel) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: WORKDIR, env: env ?? process.env });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let cancelled = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);
    if (cancel) {
      cancel.kill = () => {
        cancelled = true;
        child.kill("SIGKILL");
      };
      // Yarış: bağlantı, süreç spawn edilmeden hemen önce kopmuş olabilir.
      if (cancel.requested) cancel.kill();
    }

    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`${cmd} başlatılamadı: ${err.message} (kurulu mu?)`));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (cancel) cancel.kill = null;
      if (cancelled) return reject(new BridgeCancelledError(cmd));
      if (timedOut) return reject(new BridgeTimeoutError(cmd, timeoutMs));
      if (code !== 0)
        return reject(new Error(`${cmd} hata verdi (exit ${code}): ${stderr.slice(0, 500)}`));
      resolve(stdout);
    });

    if (stdin) child.stdin.write(stdin);
    child.stdin.end();
  });
}

/**
 * İstek başına CLI zaman aşımı. Uygulama uzun üretimler (ders/müfredat) için
 * gövdede `bridge_timeout_ms` geçer; BAŞLIK kullanılmaz, çünkü özel bir başlık
 * cross-origin preflight'ta eski köprülerin `access-control-allow-headers`
 * listesinde olmadığı için isteği tarayıcıda TAMAMEN öldürürdü (geriye uyum).
 * Bilinmeyen gövde alanı ise eski köprü tarafından sessizce yok sayılır.
 * Tavan `--timeout`: kullanıcının makinesinde ne kadar süreceğine son sözü
 * köprüyü çalıştıran kişi söyler.
 */
function timeoutForRequest(parsed) {
  const raw = Number(parsed?.bridge_timeout_ms);
  if (!Number.isFinite(raw) || raw <= 0) return TIMEOUT_MS;
  return Math.min(raw, TIMEOUT_MS);
}

// Aynı anda tek CLI süreci (abonelik limitleri + makine yükü).
let chain = Promise.resolve();
let pendingCount = 0;
/** Şu an çalışan ya da sırada bekleyen iş var mı? Yeni isteğin log satırına
 * "sırada" notu düşmek için; davranışı etkilemez. */
function chainIsBusy() {
  return pendingCount > 0;
}
function serialize(fn) {
  pendingCount++;
  const next = chain.then(fn, fn);
  chain = next.catch(() => {});
  next.finally(() => pendingCount--).catch(() => {});
  return next;
}

function messagesToPrompt(messages) {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => contentText(m.content))
    .join("\n\n");
  const rest = messages
    .filter((m) => m.role !== "system")
    .map((m) => contentText(m.content))
    .join("\n\n");
  return { system: system || undefined, prompt: rest };
}
function contentText(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content))
    return content.map((c) => c.text ?? "").join("\n");
  return String(content ?? "");
}

const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
// Host başlığı: yalnız loopback isimleri. Sunucu 127.0.0.1'e bind olduğu için
// başka bir Host ancak DNS rebinding'le (attacker.com → 127.0.0.1) gelebilir.
const LOCAL_HOST = /^(localhost|127\.0\.0\.1)(:\d+)?$/i;

/**
 * İsteği yetkilendir. `ok:false` → CLI ASLA çalışmaz, CORS başlığı verilmez.
 * Katmanlar: Host allowlist → Origin allowlist → bearer token.
 */
function authorize(req) {
  const host = req.headers.host ?? "";
  if (!LOCAL_HOST.test(host)) {
    return { ok: false, status: 403, reason: `host_not_allowed (${host || "-"})` };
  }
  const origin = req.headers.origin;
  // Origin yoksa istek tarayıcıdan gelmiyor (curl / node http-provider /
  // llm:smoke). Tarayıcılar POST'ta Origin'i her zaman gönderir, bu yüzden
  // bu dal drive-by saldırganın erişebileceği bir yol değil.
  const originOk =
    !origin || LOCAL_ORIGIN.test(origin) || EXTRA_ORIGINS.includes(origin);
  if (!originOk) return { ok: false, status: 403, reason: `origin_not_allowed (${origin})` };

  if (TOKEN) {
    const auth = req.headers.authorization ?? "";
    const given = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (given !== TOKEN) return { ok: false, status: 401, reason: "bad_token" };
  }
  return { ok: true, origin };
}

/** CORS başlıkları YALNIZ yetkili isteklere (PNA dahil — bkz. T-039/3). */
function corsHeaders(auth) {
  if (!auth.ok) return {};
  return {
    ...(auth.origin ? { "access-control-allow-origin": auth.origin } : {}),
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type, authorization",
    // Chrome Private Network Access: public sayfa → localhost isteği için.
    // Koşulsuz gönderilirse Chromium'un rebinding savunmasını her origin
    // için kapatır; bu yüzden yalnız izinli origin'e.
    "access-control-allow-private-network": "true",
  };
}

/** İzin verilen tek gövde tipi: application/json (charset eki serbest). */
function isJsonContentType(req) {
  const raw = req.headers["content-type"];
  if (!raw) return false;
  return raw.split(";")[0].trim().toLowerCase() === "application/json";
}

function deny(req, res, { status, reason }) {
  req.resume(); // gövdeyi tüket: bağlantı temiz kapansın (gövde okunmaz)
  console.warn(`[bridge] REDDEDİLDİ (${status}): ${reason}`);
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: { message: `bridge: request rejected (${reason})` } }));
}

// -------------------------------------------------------------------- sunucu
const server = http.createServer(async (req, res) => {
  // Tek kapı: Host + Origin (+ token). Başarısızsa hiçbir yol çalışmaz —
  // preflight bile ACAO/PNA almaz, POST ise runCli'ya asla ulaşmaz.
  const auth = authorize(req);
  if (!auth.ok) return deny(req, res, auth);
  const cors = corsHeaders(auth);

  if (req.method === "OPTIONS") {
    res.writeHead(204, cors);
    return res.end();
  }

  const urlPath = (req.url ?? "").split("?")[0];
  if (req.method === "GET" && urlPath === "/health") {
    res.writeHead(200, { ...cors, "content-type": "application/json" });
    return res.end(
      JSON.stringify({ ok: true, backend: BACKEND, cliFound: checkCliFound() })
    );
  }

  if (req.method === "GET" && req.url === "/v1/models") {
    res.writeHead(200, { ...cors, "content-type": "application/json" });
    return res.end(JSON.stringify({ data: [{ id: BACKEND, object: "model" }] }));
  }

  if (req.method === "POST" && req.url === "/v1/chat/completions") {
    // CORS "simple request" (text/plain) yolunu kapat: preflight'sız
    // cross-origin POST artık gövde okunmadan reddedilir.
    if (!isJsonContentType(req)) {
      return deny(req, res, {
        status: 415,
        reason: `content_type (${req.headers["content-type"] ?? "-"})`,
      });
    }
    let body = "";
    // İstek başına iptal durumu: yanıt bitmeden bağlantı kapanırsa istemci
    // vazgeçmiş demektir. Çalışan CLI süreci öldürülür; sıradaysa hiç
    // başlatılmaz. res "close" hem normal bitişte hem kopuşta gelir;
    // writableEnded ikisini ayırır.
    const cancel = { requested: false, kill: null };
    res.on("close", () => {
      if (!res.writableEnded) {
        cancel.requested = true;
        cancel.kill?.();
      }
    });
    req.on("data", (d) => (body += d));
    req.on("end", async () => {
      const started = Date.now();
      // Şeffaflık: köprü yalnız iş bitince log basıyordu; 3 dakikalık bir
      // üretim boyunca ekran sessiz kalınca "istek hiç gelmedi" sanılıyor.
      // Artık istek anında, sürerken (30 sn'de bir) ve her sonuçta satır var.
      // Etiket: uygulama gövdede `bridge_label` geçer ("ders: Sayaçlar ...");
      // eski uygulama sürümü geçmezse model adına düşülür.
      let heartbeat = null;
      try {
        const parsed = JSON.parse(body);
        const { system, prompt } = messagesToPrompt(parsed.messages ?? []);
        // Tier adları model seçilmemiş demek — CLI'ya geçirme, backend
        // kendi varsayılanını kullansın (codex/gemini bilinmeyen modelde patlar).
        const model = ["fast", "balanced", "deep"].includes(parsed.model)
          ? undefined
          : parsed.model;
        const label =
          typeof parsed.bridge_label === "string" && parsed.bridge_label.trim()
            ? parsed.bridge_label.trim().replace(/\s+/g, " ").slice(0, 160)
            : `model=${parsed.model ?? "-"}`;
        const spec = adapter.build(prompt, system, model);
        const timeoutMs = timeoutForRequest(parsed);
        console.log(
          `[bridge] istek: ${label} (timeout ${Math.round(timeoutMs / 1000)}s${chainIsBusy() ? ", sırada" : ""})`
        );
        heartbeat = setInterval(() => {
          const s = Math.round((Date.now() - started) / 1000);
          console.log(`[bridge] sürüyor: ${label} (${s}s)`);
        }, 30_000);
        const stdout = await serialize(() => {
          // Sırası gelmeden vazgeçildiyse CLI hiç başlatılmaz: zombi üretim
          // tek şeritli kuyruğu dakikalarca işgal etmesin.
          if (cancel.requested) throw new BridgeCancelledError(spec.cmd);
          return runCli(spec, timeoutMs, cancel);
        });
        clearInterval(heartbeat);
        const { text, usage } = adapter.parse(stdout);
        const secs = ((Date.now() - started) / 1000).toFixed(1);
        console.log(
          `[bridge] bitti: ${label} — ${secs}s ${text.length}ch (backend=${BACKEND} model=${parsed.model ?? "-"})`
        );
        res.writeHead(200, { ...cors, "content-type": "application/json" });
        res.end(
          JSON.stringify({
            id: `bridge-${Date.now()}`,
            object: "chat.completion",
            model: parsed.model ?? BACKEND,
            choices: [
              {
                index: 0,
                message: { role: "assistant", content: text },
                finish_reason: "stop",
              },
            ],
            ...(usage ? { usage } : {}),
          })
        );
      } catch (err) {
        if (heartbeat) clearInterval(heartbeat);
        const message = err instanceof Error ? err.message : String(err);
        // İptal hata değil: istemci gitti, yanıt yazacak soket de yok.
        // Logla ve çık; 500 sayılmasın, kuyruk bir sonrakine geçsin.
        if (err instanceof BridgeCancelledError) {
          console.log(`[bridge] iptal: ${message}`);
          res.destroy();
          return;
        }
        console.error(`[bridge] HATA: ${message}`);
        // Zaman aşımı ayrı statü + tip: uygulama bunu LlmTimeoutError'a
        // çevirip "üretim çok uzun sürdü, tekrar dene" diyebilsin. Diğer her
        // şey 500 olarak kalır (davranış değişmedi).
        const isTimeout = err instanceof BridgeTimeoutError;
        res.writeHead(isTimeout ? 504 : 500, {
          ...cors,
          "content-type": "application/json",
        });
        res.end(
          JSON.stringify({
            error: isTimeout
              ? { message, type: "timeout", timeout_ms: err.timeoutMs }
              : { message },
          })
        );
      }
    });
    return;
  }

  res.writeHead(404, cors);
  res.end();
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`llm-bridge hazır → http://localhost:${PORT}/v1`);
  console.log(`  backend : ${BACKEND} (${Object.keys(ADAPTERS).join(" | ")})`);
  console.log(`  origins : localhost + ${EXTRA_ORIGINS.join(", ") || "(ek yok)"}`);
  console.log(`  timeout : ${TIMEOUT_MS / 1000}s (tavan; uygulama daha kısa isteyebilir)`);
  console.log(`  token   : ${TOKEN ? "gerekli (--token)" : "kapalı"}`);
  if (TOKEN) {
    console.log(`            Uygulamada "API anahtarı" alanına yapıştır: ${TOKEN}`);
  }
  console.log(
    `Uygulamada: Ayarlar → LLM Sağlayıcı → "API / Yerel sunucu" → Base URL: http://localhost:${PORT}/v1`
  );
});
