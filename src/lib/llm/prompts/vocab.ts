import { languageName, nativeLanguageName } from "@/lib/profile-options";

type VocabEntry = typeof import("@/db/schema").vocabEntries.$inferSelect;

export function vocabPrompt(opts: {
  entry: VocabEntry;
  selfLevel: string;
  interests: string[];
  nativeLanguage?: string;
}) {
  const { entry } = opts;
  const lang = languageName(entry.targetLanguage);
  const native = nativeLanguageName(opts.nativeLanguage ?? "tr");

  // Bracket-reading rule follows the grammar prompt's scriptRules; the index
  // is zh-only today but the seam stays language-agnostic.
  const scriptRule =
    entry.targetLanguage === "zh"
      ? " Hanzi içeren her ifadede pinyin okunuşu köşeli parantezle ver: 学生[xuésheng]; ton işaretlerini mutlaka yaz."
      : entry.targetLanguage === "ja"
        ? " Kanji içeren her ifadede furigana'yı köşeli parantezle ver: 勉強[べんきょう]."
        : "";

  const system =
    `Sen ana dili ${native} olan öğrenciler için ${lang} kelime sözlüğü yazan bir sözlükbilimcisin. ` +
    "Kelimenin okunuşu sana verilir — asla değiştirme, yeni okunuş uydurma. " +
    `Görevin ${native} dilinde anlamlar, kullanım notu ve gerçek, doğal örnekler üretmek.${scriptRule} Sadece istenen JSON'u döndür.`;

  // 量词 (measure words) are a zh-only concept; ja carries no classifiers, so
  // the reference line and the classifier_note instruction are dropped for ja
  // (the field stays null via the schema's .nullish()).
  const isZh = entry.targetLanguage === "zh";
  const classifierRef = isZh
    ? `\nÖlçü kelimeleri (量词): ${entry.classifiers?.join("、") || "—"}`
    : "";
  const classifierInstruction = isZh
    ? `\n- "classifier_note_tr": kelime isimse ölçü kelimesi kullanımı (hangi 量词, hangi bağlamda, örnek kalıp) 1 cümleyle; isim değilse null.`
    : "";
  const charsUnit = isZh ? "her karakter" : "her kanji";

  const prompt = `Kelime: ${entry.word}${entry.traditional ? ` (geleneksel: ${entry.traditional})` : ""} (${entry.level})
Okunuş: ${entry.reading}
İngilizce anlamlar (referans): ${entry.meaningsEn.join("; ")}${classifierRef}
Öğrenci seviyesi: ${opts.selfLevel}${opts.interests.length ? `, ilgi alanları: ${opts.interests.join(", ")}` : ""}

Bu kelime için üret:
- "meanings_tr": TÜM anlamları ${native} dilinde, en yaygından başlayarak.
- "note_tr": 1-2 cümlelik kullanım notu (${native} dilinde) — register, tipik bağlam, sık karıştırılan yakın anlamlı kelimelerle farkı. Yoksa null.${classifierInstruction}
- "examples": 2-4 GERÇEK ve doğal örnek cümle, öğrencinin seviyesine uygun. "sentence" hedef dilde, "translation_tr" ${native} dilinde.
- "collocations": 2-5 yaygın eşdizim/kalıp ("phrase" hedef dilde, "meaning_tr" ${native} dilinde). Yoksa null.
- "chars": kelimedeki ${charsUnit} için { "char", "reading", "meaning_tr", "hint_tr" } — "hint_tr" karakteri hatırlatan kısa bir bileşen ipucu (radikal anlamı / fonetik bileşen), yoksa null.${isZh ? "" : " Kelimede kanji yoksa (yalnızca kana) boş bırak."}

Sadece şemaya uygun JSON döndür.`;

  return { system, prompt };
}
