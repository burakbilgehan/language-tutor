// Lokal DB'de LLM ile üretilmiş gramer içeriğini statik seed'e çevirir:
// public/grammar-seed/<lang>.json. Deploy'da yeni profiller bu dosyadan
// beslenir (bkz. src/core/grammar.ts applyGrammarSeed) — LLM'siz tam gramer.
// Çalıştır: npm run seed:grammar  (data/app.db'ye ihtiyaç duyar)
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { GrammarTopicSchema } from "@/lib/llm/schemas";

const DB_PATH = "data/app.db";
const OUT_DIR = "public/grammar-seed";

if (!fs.existsSync(DB_PATH)) {
  console.error(`bulunamadı: ${DB_PATH}`);
  process.exit(1);
}

const db = new Database(DB_PATH, { readonly: true });
const rows = db
  .prepare(
    `SELECT target_language AS lang, slug, content
     FROM grammar_topics
     WHERE status = 'ready' AND content IS NOT NULL
     ORDER BY target_language, position`
  )
  .all() as { lang: string; slug: string; content: string }[];

const byLang = new Map<string, Record<string, unknown>>();
let skipped = 0;
for (const r of rows) {
  const parsed = GrammarTopicSchema.safeParse(JSON.parse(r.content));
  if (!parsed.success) {
    skipped++;
    console.warn(`ATLA ${r.lang}/${r.slug}: şemaya uymuyor`);
    continue;
  }
  if (!byLang.has(r.lang)) byLang.set(r.lang, {});
  byLang.get(r.lang)![r.slug] = parsed.data;
}

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const [lang, topics] of byLang) {
  const file = path.join(OUT_DIR, `${lang}.json`);
  fs.writeFileSync(file, JSON.stringify({ version: 1, topics }));
  const kb = Math.round(fs.statSync(file).size / 1024);
  console.log(`${file}: ${Object.keys(topics).length} konu, ${kb} KB`);
}
if (skipped) console.log(`${skipped} konu şema uyumsuzluğundan atlandı`);
