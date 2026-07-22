// sql.js sürücü parite testi: gerçek app.db imajını sql.js'e yükle, core
// SRS fonksiyonlarını çalıştır (tarayıcıda çalışacak yolun aynısı, node'da).
import fs from "node:fs";
import initSqlJs from "sql.js";
import { drizzle } from "drizzle-orm/sql-js";
import * as schema from "@/db/schema";
import { srsDue, srsReview } from "@/core/srs";
import { getActiveProfile } from "@/core/profile";
import { totalXp } from "@/core/xp";

async function main() {
const SQL = await initSqlJs({
  locateFile: (f: string) => `node_modules/sql.js/dist/${f}`,
});
const bytes = fs.readFileSync("data/app.db");
const sqlite = new SQL.Database(bytes);
sqlite.run("PRAGMA foreign_keys = ON");
const db = drizzle(sqlite, { schema });

let fail = 0;
const check = (name: string, cond: boolean, extra = "") => {
  console.log(`${cond ? "OK " : "FAIL"} ${name} ${extra}`);
  if (!cond) fail++;
};

// 1. Profil okuma (relational query + .sync())
const profile = getActiveProfile(db as never);
check("getActiveProfile", !!profile, `→ ${profile?.targetLanguage}`);

// 2. srsDue (findMany + count + get)
const due = srsDue(db as never);
check("srsDue çalışır", due !== null, `→ ${due?.dueCount} due, ${due?.cards.length} kart`);

// 3. srsReview (transaction + update + insert + XP) — due kart varsa
if (due && due.cards.length > 0) {
  const before = totalXp(db as never, profile!.id);
  const r = srsReview(db as never, due.cards[0].id, 2);
  const after = totalXp(db as never, profile!.id);
  check("srsReview transaction", r !== null, `→ interval ${r?.intervalDays}g, kalan ${r?.remaining}`);
  check("XP yazıldı (+2)", after === before + 2, `${before}→${after}`);
} else {
  // due kart yoksa herhangi bir kartla test et
  const anyCard = db.query.srsCards.findFirst().sync();
  if (anyCard) {
    const r = srsReview(db as never, anyCard.id, 2);
    check("srsReview transaction (rastgele kart)", r !== null, `→ interval ${r?.intervalDays}g`);
  } else check("test edilecek kart yok", false);
}

// 4. İmaj export (save uyumluluğu) — başlık "SQLite format 3"
const out = sqlite.export();
const header = Buffer.from(out.slice(0, 15)).toString();
check("export SQLite imajı", header === "SQLite format 3", `${(out.length / 1e6).toFixed(1)}MB`);


// 5. Roadmap + Stats (harita tranche'ı)
{
  const { getRoadmap } = await import("@/core/roadmap");
  const { getStats } = await import("@/core/stats");
  const { listProfiles } = await import("@/core/profile");
  const rm = getRoadmap(db as never, profile!.id);
  check("getRoadmap", rm !== null, `→ ${rm?.units.length} ünite, xp=${rm?.xpTotal}`);
  const st = getStats(db as never);
  check("getStats", st.llm.totalCalls > 0, `→ ${st.llm.totalCalls} çağrı, $${st.llm.totalUsd.toFixed(2)}`);
  const ps = listProfiles(db as never);
  check("listProfiles", ps.length > 0 && typeof ps[0].displayName === "string", `→ ${ps.length} profil`);
}


// 6. Ders akışı (open/attempt/complete)
{
  const { openNode, attemptExercise, completeNodeFlow } = await import("@/core/lesson");
  const schema = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  const readyLesson = db.select().from(schema.lessons).where(eq(schema.lessons.status, "ready")).limit(1).get();
  const opened = readyLesson ? openNode(db as never, readyLesson.nodeId) : null;
  check("openNode ready", opened?.status === "ready",
    opened?.status === "ready" ? `→ ${opened.exercises.length} egzersiz` : String(opened?.status));

  if (opened?.status === "ready") {
    // deterministik yanlış cevap (mcq)
    const mcq = opened.exercises.find((e) => e.type === "mcq");
    if (mcq) {
      const out = await attemptExercise(db as never, {
        exerciseId: mcq.id, response: "kesinlikle-yanlis-cevap-xyz",
        profile: { id: profile!.id, targetLanguage: profile!.targetLanguage, uiLanguage: "tr" },
      });
      check("attempt mcq deterministik", out.kind === "graded" && out.result.gradedBy === "deterministic",
        out.kind === "graded" ? `→ correct=${out.result.isCorrect}` : out.kind);
    }
    // self-check protokolü (translate, llmGrade yok)
    const tr = db.select().from(schema.exercises)
      .where(eq(schema.exercises.grading, "llm")).limit(1).get();
    if (tr) {
      const p = { id: profile!.id, targetLanguage: profile!.targetLanguage, uiLanguage: "tr" };
      const step1 = await attemptExercise(db as never, { exerciseId: tr.id, response: "alakasiz xyz", profile: p });
      check("attempt self-check adım 1", step1.kind === "needsSelfCheck");
      const step2 = await attemptExercise(db as never, { exerciseId: tr.id, response: "alakasiz xyz", selfVerdict: true, profile: p });
      check("attempt self-check adım 2", step2.kind === "graded" && step2.result.gradedBy === "self" && step2.result.xpAwarded === 5);
    }
    // complete akışı
    const flow = completeNodeFlow(db as never, opened.node.id, profile!.id);
    check("completeNodeFlow", flow !== null, `→ xp=${flow?.xpAwarded}, yeniKart=${flow?.newCards}, unlock=${flow?.unlockedNodeIds.length}`);
  }
}


// 7. Gramer (nl profiline geçiş + dil-doğru liste — kullanıcının bug senaryosu)
{
  const { listGrammarTopics } = await import("@/core/grammar");
  const { setActiveProfile, listProfiles: lp } = await import("@/core/profile");
  const nl = lp(db as never).find((p) => p.targetLanguage === "nl");
  if (nl) {
    setActiveProfile(db as never, nl.id);
    const topics = listGrammarTopics(db as never, "nl");
    const wrongLang = topics.some((t) => /[぀-ヿ一-鿿]/.test(t.titleTr));
    check("nl grammar listesi nl", topics.length > 0 && !wrongLang, `→ ${topics.length} konu, ilki: ${topics[0]?.titleTr}`);
  } else check("nl profili yok", false);
}


// 8. Süpürme: overview/kanji/chat/lookup/translate-cached
{
  const { getOverview } = await import("@/core/overview");
  const { listKanji, kanjiLookup } = await import("@/core/kanji");
  const { chatHistory } = await import("@/core/chat");
  const { cachedTranslation } = await import("@/core/translate");
  const { setActiveProfile: sap } = await import("@/core/profile");
  const schema = await import("@/db/schema");
  sap(db as never, profile!.id); // ja'ya dön

  const ov = getOverview(db as never, profile!);
  check("getOverview (raw SQL → sql tag)", ov.nodes.total > 0, `→ ${ov.nodes.completed}/${ov.nodes.total} node, srs due=${ov.srs.due}`);

  const kl = listKanji(db as never, "ja");
  check("listKanji", kl.length > 100, `→ ${kl.length} kanji`);

  const { listVocab, findVocab } = await import("@/core/vocab");
  const vl = listVocab(db as never, "zh"); // seed 4991 HSK kelimesi (in-memory)
  check("listVocab (zh seed)", vl.length > 4000, `→ ${vl.length} kelime`);
  const vf = findVocab(db as never, "zh", vl[0]?.word ?? "");
  check("findVocab", !!vf && vf.reading.length > 0, `→ ${vf?.word} ${vf?.reading}`);

  const look = kanjiLookup(db as never, "ja", "日本");
  check("kanjiLookup", look.kanji.length > 0, `→ ${look.kanji.map(k=>k.char).join("")}, word=${!!look.word}`);

  const ch = chatHistory(db as never, profile!.id);
  check("chatHistory", Array.isArray(ch.messages), `→ ${ch.messages.length} mesaj`);

  const tr = db.select().from(schema.translations).limit(1).get();
  if (tr) {
    const hit = cachedTranslation(db as never, tr.targetLanguage, tr.sourceText);
    check("cachedTranslation", hit === tr.translationTr);
  }
}


// 9. LLM üretim çekirdeği (mock gen + fixture içerikleri, sql.js üzerinde)
{
  const fsx = await import("node:fs");
  const { generateGrammarContent, generateLessonContent, sendChatMessage, makeLlmGrader } =
    await import("@/core/llm-gen");
  const schema = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  const fixtures: Record<string, string> = {
    grammar: fsx.readFileSync("src/lib/llm/fixtures/grammar.json", "utf8"),
    lesson: fsx.readFileSync("src/lib/llm/fixtures/lesson.json", "utf8"),
    grade: fsx.readFileSync("src/lib/llm/fixtures/grade.json", "utf8"),
    chat: fsx.readFileSync("src/lib/llm/fixtures/chat.txt", "utf8"),
    vocab: fsx.readFileSync("src/lib/llm/fixtures/vocab.json", "utf8"),
  };
  const mockGen = {
    async generateJson(o: { fixtureKey: string; schema: { parse: (x: unknown) => unknown } }) {
      return o.schema.parse(JSON.parse(fixtures[o.fixtureKey.replace("-retry", "")]));
    },
    async generateText(o: { fixtureKey: string }) {
      return fixtures[o.fixtureKey.replace("-retry", "")] ?? "mock";
    },
  } as never;

  // grammar üretimi
  const pending = db.select().from(schema.grammarTopics)
    .where(eq(schema.grammarTopics.status, "pending")).limit(1).get();
  if (pending) {
    await generateGrammarContent(db as never, mockGen, pending.id);
    const after = db.select().from(schema.grammarTopics)
      .where(eq(schema.grammarTopics.id, pending.id)).limit(1).get();
    check("generateGrammarContent", after?.status === "ready" && !!after.content);
  }

  // vocab üretimi
  {
    const { generateVocabContent } = await import("@/core/llm-gen");
    const pendingV = db.select().from(schema.vocabEntries)
      .where(eq(schema.vocabEntries.status, "pending")).limit(1).get();
    if (pendingV) {
      await generateVocabContent(db as never, mockGen, pendingV.id);
      const after = db.select().from(schema.vocabEntries)
        .where(eq(schema.vocabEntries.id, pendingV.id)).limit(1).get();
      check("generateVocabContent", after?.status === "ready" && !!after.content);
    } else check("vocab pending kaydı yok", false);
  }

  // lesson üretimi (lesson'sız ya da error'lu bir node bul; yoksa mevcut ready birini yeniden üret)
  const anyNode = db.select().from(schema.nodes).all().find((n) => n.nodeType === "main");
  if (anyNode) {
    await generateLessonContent(db as never, mockGen, anyNode.id);
    const lessonRow = db.select().from(schema.lessons)
      .where(eq(schema.lessons.nodeId, anyNode.id)).limit(1).get();
    const exCount = db.select().from(schema.exercises)
      .where(eq(schema.exercises.lessonId, lessonRow!.id)).all().length;
    check("generateLessonContent", lessonRow?.status === "ready" && exCount > 0, `→ ${exCount} egzersiz`);
  }

  // chat
  const chatRes = await sendChatMessage(db as never, mockGen, profile!, {
    sessionId: null, message: "test mesajı",
  });
  check("sendChatMessage", chatRes.reply.length > 0, `→ ${chatRes.reply.slice(0, 30)}...`);

  // grader
  const ex = db.select().from(schema.exercises).where(eq(schema.exercises.grading, "llm")).limit(1).get();
  if (ex) {
    const grade = await makeLlmGrader(mockGen, profile!, "deneme")(ex);
    check("makeLlmGrader", typeof grade.correct === "boolean", `→ score ${grade.score}`);
  }
}

// 10. Bölüm (chapter) üretimi — statik onboarding/auto-extend'in çekirdeği
{
  const fsx = await import("node:fs");
  const { generateChapter, topChapterLevel } = await import("@/core/curriculum-gen");
  const { nextLevelFor } = await import("@/lib/curriculum/levels");
  const schema = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  const fixture = fsx.readFileSync("src/lib/llm/fixtures/curriculum.json", "utf8");
  const mockGen = {
    async generateJson(o: { schema: { parse: (x: unknown) => unknown } }) {
      return o.schema.parse(JSON.parse(fixture));
    },
    async generateText() {
      return "mock";
    },
  } as never;

  // Statik onboarding yolunun kendisi: sıfırdan profil + ilk bölüm (levelArg
  // null → şemanın ilk seviyesi). In-memory kopya — gerçek DB'ye dokunmaz.
  const { createProfile } = await import("@/core/profile");
  const fresh = createProfile(db as never, {
    displayName: "parity-test",
    targetLanguage: "ko",
    selfLevel: "beginner",
    nativeLanguage: "tr",
    uiLanguage: "tr",
    goals: ["seyahat"],
    interests: ["muzik"],
    minutesPerWeek: 120,
  } as never);
  check("createProfile (yeni ko/CEFR)", !!fresh);

  // Yarım kalmış onboarding: müfredat yokken aynı dile tekrar submit →
  // yeni profil DEĞİL, mevcut orphan güncellenip yeniden kullanılmalı.
  const { createOrReuseProfile } = await import("@/core/profile");
  const reuse = createOrReuseProfile(db as never, {
    displayName: "parity-retry",
    targetLanguage: "ko",
    selfLevel: "beginner",
    nativeLanguage: "tr",
    uiLanguage: "tr",
    goals: ["seyahat"],
    interests: ["muzik"],
    minutesPerWeek: 90,
  } as never);
  check(
    "createOrReuseProfile orphan'ı devralır",
    !reuse.duplicate && reuse.profile?.id === fresh!.id &&
      reuse.profile?.displayName === "parity-retry"
  );

  await generateChapter(db as never, mockGen, fresh!.id, null, {
    modelUsed: "fixture",
  });

  // Müfredat oluştuktan sonra aynı dil gerçek duplicate'tir.
  const dup = createOrReuseProfile(db as never, {
    displayName: "x",
    targetLanguage: "ko",
    selfLevel: "beginner",
    nativeLanguage: "tr",
    uiLanguage: "tr",
    goals: ["seyahat"],
    interests: ["muzik"],
    minutesPerWeek: 90,
  } as never);
  check("createOrReuseProfile müfredatlıyı korur", dup.duplicate && !dup.profile);

  const cur = db.select().from(schema.curricula)
    .where(eq(schema.curricula.profileId, fresh!.id)).limit(1).get();
  const top = cur ? topChapterLevel(db as never, cur.id, "ko") : null;
  check("generateChapter ilk bölüm", top === "A1", `→ chapter=${top}`);
  check("A2'ye uzayabilir", nextLevelFor("ko", top ?? "") === "A2");

  const unitIds = new Set(
    db.select().from(schema.units).all()
      .filter((u) => u.curriculumId === cur?.id).map((u) => u.id)
  );
  const mains = db.select().from(schema.nodes).all()
    .filter((n) => n.nodeType === "main" && n.unitId && unitIds.has(n.unitId));
  // Prereq zinciri tek parça mı: tam bir baş olmalı, gerisi zincirde.
  const ids = new Set(mains.map((n) => n.id));
  const heads = mains.filter((n) => !n.prereqNodeId || !ids.has(n.prereqNodeId));
  check("üniteler + nodelar yazıldı", unitIds.size > 0 && mains.length > 0,
    `→ ${unitIds.size} ünite, ${mains.length} node`);
  check("prereq zinciri tek parça", heads.length === 1, `→ ${heads.length} baş`);

  // Gramer indeksi dil-geneli (profil başına değil) — nl konuları mevcut olmalı.
  const gtopics = db.select().from(schema.grammarTopics).all()
    .filter((g) => g.targetLanguage === "nl");
  check("gramer iskeleti (nl, dil-geneli)", gtopics.length > 0, `→ ${gtopics.length} konu`);

  // T-034: iş kuyruğu core'u sql.js sürücüsünde query-builder ile çalışmalı.
  const { listJobs, cancelJob, cancelAllJobs, resumePendingJobs } =
    await import("@/core/jobs");
  const before = listJobs(db as never).active.length;
  db.insert(schema.generationJobs)
    .values([
      { id: "parity-user", jobType: "grammar", refId: "r1", status: "queued" },
      { id: "parity-sys", jobType: "lesson", refId: "r2", status: "queued" },
      { id: "parity-pend", jobType: "kanji", refId: "r3", status: "pending_approval" },
    ])
    .run();
  const snap = listJobs(db as never);
  check("listJobs aktifleri sınıflar",
    snap.active.length === before + 3 && snap.counts.pendingApproval >= 1,
    `→ ${snap.active.length} aktif, ${snap.counts.pendingApproval} onay-bekleyen`);
  check("jobKind: grammar=user, lesson=system",
    snap.active.find((j) => j.id === "parity-user")?.kind === "user" &&
    snap.active.find((j) => j.id === "parity-sys")?.kind === "system");
  check("cancelJob queued → deleted",
    cancelJob(db as never, "parity-user") === "deleted" &&
    !db.select().from(schema.generationJobs)
      .where(eq(schema.generationJobs.id, "parity-user")).get());
  const resumed = resumePendingJobs(db as never);
  check("resumePendingJobs → queued", resumed.includes("parity-pend") &&
    db.select().from(schema.generationJobs)
      .where(eq(schema.generationJobs.id, "parity-pend")).get()?.status === "queued");
  cancelAllJobs(db as never, { userOnly: false });
  const leftover = listJobs(db as never).active
    .filter((j) => j.id.startsWith("parity-")).length;
  check("cancelAllJobs temizler", leftover === 0, `→ ${leftover} kaldı`);
}

console.log(fail === 0 ? "ALL PASS" : `${fail} FAILURES`);
process.exit(fail ? 1 : 0);

}
main();
