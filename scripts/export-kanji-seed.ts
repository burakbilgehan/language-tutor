// Lokal DB'de LLM ile üretilmiş kanji/hanzi içeriğini statik seed'e çevirir:
// public/kanji-seed/<lang>.json. Deploy'da yeni profiller bu dosyadan
// beslenir (bkz. src/core/kanji.ts applyKanjiSeed) — LLM'siz tam kanji sözlüğü.
// Çalıştır: npm run seed:kanji [-- <db-yolu>]
// Kaynak varsayılan data/app.db; argüman olarak export edilmiş bir save
// snapshot'ı da verilebilir (aynı raw SQLite imajı, T-069 ön koşulu 3).
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { KanjiContentSchema } from "@/lib/llm/schemas";
import { readLangContent } from "@/lib/llm/lang-content";

const DB_PATH = process.argv[2] ?? "data/app.db";
const OUT_DIR = "public/kanji-seed";

if (!fs.existsSync(DB_PATH)) {
  console.error(`bulunamadı: ${DB_PATH}`);
  process.exit(1);
}

const db = new Database(DB_PATH, { readonly: true });
const rows = db
  .prepare(
    `SELECT target_language AS lang, char, content
     FROM kanji_entries
     WHERE status = 'ready' AND content IS NOT NULL
     ORDER BY target_language, position`
  )
  .all() as { lang: string; char: string; content: string }[];

// Content kolonu {tr:...,en:...} dil-anahtarlı (T-031). Her native için ayrı
// dosya: tr -> <lang>.json, en -> <lang>.en.json (sıfırdan o dil için
// üretilmiş içerik). Kısmi export sorun değil; applyKanjiSeed boşları
// doldurur, dosya büyüdükçe fark uygulanır.
let skipped = 0;
for (const native of ["tr", "en"] as const) {
  const byLang = new Map<string, Record<string, unknown>>();
  for (const r of rows) {
    const payload = readLangContent(JSON.parse(r.content), native);
    if (!payload) continue;
    const parsed = KanjiContentSchema.safeParse(payload);
    if (!parsed.success) {
      skipped++;
      console.warn(`ATLA ${r.lang}/${r.char} (${native}): şemaya uymuyor`);
      continue;
    }
    if (!byLang.has(r.lang)) byLang.set(r.lang, {});
    byLang.get(r.lang)![r.char] = parsed.data;
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const [lang, chars] of byLang) {
    const file = path.join(
      OUT_DIR,
      native === "tr" ? `${lang}.json` : `${lang}.${native}.json`
    );
    fs.writeFileSync(file, JSON.stringify({ version: 1, chars }));
    const kb = Math.round(fs.statSync(file).size / 1024);
    console.log(`${file}: ${Object.keys(chars).length} karakter (${native}), ${kb} KB`);
  }
}
if (skipped) console.log(`${skipped} karakter şema uyumsuzluğundan atlandı`);
