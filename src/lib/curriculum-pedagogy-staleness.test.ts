import test from "node:test";
import assert from "node:assert/strict";
import {
  inspectStoredPedagogy,
  readStoredPedagogy,
} from "@/core/curriculum-gen";
import type { CurriculumPedagogy } from "@/lib/llm/schemas";
import type { profiles } from "@/db/schema";

// T-080 pins the one rule a future refactor would silently break: what a stale
// language-pair stamp DOES depends on whether the body was hand-edited. An
// auto-generated stale body is disposable; a hand-edited one is user input and
// is never destroyed without the user asking.

type Profile = typeof profiles.$inferSelect;

const BODY = "x".repeat(500);

function profileWith(
  stored: CurriculumPedagogy | null,
  pair: { targetLanguage: string; nativeLanguage: string } = {
    targetLanguage: "nl",
    nativeLanguage: "tr",
  }
): Profile {
  return {
    id: "p1",
    targetLanguage: pair.targetLanguage,
    nativeLanguage: pair.nativeLanguage,
    uiLanguage: "tr",
    displayName: "Test",
    goals: ["Günlük konuşma"],
    selfLevel: "zero",
    minutesPerWeek: 150,
    interests: ["Seyahat"],
    motivation: "",
    isActive: true,
    createdAt: new Date(),
    curriculumPedagogy: stored,
  } as unknown as Profile;
}

const fresh = (extra?: Partial<CurriculumPedagogy>): CurriculumPedagogy => ({
  pedagogy: BODY,
  targetLanguage: "nl",
  nativeLanguage: "tr",
  generatedAt: "2026-08-06T00:00:00.000Z",
  ...extra,
});

test("fresh + auto-generated: reused", () => {
  const p = profileWith(fresh());
  assert.equal(readStoredPedagogy(p), BODY);
  assert.deepEqual(
    { stale: inspectStoredPedagogy(p)?.stale, edited: inspectStoredPedagogy(p)?.edited },
    { stale: false, edited: false }
  );
});

test("fresh + hand-edited: reused", () => {
  const p = profileWith(fresh({ edited: true }));
  assert.equal(readStoredPedagogy(p), BODY);
  assert.equal(inspectStoredPedagogy(p)?.edited, true);
});

test("stale pair + auto-generated: discarded, so the next call regenerates", () => {
  // The learner switched native language tr -> en (PATCH /api/profile).
  const p = profileWith(fresh(), { targetLanguage: "nl", nativeLanguage: "en" });
  assert.equal(readStoredPedagogy(p), null);
  assert.equal(inspectStoredPedagogy(p)?.stale, true);
});

test("stale pair + hand-edited: KEPT (user input is never silently destroyed)", () => {
  const p = profileWith(fresh({ edited: true }), {
    targetLanguage: "nl",
    nativeLanguage: "en",
  });
  assert.equal(readStoredPedagogy(p), BODY);
  // Still reported as stale so the UI can offer an explicit regenerate.
  const info = inspectStoredPedagogy(p);
  assert.equal(info?.stale, true);
  assert.equal(info?.edited, true);
});

test("target-language mismatch is stale too", () => {
  const p = profileWith(fresh(), { targetLanguage: "ja", nativeLanguage: "tr" });
  assert.equal(inspectStoredPedagogy(p)?.stale, true);
  assert.equal(readStoredPedagogy(p), null);
});

test("absent / blank / malformed: nothing stored", () => {
  assert.equal(readStoredPedagogy(profileWith(null)), null);
  assert.equal(inspectStoredPedagogy(profileWith(null)), null);
  assert.equal(readStoredPedagogy(profileWith(fresh({ pedagogy: "   " }))), null);
  assert.equal(
    readStoredPedagogy(
      profileWith({ pedagogy: 42 } as unknown as CurriculumPedagogy)
    ),
    null
  );
});

test("pre-T-080 values (no `edited` field) behave exactly as before", () => {
  const legacy = {
    pedagogy: BODY,
    targetLanguage: "nl",
    nativeLanguage: "tr",
    generatedAt: "2026-08-05T00:00:00.000Z",
  } as CurriculumPedagogy;
  assert.equal(readStoredPedagogy(profileWith(legacy)), BODY);
  assert.equal(
    readStoredPedagogy(
      profileWith(legacy, { targetLanguage: "nl", nativeLanguage: "en" })
    ),
    null
  );
});
