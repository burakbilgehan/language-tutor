import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { z } from "zod";
import {
  type LlmProvider,
  type GenerateJsonOptions,
  type GenerateTextOptions,
  type ModelTier,
  LlmError,
  LlmAuthError,
  LlmParseError,
  LlmTimeoutError,
  modelForTier,
} from "./provider";
import { enqueue } from "./queue";

const DEFAULT_TIMEOUT_MS = 120_000;

interface CliEnvelope {
  type?: string;
  is_error?: boolean;
  result?: string;
  total_cost_usd?: number;
  usage?: { input_tokens?: number; output_tokens?: number };
}

function recordCall(row: {
  purpose: string;
  model: string;
  tier: ModelTier;
  durationMs: number;
  costUsd: number;
  inputTokens?: number;
  outputTokens?: number;
}) {
  // Lazy import: keeps the provider usable from plain tsx scripts too.
  import("@/db")
    .then(({ db, tables }) =>
      db
        .insert(tables.llmCalls)
        .values({ id: crypto.randomUUID(), ...row })
        .run()
    )
    .catch((err) => console.warn("[llm] usage kaydedilemedi:", err));
}

function workdir(): string {
  // Empty dir so the CLI never picks up this project's CLAUDE.md/settings.
  const dir = path.join(process.cwd(), "data", "llm-workdir");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function runCli(opts: {
  prompt: string;
  system?: string;
  tier: ModelTier;
  purpose: string;
  jsonSchema?: object;
  timeoutMs: number;
}): Promise<string> {
  const args = [
    "-p",
    "--output-format",
    "json",
    "--model",
    modelForTier(opts.tier),
    "--tools",
    "",
    "--no-session-persistence",
    "--disable-slash-commands",
    "--setting-sources",
    "",
  ];
  if (opts.system) args.push("--system-prompt", opts.system);
  if (opts.jsonSchema)
    args.push("--json-schema", JSON.stringify(opts.jsonSchema));
  if (opts.tier === "deep") args.push("--fallback-model", "sonnet");

  // A set ANTHROPIC_API_KEY would shadow the Max-subscription login and bill
  // the API instead — strip it from the child env.
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;
  delete env.ANTHROPIC_AUTH_TOKEN;

  return new Promise<string>((resolve, reject) => {
    const started = Date.now();
    const child = spawn("claude", args, { cwd: workdir(), env });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, opts.timeoutMs);

    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(new LlmError(`claude CLI başlatılamadı: ${err.message}`));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      const secs = ((Date.now() - started) / 1000).toFixed(1);
      console.log(
        `[llm] tier=${opts.tier} model=${modelForTier(opts.tier)} exit=${code} ${secs}s`
      );
      if (timedOut) {
        return reject(
          new LlmTimeoutError(`LLM çağrısı ${opts.timeoutMs / 1000}s içinde bitmedi`)
        );
      }
      const combined = stdout + "\n" + stderr;
      if (/\/login|authentication|not logged in|oauth/i.test(combined) && code !== 0) {
        return reject(
          new LlmAuthError(
            "Claude oturumu bulunamadı. Terminalde `claude` çalıştırıp giriş yap.",
            combined
          )
        );
      }
      if (code !== 0) {
        return reject(
          new LlmError(`claude CLI hata verdi (exit ${code})`, combined)
        );
      }
      let envelope: CliEnvelope;
      try {
        envelope = JSON.parse(stdout) as CliEnvelope;
      } catch {
        return reject(new LlmError("CLI çıktısı JSON değil", stdout));
      }
      if (envelope.is_error) {
        if (/\/login|authentication|oauth/i.test(envelope.result ?? "")) {
          return reject(
            new LlmAuthError(
              "Claude oturumu bulunamadı. Terminalde `claude` çalıştırıp giriş yap.",
              envelope.result
            )
          );
        }
        return reject(new LlmError("LLM hata döndürdü", envelope.result));
      }
      recordCall({
        purpose: opts.purpose,
        model: modelForTier(opts.tier),
        tier: opts.tier,
        durationMs: Date.now() - started,
        costUsd: envelope.total_cost_usd ?? 0,
        inputTokens: envelope.usage?.input_tokens,
        outputTokens: envelope.usage?.output_tokens,
      });
      resolve(envelope.result ?? "");
    });

    child.stdin.write(opts.prompt);
    child.stdin.end();
  });
}

/** Strip markdown fences / surrounding prose, keep the first JSON value. */
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.search(/[{[]/);
  if (start === -1) return body.trim();
  const open = body[start];
  const close = open === "{" ? "}" : "]";
  const end = body.lastIndexOf(close);
  return end > start ? body.slice(start, end + 1) : body.slice(start);
}

export class ClaudeCliProvider implements LlmProvider {
  async generateJson<T>(opts: GenerateJsonOptions<T>): Promise<T> {
    const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    // CLI's validator doesn't accept the draft-2020-12 $schema marker.
    const jsonSchema = z.toJSONSchema(opts.schema as z.ZodType<T>, {
      target: "draft-7",
    }) as Record<string, unknown>;
    delete jsonSchema.$schema;

    return enqueue(async () => {
      let raw = await runCli({
        prompt: opts.prompt,
        system: opts.system,
        tier: opts.tier,
        purpose: opts.fixtureKey,
        jsonSchema,
        timeoutMs,
      });

      for (let attempt = 0; ; attempt++) {
        const parsed = opts.schema.safeParse(
          tryJsonParse(extractJson(raw))
        );
        if (parsed.success) return parsed.data;
        if (attempt >= 1) {
          throw new LlmParseError(
            `LLM çıktısı şemaya uymadı: ${parsed.error.message}`,
            raw
          );
        }
        raw = await runCli({
          prompt:
            opts.prompt +
            `\n\nÖnceki çıktın şemaya uymadı. Hatalar: ${parsed.error.message}\nSADECE geçerli JSON döndür, başka hiçbir şey yazma.`,
          system: opts.system,
          tier: opts.tier,
          purpose: `${opts.fixtureKey}-retry`,
          jsonSchema,
          timeoutMs,
        });
      }
    });
  }

  async generateText(opts: GenerateTextOptions): Promise<string> {
    const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    return enqueue(() =>
      runCli({
        prompt: opts.prompt,
        system: opts.system,
        tier: opts.tier,
        purpose: opts.fixtureKey,
        timeoutMs,
      })
    );
  }
}

function tryJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
