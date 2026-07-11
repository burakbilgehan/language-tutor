import type { profiles } from "@/db/schema";

type Profile = typeof profiles.$inferSelect;

const LANGUAGE_NAMES: Record<string, string> = {
  ja: "Japonca",
  nl: "Hollandaca",
};

export function curriculumPrompt(profile: Profile) {
  const lang = LANGUAGE_NAMES[profile.targetLanguage] ?? profile.targetLanguage;

  const system = `Sen deneyimli bir ${lang} müfredat tasarımcısısın. Türk öğrenciler için kişiselleştirilmiş, oyunlaştırılmış dil müfredatları hazırlıyorsun. Tüm başlık ve açıklamalar Türkçe olacak. Sadece istenen JSON'u döndür.`;

  const levelText: Record<string, string> = {
    zero: "hiç bilmiyor, sıfırdan başlıyor",
    beginner: "çok az biliyor (birkaç kelime/selamlaşma)",
    elementary: "temel seviyede (basit cümleler kurabiliyor)",
    intermediate: "orta seviyede",
  };

  const jaExtras =
    profile.targetLanguage === "ja"
      ? `\n- Japonca'ya özgü: müfredat hiragana ile başlamalı (seviye sıfırsa), katakana ve temel kanji uygun yerlerde girmeli. side_quests içine "kana_drill" ve "kanji" türlerini ekle.`
      : `\n- Bu dil için kana/kanji side quest türleri KULLANMA; "pop_quiz" ve "vocab_review" yeterli.`;

  const prompt = `Öğrenci profili:
- Hedef dil: ${lang}
- Seviye: ${levelText[profile.selfLevel]}
- Haftalık ayırabileceği süre: ${profile.minutesPerWeek} dakika
- Hedefleri: ${profile.goals.join(", ")}
- İlgi alanları: ${profile.interests.join(", ")}
- Motivasyonu (kendi sözleriyle): "${profile.motivation}"

Bu öğrenci için kişiselleştirilmiş bir ${lang} müfredatı tasarla.

Kurallar:
- 8-12 ünite ("units"), her ünitede 4-8 ders düğümü ("nodes").
- Üniteler mantıklı bir öğrenme sırası izlemeli; temalar öğrencinin ilgi alanlarına bağlansın (ör. ilgi alanı "anime" ise örnek bağlamları oradan seçilebilecek temalar).
- Her ünitenin son düğümü "checkpoint" ya da "boss" olmalı (boss = üniteyi taçlandıran zorlu görev). Diğerleri "lesson".
- xp_reward: lesson 20-35, checkpoint 40-50, boss 60-80.
- "theme" alanı kısa bir ingilizce etiket (ör: "kana", "food", "travel").
- "objectives" her düğüm için 1-3 somut öğrenme hedefi (Türkçe).
- "side_quests": sürekli erişilebilir yan görev türleri.${jaExtras}
- "grammar_index": bu müfredat boyunca öğretilecek 10-20 gramer konusunun listesi (slug kebab-case İngilizce, title_tr Türkçe, category: particles/verbs/adjectives/nouns/numbers/syntax gibi).

Sadece şemaya uygun JSON döndür.`;

  return { system, prompt };
}
