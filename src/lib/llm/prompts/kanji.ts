import { nativeLanguageName } from "@/lib/profile-options";

type KanjiEntry = typeof import("@/db/schema").kanjiEntries.$inferSelect;

export function kanjiPrompt(opts: {
  entry: KanjiEntry;
  selfLevel: string;
  interests: string[];
  nativeLanguage?: string;
}) {
  const { entry } = opts;
  const native = nativeLanguageName(opts.nativeLanguage ?? "tr");

  const system =
    `Sen ana dili ${native} olan öğrenciler için Japonca kanji referansı yazan bir sözlükbilimcisin. ` +
    "Okunuşlar sana verilir — asla yeni okunuş uydurma. " +
    `Görevin ${native} dilinde anlamlar ve gerçek, yaygın örnek kelimeler üretmek. Sadece istenen JSON'u döndür.`;

  const prompt = `Kanji: ${entry.char} (JLPT ${entry.level})
Onyomi: ${entry.onyomi.join("、") || "—"}
Kunyomi: ${entry.kunyomi.join("、") || "—"}
İngilizce anlamlar (referans): ${entry.meaningsEn.join(", ")}
Öğrenci seviyesi: ${opts.selfLevel}${opts.interests.length ? `, ilgi alanları: ${opts.interests.join(", ")}` : ""}

Bu kanji için üret:
- "meanings_tr": TÜM anlamları ${native} dilinde, en yaygından başlayarak.
- "note_tr": 1-2 cümlelik kullanım notu (${native} dilinde) — hangi bağlamda hangi okunuş, sık karıştırılan benzer kanji varsa ayrımı. Yoksa null.
- "examples": 3-6 GERÇEK ve yaygın örnek kelime/ifade. Her biri: "word" (kanjili yazım), "reading" (tamamı hiragana/katakana), "meaning_tr" (${native} dilinde). Verilen okunuşların olabildiğince çoğunu kapsa; öğrencinin seviyesine uygun basit kelimeleri öne al.

Sadece şemaya uygun JSON döndür.`;

  return { system, prompt };
}
