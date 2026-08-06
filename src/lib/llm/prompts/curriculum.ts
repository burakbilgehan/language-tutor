import type { profiles } from "@/db/schema";
import { firstLevel, levelDisplay } from "@/lib/curriculum/levels";
import { languageName, nativeLanguageName } from "@/lib/profile-options";

type Profile = typeof profiles.$inferSelect;

// The prompt SCAFFOLDING follows the learner's native language (tr | en).
// Historically every prompt was written in Turkish with `${native}`
// interpolations; that worked, but T-080 shows this prompt to the user, and an
// English-native learner reading "Sen deneyimli bir..." around English
// fragments is broken transparency. tr stays canonical; en mirrors it.
type PromptLang = "tr" | "en";
const promptLang = (nativeLanguage: string | null): PromptLang =>
  nativeLanguage === "en" ? "en" : "tr";

// Per-level pedagogical goal, injected into the chapter prompt. Level strings
// are globally unique across schemes (JLPT/HSK/CEFR), so one flat map per
// scaffolding language.
const LEVEL_GOAL: Record<PromptLang, Record<string, string>> = {
  tr: {
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
  },
  en: {
    N5: "survival basics: kana, basic greetings, simple sentences",
    N4: "simple everyday communication: core verb conjugation, common patterns",
    N3: "intermediate: complex sentence connectors, everyday fluency",
    N2: "upper-intermediate: abstract topics, formal/informal register, a wide pattern repertoire",
    N1: "advanced: literary/academic language, fine nuance, keigo in depth",
    HSK1: "survival basics: pinyin and tones, basic sentence structure, greetings (~150 words)",
    HSK2: "simple everyday communication: time/place expressions, basic aspect particles (~300 words)",
    HSK3: "pre-intermediate: fluency on daily topics, basic 把/被 structures, complements (~600 words)",
    HSK4: "intermediate: entry to abstract topics, complex complements, rich connectors (~1200 words)",
    HSK5: "upper-intermediate: newspaper/TV-drama level, written-language patterns (~2500 words)",
    HSK6: "advanced: natural and nuanced expression, idioms (成语), literary structures (~5000 words)",
    A1: "survival basics: greetings, introducing yourself, the most basic sentences",
    A2: "simple everyday communication: routine topics, simple past/future tenses",
    B1: "intermediate: coping in travel and work situations, expressing opinions",
    B2: "upper-intermediate: abstract topics, fluent discussion, detailed texts",
    C1: "advanced: flexible and effective language use, fine shades of meaning",
    C2: "mastery: near-native level, command of subtle style",
  },
};

const SELF_LEVEL_TEXT: Record<PromptLang, Record<string, string>> = {
  tr: {
    zero: "hiç bilmiyor, sıfırdan başlıyor",
    beginner: "çok az biliyor (birkaç kelime/selamlaşma)",
    elementary: "temel seviyede (basit cümleler kurabiliyor)",
    intermediate: "orta seviyede",
  },
  en: {
    zero: "knows nothing, starting from scratch",
    beginner: "knows very little (a few words/greetings)",
    elementary: "elementary (can build simple sentences)",
    intermediate: "intermediate",
  },
};

export interface ChapterPromptInput {
  profile: Profile;
  level: string;
  /**
   * T-079 stage 1 output: the pedagogical body written by the deep tier for
   * this (target, native) language pair, stored on the profile and reused by
   * every chapter. This function is the WRAPPER around it: everything here is
   * the fixed data contract (counts, xp ranges, JSON shape, output language),
   * and the pedagogy body is forbidden from restating any of it.
   */
  pedagogy: string;
  /** Compact summary of already-taught units/grammar (empty for the first chapter). */
  priorSummary?: string;
}

/** The chapter prompt split at the one seam the user is allowed to edit. */
export interface ChapterPromptParts {
  system: string;
  /** Locked contract text that precedes the pedagogy body. */
  before: string;
  /** T-079 stage 1 output; the ONLY editable region (T-080). */
  pedagogy: string;
  /** Locked contract text that follows the pedagogy body. */
  after: string;
}

/**
 * Builds the prompt for ONE chapter (a level of the profile's scheme:
 * JLPT/HSK/CEFR), split into the locked contract halves and the editable
 * pedagogy body between them. The first chapter frames a from-zero journey;
 * later chapters generate only that level's units and are told what prior
 * chapters already covered so they don't repeat it.
 *
 * The per-language pedagogy that used to live here as hand-written `jaCore` /
 * `zhCore` / `latinCore` / `nlExtras` / `frExtras` blocks is gone (T-079):
 * hand-generalizing to every new language did not scale and ignored the
 * learner's native language entirely. It now arrives as `pedagogy`.
 *
 * T-080 shows this prompt to the user before generation: the `before`/`after`
 * halves render read-only and `pedagogy` renders in an editable textarea.
 * `chapterPrompt` is nothing but `before + pedagogy + after`, so what the UI
 * displays is byte-for-byte what generation sends; there is no second copy of
 * the copy to drift.
 */
export function chapterPromptParts({
  profile,
  level,
  pedagogy,
  priorSummary,
}: ChapterPromptInput): ChapterPromptParts {
  const lang = languageName(profile.targetLanguage);
  const native = nativeLanguageName(profile.nativeLanguage);
  const pl = promptLang(profile.nativeLanguage);
  const isFirst = level === firstLevel(profile.targetLanguage);
  const levelLabel = levelDisplay(profile.targetLanguage, level);
  const levelText = SELF_LEVEL_TEXT[pl][profile.selfLevel] ?? profile.selfLevel;
  const levelGoal =
    LEVEL_GOAL[pl][level] ??
    (pl === "en" ? "level-appropriate progress" : "seviyeye uygun ilerleme");

  const system =
    pl === "en"
      ? `You are an experienced ${lang} curriculum designer. You build personalized, gamified language curricula for learners whose native language is ${native}. All titles and descriptions must be in ${native}. Return only the requested JSON.`
      : `Sen deneyimli bir ${lang} müfredat tasarımcısısın. Ana dili ${native} olan öğrenciler için kişiselleştirilmiş, oyunlaştırılmış dil müfredatları hazırlıyorsun. Tüm başlık ve açıklamalar ${native} dilinde olacak. Sadece istenen JSON'u döndür.`;

  // Stage 1's output goes verbatim between `before` and `after`, in its own
  // clearly-labelled section so the model can tell pedagogy from contract; the
  // meta-prompt is explicitly forbidden from emitting contract rules, which
  // keeps the two from fighting. The label lines belong to the LOCKED halves:
  // the user edits the body, not the framing that marks it as pedagogy.

  // Chapter position is structural, not pedagogical, so it stays in the
  // wrapper: only the wrapper knows whether this is the first chapter.
  const continuationRule = isFirst
    ? ""
    : pl === "en"
      ? `\n- This is NOT the first chapter: do not re-teach basics/introductions; move forward with NEW topics specific to this level.`
      : `\n- Bu ilk bölüm DEĞİL: temel/giriş konularını baştan öğretme, bu seviyeye özgü YENİ konularla ilerle.`;

  const priorBlock = priorSummary
    ? pl === "en"
      ? `\nTHE FOLLOWING WAS ALREADY TAUGHT IN EARLIER CHAPTERS. DO NOT REPEAT IT; advance only NEW grammar and vocabulary specific to this level:\n${priorSummary}\n`
      : `\nŞU KONULAR ÖNCEKİ BÖLÜMLERDE ZATEN ÖĞRETİLDİ; TEKRARLAMA, sadece bu seviyeye özgü YENİ dilbilgisi ve kelime dağarcığını ilerlet:\n${priorSummary}\n`
    : "";

  const titleRule = isFirst
    ? pl === "en"
      ? `- "title": a short, motivating title for the whole curriculum (in ${native}).`
      : `- "title": tüm müfredat için kısa, motive edici bir başlık (${native} dilinde).`
    : pl === "en"
      ? `- "title": a short title for this chapter (in ${native}); the overall curriculum title already exists.`
      : `- "title": bu bölüm için kısa bir başlık (${native} dilinde); genel müfredat başlığı zaten mevcut.`;

  const before =
    pl === "en"
      ? `Learner profile:
- Target language: ${lang}
- Native language: ${native}
- Starting level: ${levelText}
- Weekly time budget: ${profile.minutesPerWeek} minutes
- Goals: ${profile.goals.join(", ")}
- Interests: ${profile.interests.join(", ")}
- Motivation (in their own words): "${profile.motivation}"
${priorBlock}
PEDAGOGY INSTRUCTION FOR THIS LANGUAGE PAIR (follow it):
`
      : `Öğrenci profili:
- Hedef dil: ${lang}
- Ana dili: ${native}
- Başlangıç seviyesi: ${levelText}
- Haftalık ayırabileceği süre: ${profile.minutesPerWeek} dakika
- Hedefleri: ${profile.goals.join(", ")}
- İlgi alanları: ${profile.interests.join(", ")}
- Motivasyonu (kendi sözleriyle): "${profile.motivation}"
${priorBlock}
BU DİL ÇİFTİ İÇİN PEDAGOJİ TALİMATI (uy):
`;

  const after =
    pl === "en"
      ? `

Now design the curriculum chapter for the **${levelLabel}** level.
The goal of this level: ${levelGoal}.

Rules:
- ${isFirst ? "8-14" : "3-6"} units, each with 4-8 lesson nodes. Produce content appropriate for ${levelLabel} ONLY; do not drift easier or harder.
- Units must follow a sensible learning order; tie themes to the learner's interests.
- The last node of every unit must be a "checkpoint" or a "boss" (boss = a demanding task crowning the unit). All others are "lesson".
- xp_reward: lesson 20-35, checkpoint 40-50, boss 60-80.
- "theme" is a short English tag (e.g. "food", "travel", "grammar").
- "objectives": 1-3 concrete learning objectives per node (in ${native}).
${titleRule}${continuationRule}

Return only JSON matching the schema.`
      : `

Şu an **${levelLabel}** seviyesi için müfredat bölümü ("chapter") tasarla.
Bu seviyenin hedefi: ${levelGoal}.

Kurallar:
- ${isFirst ? "8-14" : "3-6"} ünite ("units"), her ünitede 4-8 ders düğümü ("nodes"). SADECE ${levelLabel} seviyesine uygun içerik üret; daha kolay veya daha zor seviyeye kayma.
- Üniteler mantıklı bir öğrenme sırası izlemeli; temalar öğrencinin ilgi alanlarına bağlansın.
- Her ünitenin son düğümü "checkpoint" ya da "boss" olmalı (boss = üniteyi taçlandıran zorlu görev). Diğerleri "lesson".
- xp_reward: lesson 20-35, checkpoint 40-50, boss 60-80.
- "theme" alanı kısa bir ingilizce etiket (ör: "food", "travel", "grammar").
- "objectives" her düğüm için 1-3 somut öğrenme hedefi (${native} dilinde).
${titleRule}${continuationRule}

Sadece şemaya uygun JSON döndür.`;

  return { system, before, pedagogy: pedagogy.trim(), after };
}

/**
 * The prompt actually sent to the model: the locked halves with the pedagogy
 * body between them. Kept as the single assembly point so the transparency UI
 * (T-080) and generation can never disagree about what gets sent.
 */
export function chapterPrompt(input: ChapterPromptInput) {
  const parts = chapterPromptParts(input);
  return {
    system: parts.system,
    prompt: parts.before + parts.pedagogy + parts.after,
  };
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
