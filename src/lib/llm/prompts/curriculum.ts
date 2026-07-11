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
      ? `\n- Japonca'ya özgü: müfredat hiragana ile başlamalı (seviye sıfırsa), katakana erken gelmeli. KANJI'Yİ ERTELEME: en temel kanjiler (一二三, 人, 日, 月, 本...) ilk ünitelerden itibaren kademeli olarak tanıtılmalı ve sonraki ünitelerde doğal olarak kullanılmalı; ileri kanjiler sonraya kalsın ama her ünitede kanji teması ilerlesin. side_quests içine "kana_drill" ve "kanji" türlerini ekle.`
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
- 12-16 ünite ("units"), her ünitede 5-8 ders düğümü ("nodes"). Müfredat KAPSAMLI olsun: sıfırdan sağlam bir orta-alt seviyeye (JLPT N4 dengi) uzanan uzun bir yolculuk tasarla.
- Üniteler mantıklı bir öğrenme sırası izlemeli; temalar öğrencinin ilgi alanlarına bağlansın (ör. ilgi alanı "anime" ise örnek bağlamları oradan seçilebilecek temalar).
- Her ünitenin son düğümü "checkpoint" ya da "boss" olmalı (boss = üniteyi taçlandıran zorlu görev). Diğerleri "lesson".
- xp_reward: lesson 20-35, checkpoint 40-50, boss 60-80.
- "theme" alanı kısa bir ingilizce etiket (ör: "kana", "food", "travel").
- "objectives" her düğüm için 1-3 somut öğrenme hedefi (Türkçe).
- "side_quests": sürekli erişilebilir yan görev türleri.${jaExtras}

Sadece şemaya uygun JSON döndür.`;

  return { system, prompt };
}
