// T-064: one-time translation of the grammar index TITLES into a native
// language. The titles (src/lib/grammar-index/{ja,zh,nl}.ts, `title_tr`) are
// the single biggest piece of the perceived-English experience — they're
// what an en-native user sees in the sidebar for every topic, translated or
// not (a "pending" topic still shows its title). There is no DB row to seed
// here; this is deterministic index DATA, so the output is a companion JSON
// keyed by slug, loaded by grammarIndexFor's callers (see src/core/grammar.ts
// resolveTitle) rather than a hand-edited field on 555 TS object literals
// across three files.
//
// Output: src/lib/grammar-index/titles.<native>.json — { [slug]: title }.
// Committed like the grammar-seed JSON, NOT regenerated at build time.
//
// Usage:
//   npm run seed:grammar:titles -- en           # all three languages, full run
//   npm run seed:grammar:titles -- en --limit 10 --lang ja   # spot-check slice
import fs from "node:fs";
import path from "node:path";
import { grammarIndexFor } from "@/lib/grammar-index";

const OUT_DIR = "src/lib/grammar-index";
const LANGS = ["ja", "zh", "nl"];

function parseArgs(argv: string[]) {
  const positional = argv.filter((a) => !a.startsWith("--"));
  const [nativeLanguage] = positional;
  const limitFlag = argv.indexOf("--limit");
  const limit = limitFlag !== -1 ? Number(argv[limitFlag + 1]) : undefined;
  const langFlag = argv.indexOf("--lang");
  const onlyLang = langFlag !== -1 ? argv[langFlag + 1] : undefined;
  return { nativeLanguage, limit, onlyLang };
}

async function translateBatch(
  targetLanguage: string,
  nativeLanguage: string,
  items: { id: string; text: string }[]
): Promise<Map<string, string>> {
  const { z } = await import("zod");
  const { getProvider } = await import("@/lib/llm/provider");
  const { languageName, nativeLanguageName } = await import(
    "@/lib/profile-options"
  );
  const gen = getProvider();
  const lang = languageName(targetLanguage);
  const native = nativeLanguageName(nativeLanguage);

  const schema = z.object({
    items: z.array(z.object({ id: z.string(), text: z.string() })),
  });
  const system =
    `You are a translation assistant. Translate short ${lang} grammar-topic ` +
    `titles from Turkish to ${native}. Keep them terse (title-length, not a ` +
    `sentence). Preserve any ${lang} script or bracket-notation reading ` +
    `(e.g. 漢字[かんじ]) exactly as written. Return every item's "id" ` +
    `unchanged, and return EVERY id you were given — never omit one. Return ` +
    `only the requested JSON.`;
  const prompt =
    `Translate the "text" of each item (a grammar-topic title) into ${native}. ` +
    `Do not change "id".\n\n${JSON.stringify(items)}\n\n` +
    `Output: { "items": [ { "id": "...", "text": "translation" }, ... ] }`;

  const result = await gen.generateJson({
    system,
    prompt,
    schema,
    fixtureKey: "grammar-mt-titles",
    tier: "fast",
    timeoutMs: 120_000,
  });
  return new Map(result.items.map((it) => [it.id, it.text]));
}

async function main() {
  const { nativeLanguage, limit, onlyLang } = parseArgs(process.argv.slice(2));
  if (!nativeLanguage) {
    console.error(
      "usage: tsx scripts/mt-grammar-titles.ts <nativeLanguage> [--limit N] [--lang ja|zh|nl]"
    );
    process.exit(2);
  }

  const langs = onlyLang ? [onlyLang] : LANGS;
  for (const targetLanguage of langs) {
    const entries = grammarIndexFor(targetLanguage);
    if (entries.length === 0) {
      console.warn(`${targetLanguage}: index boş, atlanıyor`);
      continue;
    }
    const outPath = path.join(OUT_DIR, `titles.${targetLanguage}.${nativeLanguage}.json`);
    const existing: Record<string, string> = fs.existsSync(outPath)
      ? JSON.parse(fs.readFileSync(outPath, "utf8"))
      : {};

    const pending = entries.filter((e) => !existing[e.slug]);
    const slice = limit ? pending.slice(0, limit) : pending;
    console.log(
      `${targetLanguage}->${nativeLanguage}: ${entries.length} başlık toplam, ` +
        `${Object.keys(existing).length} zaten çevrili, ${slice.length} bu koşuda çevrilecek`
    );
    if (slice.length === 0) continue;

    const items = slice.map((e) => ({ id: e.slug, text: e.title_tr }));
    // Batches of 50: keeps each CLI call's prompt/response small and gives a
    // partial-failure boundary (one bad batch doesn't cost the whole run).
    const BATCH = 50;
    let ok = 0;
    for (let i = 0; i < items.length; i += BATCH) {
      const batch = items.slice(i, i + BATCH);
      try {
        const byId = await translateBatch(targetLanguage, nativeLanguage, batch);
        for (const it of batch) {
          const t = byId.get(it.id);
          if (t && t.trim()) {
            existing[it.id] = t.trim();
            ok++;
          } else {
            console.warn(`ATLA ${it.id}: LLM çeviri döndürmedi`);
          }
        }
      } catch (err) {
        console.warn(
          `ATLA batch ${i}-${i + batch.length}: ${err instanceof Error ? err.message : err}`
        );
      }
    }

    fs.writeFileSync(outPath, JSON.stringify(existing, null, 0));
    console.log(`${outPath}: ${Object.keys(existing).length} başlık toplam (bu koşuda +${ok})`);
  }
}

main();
