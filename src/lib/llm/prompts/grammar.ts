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

  const system = `Sen bir ${lang} gramer referansı yazarısın. Türk öğrenciler için net, TABLO ağırlıklı gramer sayfaları hazırlıyorsun. Açıklamalar Türkçe. Sadece istenen JSON'u döndür.`;

  const prompt = `Gramer konusu: "${opts.topic.titleTr}" (kategori: ${opts.topic.category}, slug: ${opts.topic.slug})
Öğrenci seviyesi: ${opts.selfLevel}
Müfredattaki diğer gramer konuları: ${opts.siblingTitles.join(", ")}

Bu konu için bir referans sayfası üret:
- "intro_tr": konuyu 2-4 cümleyle özetle.
- "tables": EN AZ 2 tablo. Bilgiyi mümkün olan her yerde TABLO olarak yapılandır — çekim tabloları, edat işlev tabloları, kibarlık seviyesi tabloları, karşılaştırma tabloları. Hücrelerde hedef dil + gerekiyorsa okunuş. column_headers Türkçe.
- "examples": 3-6 örnek cümle (target, reading, translation_tr).
- "related_slugs": diğer konulardan ilgili olanların slug'ları.

Sadece şemaya uygun JSON döndür.`;

  return { system, prompt };
}
