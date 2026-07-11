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

export const CurriculumSchema = z.object({
  title: z.string(),
  units: z.array(CurriculumUnitSchema).min(4).max(18),
  side_quests: z.array(CurriculumSideQuestSchema).min(1),
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

export const LessonExerciseSchema = z.object({
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

// -- Side quest payloads -----------------------------------------------------

export const SideQuestItemSchema = z.object({
  type: z.enum(["mcq", "type_answer"]),
  prompt_tr: z.string(),
  target_text: z.string().nullish(),
  options: z.array(z.string()).nullish(),
  answer: z.string(),
});

export const SideQuestPayloadSchema = z.object({
  title_tr: z.string(),
  items: z.array(SideQuestItemSchema).min(5).max(20),
});
export type SideQuestPayload = z.infer<typeof SideQuestPayloadSchema>;
