// Lokal DB'de LLM ile üretilmiş kelime sözlüğü içeriğini statik seed'e çevirir:
// public/vocab-seed/<lang>.json. Deploy'da yeni profiller bu dosyadan
// beslenir (bkz. src/core/vocab.ts applyVocabSeed) — LLM'siz tam sözlük.
// Çalıştır: npm run seed:vocab  (data/app.db'ye ihtiyaç duyar)
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { VocabContentSchema } from "@/lib/llm/schemas";

const DB_PATH = "data/app.db";
const OUT_DIR = "public/vocab-seed";

if (!fs.existsSync(DB_PATH)) {
  console.error(`bulunamadı: ${DB_PATH}`);
  process.exit(1);
}

const db = new Database(DB_PATH, { readonly: true });
const rows = db
  .prepare(
    `SELECT target_language AS lang, word, content
     FROM vocab_entries
     WHERE status = 'ready' AND content IS NOT NULL
     ORDER BY target_language, position`
  )
  .all() as { lang: string; word: string; content: string }[];

const byLang = new Map<string, Record<string, unknown>>();
let skipped = 0;
for (const r of rows) {
  const parsed = VocabContentSchema.safeParse(JSON.parse(r.content));
  if (!parsed.success) {
    skipped++;
    console.warn(`ATLA ${r.lang}/${r.word}: şemaya uymuyor`);
    continue;
  }
  if (!byLang.has(r.lang)) byLang.set(r.lang, {});
  byLang.get(r.lang)![r.word] = parsed.data;
}

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const [lang, words] of byLang) {
  const file = path.join(OUT_DIR, `${lang}.json`);
  fs.writeFileSync(file, JSON.stringify({ version: 1, words }));
  const kb = Math.round(fs.statSync(file).size / 1024);
  console.log(`${file}: ${Object.keys(words).length} kelime, ${kb} KB`);
}
if (skipped) console.log(`${skipped} kelime şema uyumsuzluğundan atlandı`);
