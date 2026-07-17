import { test } from "node:test";
import assert from "node:assert/strict";
import { conjugateNl, nlStem } from "./conjugation/nl";

function val(inf: string, id: string): string {
  const r = conjugateNl({ infinitive: inf });
  assert.ok(r.ok, `${inf} should conjugate`);
  for (const g of r.groups) {
    const f = g.forms.find((x) => x.id === id);
    if (f) return f.value;
  }
  throw new Error(`${inf}: form ${id} not found`);
}

test("weak verb stems and spelling", () => {
  assert.equal(nlStem("werken"), "werk");
  assert.equal(nlStem("maken"), "maak");
  assert.equal(nlStem("stoppen"), "stop");
  assert.equal(nlStem("leven"), "leef");
  assert.equal(nlStem("reizen"), "reis");
});

test("weak past: kofschip on underlying sound", () => {
  assert.equal(val("werken", "past-sg"), "werkte");
  assert.equal(val("wonen", "past-sg"), "woonde");
  assert.equal(val("stoppen", "past-sg"), "stopte");
  // v/z stems are voiced despite f/s spelling
  assert.equal(val("leven", "past-sg"), "leefde");
  assert.equal(val("reizen", "past-sg"), "reisde");
  assert.equal(val("maken", "participle"), "gemaakt");
  assert.equal(val("wonen", "participle"), "gewoond");
});

test("present forms", () => {
  assert.equal(val("werken", "ik"), "werk");
  assert.equal(val("werken", "jij"), "werkt");
  assert.equal(val("werken", "wij"), "werken");
  assert.equal(val("maken", "ik"), "maak");
});

test("strong and irregular verbs", () => {
  assert.equal(val("lopen", "past-sg"), "liep");
  assert.equal(val("lopen", "past-pl"), "liepen");
  assert.equal(val("lopen", "participle"), "gelopen");
  assert.equal(val("eten", "participle"), "gegeten");
  assert.equal(val("zijn", "past-sg"), "was");
  assert.equal(val("gaan", "perfect"), "is gegaan");
  assert.equal(val("kopen", "past-sg"), "kocht");
});

test("separable and inseparable prefixes", () => {
  assert.equal(val("opstaan", "past-sg"), "stond op");
  assert.equal(val("opstaan", "participle"), "opgestaan");
  assert.equal(val("opstaan", "ik"), "sta op");
  // inseparable: no ge-
  assert.equal(val("vergeten", "participle"), "vergeten");
  const r = conjugateNl({ infinitive: "bestellen" });
  assert.ok(r.ok);
  assert.equal(val("bestellen", "participle"), "besteld");
});

test("invalid input", () => {
  const r = conjugateNl({ infinitive: "xyz" });
  assert.ok(!r.ok);
});

test("aan/oen/ien stems", () => {
  assert.equal(val("gaan", "ik"), "ga");
  assert.equal(val("doen", "ik"), "doe");
  assert.equal(val("zien", "ik"), "zie");
});
