// T-064: build-time machine translation of the packaged tr grammar seed into
// another native language. Input: public/grammar-seed/<lang>.json (the real,
// human/LLM-authored tr content already exported by scripts/export-grammar-seed.ts).
// Output: public/grammar-seed/<lang>.<native>.json, each topic stamped
// source:"mt" (src/core/grammar.ts applyGrammarSeed treats this file as a
// LOWER-priority layer than the tr seed: it only fills profiles whose native
// language matches `native`, and any real LLM generation always overrides it
// — see the ruling in tickets/T-064-en-native-seed-gap.md).
//
// Engine: LLM (getProvider(), fast tier — the owner's own Max sub, same
// posture as scripts/blast-generate.ts) by default. Argos Translate (offline,
// no LLM usage) was tried first and rejected — see scripts/mt/engine.ts
// ArgosEngine's doc comment for the measured failure (clause dropping, not
// just an encoding bug). --argos re-enables it if ever needed as a
// zero-Max-sub-usage fallback.
//
// Usage:
//   npm run seed:grammar:mt -- ja en               # spot-check slice (default 10)
//   npm run seed:grammar:mt -- ja en --limit 10
//   npm run seed:grammar:mt -- ja en --all          # full run (Burak triggers after
//                                                    # eyeballing the spot-check)
//   npm run seed:grammar:mt -- ja en --argos        # offline engine (rejected, see above)
//   npm run seed:grammar:mt -- ja en --stub         # pipeline dry run, no MT at all
import fs from "node:fs";
import path from "node:path";
import { GrammarTopicSchema, type GrammarTopicContent } from "@/lib/llm/schemas";
import { ArgosEngine, LlmEngine, StubEngine, type TranslateEngine } from "./mt/engine";
import { translateGrammarTopic } from "./mt/translate-grammar-topic";

const SEED_DIR = "public/grammar-seed";

function parseArgs(argv: string[]) {
  const positional = argv.filter((a) => !a.startsWith("--"));
  const [targetLanguage, nativeLanguage] = positional;
  const limitFlag = argv.indexOf("--limit");
  let limit: number | undefined = positional.length ? 10 : undefined;
  if (limitFlag !== -1) {
    limit = Number(argv[limitFlag + 1]);
    // A typo'd --limit must not silently become a FULL run (~300 LLM calls).
    if (!Number.isFinite(limit) || limit <= 0) {
      console.error(`--limit değeri sayı değil: "${argv[limitFlag + 1]}"`);
      process.exit(2);
    }
  }
  const useStub = argv.includes("--stub");
  const useArgos = argv.includes("--argos");
  const noLimit = argv.includes("--all");
  return {
    targetLanguage,
    nativeLanguage,
    limit: noLimit ? undefined : limit,
    useStub,
    useArgos,
  };
}

async function main() {
  const { targetLanguage, nativeLanguage, limit, useStub, useArgos } = parseArgs(
    process.argv.slice(2)
  );
  if (!targetLanguage || !nativeLanguage) {
    console.error(
      "usage: tsx scripts/mt-grammar-seed.ts <targetLanguage> <nativeLanguage> [--limit N | --all] [--argos | --stub]"
    );
    process.exit(2);
  }

  const inPath = path.join(SEED_DIR, `${targetLanguage}.json`);
  if (!fs.existsSync(inPath)) {
    console.error(`bulunamadı: ${inPath} (önce npm run seed:grammar çalıştır)`);
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(inPath, "utf8")) as {
    topics: Record<string, unknown>;
  };

  const engine: TranslateEngine = useStub
    ? new StubEngine()
    : useArgos
      ? new ArgosEngine(nativeLanguage === "en" ? "tr" : nativeLanguage, "en")
      : new LlmEngine(targetLanguage, nativeLanguage);
  if (useArgos && engine instanceof ArgosEngine && !engine.isAvailable()) {
    console.error(
      `BLOCKED: Argos venv not set up. Run: scripts/mt/setup-argos.sh tr ${nativeLanguage}\n` +
        `(Note: Argos is the REJECTED path for this ticket — see engine.ts. Prefer the ` +
        `default LLM engine unless you specifically need zero Max-sub usage.)`
    );
    process.exit(1);
  }

  // Stub output goes to its OWN file: writing it to the real seed path would
  // poison the incremental skip below ("already translated") with fake
  // content that could then get committed and shipped. The app never loads
  // *.stub.json (src/lib/grammar-seed.ts only fetches the real names).
  const outPath = path.join(
    SEED_DIR,
    `${targetLanguage}.${nativeLanguage}${useStub ? ".stub" : ""}.json`
  );
  const existing: { version: number; topics: Record<string, GrammarTopicContent> } =
    fs.existsSync(outPath)
      ? JSON.parse(fs.readFileSync(outPath, "utf8"))
      : { version: 1, topics: {} };

  const allSlugs = Object.keys(raw.topics);
  // Skip slugs already translated in a previous run — this script is meant to
  // be re-run incrementally (spot-check slice today, full run later) without
  // re-translating (and re-burning time/tokens on) topics that already have
  // output.
  const pending = allSlugs.filter((slug) => !existing.topics[slug]);
  const slugs = limit ? pending.slice(0, limit) : pending;

  console.log(
    `${targetLanguage}->${nativeLanguage}: ${allSlugs.length} konu toplam, ` +
      `${existing.topics ? Object.keys(existing.topics).length : 0} zaten çevrili, ` +
      `${slugs.length} bu koşuda çevrilecek` +
      (useStub ? " (STUB — gerçek çeviri yok)" : useArgos ? " (ARGOS — offline, REDDEDİLEN yol)" : " (LLM)")
  );

  let ok = 0;
  let failed = 0;
  for (const slug of slugs) {
    const parsed = GrammarTopicSchema.safeParse(raw.topics[slug]);
    if (!parsed.success) {
      console.warn(`ATLA ${slug}: tr seed şemaya uymuyor`);
      failed++;
      continue;
    }
    try {
      const { content, placeholderFailures } = await translateGrammarTopic(
        parsed.data,
        engine
      );
      if (placeholderFailures > 0) {
        console.warn(
          `ATLA ${slug}: ${placeholderFailures} alanda placeholder geri gelmedi ` +
            `(hedef-dil cümlesi/bracket notasyonu MT tarafından bozulmuş olabilir)`
        );
        failed++;
        continue;
      }
      // Re-validate the translated payload through the same schema before
      // writing — MT must never produce a file the app can't read.
      const revalidated = GrammarTopicSchema.safeParse(content);
      if (!revalidated.success) {
        console.warn(`ATLA ${slug}: çeviri sonrası şemaya uymuyor`);
        failed++;
        continue;
      }
      existing.topics[slug] = revalidated.data;
      ok++;
      console.log(`  ${slug} ✓`);
    } catch (err) {
      console.warn(`ATLA ${slug}: ${err instanceof Error ? err.message : err}`);
      failed++;
    }
  }

  if (ok > 0) {
    fs.mkdirSync(SEED_DIR, { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(existing));
  }
  const kb = fs.existsSync(outPath) ? Math.round(fs.statSync(outPath).size / 1024) : 0;
  console.log(
    `${outPath}: ${Object.keys(existing.topics).length} konu toplam (bu koşuda +${ok}, ${failed} atlandı), ${kb} KB`
  );
  if (useStub) {
    console.log(
      "UYARI: --stub ile üretildi, bu dosya GERÇEK ÇEVİRİ İÇERMİYOR — yayınlanmaya hazır değil."
    );
  }
}

main();
