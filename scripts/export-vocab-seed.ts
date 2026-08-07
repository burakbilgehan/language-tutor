// Lokal DB'de LLM ile üretilmiş kelime sözlüğü içeriğini statik seed'e çevirir:
// public/vocab-seed/<lang>.json. Deploy'da yeni profiller bu dosyadan
// beslenir (bkz. src/core/vocab.ts applyVocabSeed) — LLM'siz tam sözlük.
// Çalıştır: npm run seed:vocab  (data/app.db'ye ihtiyaç duyar)
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { VocabContentSchema } from "@/lib/llm/schemas";
import { readLangContent } from "@/lib/llm/lang-content";

const DB_PATH = "data/app.db";
const OUT_DIR = "public/vocab-seed";

if (!fs.existsSync(DB_PATH)) {
  console.error(`bulunamadı: ${DB_PATH}`);
  process.exit(1);
}

const db = new Database(DB_PATH, { readonly: true });
// Yalnız statik indexi olan diller (reddedilen T-030'un ölü ja satırı seed
// dosyası üretmesin).
const VOCAB_LANGS = fs
  .readdirSync("src/lib/vocab-index")
  .map((f) => f.match(/^([a-z]{2})-data\.json$/)?.[1])
  .filter(Boolean) as string[];
const rows = db
  .prepare(
    `SELECT target_language AS lang, word, content
     FROM vocab_entries
     WHERE status = 'ready' AND content IS NOT NULL
     ORDER BY target_language, position`
  )
  .all()
  .filter((r: { lang: string }) => VOCAB_LANGS.includes(r.lang)) as { lang: string; word: string; content: string }[];

// Content kolonu {tr:...,en:...} dil-anahtarlı (T-031). Her native için ayrı
// dosya: tr -> <lang>.json, en -> <lang>.en.json (sıfırdan o dil için
// üretilmiş içerik). Kısmi export sorun değil; applyVocabSeed boşları
// doldurur, dosya büyüdükçe fark uygulanır.
let skipped = 0;
for (const native of ["tr", "en"] as const) {
  const byLang = new Map<string, Record<string, unknown>>();
  for (const r of rows) {
    const payload = readLangContent(JSON.parse(r.content), native);
    if (!payload) continue;
    const parsed = VocabContentSchema.safeParse(payload);
    if (!parsed.success) {
      skipped++;
      console.warn(`ATLA ${r.lang}/${r.word} (${native}): şemaya uymuyor`);
      continue;
    }
    if (!byLang.has(r.lang)) byLang.set(r.lang, {});
    byLang.get(r.lang)![r.word] = parsed.data;
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const [lang, words] of byLang) {
    const file = path.join(
      OUT_DIR,
      native === "tr" ? `${lang}.json` : `${lang}.${native}.json`
    );
    fs.writeFileSync(file, JSON.stringify({ version: 1, words }));
    const kb = Math.round(fs.statSync(file).size / 1024);
    console.log(`${file}: ${Object.keys(words).length} kelime (${native}), ${kb} KB`);
  }
}
if (skipped) console.log(`${skipped} kelime şema uyumsuzluğundan atlandı`);
