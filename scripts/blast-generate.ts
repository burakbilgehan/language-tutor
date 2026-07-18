// Tek seferlik: eksik (pending/error) gramer + kanji içeriğini yüksek
// concurrency ile üretir. Çalıştır: LLM_CONCURRENCY=100 npx tsx --tsconfig tsconfig.json scripts/blast-generate.ts
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import * as tables from "@/db/schema";
import { getProvider } from "@/lib/llm/provider";
import { generateGrammarContent, generateKanjiContent } from "@/core/llm-gen";

const CONC = Number(process.env.BLAST_CONC ?? 100);

type Item = { kind: "grammar" | "kanji"; id: string; label: string };

async function main() {
  const gen = getProvider();
  const gt = db
    .select()
    .from(tables.grammarTopics)
    .where(inArray(tables.grammarTopics.status, ["pending", "error"]))
    .all();
  const ke = db
    .select()
    .from(tables.kanjiEntries)
    .where(inArray(tables.kanjiEntries.status, ["pending", "error"]))
    .all();
  const items: Item[] = [
    ...gt.map((t) => ({
      kind: "grammar" as const,
      id: t.id,
      label: `g:${t.targetLanguage}/${t.slug}`,
    })),
    ...ke.map((k) => ({
      kind: "kanji" as const,
      id: k.id,
      label: `k:${k.char}`,
    })),
  ];
  console.log(
    `todo: grammar=${gt.length} kanji=${ke.length} toplam=${items.length} conc=${CONC}`
  );

  let i = 0,
    ok = 0,
    fail = 0;
  const t0 = Date.now();
  const workers = Array.from(
    { length: Math.min(CONC, items.length) },
    async () => {
      while (i < items.length) {
        const it = items[i++];
        try {
          if (it.kind === "grammar")
            await generateGrammarContent(db as never, gen, it.id);
          else await generateKanjiContent(db as never, gen, it.id);
          ok++;
        } catch (e) {
          fail++;
          console.error(
            `FAIL ${it.label}: ${(e as Error).message?.slice(0, 120)}`
          );
        }
        const n = ok + fail;
        if (n % 20 === 0)
          console.log(
            `${n}/${items.length} ok=${ok} fail=${fail} ${Math.round((Date.now() - t0) / 1000)}s`
          );
      }
    }
  );
  await Promise.all(workers);
  console.log(
    `BİTTİ ok=${ok} fail=${fail} ${Math.round((Date.now() - t0) / 1000)}s`
  );
}
main();
