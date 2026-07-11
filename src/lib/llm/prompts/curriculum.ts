import type { profiles } from "@/db/schema";
import type { JlptLevel } from "@/lib/curriculum/levels";

type Profile = typeof profiles.$inferSelect;

const LANGUAGE_NAMES: Record<string, string> = {
  ja: "Japonca",
  nl: "Hollandaca",
};

const LEVEL_GOAL: Record<JlptLevel, string> = {
  N5: "hayatta kalma temelleri: kana, temel selamlaşma, basit cümleler",
  N4: "günlük basit iletişim: temel fiil çekimleri, yaygın kalıplar",
  N3: "orta seviye: karmaşık cümle bağlaçları, günlük akıcılık",
  N2: "orta-ileri: soyut konular, resmî/gayriresmî ayrımı, geniş kalıp dağarcığı",
  N1: "ileri: edebî/akademik dil, incelikli nüanslar, keigo derinliği",
};

export interface ChapterPromptInput {
  profile: Profile;
  level: JlptLevel;
  /** Compact summary of already-taught units/grammar (empty for the first chapter). */
  priorSummary?: string;
}

/**
 * Builds the prompt for ONE JLPT chapter. The first chapter (N5) frames a
 * from-zero journey; later chapters generate only that level's units and are
 * told what prior chapters already covered so they don't repeat it.
 */
export function chapterPrompt({ profile, level, priorSummary }: ChapterPromptInput) {
  const lang = LANGUAGE_NAMES[profile.targetLanguage] ?? profile.targetLanguage;
  const isFirst = level === "N5";

  const system = `Sen deneyimli bir ${lang} müfredat tasarımcısısın. Türk öğrenciler için kişiselleştirilmiş, oyunlaştırılmış dil müfredatları hazırlıyorsun. Tüm başlık ve açıklamalar Türkçe olacak. Sadece istenen JSON'u döndür.`;

  const levelText: Record<string, string> = {
    zero: "hiç bilmiyor, sıfırdan başlıyor",
    beginner: "çok az biliyor (birkaç kelime/selamlaşma)",
    elementary: "temel seviyede (basit cümleler kurabiliyor)",
    intermediate: "orta seviyede",
  };

  const jaExtras =
    profile.targetLanguage === "ja"
      ? isFirst
        ? `\n- Japonca'ya özgü: müfredat hiragana ile başlamalı (seviye sıfırsa), katakana erken gelmeli. KANJI'Yİ ERTELEME: en temel kanjiler (一二三, 人, 日, 月, 本...) ilk ünitelerden itibaren kademeli olarak tanıtılmalı ve sonraki ünitelerde doğal olarak kullanılmalı. side_quests içine "kana_drill" ve "kanji" türlerini ekle.`
        : `\n- Japonca'ya özgü: bu seviyede yeni kanjiler ve o seviyeye özgü dilbilgisi ağırlıklı ilerlesin; kana zaten öğrenildi, tekrar etme.`
      : isFirst
        ? `\n- Bu dil için kana/kanji side quest türleri KULLANMA; "pop_quiz" ve "vocab_review" yeterli.`
        : "";

  const priorBlock = priorSummary
    ? `\nŞU KONULAR ÖNCEKİ BÖLÜMLERDE ZATEN ÖĞRETİLDİ — TEKRARLAMA, sadece bu seviyeye özgü YENİ dilbilgisi ve kelime dağarcığını ilerlet:\n${priorSummary}\n`
    : "";

  const sideQuestRule = isFirst
    ? `- "side_quests": sürekli erişilebilir yan görev türleri.${jaExtras}`
    : `- "side_quests": BOŞ dizi döndür ([]) — yan görevler ilk bölümde tanımlandı.${jaExtras}`;

  const titleRule = isFirst
    ? `- "title": tüm müfredat için kısa, motive edici bir başlık (Türkçe).`
    : `- "title": bu bölüm için kısa bir başlık (Türkçe); genel müfredat başlığı zaten mevcut.`;

  const prompt = `Öğrenci profili:
- Hedef dil: ${lang}
- Başlangıç seviyesi: ${levelText[profile.selfLevel]}
- Haftalık ayırabileceği süre: ${profile.minutesPerWeek} dakika
- Hedefleri: ${profile.goals.join(", ")}
- İlgi alanları: ${profile.interests.join(", ")}
- Motivasyonu (kendi sözleriyle): "${profile.motivation}"
${priorBlock}
Şu an **JLPT ${level}** seviyesi için müfredat bölümü ("chapter") tasarla.
Bu seviyenin hedefi: ${LEVEL_GOAL[level]}.

Kurallar:
- ${isFirst ? "8-14" : "3-6"} ünite ("units"), her ünitede 4-8 ders düğümü ("nodes"). SADECE JLPT ${level} seviyesine uygun içerik üret — daha kolay veya daha zor seviyeye kayma.
- Üniteler mantıklı bir öğrenme sırası izlemeli; temalar öğrencinin ilgi alanlarına bağlansın.
- Her ünitenin son düğümü "checkpoint" ya da "boss" olmalı (boss = üniteyi taçlandıran zorlu görev). Diğerleri "lesson".
- xp_reward: lesson 20-35, checkpoint 40-50, boss 60-80.
- "theme" alanı kısa bir ingilizce etiket (ör: "kana", "food", "travel").
- "objectives" her düğüm için 1-3 somut öğrenme hedefi (Türkçe).
${titleRule}
${sideQuestRule}

Sadece şemaya uygun JSON döndür.`;

  return { system, prompt };
}
