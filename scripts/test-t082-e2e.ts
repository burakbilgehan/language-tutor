// T-082 end-to-end exercise on the sql.js (browser) driver: generate a
// curriculum with fixtures, delete it, regenerate it from a MID-SCHEME level,
// and prove the regenerated curriculum is actually usable.
//
// The last part is the point. A partial delete is silent: `generateChapter`
// marks its head node "available" only when `findChainTail` returns null, so a
// single surviving unit or node would leave the new head "locked" and the map
// dead with no error anywhere. That is asserted here, not assumed.
//
// Run: npx tsx --tsconfig tsconfig.json scripts/test-t082-e2e.ts
import fs from "node:fs";
import initSqlJs from "sql.js";
import { drizzle } from "drizzle-orm/sql-js";
import { eq, inArray } from "drizzle-orm";
import * as schema from "@/db/schema";
import { DDL } from "@/db/ddl";

async function main() {
  const SQL = await initSqlJs({
    locateFile: (f: string) => `node_modules/sql.js/dist/${f}`,
  });
  // A fresh image, NOT the maintainer's app.db: this script deletes things.
  const sqlite = new SQL.Database();
  sqlite.run("PRAGMA foreign_keys = ON");
  for (const stmt of DDL) sqlite.run(stmt);
  const db = drizzle(sqlite, { schema }) as never;

  let fail = 0;
  const check = (name: string, cond: boolean, extra = "") => {
    console.log(`${cond ? "OK " : "FAIL"} ${name} ${extra}`);
    if (!cond) fail++;
  };

  const chapterFixture = fs.readFileSync(
    "src/lib/llm/fixtures/curriculum.json",
    "utf8"
  );
  const pedagogyFixture = fs.readFileSync(
    "src/lib/llm/fixtures/curriculum-pedagogy.json",
    "utf8"
  );
  const genCalls: string[] = [];
  let lastChapterPrompt = "";
  const mockGen = {
    async generateJson(o: {
      fixtureKey: string;
      prompt: string;
      schema: { parse: (x: unknown) => unknown };
    }) {
      genCalls.push(o.fixtureKey);
      if (o.fixtureKey === "curriculum-pedagogy") {
        return o.schema.parse(JSON.parse(pedagogyFixture));
      }
      if (o.fixtureKey === "curriculum") lastChapterPrompt = o.prompt;
      return o.schema.parse(JSON.parse(chapterFixture));
    },
    async generateText() {
      return "mock";
    },
  } as never;

  const { createProfile } = await import("@/core/profile");
  const { generateChapter, topChapterLevel, saveCurriculumPedagogy } =
    await import("@/core/curriculum-gen");
  const { deleteCurriculum, discardLesson } = await import(
    "@/core/curriculum-delete"
  );
  const { nextLevelFor, schemeFor } = await import("@/lib/curriculum/levels");

  const profile = createProfile(db, {
    displayName: "t082",
    targetLanguage: "nl",
    selfLevel: "beginner",
    nativeLanguage: "tr",
    uiLanguage: "tr",
    goals: ["seyahat"],
    interests: ["muzik"],
    minutesPerWeek: 120,
  } as never)!;
  const pid = profile.id;

  // ---- 1. Build a curriculum the ordinary way (A1, the scheme's first level)
  await generateChapter(db, mockGen, pid, null);
  const cur0 = db
    .select()
    .from(schema.curricula)
    .where(eq(schema.curricula.profileId, pid))
    .get();
  check("ilk müfredat üretildi", !!cur0, `→ ${cur0?.status}`);
  check(
    "ilk bölüm A1",
    topChapterLevel(db, cur0!.id, "nl") === "A1",
    `→ ${topChapterLevel(db, cur0!.id, "nl")}`
  );

  // A hand-edited pedagogy body: T-082 must NOT destroy this.
  saveCurriculumPedagogy(db, pid, "EL YAZMASI PEDAGOJI. " + "x".repeat(500));

  // Cached lesson + exercise + attempt + profile-level progress on top.
  const unitIds = db
    .select({ id: schema.units.id })
    .from(schema.units)
    .where(eq(schema.units.curriculumId, cur0!.id))
    .all()
    .map((u: { id: string }) => u.id);
  const nodeRows = db
    .select()
    .from(schema.nodes)
    .where(inArray(schema.nodes.unitId, unitIds))
    .all();
  const firstNode = nodeRows[0];
  db.insert(schema.lessons)
    .values({
      id: "les-1",
      nodeId: firstNode.id,
      status: "ready",
      content: { tr: { title_tr: "x" } },
    })
    .run();
  db.insert(schema.exercises)
    .values({
      id: "ex-1",
      lessonId: "les-1",
      lang: "tr",
      position: 0,
      type: "mcq",
      promptTr: "p",
      answer: "a",
      grading: "deterministic",
    })
    .run();
  db.insert(schema.attempts)
    .values({
      id: "att-1",
      exerciseId: "ex-1",
      response: "a",
      isCorrect: true,
      score: 100,
      gradedBy: "deterministic",
    })
    .run();
  db.insert(schema.xpEvents)
    .values({ id: "xp-1", profileId: pid, amount: 40, reason: "lesson_complete" })
    .run();
  db.insert(schema.srsCards)
    .values({
      id: "card-1",
      profileId: pid,
      itemType: "vocab",
      front: "huis",
      back: "ev",
      lang: "tr",
      dueAt: new Date(),
    })
    .run();
  const grammarBefore = db.select().from(schema.grammarTopics).all().length;
  check("gramer kütüphanesi tohumlandı", grammarBefore > 0, `→ ${grammarBefore} konu`);

  // ---- 2. Per-lesson discard (T-082 item 3)
  const nodeStatusBefore = db
    .select()
    .from(schema.nodes)
    .where(eq(schema.nodes.id, firstNode.id))
    .get()!.status;
  const discarded = discardLesson(db, firstNode.id);
  check("ders atıldı", discarded.had && discarded.exercises === 1);
  check(
    "atma node durumunu DEĞİŞTİRMEZ",
    db.select().from(schema.nodes).where(eq(schema.nodes.id, firstNode.id)).get()!
      .status === nodeStatusBefore
  );
  check(
    "atma XP'e dokunmaz",
    db.select().from(schema.xpEvents).all().length === 1
  );

  // ---- 3. Delete the whole curriculum
  const nodesBefore = nodeRows.length;
  const result = deleteCurriculum(db, pid);
  check(
    "silme sayıları",
    result.deleted.nodes === nodesBefore && result.deleted.units === unitIds.length,
    `→ ${result.deleted.nodes} node, ${result.deleted.units} ünite`
  );
  check("müfredat gitti", db.select().from(schema.curricula).all().length === 0);
  check("bölümler gitti", db.select().from(schema.curriculumChapters).all().length === 0);
  check("üniteler gitti", db.select().from(schema.units).all().length === 0);
  check("node'lar gitti", db.select().from(schema.nodes).all().length === 0);
  check("dersler gitti", db.select().from(schema.lessons).all().length === 0);

  check("XP hayatta", db.select().from(schema.xpEvents).all().length === 1);
  check("SRS kartı hayatta", db.select().from(schema.srsCards).all().length === 1);
  check(
    "gramer kütüphanesi hayatta",
    db.select().from(schema.grammarTopics).all().length === grammarBefore,
    `→ ${grammarBefore} konu`
  );
  const profAfter = db
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.id, pid))
    .get()!;
  check(
    "el yazması pedagoji hayatta (T-079/T-080)",
    (profAfter.curriculumPedagogy as { pedagogy: string; edited?: boolean })
      ?.pedagogy?.startsWith("EL YAZMASI") === true &&
      (profAfter.curriculumPedagogy as { edited?: boolean }).edited === true
  );

  // ---- 4. Regenerate from a MID-SCHEME level (T-082 item 2)
  const levels = schemeFor("nl").levels;
  const startLevel = levels[2]; // B1: two levels above the scheme's first
  genCalls.length = 0;
  await generateChapter(db, mockGen, pid, startLevel);

  const cur1 = db
    .select()
    .from(schema.curricula)
    .where(eq(schema.curricula.profileId, pid))
    .get();
  check("yeni müfredat kuruldu", !!cur1 && cur1.id !== cur0!.id);
  const chapters = db.select().from(schema.curriculumChapters).all();
  check(
    "TEK bölüm ve o da B1 (öncesi hiç üretilmedi)",
    chapters.length === 1 && chapters[0].level === startLevel,
    `→ ${chapters.map((c: { level: string }) => c.level).join(",")}`
  );
  check(
    "el yazması pedagoji YENİDEN KULLANILDI (meta-çağrı yok)",
    !genCalls.includes("curriculum-pedagogy"),
    `→ ${genCalls.join(",")}`
  );
  check(
    "bölüm promptu el yazması gövdeyi taşıdı",
    lastChapterPrompt.includes("EL YAZMASI PEDAGOJI")
  );

  // The load-bearing assertion: exactly ONE available head, no orphan tail.
  const newNodes = db
    .select()
    .from(schema.nodes)
    .all() as { id: string; status: string; prereqNodeId: string | null }[];
  const available = newNodes.filter((n) => n.status === "available");
  const heads = newNodes.filter((n) => n.prereqNodeId === null);
  check(
    "tam olarak BİR açık node var (harita ölü değil)",
    available.length === 1,
    `→ ${available.length} available / ${newNodes.length} node`
  );
  check(
    "zincirin tek başı var ve o da açık olan",
    heads.length === 1 && heads[0].id === available[0]?.id,
    `→ ${heads.length} baş`
  );

  // ---- 5. Auto-extend still chains forward from a mid-scheme start
  const top = topChapterLevel(db, cur1!.id, "nl");
  const next = top ? nextLevelFor("nl", top) : null;
  check(
    "auto-extend B1'den B2'ye zincirlenir",
    top === startLevel && next === levels[3],
    `→ top=${top} next=${next}`
  );
  await generateChapter(db, mockGen, pid, next);
  const chapters2 = db
    .select()
    .from(schema.curriculumChapters)
    .all() as { level: string }[];
  check(
    "uzatma sonrası B1+B2",
    chapters2.length === 2 &&
      chapters2.some((c) => c.level === levels[3]),
    `→ ${chapters2.map((c) => c.level).sort().join(",")}`
  );
  const afterExtend = db
    .select()
    .from(schema.nodes)
    .all() as { status: string; prereqNodeId: string | null }[];
  check(
    "uzatma sonrası hâlâ tek açık baş",
    afterExtend.filter((n) => n.status === "available").length === 1 &&
      afterExtend.filter((n) => n.prereqNodeId === null).length === 1
  );

  console.log(fail === 0 ? "\nALL PASS" : `\n${fail} FAIL`);
  process.exit(fail === 0 ? 0 : 1);
}

void main();
