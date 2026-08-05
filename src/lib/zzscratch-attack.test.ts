import { test } from "node:test";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { DDL } from "@/db/ddl";
import { COLUMN_HEALS } from "@/db/heals";
import { deleteCurriculum } from "@/core/curriculum-delete";
import { generateChapter, findChainTail } from "@/core/curriculum-gen";
import type { AppDb } from "@/core/db-types";

function testDb(): AppDb {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  for (const stmt of DDL) sqlite.exec(stmt);
  for (const stmt of COLUMN_HEALS) { try { sqlite.exec(stmt); } catch {} }
  return drizzle(sqlite, { schema }) as unknown as AppDb;
}

function mkProfile(db: AppDb, id: string, target = "nl") {
  db.insert(schema.profiles).values({
    id, targetLanguage: target, nativeLanguage: "tr", uiLanguage: "tr",
    displayName: id, goals: ["Günlük konuşma"], selfLevel: "zero",
    minutesPerWeek: 150, interests: ["Seyahat"], motivation: "",
    curriculumPedagogy: { pedagogy: "x".repeat(500), targetLanguage: target,
      nativeLanguage: "tr", generatedAt: "2026-08-06T00:00:00.000Z", edited: true } as never,
    isActive: true,
  }).run();
}

const fakeGen = (units: number, nodesPer: number) => ({
  generateJson: async ({ fixtureKey }: { fixtureKey: string }) => {
    if (fixtureKey === "curriculum-pedagogy") return { pedagogy: "y".repeat(500) };
    return {
      title: "Gen",
      units: Array.from({ length: units }, (_, u) => ({
        title_tr: `U${u}`, description_tr: "d", theme: "t",
        nodes: Array.from({ length: nodesPer }, (_, n) => ({
          lesson_type: "lesson", title_tr: `N${u}_${n}`, subtitle_tr: "s",
          objectives: ["o"], xp_reward: 20,
        })),
      })),
    };
  },
  generateText: async () => "",
}) as never;

// C2: which curricula row does deleteCurriculum pick, and does the SURVIVOR
// become the one generateChapter later resolves? Print full state.
test("C2: duplicate curricula rows, detailed trace", async () => {
  const db = testDb();
  mkProfile(db, "p1", "nl");
  for (const c of ["cur-A", "cur-B"]) {
    db.insert(schema.curricula).values({ id: c, profileId: "p1", title: c, status: "ready" }).run();
    db.insert(schema.curriculumChapters).values({ id: `${c}-chp`, curriculumId: c, level: "A1", position: 0, status: "ready", titleTr: "A1" }).run();
    db.insert(schema.units).values({ id: `${c}-u`, curriculumId: c, chapterId: `${c}-chp`, level: "A1", position: 0, titleTr: "U" }).run();
    db.insert(schema.nodes).values({ id: `${c}-n1`, unitId: `${c}-u`, position: 0, nodeType: "main", titleTr: `${c}-n1`, objectives: [], status: "available", prereqNodeId: null }).run();
  }
  deleteCurriculum(db, "p1");
  const left = db.select().from(schema.curricula).all();
  console.log("  [C2] curricula after delete:", left.map((c) => c.id));
  console.log("  [C2] units left:", db.select().from(schema.units).all().map((u) => `${u.id}@${u.curriculumId}`));
  console.log("  [C2] nodes left:", db.select().from(schema.nodes).all().map((n) => `${n.titleTr}/${n.status}`));
  const survivorId = left[0]?.id;
  console.log("  [C2] chainTail(survivor) BEFORE regen:", findChainTail(db, survivorId!));

  await generateChapter(db, fakeGen(2, 3), "p1", "A2");
  const cur = db.select().from(schema.curricula).where(eq(schema.curricula.profileId, "p1")).limit(1).get();
  console.log("  [C2] generateChapter resolved curriculum:", cur!.id);
  const allNodes = db.select().from(schema.nodes).all();
  console.log("  [C2] ALL nodes now:", allNodes.map((n) => `${n.titleTr}/${n.status}/prereq=${n.prereqNodeId ? "yes" : "NULL"}`));
  console.log("  [C2] total available across DB:", allNodes.filter((n) => n.status === "available").length);
});

// C3: THE REAL WORRY. Delete leaves nothing for this profile, but suppose an
// ORPHAN unit exists with a curriculumId pointing at the deleted curriculum
// (impossible under FK) OR a legacy unit with chapterId null on the SAME new
// curriculum. Also: what does ensureChaptersBackfilled do to another
// profile's legacy units during OUR regeneration?
test("C3: ensureChaptersBackfilled touches OTHER profiles' legacy units", async () => {
  const db = testDb();
  mkProfile(db, "p1", "nl");
  mkProfile(db, "p2", "ja");
  // p2 = a legacy pre-chapters curriculum: units with chapterId null.
  db.insert(schema.curricula).values({ id: "p2-cur", profileId: "p2", title: "legacy", status: "ready" }).run();
  db.insert(schema.units).values({ id: "p2-u", curriculumId: "p2-cur", chapterId: null, level: null, position: 0, titleTr: "U" }).run();
  db.insert(schema.nodes).values({ id: "p2-n1", unitId: "p2-u", position: 0, nodeType: "main", titleTr: "p2n1", objectives: [], status: "available", prereqNodeId: null }).run();

  console.log("  [C3] p2 units before:", db.select().from(schema.units).all().map((u) => `${u.id} chapter=${u.chapterId} level=${u.level}`));
  await generateChapter(db, fakeGen(2, 2), "p1", "A1");
  console.log("  [C3] p2 units after p1 regen:", db.select().from(schema.units).where(eq(schema.units.curriculumId, "p2-cur")).all().map((u) => `${u.id} chapter=${u.chapterId} level=${u.level}`));
  console.log("  [C3] p2 chapters:", db.select().from(schema.curriculumChapters).where(eq(schema.curriculumChapters.curriculumId, "p2-cur")).all().map((c) => `${c.level}/${c.titleTr}`));
  const p1cur = db.select().from(schema.curricula).where(eq(schema.curricula.profileId, "p1")).get();
  const p1units = db.select().from(schema.units).where(eq(schema.units.curriculumId, p1cur!.id)).all().map((u) => u.id);
  const p1nodes = db.select().from(schema.nodes).all().filter((n) => p1units.includes(n.unitId));
  console.log("  [C3] p1 available:", p1nodes.filter((n) => n.status === "available").length);
});

// C4: The doc comment's own claimed failure mode. Simulate a PARTIAL delete
// (one surviving unit+node) and confirm the regenerated head is locked.
test("C4: partial delete => locked head (confirms the stated risk is real)", async () => {
  const db = testDb();
  mkProfile(db, "p1", "nl");
  db.insert(schema.curricula).values({ id: "c", profileId: "p1", title: "T", status: "ready" }).run();
  db.insert(schema.curriculumChapters).values({ id: "chp", curriculumId: "c", level: "A1", position: 0, status: "ready", titleTr: "A1" }).run();
  db.insert(schema.units).values({ id: "u-survivor", curriculumId: "c", chapterId: "chp", level: "A1", position: 0, titleTr: "U" }).run();
  db.insert(schema.nodes).values({ id: "n-survivor", unitId: "u-survivor", position: 0, nodeType: "main", titleTr: "survivor", objectives: [], status: "completed", prereqNodeId: null }).run();
  await generateChapter(db, fakeGen(2, 2), "p1", "A2");
  const nodes = db.select().from(schema.nodes).all();
  console.log("  [C4] nodes:", nodes.map((n) => `${n.titleTr}/${n.status}`));
  console.log("  [C4] available count:", nodes.filter((n) => n.status === "available").length);
});

// C5: attempts on the OTHER native language's exercises + a node that has a
// lessons row with content but no exercises. Plus srs_cards.sourceLessonId
// dangling: does any read path dereference it?
test("C5: srs card with dangling sourceLessonId still readable", () => {
  const db = testDb();
  mkProfile(db, "p1", "nl");
  db.insert(schema.curricula).values({ id: "c", profileId: "p1", title: "T", status: "ready" }).run();
  db.insert(schema.curriculumChapters).values({ id: "chp", curriculumId: "c", level: "A1", position: 0, status: "ready", titleTr: "A1" }).run();
  db.insert(schema.units).values({ id: "u", curriculumId: "c", chapterId: "chp", level: "A1", position: 0, titleTr: "U" }).run();
  db.insert(schema.nodes).values({ id: "n1", unitId: "u", position: 0, nodeType: "main", titleTr: "n1", objectives: [], status: "completed", prereqNodeId: null }).run();
  db.insert(schema.lessons).values({ id: "les1", nodeId: "n1", status: "ready", content: { tr: {} } as never }).run();
  db.insert(schema.srsCards).values({ id: "card", profileId: "p1", itemType: "vocab", front: "f", back: "b", lang: "tr", sourceLessonId: "les1", dueAt: new Date() }).run();
  db.insert(schema.chatSessions).values({ id: "sess", profileId: "p1", contextNodeId: "n1" }).run();
  db.insert(schema.xpEvents).values({ id: "xp", profileId: "p1", amount: 20, reason: "lesson_complete", refId: "n1" }).run();

  deleteCurriculum(db, "p1");
  const card = db.select().from(schema.srsCards).get();
  const sess = db.select().from(schema.chatSessions).get();
  const xp = db.select().from(schema.xpEvents).get();
  console.log(`  [C5] card.sourceLessonId=${card?.sourceLessonId} (lesson gone: ${db.select().from(schema.lessons).all().length === 0})`);
  console.log(`  [C5] chatSession.contextNodeId=${sess?.contextNodeId} (node gone: ${db.select().from(schema.nodes).all().length === 0})`);
  console.log(`  [C5] xpEvent.refId=${xp?.refId}`);
});
