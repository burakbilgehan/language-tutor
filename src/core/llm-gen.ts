import { asc, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import * as tables from "@/db/schema";
import type { LlmProvider } from "@/lib/llm/provider-types";
import {
  LessonSchema,
  GrammarTopicSchema,
  KanjiContentSchema,
  VocabContentSchema,
  GradeSchema,
} from "@/lib/llm/schemas";
import { lessonPrompt, gradingPrompt } from "@/lib/llm/prompts/lesson";
import { grammarPrompt } from "@/lib/llm/prompts/grammar";
import { kanjiPrompt } from "@/lib/llm/prompts/kanji";
import { vocabPrompt } from "@/lib/llm/prompts/vocab";
import { chatPrompt } from "@/lib/llm/prompts/chat";
import { languageName, nativeLanguageName } from "@/lib/profile-options";
import { getStrugglesLine } from "./struggles";
import type { AppDb } from "./db-types";
import type { Profile } from "./profile";

// LLM ÜRETİM mantığının ortam-bağımsız çekirdeği. `gen` = aktif sağlayıcı:
// sunucuda getProvider() (CLI/HTTP), statik modda tarayıcı sağlayıcısı
// (localStorage config → köprü/Ollama/DeepSeek/Anthropic). Sunucu job'ları
// (jobs.ts) ve client-api aynı fonksiyonları çağırır.

export type Gen = Pick<LlmProvider, "generateJson" | "generateText">;

/** runLessonJob'un üretim gövdesi: prompt bağlamını toplar, LLM'den dersi
 * alır, lesson+exercises'ı atomik yazar. Hata durumunda status "error". */
export async function generateLessonContent(
  db: AppDb,
  gen: Gen,
  nodeId: string
): Promise<void> {
  const node = db
    .select()
    .from(tables.nodes)
    .where(eq(tables.nodes.id, nodeId))
    .limit(1)
    .get();
  if (!node) throw new Error("Node bulunamadı");

  const unit = db
    .select()
    .from(tables.units)
    .where(eq(tables.units.id, node.unitId))
    .limit(1)
    .get();
  if (!unit) throw new Error("Ünite bulunamadı");

  const curriculum = db
    .select()
    .from(tables.curricula)
    .where(eq(tables.curricula.id, unit.curriculumId))
    .limit(1)
    .get();
  const profile = db
    .select()
    .from(tables.profiles)
    .where(eq(tables.profiles.id, curriculum!.profileId))
    .limit(1)
    .get();
  if (!profile) throw new Error("Profil bulunamadı");

  const completedTitles = db
    .select({ title: tables.nodes.titleTr })
    .from(tables.nodes)
    .where(eq(tables.nodes.status, "completed"))
    .all()
    .map((r) => r.title)
    .slice(-12);

  // Recent exercise questions in this curriculum — fed to the prompt so the
  // LLM stops recycling the same trivially-patterned questions across lessons.
  const recentExercisePrompts = db
    .select({ prompt: tables.exercises.promptTr })
    .from(tables.exercises)
    .innerJoin(tables.lessons, eq(tables.exercises.lessonId, tables.lessons.id))
    .innerJoin(tables.nodes, eq(tables.lessons.nodeId, tables.nodes.id))
    .innerJoin(tables.units, eq(tables.nodes.unitId, tables.units.id))
    .where(eq(tables.units.curriculumId, unit.curriculumId))
    .all()
    .map((r) => r.prompt)
    .slice(-30);

  // Ensure a lessons row exists (status marker for the UI).
  const existing = db
    .select()
    .from(tables.lessons)
    .where(eq(tables.lessons.nodeId, nodeId))
    .limit(1)
    .get();
  const lessonId = existing?.id ?? nanoid();
  if (!existing) {
    db.insert(tables.lessons)
      .values({ id: lessonId, nodeId, status: "generating" })
      .run();
  } else {
    db.update(tables.lessons)
      .set({ status: "generating" })
      .where(eq(tables.lessons.id, lessonId))
      .run();
  }

  try {
    const { system, prompt } = lessonPrompt({
      profile,
      node,
      unitTitle: unit.titleTr,
      unitTheme: unit.theme,
      completedTitles,
      strugglesLine: getStrugglesLine(db, profile.id),
      recentExercisePrompts,
    });
    const lesson = await gen.generateJson({
      system,
      prompt,
      schema: LessonSchema,
      fixtureKey: "lesson",
      tier: "balanced",
      timeoutMs: 300_000,
    });

    db.transaction((tx) => {
      tx.update(tables.lessons)
        .set({ content: lesson, status: "ready", generatedAt: new Date() })
        .where(eq(tables.lessons.id, lessonId))
        .run();
      // Re-generation: replace old exercises. Attempts on the replaced
      // exercises go with them (FK, and they grade questions that no longer
      // exist).
      tx.delete(tables.attempts)
        .where(
          inArray(
            tables.attempts.exerciseId,
            tx
              .select({ id: tables.exercises.id })
              .from(tables.exercises)
              .where(eq(tables.exercises.lessonId, lessonId))
          )
        )
        .run();
      tx.delete(tables.exercises)
        .where(eq(tables.exercises.lessonId, lessonId))
        .run();
      lesson.exercises.forEach((ex, i) => {
        tx.insert(tables.exercises)
          .values({
            id: nanoid(),
            lessonId,
            position: i,
            type: ex.type,
            promptTr: ex.prompt_tr,
            targetText: ex.target_text ?? null,
            options: ex.options ?? null,
            answer: ex.answer,
            acceptAlso: ex.accept_also ?? null,
            grading:
              ex.type === "free_response" || ex.type === "translate"
                ? "llm"
                : "deterministic",
          })
          .run();
      });
    });
  } catch (err) {
    db.update(tables.lessons)
      .set({ status: "error" })
      .where(eq(tables.lessons.id, lessonId))
      .run();
    throw err;
  }
}

/** runGrammarJob'un üretim gövdesi. */
export async function generateGrammarContent(
  db: AppDb,
  gen: Gen,
  topicId: string
): Promise<void> {
  const topic = db
    .select()
    .from(tables.grammarTopics)
    .where(eq(tables.grammarTopics.id, topicId))
    .limit(1)
    .get();
  if (!topic) throw new Error("Gramer konusu bulunamadı");

  // Level personalization must follow the topic's language, not whichever
  // profile happens to be active when the job runs.
  const profile = db
    .select()
    .from(tables.profiles)
    .where(eq(tables.profiles.targetLanguage, topic.targetLanguage))
    .limit(1)
    .get();
  const siblingTitles = db
    .select({ title: tables.grammarTopics.titleTr })
    .from(tables.grammarTopics)
    .where(eq(tables.grammarTopics.targetLanguage, topic.targetLanguage))
    .all()
    .map((r) => r.title);

  db.update(tables.grammarTopics)
    .set({ status: "generating" })
    .where(eq(tables.grammarTopics.id, topicId))
    .run();

  try {
    const { system, prompt } = grammarPrompt({
      topic,
      selfLevel: profile?.selfLevel ?? "zero",
      nativeLanguage: profile?.nativeLanguage ?? "tr",
      siblingTitles,
    });
    const content = await gen.generateJson({
      system,
      prompt,
      schema: GrammarTopicSchema,
      fixtureKey: "grammar",
      tier: "balanced",
      timeoutMs: 300_000,
    });
    db.update(tables.grammarTopics)
      .set({ content, status: "ready", generatedAt: new Date() })
      .where(eq(tables.grammarTopics.id, topicId))
      .run();
  } catch (err) {
    db.update(tables.grammarTopics)
      .set({ status: "error" })
      .where(eq(tables.grammarTopics.id, topicId))
      .run();
    throw err;
  }
}

/** runKanjiJob'un üretim gövdesi. */
export async function generateKanjiContent(
  db: AppDb,
  gen: Gen,
  entryId: string
): Promise<void> {
  const entry = db
    .select()
    .from(tables.kanjiEntries)
    .where(eq(tables.kanjiEntries.id, entryId))
    .limit(1)
    .get();
  if (!entry) throw new Error("Kanji kaydı bulunamadı");

  // Personalization follows the entry's language, not the active profile.
  const profile = db
    .select()
    .from(tables.profiles)
    .where(eq(tables.profiles.targetLanguage, entry.targetLanguage))
    .limit(1)
    .get();

  db.update(tables.kanjiEntries)
    .set({ status: "generating" })
    .where(eq(tables.kanjiEntries.id, entryId))
    .run();

  try {
    const { system, prompt } = kanjiPrompt({
      entry,
      selfLevel: profile?.selfLevel ?? "zero",
      interests: profile?.interests ?? [],
      nativeLanguage: profile?.nativeLanguage,
    });
    const content = await gen.generateJson({
      system,
      prompt,
      schema: KanjiContentSchema,
      fixtureKey: "kanji",
      tier: "fast",
      timeoutMs: 120_000,
    });
    db.update(tables.kanjiEntries)
      .set({ content, status: "ready", generatedAt: new Date() })
      .where(eq(tables.kanjiEntries.id, entryId))
      .run();
  } catch (err) {
    db.update(tables.kanjiEntries)
      .set({ status: "error" })
      .where(eq(tables.kanjiEntries.id, entryId))
      .run();
    throw err;
  }
}

/** runVocabJob'un üretim gövdesi. */
export async function generateVocabContent(
  db: AppDb,
  gen: Gen,
  entryId: string
): Promise<void> {
  const entry = db
    .select()
    .from(tables.vocabEntries)
    .where(eq(tables.vocabEntries.id, entryId))
    .limit(1)
    .get();
  if (!entry) throw new Error("Sözlük kaydı bulunamadı");

  // Personalization follows the entry's language, not the active profile.
  const profile = db
    .select()
    .from(tables.profiles)
    .where(eq(tables.profiles.targetLanguage, entry.targetLanguage))
    .limit(1)
    .get();

  db.update(tables.vocabEntries)
    .set({ status: "generating" })
    .where(eq(tables.vocabEntries.id, entryId))
    .run();

  try {
    const { system, prompt } = vocabPrompt({
      entry,
      selfLevel: profile?.selfLevel ?? "zero",
      interests: profile?.interests ?? [],
      nativeLanguage: profile?.nativeLanguage,
    });
    const content = await gen.generateJson({
      system,
      prompt,
      schema: VocabContentSchema,
      fixtureKey: "vocab",
      tier: "fast",
      timeoutMs: 120_000,
    });
    db.update(tables.vocabEntries)
      .set({ content, status: "ready", generatedAt: new Date() })
      .where(eq(tables.vocabEntries.id, entryId))
      .run();
  } catch (err) {
    db.update(tables.vocabEntries)
      .set({ status: "error" })
      .where(eq(tables.vocabEntries.id, entryId))
      .run();
    throw err;
  }
}

/** Chat POST'un gövdesi: oturum yönetimi + geçmiş + LLM + mesaj kaydı. */
export async function sendChatMessage(
  db: AppDb,
  gen: Gen,
  profile: Profile,
  input: { sessionId: string | null; message: string; contextNodeId?: string | null }
): Promise<{ sessionId: string; reply: string }> {
  let sessionId = input.sessionId ?? null;
  if (sessionId) {
    const exists = db
      .select()
      .from(tables.chatSessions)
      .where(eq(tables.chatSessions.id, sessionId))
      .limit(1)
      .get();
    if (!exists) sessionId = null;
  }
  if (!sessionId) {
    sessionId = nanoid();
    db.insert(tables.chatSessions)
      .values({ id: sessionId, profileId: profile.id })
      .run();
  }

  const history = db
    .select()
    .from(tables.chatMessages)
    .where(eq(tables.chatMessages.sessionId, sessionId))
    .orderBy(asc(tables.chatMessages.createdAt))
    .all()
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content }));

  let lessonContext: string | null = null;
  if (input.contextNodeId) {
    const node = db
      .select()
      .from(tables.nodes)
      .where(eq(tables.nodes.id, input.contextNodeId))
      .limit(1)
      .get();
    if (node) lessonContext = `"${node.titleTr}" — ${node.subtitleTr}`;
  }

  const { system, prompt } = chatPrompt({
    profile,
    lessonContext,
    history,
    message: input.message,
  });

  const reply = (
    await gen.generateText({
      system,
      prompt,
      fixtureKey: "chat",
      tier: "balanced",
      timeoutMs: 120_000,
    })
  ).trim();

  db.insert(tables.chatMessages)
    .values([
      { id: nanoid(), sessionId, role: "user" as const, content: input.message },
      { id: nanoid(), sessionId, role: "assistant" as const, content: reply },
    ])
    .run();

  return { sessionId, reply };
}

/** Translate route'un LLM bacağı: taze çeviri + cache'e yazma. */
export async function freshTranslation(
  db: AppDb,
  gen: Gen,
  profile: Profile,
  normalizedText: string
): Promise<string> {
  const lang = languageName(profile.targetLanguage);
  const native = nativeLanguageName(profile.nativeLanguage);
  const translation = (
    await gen.generateText({
      prompt: `Aşağıdaki ${lang} metni ${native} diline çevir. SADECE çeviriyi yaz, açıklama ekleme. Metin bir kelime listesiyse ("・" ile ayrılmış) her öğeyi aynı sırayla "・" ile ayırarak çevir.\n\n${normalizedText}`,
      fixtureKey: "translate",
      tier: "fast",
      timeoutMs: 30_000,
      urgent: true,
    })
  ).trim();
  if (translation) {
    db.insert(tables.translations)
      .values({
        id: nanoid(),
        targetLanguage: profile.targetLanguage,
        sourceText: normalizedText,
        translationTr: translation,
      })
      .onConflictDoNothing()
      .run();
  }
  return translation;
}

/** Attempt route'un LLM değerlendirme callback'i — sunucu ve tarayıcı aynı
 * prompt/şemayla değerlendirir. */
export function makeLlmGrader(
  gen: Gen,
  profile: Profile,
  userResponse: string
) {
  return async (exercise: typeof tables.exercises.$inferSelect) => {
    const { system, prompt } = gradingPrompt({
      targetLanguage: profile.targetLanguage,
      nativeLanguage: profile.nativeLanguage,
      exerciseType: exercise.type,
      promptTr: exercise.promptTr,
      targetText: exercise.targetText,
      expectedAnswer: exercise.answer,
      acceptAlso: exercise.acceptAlso,
      userResponse,
    });
    return gen.generateJson({
      system,
      prompt,
      schema: GradeSchema,
      fixtureKey: "grade",
      tier: exercise.type === "free_response" ? "balanced" : "fast",
      timeoutMs: 90_000,
      urgent: true,
    });
  };
}
