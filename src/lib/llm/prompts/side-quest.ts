type Node = typeof import("@/db/schema").nodes.$inferSelect;

const LANGUAGE_NAMES: Record<string, string> = {
  ja: "Japonca",
  nl: "Hollandaca",
};

export function sideQuestPrompt(opts: {
  targetLanguage: string;
  node: Node;
  selfLevel: string;
  recentVocab: { term: string; meaning: string }[];
  completedTitles: string[];
}) {
  const lang = LANGUAGE_NAMES[opts.targetLanguage] ?? opts.targetLanguage;
  const system = `Sen bir ${lang} öğretmenisin, kısa ve eğlenceli mini alıştırma setleri hazırlıyorsun. Sorular Türkçe. Sadece istenen JSON'u döndür.`;

  const kindInstructions: Record<string, string> = {
    kana_drill:
      "Hiragana/katakana tanıma ve okunuş yazma alıştırması. Öğrencinin seviyesine uygun karakterler seç; mcq'da options romaji ya da kana olabilir.",
    kanji:
      "Temel kanji alıştırması: anlam eşleştirme ve okunuş. Seviyeye uygun, en temel kanjilerden başla.",
    pop_quiz:
      "Öğrencinin şu ana kadar öğrendiklerinden sürpriz karma quiz. Aşağıdaki kelimeleri ve tamamlanan ders konularını kullan.",
    vocab_review:
      "Aşağıdaki kelime listesinden anlam eşleştirme soruları üret.",
  };

  const prompt = `Yan görev: "${opts.node.titleTr}" (tür: ${opts.node.sideQuestKind})
Öğrenci seviyesi: ${opts.selfLevel}
Tamamladığı dersler: ${opts.completedTitles.join(", ") || "henüz yok"}
Bildiği kelimeler: ${
    opts.recentVocab.map((v) => `${v.term}=${v.meaning}`).join(", ") ||
    "henüz yok"
  }

${kindInstructions[opts.node.sideQuestKind ?? "pop_quiz"]}

8-12 soruluk bir set üret:
- "mcq": options 4 seçenek, answer seçeneklerden birinin AYNEN kendisi.
- "type_answer": kısa yazılı cevap; answer kanonik cevap. Öğrenci romaji yazar — answer romaji ya da kana olabilir, ikisi de kabul edilir.
- target_text alanına hedef dildeki karakter/kelimeyi koy (varsa). Kanji kullanırsan furigana'yı köşeli parantezle ekle: 日[に]本[ほん] değil, kelime bütünüyle: 日本[にほん].

Sadece şemaya uygun JSON döndür.`;

  return { system, prompt };
}
