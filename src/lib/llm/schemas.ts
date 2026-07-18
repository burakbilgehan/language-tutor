import { z } from "zod";

// ---------------------------------------------------------------------------
// Single source of truth for every LLM-generated payload.
// DB json columns and UI components consume the inferred types from here.
// ---------------------------------------------------------------------------

export const SideQuestKind = z.enum([
  "kana_drill",
  "kanji",
  "pop_quiz",
  "vocab_review",
]);
export type SideQuestKind = z.infer<typeof SideQuestKind>;

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

export const CurriculumSideQuestSchema = z.object({
  kind: SideQuestKind,
  title_tr: z.string(),
  description_tr: z.string(),
});

// min(2)/min(0): a single appended JLPT chapter is a small block of units and
// (for non-first chapters) emits no side quests. The initial N5 chapter still
// produces a full journey by prompt design.
export const CurriculumSchema = z.object({
  title: z.string(),
  units: z.array(CurriculumUnitSchema).min(2).max(18),
  side_quests: z.array(CurriculumSideQuestSchema).min(0),
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

export const GrammarTopicSchema = z.object({
  title_tr: z.string(),
  intro_tr: z.string(),
  tables: z.array(GrammarTableSchema).min(1),
  examples: z.array(LessonExampleSchema).min(2),
  related_slugs: z.array(z.string()).nullish(),
});
export type GrammarTopicContent = z.infer<typeof GrammarTopicSchema>;

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

// -- Side quest payloads -----------------------------------------------------

export const SideQuestItemSchema = z
  .object({
    type: z.enum(["mcq", "type_answer"]),
    prompt_tr: z.string(),
    target_text: z.string().nullish(),
    options: z.array(z.string()).nullish(),
    answer: z.string(),
  })
  .superRefine((item, ctx) => {
    if (item.type === "mcq") {
      if (!item.options || item.options.length < 2) {
        ctx.addIssue({
          code: "custom",
          message: "mcq için options zorunlu (en az 2 seçenek).",
        });
      } else if (!item.options.includes(item.answer)) {
        ctx.addIssue({
          code: "custom",
          message: `mcq answer, options'tan birinin AYNEN kendisi olmalı; "${item.answer}" seçeneklerde yok.`,
        });
      }
    }
  });

export const SideQuestPayloadSchema = z.object({
  title_tr: z.string(),
  items: z.array(SideQuestItemSchema).min(5).max(20),
});
export type SideQuestPayload = z.infer<typeof SideQuestPayloadSchema>;
