import { z } from "zod";

// ---------------------------------------------------------------------------
// Single source of truth for every LLM-generated payload.
// DB json columns and UI components consume the inferred types from here.
// ---------------------------------------------------------------------------

export const LessonType = z.enum(["lesson", "checkpoint", "boss"]);
export type LessonType = z.infer<typeof LessonType>;

// -- Curriculum --------------------------------------------------------------

export const CurriculumNodeSchema = z.object({
  lesson_type: LessonType,
  title_tr: z.string(),
  subtitle_tr: z.string(),
  objectives: z.array(z.string()).min(1),
  xp_reward: z.number().int().min(10).max(200),
});

export const CurriculumUnitSchema = z.object({
  title_tr: z.string(),
  description_tr: z.string(),
  theme: z.string(),
  nodes: z.array(CurriculumNodeSchema).min(3).max(10),
});

// min(2): a single appended chapter is a small block of units.
export const CurriculumSchema = z.object({
  title: z.string(),
  units: z.array(CurriculumUnitSchema).min(2).max(18),
});
export type Curriculum = z.infer<typeof CurriculumSchema>;

// -- Lesson ------------------------------------------------------------------

export const ExerciseType = z.enum([
  "mcq",
  "fill_blank",
  "translate",
  "free_response",
]);
export type ExerciseType = z.infer<typeof ExerciseType>;

export const LessonExampleSchema = z.object({
  target: z.string(),
  reading: z.string().nullish(),
  translation_tr: z.string(),
  note_tr: z.string().nullish(),
});

export const LessonVocabSchema = z.object({
  term: z.string(),
  reading: z.string().nullish(),
  meaning_tr: z.string(),
  example: z.string().nullish(),
});

/** Rubric-style answer text ("...tam puan verilmeli...") — can never be
 * string-matched, so it must be accompanied by literal accept_also entries. */
const RUBRIC_RE = /puan|verilmeli|değerlendir|kılavuz|olmalı/i;

export const LessonExerciseSchema = z
  .object({
    type: ExerciseType,
    // question shown to the user; for mcq includes options; for fill_blank the
    // sentence contains "___"
    prompt_tr: z.string(),
    target_text: z.string().nullish(),
    options: z.array(z.string()).nullish(), // mcq only
    // expected answer: mcq = exact option text, fill_blank/translate = canonical
    // answer, free_response = grading guidance for the LLM grader
    answer: z.string(),
    accept_also: z.array(z.string()).nullish(),
  })
  .superRefine((ex, ctx) => {
    // Content contracts: schema-level so a violating generation self-corrects
    // via the CLI retry loop instead of shipping a broken exercise.
    if (ex.type === "mcq") {
      if (!ex.options || ex.options.length < 2) {
        ctx.addIssue({
          code: "custom",
          message: "mcq için options zorunlu (en az 2 seçenek).",
        });
      } else if (!ex.options.includes(ex.answer)) {
        ctx.addIssue({
          code: "custom",
          message: `mcq answer, options'tan birinin AYNEN kendisi olmalı; "${ex.answer}" seçeneklerde yok.`,
        });
      }
    }
    if (ex.type === "fill_blank" && !ex.prompt_tr.includes("___")) {
      ctx.addIssue({
        code: "custom",
        message: "fill_blank prompt_tr içinde ___ boşluğu olmalı.",
      });
    }
    if (ex.type === "translate" && (ex.accept_also?.length ?? 0) < 1) {
      ctx.addIssue({
        code: "custom",
        message:
          "translate için accept_also boş olamaz: 3-6 kabul edilebilir alternatif çeviri ekle.",
      });
    }
    if (
      ex.type === "free_response" &&
      RUBRIC_RE.test(ex.answer) &&
      (ex.accept_also?.length ?? 0) < 1
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "free_response answer'ı bir değerlendirme kılavuzu; accept_also'ya birebir kabul edilebilir örnek cevaplar ekle (deterministik eşleşme için).",
      });
    }
  });

export const LessonSchema = z.object({
  title_tr: z.string(),
  explanation_tr: z.string(), // markdown, Turkish
  examples: z.array(LessonExampleSchema).min(2),
  grammar_notes: z.array(
    z.object({ heading_tr: z.string(), body_tr: z.string() })
  ),
  vocab: z.array(LessonVocabSchema),
  exercises: z.array(LessonExerciseSchema).min(4).max(12),
});
export type LessonContent = z.infer<typeof LessonSchema>;

/** Ders çıktısı için son çare kurtarma (GenerateJsonOptions.salvage):
 * superRefine içerik sözleşmelerini (mcq answer options'ta birebir olmalı,
 * translate accept_also >=1, fill_blank ___ ...) İHLAL EDEN alıştırmaları
 * atar; en az 4 geçerli alıştırma kalıyorsa ders kabul edilir. Sözleşmeler
 * JSON Şeması'na çevrilemez (CLI --json-schema yalnız yapıyı zorlar), yani
 * bunlar ancak zod'da yakalanır; tek bozuk alıştırma yüzünden 5-6k
 * karakterlik dersi komple çöpe atmak 2x2.5 dakikalık kesin başarısızlık
 * üretiyordu (2026-08-01 canlı kilit). Dersin geri kalanı (başlık, açıklama,
 * örnekler...) hâlâ tam şemadan geçer; yapısal bozukluk kurtarılMAZ. */
export function salvageLessonContent(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.exercises)) return raw;
  const kept = obj.exercises.filter(
    (ex) => LessonExerciseSchema.safeParse(ex).success
  );
  if (kept.length < 4 || kept.length === obj.exercises.length) return raw;
  return { ...obj, exercises: kept };
}

// -- Curriculum pedagogy prompt (T-079) --------------------------------------
// Stage 1 of the two-stage curriculum pipeline: the deep tier writes the
// PEDAGOGICAL BODY of the curriculum prompt for one (target, native) language
// pair. Code then wraps that body with the fixed data contract (unit/node
// counts, xp ranges, JSON shape) in `chapterPrompt`. Structured output rather
// than free text so the model cannot wrap the body in a chat preamble, and so
// a degenerate response fails validation loudly instead of silently producing
// a contentless curriculum prompt.
export const CurriculumPedagogySchema = z.object({
  // 400 chars is far below any usable body (real ones run 1500-4000) but well
  // above "Tamam." — it catches refusals and truncations, not style variance.
  pedagogy: z.string().min(400),
});
export type CurriculumPedagogyContent = z.infer<typeof CurriculumPedagogySchema>;

/**
 * What `profiles.curriculum_pedagogy` stores. The body is stamped with the
 * language pair it was written for: the whole premise of T-079 is that the
 * prompt is pair-specific, and `nativeLanguage` is editable (PATCH
 * /api/profile), so a stale stamp must trigger a regeneration. Same idea as
 * `curricula.contentLang`. `targetLanguage` is immutable per profile but
 * stamped anyway so the stored value is self-describing for T-080's UI.
 *
 * `edited` (T-080) marks a body the USER wrote or amended by hand. It is
 * additive and optional: values stored before T-080 simply lack it and behave
 * exactly as before. Its one job is to change what a stale pair stamp means.
 * An auto-generated stale body is disposable (regenerating costs one deep
 * call), so it is discarded; a hand-edited one is user input, so it is kept
 * and the staleness is surfaced in the UI with an explicit regenerate action
 * instead of being silently destroyed. Deliberately `true`-only: absent means
 * "not edited", so nothing has to write `edited: false`.
 */
export type CurriculumPedagogy = {
  pedagogy: string;
  targetLanguage: string;
  nativeLanguage: string;
  generatedAt: string;
  edited?: true;
};

// -- Curriculum re-translation (T-031) ---------------------------------------
// Curriculum titles/descriptions are plain columns (not a lang map), so when
// the learner's native language changes they're re-translated in place. The
// LLM receives a list of {id, text} and returns the same ids with translated
// text — structure and IDs are preserved so no progress/SRS/attempt data is
// touched. IDs are opaque row/field keys, echoed back verbatim.
export const CurriculumTranslationSchema = z.object({
  items: z.array(z.object({ id: z.string(), text: z.string() })),
});
export type CurriculumTranslation = z.infer<typeof CurriculumTranslationSchema>;

// -- Grading -----------------------------------------------------------------

export const GradeSchema = z.object({
  correct: z.boolean(),
  score: z.number().int().min(0).max(100),
  feedback_tr: z.string(),
  corrected_answer: z.string().nullish(),
  mistakes: z.array(z.string()).nullish(),
});
export type Grade = z.infer<typeof GradeSchema>;

// -- Grammar topic -----------------------------------------------------------

export const GrammarTableSchema = z.object({
  caption_tr: z.string(),
  column_headers: z.array(z.string()).min(2),
  rows: z.array(z.array(z.string()).min(1)).min(1),
  footnotes_tr: z.array(z.string()).nullish(),
});
export type GrammarTable = z.infer<typeof GrammarTableSchema>;

// T-064: content provenance, carried INSIDE the json payload on purpose (no
// DB column — see src/core/grammar.ts / isMachineTranslated below). Binary,
// not a faithful three-way record: the only thing it drives is "was this
// machine-translated", so absent/null means NOT machine-translated (real
// content — covers every one of the 554 pre-T-064 rows in production, the
// existing packaged tr seed, and every LLM generation, none of which need
// backfilling). Only the MT export script ever stamps "mt". Never trust this
// field if it comes back from an LLM call: the LLM never needs to see or set
// it — it is not meant to author machine-translated content.
export const ContentSource = z.enum(["mt"]);
export type ContentSource = z.infer<typeof ContentSource>;

export const GrammarTopicSchema = z.object({
  title_tr: z.string(),
  intro_tr: z.string(),
  tables: z.array(GrammarTableSchema).min(1),
  examples: z.array(LessonExampleSchema).min(2),
  related_slugs: z.array(z.string()).nullish(),
  source: ContentSource.nullish(),
});
export type GrammarTopicContent = z.infer<typeof GrammarTopicSchema>;

/** The one predicate every reader should use — never compare `.source` directly. */
export function isMachineTranslated(
  content: GrammarTopicContent | null | undefined
): boolean {
  return content?.source === "mt";
}

// -- Kanji entry ---------------------------------------------------------------

// Only the subjective/translated half is LLM-generated; readings and English
// glosses are static dictionary facts in src/lib/kanji-index/ (never ask the
// LLM to produce readings — it will hallucinate rare ones).
export const KanjiExampleSchema = z.object({
  word: z.string(),
  reading: z.string(),
  meaning_tr: z.string(),
});

export const KanjiContentSchema = z.object({
  meanings_tr: z.array(z.string()).min(1),
  note_tr: z.string().nullish(),
  examples: z.array(KanjiExampleSchema).min(2).max(8),
});
export type KanjiContent = z.infer<typeof KanjiContentSchema>;

// -- Vocab entry -------------------------------------------------------------

// Word-level dictionary (HSK sözlük). Like kanji: the reading and English
// glosses are static index facts (src/lib/vocab-index/) — the LLM only
// produces the native-language half. Sentences/phrases use the bracket
// reading notation (学生[xuésheng]) rendered by <Furigana>.
export const VocabExampleSchema = z.object({
  sentence: z.string(),
  translation_tr: z.string(),
});

export const VocabCollocationSchema = z.object({
  phrase: z.string(),
  meaning_tr: z.string(),
});

export const VocabCharSchema = z.object({
  char: z.string(),
  reading: z.string(),
  meaning_tr: z.string(),
  hint_tr: z.string().nullish(),
});

export const VocabContentSchema = z.object({
  meanings_tr: z.array(z.string()).min(1),
  note_tr: z.string().nullish(),
  classifier_note_tr: z.string().nullish(),
  examples: z.array(VocabExampleSchema).min(2).max(5),
  collocations: z.array(VocabCollocationSchema).max(6).nullish(),
  chars: z.array(VocabCharSchema).nullish(),
});
export type VocabContent = z.infer<typeof VocabContentSchema>;

// -- Side quest payload (legacy) ---------------------------------------------
// Side quests were removed (T-018). `nodes.side_quest_payload` and quest-typed
// `nodes` rows stay in the DB on purpose as dead data — dropping the column
// would force a SAVE_SCHEMA_VERSION bump and reject old saves for no benefit.
// This type only exists to keep that column's `.$type<...>()` annotation
// compiling; there is no runtime schema or generator behind it anymore.
export type SideQuestPayload = {
  title_tr: string;
  items: {
    type: "mcq" | "type_answer";
    prompt_tr: string;
    target_text?: string | null;
    options?: string[] | null;
    answer: string;
  }[];
};
