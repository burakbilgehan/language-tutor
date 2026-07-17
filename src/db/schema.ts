import {
  sqliteTable,
  text,
  integer,
  real,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import type {
  LessonContent,
  GrammarTopicContent,
  SideQuestPayload,
  KanjiContent,
} from "@/lib/llm/schemas";

const id = () => text("id").primaryKey();
const createdAt = () =>
  integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date());

export const profiles = sqliteTable("profiles", {
  id: id(),
  targetLanguage: text("target_language").notNull(), // 'ja' | 'nl' | ...
  nativeLanguage: text("native_language").notNull().default("tr"),
  uiLanguage: text("ui_language").notNull().default("tr"),
  displayName: text("display_name").notNull(),
  goals: text("goals", { mode: "json" }).notNull().$type<string[]>(),
  selfLevel: text("self_level", {
    enum: ["zero", "beginner", "elementary", "intermediate"],
  }).notNull(),
  minutesPerWeek: integer("minutes_per_week").notNull(),
  interests: text("interests", { mode: "json" }).notNull().$type<string[]>(),
  motivation: text("motivation").notNull().default(""),
  // Exactly one profile is active at a time; getActiveProfile() self-heals
  // legacy rows where no flag is set.
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(false),
  createdAt: createdAt(),
});

export const curricula = sqliteTable("curricula", {
  id: id(),
  profileId: text("profile_id")
    .notNull()
    .references(() => profiles.id),
  title: text("title").notNull().default(""),
  status: text("status", {
    enum: ["pending", "generating", "ready", "error"],
  })
    .notNull()
    .default("pending"),
  modelUsed: text("model_used"),
  generatedAt: integer("generated_at", { mode: "timestamp" }),
});

export const curriculumChapters = sqliteTable(
  "curriculum_chapters",
  {
    id: id(),
    curriculumId: text("curriculum_id")
      .notNull()
      .references(() => curricula.id),
    level: text("level").notNull(), // 'N5' | 'N4' | 'N3' | 'N2' | 'N1'
    position: integer("position").notNull(), // 0-based JLPT ordinal (N5=0..N1=4)
    status: text("status", {
      enum: ["pending", "generating", "ready", "error"],
    })
      .notNull()
      .default("pending"),
    titleTr: text("title_tr").notNull().default(""),
    generatedAt: integer("generated_at", { mode: "timestamp" }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("chapter_level_idx").on(t.curriculumId, t.level)]
);

export const units = sqliteTable("units", {
  id: id(),
  curriculumId: text("curriculum_id")
    .notNull()
    .references(() => curricula.id),
  chapterId: text("chapter_id").references(() => curriculumChapters.id),
  level: text("level"), // denormalized chapter level for cheap filtering/labels
  position: integer("position").notNull(),
  titleTr: text("title_tr").notNull(),
  descriptionTr: text("description_tr").notNull().default(""),
  theme: text("theme").notNull().default(""),
});

export const nodes = sqliteTable("nodes", {
  id: id(),
  unitId: text("unit_id")
    .notNull()
    .references(() => units.id),
  position: integer("position").notNull(),
  nodeType: text("node_type", { enum: ["main", "side_quest"] })
    .notNull()
    .default("main"),
  sideQuestKind: text("side_quest_kind", {
    enum: ["kana_drill", "kanji", "pop_quiz", "vocab_review"],
  }),
  lessonType: text("lesson_type", {
    enum: ["lesson", "checkpoint", "boss"],
  })
    .notNull()
    .default("lesson"),
  titleTr: text("title_tr").notNull(),
  subtitleTr: text("subtitle_tr").notNull().default(""),
  objectives: text("objectives", { mode: "json" }).notNull().$type<string[]>(),
  xpReward: integer("xp_reward").notNull().default(20),
  status: text("status", { enum: ["locked", "available", "completed"] })
    .notNull()
    .default("locked"),
  prereqNodeId: text("prereq_node_id"),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  // Cached drill payload for side quests: generated on first start, cleared on
  // completion so each *completed run* gets fresh content — but re-opens and
  // page refreshes don't pay for a new LLM call.
  sideQuestPayload: text("side_quest_payload", {
    mode: "json",
  }).$type<SideQuestPayload | null>(),
});

export const lessons = sqliteTable(
  "lessons",
  {
    id: id(),
    nodeId: text("node_id")
      .notNull()
      .references(() => nodes.id),
    content: text("content", { mode: "json" }).$type<LessonContent>(),
    status: text("status", {
      enum: ["pending", "generating", "ready", "error"],
    })
      .notNull()
      .default("pending"),
    modelUsed: text("model_used"),
    generatedAt: integer("generated_at", { mode: "timestamp" }),
  },
  (t) => [uniqueIndex("lessons_node_idx").on(t.nodeId)]
);

export const exercises = sqliteTable("exercises", {
  id: id(),
  lessonId: text("lesson_id")
    .notNull()
    .references(() => lessons.id),
  position: integer("position").notNull(),
  type: text("type", {
    enum: ["mcq", "fill_blank", "translate", "free_response"],
  }).notNull(),
  promptTr: text("prompt_tr").notNull(),
  targetText: text("target_text"),
  options: text("options", { mode: "json" }).$type<string[] | null>(),
  answer: text("answer").notNull(),
  acceptAlso: text("accept_also", { mode: "json" }).$type<string[] | null>(),
  grading: text("grading", { enum: ["deterministic", "llm"] }).notNull(),
});

export const attempts = sqliteTable("attempts", {
  id: id(),
  exerciseId: text("exercise_id")
    .notNull()
    .references(() => exercises.id),
  response: text("response").notNull(),
  isCorrect: integer("is_correct", { mode: "boolean" }),
  score: integer("score"),
  feedbackTr: text("feedback_tr"),
  gradedBy: text("graded_by", { enum: ["deterministic", "llm"] }).notNull(),
  createdAt: createdAt(),
});

export const srsCards = sqliteTable(
  "srs_cards",
  {
    id: id(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id),
    itemType: text("item_type", {
      enum: ["vocab", "kanji", "kana", "grammar_point"],
    }).notNull(),
    front: text("front").notNull(),
    back: text("back").notNull(),
    reading: text("reading"),
    example: text("example"),
    sourceLessonId: text("source_lesson_id"),
    easeFactor: real("ease_factor").notNull().default(2.5),
    intervalDays: real("interval_days").notNull().default(0),
    repetitions: integer("repetitions").notNull().default(0),
    lapses: integer("lapses").notNull().default(0),
    dueAt: integer("due_at", { mode: "timestamp" }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("srs_cards_dedupe_idx").on(t.profileId, t.itemType, t.front),
  ]
);

export const srsReviews = sqliteTable("srs_reviews", {
  id: id(),
  cardId: text("card_id")
    .notNull()
    .references(() => srsCards.id),
  rating: integer("rating").notNull(), // 0 again | 1 hard | 2 good | 3 easy
  intervalBefore: real("interval_before").notNull(),
  intervalAfter: real("interval_after").notNull(),
  reviewedAt: createdAt(),
});

export const grammarTopics = sqliteTable(
  "grammar_topics",
  {
    id: id(),
    targetLanguage: text("target_language").notNull(),
    slug: text("slug").notNull(),
    titleTr: text("title_tr").notNull(),
    category: text("category").notNull(),
    level: text("level"),
    position: integer("position").notNull().default(0),
    content: text("content", { mode: "json" }).$type<GrammarTopicContent>(),
    status: text("status", {
      enum: ["pending", "generating", "ready", "error"],
    })
      .notNull()
      .default("pending"),
    generatedAt: integer("generated_at", { mode: "timestamp" }),
  },
  (t) => [uniqueIndex("grammar_slug_idx").on(t.targetLanguage, t.slug)]
);

export const kanjiEntries = sqliteTable(
  "kanji_entries",
  {
    id: id(),
    targetLanguage: text("target_language").notNull(),
    char: text("char").notNull(),
    level: text("level").notNull(), // 'N5'..'N1'
    position: integer("position").notNull().default(0),
    // Static dictionary facts, seeded from src/lib/kanji-index/ (re-synced by
    // the /api/kanji self-heal, never LLM-generated).
    onyomi: text("onyomi", { mode: "json" }).notNull().$type<string[]>(),
    kunyomi: text("kunyomi", { mode: "json" }).notNull().$type<string[]>(),
    meaningsEn: text("meanings_en", { mode: "json" })
      .notNull()
      .$type<string[]>(),
    // LLM half: Turkish meanings + examples, generated once on demand.
    content: text("content", { mode: "json" }).$type<KanjiContent>(),
    status: text("status", {
      enum: ["pending", "generating", "ready", "error"],
    })
      .notNull()
      .default("pending"),
    generatedAt: integer("generated_at", { mode: "timestamp" }),
  },
  (t) => [uniqueIndex("kanji_char_idx").on(t.targetLanguage, t.char)]
);

// Cached selection translations (SelectionTooltip "Çevir") so re-selecting
// the same text never re-calls the LLM.
export const translations = sqliteTable(
  "translations",
  {
    id: id(),
    targetLanguage: text("target_language").notNull(),
    sourceText: text("source_text").notNull(),
    translationTr: text("translation_tr").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("translation_text_idx").on(t.targetLanguage, t.sourceText)]
);

export const chatSessions = sqliteTable("chat_sessions", {
  id: id(),
  profileId: text("profile_id")
    .notNull()
    .references(() => profiles.id),
  contextNodeId: text("context_node_id"),
  createdAt: createdAt(),
});

export const chatMessages = sqliteTable("chat_messages", {
  id: id(),
  sessionId: text("session_id")
    .notNull()
    .references(() => chatSessions.id),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  createdAt: createdAt(),
});

export const xpEvents = sqliteTable("xp_events", {
  id: id(),
  profileId: text("profile_id")
    .notNull()
    .references(() => profiles.id),
  amount: integer("amount").notNull(),
  reason: text("reason", {
    enum: [
      "lesson_complete",
      "exercise",
      "srs_review",
      "side_quest",
      "streak_bonus",
    ],
  }).notNull(),
  refId: text("ref_id"),
  createdAt: createdAt(),
});

export const streaks = sqliteTable("streaks", {
  profileId: text("profile_id")
    .primaryKey()
    .references(() => profiles.id),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastActivityDate: text("last_activity_date"), // ISO date 'YYYY-MM-DD'
});

export const llmCalls = sqliteTable("llm_calls", {
  id: id(),
  purpose: text("purpose").notNull(), // fixtureKey: curriculum/lesson/grade/...
  model: text("model").notNull(),
  tier: text("tier").notNull(),
  durationMs: integer("duration_ms").notNull(),
  costUsd: real("cost_usd").notNull().default(0),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  createdAt: createdAt(),
});

// Single-row KV metadata baked into an exported save so import can verify
// schema compatibility before swapping in the file.
export const saveMeta = sqliteTable("save_meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const generationJobs = sqliteTable("generation_jobs", {
  id: id(),
  jobType: text("job_type", {
    enum: ["curriculum", "chapter", "lesson", "grammar", "side_quest", "kanji"],
  }).notNull(),
  refId: text("ref_id").notNull(),
  status: text("status", {
    enum: ["queued", "running", "done", "error"],
  })
    .notNull()
    .default("queued"),
  error: text("error"),
  rawOutput: text("raw_output"),
  createdAt: createdAt(),
  startedAt: integer("started_at", { mode: "timestamp" }),
  finishedAt: integer("finished_at", { mode: "timestamp" }),
});
