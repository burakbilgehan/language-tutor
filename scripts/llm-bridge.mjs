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
//
// Güvenlik:
//   - Sadece 127.0.0.1'e bağlanır: ağdaki başka makineler erişemez.
//   - CORS varsayılanı localhost origin'leri; statik deploy'dan kullanmak
//     için sayfanın origin'ini --origin ile ekleyin (drive-by websitelerin
//     köprünüzü kullanmasını engeller).
//   - claude backend'i ANTHROPIC_API_KEY'i child env'den siler — abonelik
//     yerine API faturalanmasın (uygulamadaki korumanın aynısı).

import http from "node:http";
import { spawn } from "node:child_process";
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
const TIMEOUT_MS = Number(argOf("timeout", "180")) * 1000;
const EXTRA_ORIGINS = argsOf("origin");

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

// ------------------------------------------------------------------- yardımcı
function runCli({ cmd, args, stdin, env }) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: WORKDIR, env: env ?? process.env });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, TIMEOUT_MS);

    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`${cmd} başlatılamadı: ${err.message} (kurulu mu?)`));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (timedOut) return reject(new Error(`${cmd} zaman aşımı (${TIMEOUT_MS / 1000}s)`));
      if (code !== 0)
        return reject(new Error(`${cmd} hata verdi (exit ${code}): ${stderr.slice(0, 500)}`));
      resolve(stdout);
    });

    if (stdin) child.stdin.write(stdin);
    child.stdin.end();
  });
}

// Aynı anda tek CLI süreci (abonelik limitleri + makine yükü).
let chain = Promise.resolve();
function serialize(fn) {
  const next = chain.then(fn, fn);
  chain = next.catch(() => {});
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
function corsHeaders(req) {
  const origin = req.headers.origin;
  const allowed =
    !origin || LOCAL_ORIGIN.test(origin) || EXTRA_ORIGINS.includes(origin);
  return {
    ...(allowed && origin ? { "access-control-allow-origin": origin } : {}),
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type, authorization",
    // Chrome Private Network Access: public sayfa → localhost isteği için.
    "access-control-allow-private-network": "true",
  };
}

// -------------------------------------------------------------------- sunucu
const server = http.createServer(async (req, res) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") {
    res.writeHead(204, cors);
    return res.end();
  }

  if (req.method === "GET" && req.url === "/v1/models") {
    res.writeHead(200, { ...cors, "content-type": "application/json" });
    return res.end(JSON.stringify({ data: [{ id: BACKEND, object: "model" }] }));
  }

  if (req.method === "POST" && req.url === "/v1/chat/completions") {
    let body = "";
    req.on("data", (d) => (body += d));
    req.on("end", async () => {
      const started = Date.now();
      try {
        const parsed = JSON.parse(body);
        const { system, prompt } = messagesToPrompt(parsed.messages ?? []);
        // Tier adları model seçilmemiş demek — CLI'ya geçirme, backend
        // kendi varsayılanını kullansın (codex/gemini bilinmeyen modelde patlar).
        const model = ["fast", "balanced", "deep"].includes(parsed.model)
          ? undefined
          : parsed.model;
        const spec = adapter.build(prompt, system, model);
        const stdout = await serialize(() => runCli(spec));
        const { text, usage } = adapter.parse(stdout);
        const secs = ((Date.now() - started) / 1000).toFixed(1);
        console.log(
          `[bridge] backend=${BACKEND} model=${parsed.model ?? "-"} ${secs}s ${text.length}ch`
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
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[bridge] HATA: ${message}`);
        res.writeHead(500, { ...cors, "content-type": "application/json" });
        res.end(JSON.stringify({ error: { message } }));
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
  console.log(
    `Uygulamada: Ayarlar → LLM Sağlayıcı → "API / Yerel sunucu" → Base URL: http://localhost:${PORT}/v1`
  );
});
