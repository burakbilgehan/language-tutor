import { test } from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { DDL } from "@/db/ddl";
import { COLUMN_HEALS } from "@/db/heals";
import {
  insertTravelSprint,
  travelSprintAvailable,
} from "@/core/travel-sprint";
import { findChainTail } from "@/core/curriculum-gen";
import { frontierNodeId, lessonWindowTargets } from "@/core/lesson-window";
import { completeNode } from "@/core/roadmap";
import { TRAVEL_SPRINT_JA } from "@/lib/curriculum/travel-sprint-ja";
import type { AppDb } from "@/core/db-types";
import { AppError } from "@/lib/errors";

// T-099. The sprint is spliced into a LIVE learner's curriculum (the owner's
// real progress sits in browser IndexedDB), so the invariants are tested, not
// eyeballed: completed nodes stay completed, the old frontier stays openable,
// the chain stays a single line through the sprint, and the frontier read the
// lesson window uses lands on the sprint head.

function testDb(): AppDb {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  for (const stmt of DDL) sqlite.exec(stmt);
  for (const stmt of COLUMN_HEALS) {
    try {
      sqlite.exec(stmt);
    } catch {
      // column already present in DDL
    }
  }
  return drizzle(sqlite, { schema }) as unknown as AppDb;
}

const SPRINT_NODES = TRAVEL_SPRINT_JA.reduce((n, u) => n + u.nodes.length, 0);

/** ja profile; unit u0 = [a completed, b available], unit u1 = [c locked]. */
function seed(db: AppDb, opts: { target?: string; allDone?: boolean } = {}) {
  db.insert(schema.profiles)
    .values({
      id: "p",
      targetLanguage: opts.target ?? "ja",
      nativeLanguage: "tr",
      uiLanguage: "tr",
      displayName: "p",
      goals: [],
      selfLevel: "zero",
      minutesPerWeek: 150,
      interests: [],
      motivation: "",
      isActive: true,
    })
    .run();
  db.insert(schema.curricula)
    .values({ id: "cur", profileId: "p", title: "T", status: "ready", contentLang: "tr" })
    .run();
  db.insert(schema.curriculumChapters)
    .values({ id: "chp", curriculumId: "cur", level: "N5", position: 0, status: "ready" })
    .run();
  for (const [i, id] of ["u0", "u1"].entries()) {
    db.insert(schema.units)
      .values({ id, curriculumId: "cur", chapterId: "chp", level: "N5", position: i, titleTr: id })
      .run();
  }
  const done = opts.allDone;
  const rows = [
    { id: "a", unitId: "u0", position: 0, status: "completed", prereq: null },
    { id: "b", unitId: "u0", position: 1, status: done ? "completed" : "available", prereq: "a" },
    { id: "c", unitId: "u1", position: 0, status: done ? "completed" : "locked", prereq: "b" },
  ] as const;
  for (const r of rows) {
    db.insert(schema.nodes)
      .values({
        id: r.id,
        unitId: r.unitId,
        position: r.position,
        nodeType: "main",
        titleTr: r.id,
        objectives: [],
        status: r.status,
        prereqNodeId: r.prereq,
      })
      .run();
  }
}

const node = (db: AppDb, id: string) =>
  db.select().from(schema.nodes).where(eq(schema.nodes.id, id)).get()!;

function chainFromRoot(db: AppDb): string[] {
  const all = db.select().from(schema.nodes).all();
  const out: string[] = [];
  let cur = all.find((n) => !n.prereqNodeId);
  while (cur) {
    out.push(cur.id);
    const id = cur.id;
    cur = all.find((n) => n.prereqNodeId === id);
  }
  return out;
}

test("splices the sprint before the frontier without touching progress", () => {
  const db = testDb();
  seed(db);
  assert.equal(travelSprintAvailable(db, "p"), true);

  const head = insertTravelSprint(db, "p");

  // Progress untouched; the old frontier stays openable.
  assert.equal(node(db, "a").status, "completed");
  assert.equal(node(db, "b").status, "available");
  assert.equal(node(db, "c").status, "locked");
  assert.equal(node(db, "c").prereqNodeId, "b");

  // Head follows the last completed node and is open.
  assert.equal(node(db, head).prereqNodeId, "a");
  assert.equal(node(db, head).status, "available");

  // One straight chain: a -> sprint -> b -> c, every node reachable once.
  const chain = chainFromRoot(db);
  assert.equal(chain.length, 3 + SPRINT_NODES);
  assert.deepEqual(chain.slice(0, 2), ["a", head]);
  assert.deepEqual(chain.slice(-2), ["b", "c"]);
  assert.equal(findChainTail(db, "cur"), "c");

  // The frontier (lesson window anchor) is the sprint head.
  assert.equal(frontierNodeId(db, "p"), head);
  assert.equal(lessonWindowTargets(db, head)[0], head);

  // Units: sprint takes positions 0..6, the old units move after it.
  const units = db.select().from(schema.units).all();
  const pos = (id: string) => units.find((u) => u.id === id)!.position;
  assert.equal(pos("u0"), TRAVEL_SPRINT_JA.length);
  assert.equal(pos("u1"), TRAVEL_SPRINT_JA.length + 1);
  assert.equal(new Set(units.map((u) => u.position)).size, units.length);

  // Completing the sprint tail unlocks nothing new for b (already available)
  // and keeps c locked until b is done.
  const tail = chain[chain.length - 3];
  assert.deepEqual(completeNode(db, tail), []);
  assert.equal(node(db, "c").status, "locked");

  // Offered once only.
  assert.equal(travelSprintAvailable(db, "p"), false);
  assert.throws(
    () => insertTravelSprint(db, "p"),
    (e: unknown) => e instanceof AppError && e.code === "travel_sprint_exists"
  );
});

test("appends after the tail when everything is completed", () => {
  const db = testDb();
  seed(db, { allDone: true });
  const head = insertTravelSprint(db, "p");
  assert.equal(node(db, head).prereqNodeId, "c");
  assert.equal(node(db, head).status, "available");
  assert.equal(frontierNodeId(db, "p"), head);
  assert.equal(chainFromRoot(db).length, 3 + SPRINT_NODES);
});

test("not offered for other languages", () => {
  const db = testDb();
  seed(db, { target: "nl" });
  assert.equal(travelSprintAvailable(db, "p"), false);
  assert.throws(
    () => insertTravelSprint(db, "p"),
    (e: unknown) => e instanceof AppError && e.code === "travel_sprint_unsupported"
  );
});
