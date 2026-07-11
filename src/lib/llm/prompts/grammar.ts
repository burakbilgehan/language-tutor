type GrammarTopic = typeof import("@/db/schema").grammarTopics.$inferSelect;

const LANGUAGE_NAMES: Record<string, string> = {
  ja: "Japonca",
  nl: "Hollandaca",
};

export function grammarPrompt(opts: {
  topic: GrammarTopic;
  selfLevel: string;
  siblingTitles: string[];
}) {
  const lang =
    LANGUAGE_NAMES[opts.topic.targetLanguage] ?? opts.topic.targetLanguage;

  const jaRules =
    opts.topic.targetLanguage === "ja"
      ? " Kanji içeren her ifadede furigana'yı köşeli parantezle ver: 勉強[べんきょう]. Tablolarda ve örneklerde de bu notasyonu kullan."
      : "";

  const system = `Sen bir ${lang} gramer referansı yazarısın. Türk öğrenciler için net, TABLO ağırlıklı, DERS KİTABI KALİTESİNDE kapsamlı gramer sayfaları hazırlıyorsun. Açıklamalar Türkçe.${jaRules} Sadece istenen JSON'u döndür.`;

  const prompt = `Gramer konusu: "${opts.topic.titleTr}" (kategori: ${opts.topic.category}, slug: ${opts.topic.slug}${opts.topic.level ? `, seviye: ${opts.topic.level}` : ""})
Öğrenci seviyesi: ${opts.selfLevel}
Müfredattaki diğer gramer konuları: ${opts.siblingTitles.join(", ")}

Bu konu için KAPSAMLI bir cheatsheet sayfası üret — kullanıcı buraya tekrar tekrar dönüp bakacak, eksik kural kalmasın:
- "intro_tr": konuyu 3-5 cümleyle özetle.
- "tables": EN AZ 3 tablo (konu elverdiğince fazla). Bilgiyi mümkün olan her yerde TABLO olarak yapılandır — tam çekim tabloları (tüm formlar), edat işlev tabloları, kibarlık seviyesi tabloları, istisna listeleri, sık hata/karşılaştırma tabloları. Hücrelerde hedef dil + gerekiyorsa okunuş. column_headers Türkçe.
- "examples": 4-8 örnek cümle (target, reading, translation_tr).
- "related_slugs": diğer konulardan ilgili olanların slug'ları.

Sadece şemaya uygun JSON döndür.`;

  return { system, prompt };
}
