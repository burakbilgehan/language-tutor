// T-064: pluggable MT engine boundary. Everything upstream (field whitelist,
// placeholder protection, seed shaping) talks to this ONE function — swapping
// Argos for an LLM-batch pass later (the ticket's stated devirme koşulu if
// spot-check quality doesn't clear the bar) means implementing this interface
// again, not touching the rest of the pipeline.
export interface TranslateEngine {
  /** Translate `texts` in order; the result MUST be the same length. An
   * engine that cannot translate a given string should return it unchanged
   * (never throw per-item — throw only for total engine failure). */
  translate(texts: string[]): Promise<string[]>;

  /**
   * Whether bracket-notation/CJK runs need to be swapped out for sentinel
   * placeholders before this engine sees the text (see mt/protect.ts).
   *
   * Measured difference (T-064): a real instruction-following LLM (LlmEngine)
   * reliably preserves 漢字[かんじ] and bare CJK verbatim when told to, and
   * placeholder tokens are pure overhead that can themselves get mangled in a
   * long string with many of them (observed: one dropped sentinel out of 14
   * in a dense intro, corrupting a string the LLM would otherwise have
   * translated perfectly with NO protection). An engine with no language
   * understanding of its own (ArgosEngine, a from-scratch NMT engine) has no
   * such guarantee and MUST be protected. translateGrammarTopic branches on
   * this instead of always protecting.
   */
  readonly needsProtection: boolean;
}

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/**
 * Argos Translate via the local venv set up by scripts/mt/setup-argos.sh.
 * One subprocess call per `translate()` invocation (batched — NOT one spawn
 * per string), talking newline-free JSON over stdin/stdout.
 *
 * TRIED AND REJECTED FOR THIS TICKET (kept for the record + as an offline
 * option if the LLM path ever needs a fallback with zero Max-sub usage).
 * Measured against the real tr→en Argos model on production topic text:
 *   1. Placeholder corruption: a digit-bearing sentinel token
 *      ("XPLACEHOLDERX13X") came back mangled ("...X13X13X") in ~1/3 of
 *      protected runs — the tokenizer's number-handling duplicates/echoes
 *      numeric substrings across word boundaries. Switching to a letters-only
 *      sentinel (see protect.ts) fixed the ENCODING half of the problem.
 *   2. Clause dropping (disqualifying, not fixable by re-encoding): the model
 *      itself silently drops or summarizes whole clauses under length/
 *      complexity pressure — e.g. "Dakuten (゛) ve Handakuten (゜) ile Türeyen
 *      Sesler (濁音・半濁音)" → "Dakuten (゛) and Handakuten (゜)", the third
 *      parenthetical vanished. This IS caught when the dropped clause
 *      contained a protected placeholder (counted as a "missing" and the
 *      topic is skipped), but a dropped clause of plain prose produces ZERO
 *      missing placeholders and would ship silently corrupted. With the
 *      strict placeholder check: ~1/10 topics passed on the ja→en spot-check.
 *      Without it: unverifiable content loss. Neither is deliverable.
 * See scripts/mt/engine.ts LlmEngine for what replaced it.
 */
export class ArgosEngine implements TranslateEngine {
  readonly needsProtection = true;

  constructor(
    private fromCode: string,
    private toCode: string,
    private venvDir = path.join(process.cwd(), ".argos-venv")
  ) {}

  isAvailable(): boolean {
    return fs.existsSync(path.join(this.venvDir, "bin", "python3"));
  }

  async translate(texts: string[]): Promise<string[]> {
    if (!this.isAvailable()) {
      throw new Error(
        `Argos venv not found at ${this.venvDir} — run scripts/mt/setup-argos.sh ${this.fromCode} ${this.toCode} first`
      );
    }
    const python = path.join(this.venvDir, "bin", "python3");
    const certFile = spawnSync(python, [
      "-c",
      "import certifi; print(certifi.where())",
    ])
      .stdout.toString()
      .trim();
    const worker = path.join(__dirname, "argos-worker.py");
    const result = spawnSync(python, [worker, this.fromCode, this.toCode], {
      input: JSON.stringify(texts),
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 64,
      env: { ...process.env, SSL_CERT_FILE: certFile || process.env.SSL_CERT_FILE },
    });
    if (result.status !== 0) {
      throw new Error(
        `argos-worker.py exited ${result.status}: ${result.stderr?.slice(0, 4000)}`
      );
    }
    const out = JSON.parse(result.stdout) as string[];
    if (out.length !== texts.length) {
      throw new Error(
        `argos-worker.py returned ${out.length} items for ${texts.length} inputs`
      );
    }
    return out;
  }
}

/**
 * LLM-based translation via the app's own provider seam (getProvider(),
 * `fast` tier — same posture as scripts/blast-generate.ts: the owner running
 * a one-off script against his own Max subscription, not a new API-key
 * dependency). This is the engine actually used for the ja→en spot-check
 * (see the comment on ArgosEngine below for why Argos lost).
 *
 * Uses the same {id, text} echo pattern as retranslateCurriculum
 * (src/core/curriculum-gen.ts) / CurriculumTranslationSchema: send every
 * string in the batch as an opaque-id'd item, require every id to come back.
 * A missing id is a DETECTABLE dropped clause (unlike Argos, which drops
 * silently) — translate() throws on any miss, which the per-topic caller in
 * scripts/mt-grammar-seed.ts treats as ATLA for that topic, never a
 * silently-corrupted ship.
 *
 * No placeholder protection needed: an instruction-following model reliably
 * preserves bracket notation (漢字[かんじ]) and bare target-language text
 * verbatim when told to — verified manually against the real CLI provider
 * (haiku/fast) before wiring this in. protect.ts / restoreText are kept as a
 * cheap tripwire in translate-grammar-topic.ts regardless (defense in depth),
 * but they are expected to report 0 missing on this engine.
 */
export class LlmEngine implements TranslateEngine {
  readonly needsProtection = false;

  constructor(
    private targetLanguage: string,
    private nativeLanguage: string,
    // "fast" (haiku) handles most topics; callers may escalate a stubborn
    // topic to "balanced" (sonnet) when haiku keeps translating inline CJK
    // descriptors embedded in the Turkish prose despite the instruction.
    private tier: "fast" | "balanced" = "fast"
  ) {}

  async translate(texts: string[]): Promise<string[]> {
    if (texts.length === 0) return [];
    const { z } = await import("zod");
    const { getProvider } = await import("@/lib/llm/provider");
    const { languageName, nativeLanguageName } = await import(
      "@/lib/profile-options"
    );
    const gen = getProvider();
    const lang = languageName(this.targetLanguage);
    const native = nativeLanguageName(this.nativeLanguage);

    const items = texts.map((text, i) => ({ id: String(i), text }));
    const schema = z.object({
      items: z.array(z.object({ id: z.string(), text: z.string() })),
    });
    const system =
      `You are a translation assistant preparing a ${lang} grammar reference for ` +
      `${native}-speaking learners. Translate each item's "text" from Turkish to ` +
      `${native}. Preserve ${lang} sentences and any bracket-notation reading ` +
      `(e.g. 漢字[かんじ] or 学习[xuéxí]) EXACTLY as written, character for ` +
      `character — never translate, alter, or drop them. This includes single ` +
      `${lang} characters inside mixed terms: every contiguous run of ${lang} ` +
      `script in the source must reappear verbatim in your translation. For ` +
      `example です・ます形 must stay です・ます形 (NOT "です・ます form"), and ` +
      `た形 must stay た形 (NOT "た form"). Return every item's "id" ` +
      `unchanged, and return EVERY id you were given — never omit one. Return only ` +
      `the requested JSON.`;
    const prompt =
      `Translate the "text" of each item below into ${native}. Do not change "id". ` +
      `Preserve any ${lang} text and any [reading] bracket notation exactly as ` +
      `written.\n\n${JSON.stringify(items)}\n\n` +
      `Output: { "items": [ { "id": "...", "text": "translation" }, ... ] }`;

    const result = await gen.generateJson({
      system,
      prompt,
      schema,
      fixtureKey: "grammar-mt",
      tier: this.tier,
      timeoutMs: 120_000,
    });
    const byId = new Map(result.items.map((it) => [it.id, it.text]));
    const missing = items.filter((it) => {
      const v = byId.get(it.id);
      return v === undefined || v === null;
    });
    if (missing.length > 0) {
      throw new Error(
        `LLM dropped ${missing.length}/${items.length} item(s) in this batch`
      );
    }
    return items.map((it) => byId.get(it.id)!);
  }
}

/**
 * Stub engine: used when no real MT engine is set up in this environment
 * (e.g. no network access to fetch the Argos model, or the pip install was
 * blocked). Returns input unchanged with a fixed marker prefix so a dry run
 * of the pipeline (whitelist, placeholder protection, seed shaping, output
 * file layout) is still exercisable and reviewable end-to-end without a real
 * translation happening. Its output is NEVER ship-ready: scripts/
 * mt-grammar-seed.ts writes stub runs to a separate `<target>.<native>.stub.json`
 * file (gitignored) that the app never loads, so a stub run can neither
 * poison the real seed file's incremental skip nor get committed.
 */
export class StubEngine implements TranslateEngine {
  // Prepending a marker preserves the input verbatim (including any
  // placeholder tokens), so protection is exercised either way — set true to
  // keep the pipeline dry run representative of the stricter (Argos-like)
  // path by default.
  readonly needsProtection = true;

  async translate(texts: string[]): Promise<string[]> {
    return texts.map((t) => (t ? `[STUB-MT] ${t}` : t));
  }
}
