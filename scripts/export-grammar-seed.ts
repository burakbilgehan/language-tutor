// Lokal DB'de LLM ile üretilmiş gramer içeriğini statik seed'e çevirir:
// public/grammar-seed/<lang>.json. Deploy'da yeni profiller bu dosyadan
// beslenir (bkz. src/core/grammar.ts applyGrammarSeed) — LLM'siz tam gramer.
// Çalıştır: npm run seed:grammar  (data/app.db'ye ihtiyaç duyar)
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { GrammarTopicSchema } from "@/lib/llm/schemas";
import { readLangContent } from "@/lib/llm/lang-content";

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

// Content kolonu {tr:...,en:...} dil-anahtarlı (T-031). Her native için ayrı
// seed dosyası çıkar: tr -> <lang>.json, en -> <lang>.en.json. en dosyası
// SIFIRDAN o dil için üretilmiş gerçek içeriktir (2026-08-07 kararı; eski MT
// katmanının yerini aldı), source damgası taşımaz ve UI'da rozet çıkarmaz.
// Kısmi export sorun değil: applyGrammarSeed boş slotları doldurur, dosya
// büyüdükçe yeni profiller/refresh'ler farkı alır.
let skipped = 0;
for (const native of ["tr", "en"] as const) {
  const byLang = new Map<string, Record<string, unknown>>();
  for (const r of rows) {
    const payload = readLangContent(JSON.parse(r.content), native);
    if (!payload) continue; // bu native yarısı henüz üretilmemiş
    const parsed = GrammarTopicSchema.safeParse(payload);
    if (!parsed.success) {
      skipped++;
      console.warn(`ATLA ${r.lang}/${r.slug} (${native}): şemaya uymuyor`);
      continue;
    }
    if (!byLang.has(r.lang)) byLang.set(r.lang, {});
    byLang.get(r.lang)![r.slug] = parsed.data;
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const [lang, topics] of byLang) {
    const file = path.join(
      OUT_DIR,
      native === "tr" ? `${lang}.json` : `${lang}.${native}.json`
    );
    fs.writeFileSync(file, JSON.stringify({ version: 1, topics }));
    const kb = Math.round(fs.statSync(file).size / 1024);
    console.log(`${file}: ${Object.keys(topics).length} konu (${native}), ${kb} KB`);
  }
}
if (skipped) console.log(`${skipped} konu şema uyumsuzluğundan atlandı`);

// Sidebar/index başlıkları: en overlay (src/lib/grammar-index/titles.<lang>.en.json)
// üretilen en içeriğin kendi başlığından beslenir — sayfa h1'i ile menü aynı
// kaynaktan gelir, ayrı bir çeviri geçişi gerekmez. Mevcut girdiler korunur
// (eski elle/MT girilmiş başlıklar), üretilmiş içerik başlığı her zaman ezer.
const TITLES_DIR = "src/lib/grammar-index";
const titleByLang = new Map<string, Record<string, string>>();
for (const r of rows) {
  const payload = readLangContent<{ title_tr?: string }>(JSON.parse(r.content), "en");
  const title = payload?.title_tr?.trim();
  if (!title) continue;
  if (!titleByLang.has(r.lang)) titleByLang.set(r.lang, {});
  titleByLang.get(r.lang)![r.slug] = title;
}
for (const [lang, titles] of titleByLang) {
  const file = path.join(TITLES_DIR, `titles.${lang}.en.json`);
  let existing: Record<string, string> = {};
  try {
    existing = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    // dosya yoksa sıfırdan yazılır (yeni dil için build statik importu ayrıca ister)
  }
  const merged = { ...existing, ...titles };
  fs.writeFileSync(file, JSON.stringify(merged, null, 0) + "\n");
  console.log(`${file}: ${Object.keys(merged).length} başlık (en)`);
}
