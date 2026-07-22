import type { profiles } from "@/db/schema";
import { firstLevel, levelDisplay } from "@/lib/curriculum/levels";
import { languageName, nativeLanguageName } from "@/lib/profile-options";

type Profile = typeof profiles.$inferSelect;

// Per-level pedagogical goal, injected into the chapter prompt. Level strings
// are globally unique across schemes (JLPT/HSK/CEFR), so one flat map.
const LEVEL_GOAL: Record<string, string> = {
  // JLPT (Japanese)
  N5: "hayatta kalma temelleri: kana, temel selamlaşma, basit cümleler",
  N4: "günlük basit iletişim: temel fiil çekimleri, yaygın kalıplar",
  N3: "orta seviye: karmaşık cümle bağlaçları, günlük akıcılık",
  N2: "orta-ileri: soyut konular, resmî/gayriresmî ayrımı, geniş kalıp dağarcığı",
  N1: "ileri: edebî/akademik dil, incelikli nüanslar, keigo derinliği",
  // HSK (Mandarin Chinese)
  HSK1: "hayatta kalma temelleri: pinyin ve tonlar, temel cümle yapısı, selamlaşma (~150 kelime)",
  HSK2: "günlük basit iletişim: zaman/yer ifadeleri, temel görünüş ekleri (~300 kelime)",
  HSK3: "orta öncesi: günlük konularda akıcılık, temel 把/被 yapıları, tümleçler (~600 kelime)",
  HSK4: "orta: soyut konulara giriş, karmaşık tümleçler, bağlaç zenginliği (~1200 kelime)",
  HSK5: "orta-ileri: gazete/dizi düzeyi, yazılı dil kalıpları (~2500 kelime)",
  HSK6: "ileri: doğal ve incelikli ifade, deyimler (成语), edebî yapılar (~5000 kelime)",
  // CEFR (Dutch and any future language)
  A1: "hayatta kalma temelleri: selamlaşma, kendini tanıtma, en temel cümleler",
  A2: "günlük basit iletişim: rutin konular, basit geçmiş/gelecek zaman",
  B1: "orta seviye: seyahat ve iş durumlarında kendini idare etme, görüş bildirme",
  B2: "orta-ileri: soyut konular, akıcı tartışma, ayrıntılı metinler",
  C1: "ileri: esnek ve etkin dil kullanımı, ince anlam ayrımları",
  C2: "ustalaşma: neredeyse anadil düzeyi, incelikli üslup hâkimiyeti",
};

export interface ChapterPromptInput {
  profile: Profile;
  level: string;
  /** Compact summary of already-taught units/grammar (empty for the first chapter). */
  priorSummary?: string;
}

/**
 * Builds the prompt for ONE chapter (a level of the profile's scheme:
 * JLPT/HSK/CEFR). The first chapter frames a from-zero journey; later
 * chapters generate only that level's units and are told what prior chapters
 * already covered so they don't repeat it.
 */
export function chapterPrompt({ profile, level, priorSummary }: ChapterPromptInput) {
  const lang = languageName(profile.targetLanguage);
  const native = nativeLanguageName(profile.nativeLanguage);
  const isFirst = level === firstLevel(profile.targetLanguage);
  const levelLabel = levelDisplay(profile.targetLanguage, level);

  const system = `Sen deneyimli bir ${lang} müfredat tasarımcısısın. Ana dili ${native} olan öğrenciler için kişiselleştirilmiş, oyunlaştırılmış dil müfredatları hazırlıyorsun. Tüm başlık ve açıklamalar ${native} dilinde olacak. Sadece istenen JSON'u döndür.`;

  const levelText: Record<string, string> = {
    zero: "hiç bilmiyor, sıfırdan başlıyor",
    beginner: "çok az biliyor (birkaç kelime/selamlaşma)",
    elementary: "temel seviyede (basit cümleler kurabiliyor)",
    intermediate: "orta seviyede",
  };

  // Pedagogical guardrails distilled from reviewing generated curricula:
  // counters and the full こそあど system were missing, the kanji volume fell
  // far short of the level's set, and a listening lesson was promised even
  // though the app has no audio. Applies to every JA chapter.
  const jaCore =
    profile.targetLanguage === "ja"
      ? `\n- Sayaçlar (助数詞: 〜つ, 〜人, 〜本, 〜枚, 〜時...) seviyeye uygun kapsamda MUTLAKA işlensin — JLPT bunları yoğun sınar.
- İşaret sistemleri bütün öğretilsin: これ/それ/あれ tek başına yetmez; ここ/そこ/あそこ/どこ ve この/その/あの da kapsanmalı.
- Kanji düğümlerini ünitelere dağıt ve seviyenin kanji setinin çekirdeğini (en sık kullanılan yarısını) müfredat İÇİNDE öğret; tekrar/sınav düğümleri yalnızca öğretilen kanjileri kapsasın — öğretilmemiş kanji sayısı vaat etme.
- DİNLEME/telaffuz dersi KOYMA (uygulamada ses yok); okuma, yazma ve diyalog çözümleme odaklı kal.
- Dilbilgisi iddiaları teknik olarak doğru olsun (ör. い-sıfatı geçmişi 〜かった'dır, でした ile birleşmez).`
      : "";

  // Same guardrail spirit for Mandarin: measure words and tones are the HSK
  // analogues of counters/kana, and the app still has no audio.
  const zhCore =
    profile.targetLanguage === "zh"
      ? `\n- Ölçü sözcükleri (量词: 个, 本, 张, 只, 条, 杯...) seviyeye uygun kapsamda MUTLAKA işlensin — HSK bunları yoğun sınar.
- Her yeni kelime ve örnek pinyin + ton işaretiyle verilsin; ton ayrımları (mā/má/mǎ/mà) yazılı olarak vurgulansın.
- DİNLEME/telaffuz dersi KOYMA (uygulamada ses yok); ton eğitimini yazılı pinyin üzerinden, okuma ve diyalog çözümleme odaklı işle.
- Dilbilgisi iddiaları teknik olarak doğru olsun (ör. 了'nın tamamlanma ve durum-değişimi kullanımlarını karıştırma; 不/没 ayrımı doğru anlatılsın).`
      : "";

  const jaExtras =
    profile.targetLanguage === "ja"
      ? (isFirst
          ? `\n- Japonca'ya özgü: müfredat hiragana ile başlamalı (seviye sıfırsa), katakana erken gelmeli. KANJI'Yİ ERTELEME: en temel kanjiler (一二三, 人, 日, 月, 本...) ilk ünitelerden itibaren kademeli olarak tanıtılmalı ve sonraki ünitelerde doğal olarak kullanılmalı.`
          : `\n- Japonca'ya özgü: bu seviyede yeni kanjiler ve o seviyeye özgü dilbilgisi ağırlıklı ilerlesin; kana zaten öğrenildi, tekrar etme.`) + jaCore
      : profile.targetLanguage === "zh"
        ? (isFirst
            ? `\n- Çince'ye özgü: müfredat pinyin sistemi ve dört ton ile başlamalı. HANZİ'Yİ ERTELEME: en temel hanziler (一二三, 人, 我, 你, 好, 是...) ilk ünitelerden itibaren kademeli olarak tanıtılmalı ve sonraki ünitelerde doğal olarak kullanılmalı.`
            : `\n- Çince'ye özgü: bu seviyede yeni hanziler ve o seviyeye özgü dilbilgisi ağırlıklı ilerlesin; pinyin zaten öğrenildi, tekrar etme.`) + zhCore
        : "";

  const priorBlock = priorSummary
    ? `\nŞU KONULAR ÖNCEKİ BÖLÜMLERDE ZATEN ÖĞRETİLDİ — TEKRARLAMA, sadece bu seviyeye özgü YENİ dilbilgisi ve kelime dağarcığını ilerlet:\n${priorSummary}\n`
    : "";

  const titleRule = isFirst
    ? `- "title": tüm müfredat için kısa, motive edici bir başlık (${native} dilinde).`
    : `- "title": bu bölüm için kısa bir başlık (${native} dilinde); genel müfredat başlığı zaten mevcut.`;

  const prompt = `Öğrenci profili:
- Hedef dil: ${lang}
- Ana dili: ${native}
- Başlangıç seviyesi: ${levelText[profile.selfLevel]}
- Haftalık ayırabileceği süre: ${profile.minutesPerWeek} dakika
- Hedefleri: ${profile.goals.join(", ")}
- İlgi alanları: ${profile.interests.join(", ")}
- Motivasyonu (kendi sözleriyle): "${profile.motivation}"
${priorBlock}
Şu an **${levelLabel}** seviyesi için müfredat bölümü ("chapter") tasarla.
Bu seviyenin hedefi: ${LEVEL_GOAL[level] ?? "seviyeye uygun ilerleme"}.

Kurallar:
- ${isFirst ? "8-14" : "3-6"} ünite ("units"), her ünitede 4-8 ders düğümü ("nodes"). SADECE ${levelLabel} seviyesine uygun içerik üret — daha kolay veya daha zor seviyeye kayma.
- Üniteler mantıklı bir öğrenme sırası izlemeli; temalar öğrencinin ilgi alanlarına bağlansın.
- Her ünitenin son düğümü "checkpoint" ya da "boss" olmalı (boss = üniteyi taçlandıran zorlu görev). Diğerleri "lesson".
- xp_reward: lesson 20-35, checkpoint 40-50, boss 60-80.
- "theme" alanı kısa bir ingilizce etiket (ör: "kana", "food", "travel").
- "objectives" her düğüm için 1-3 somut öğrenme hedefi (${native} dilinde).
${titleRule}
${jaExtras}

Sadece şemaya uygun JSON döndür.`;

  return { system, prompt };
}

/**
 * Prompt to re-translate curriculum titles/descriptions into a new native
 * language (T-031). The curriculum STRUCTURE is language-independent — only the
 * display strings change — so we translate the existing strings in place rather
 * than regenerating (which would orphan progress/SRS/attempts). Each item keeps
 * its opaque id; the model must echo ids back unchanged.
 */
export function curriculumTranslatePrompt({
  targetLanguage,
  nativeLanguage,
  items,
}: {
  targetLanguage: string;
  nativeLanguage: string;
  items: { id: string; text: string }[];
}) {
  const lang = languageName(targetLanguage);
  const native = nativeLanguageName(nativeLanguage);
  const system = `Sen bir çeviri asistanısın. Bir ${lang} öğrenme müfredatının başlık ve açıklamalarını ${native} diline çevireceksin. SADECE metni çevir; anlamı ve tonu koru, dil öğrenimine uygun doğal ${native} kullan. Her öğenin "id"sini AYNEN geri döndür, değiştirme. Sadece istenen JSON'u döndür.`;
  const prompt = `Aşağıdaki öğeleri ${native} diline çevir. "id" alanlarını değiştirme, "text" alanına çevrilmiş metni yaz. Hedef dile (${lang}) ait özel terimler/örnekler varsa olduğu gibi bırak, sadece açıklayıcı kısımları çevir.\n\n${JSON.stringify(items, null, 2)}\n\nÇıktı: { "items": [ { "id": "...", "text": "çeviri" }, ... ] }`;
  return { system, prompt };
}
