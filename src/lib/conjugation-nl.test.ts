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

test("irregular present stems", () => {
  assert.equal(val("zijn", "ik"), "ben");
  assert.equal(val("zijn", "jij"), "bent");
  assert.equal(val("zijn", "hij"), "is");
  assert.equal(val("zijn", "wij"), "zijn");
  assert.equal(val("hebben", "hij"), "heeft");
  assert.equal(val("kunnen", "ik"), "kan");
  assert.equal(val("komen", "ik"), "kom");
  assert.equal(val("zullen", "ik"), "zal");
});

test("non-infinitive input is rejected", () => {
  for (const w of ["ben", "bent", "ln", "an"]) {
    const r = conjugateNl({ infinitive: w });
    assert.ok(!r.ok, `${w} should be rejected`);
  }
});

test("weak separable verbs", () => {
  assert.equal(val("opbellen", "past-sg"), "belde op");
  assert.equal(val("opbellen", "participle"), "opgebeld");
  assert.equal(val("opbellen", "ik"), "bel op");
  assert.equal(val("aanraken", "past-sg"), "raakte aan");
  assert.equal(val("aanraken", "participle"), "aangeraakt");
});

test("coincidental prefix is not split (false-positive guard)", () => {
  assert.equal(val("opperen", "past-sg"), "oppeerde");
  assert.equal(val("opperen", "participle"), "geoppeerd");
  assert.equal(val("openen", "past-sg"), "opeende");
  assert.equal(val("openen", "participle"), "geopeend");
});

// T-086 bug 1: the participle must not write a doubled final consonant.
test("weak participle absorbs a stem-final t/d", () => {
  assert.equal(val("praten", "participle"), "gepraat");
  assert.equal(val("wachten", "participle"), "gewacht");
  assert.equal(val("antwoorden", "participle"), "geantwoord");
  assert.equal(val("redden", "participle"), "gered");
  assert.equal(val("voeden", "participle"), "gevoed");
  assert.equal(val("verwachten", "participle"), "verwacht");
  assert.equal(val("zetten", "participle"), "gezet");
  assert.equal(val("kosten", "participle"), "gekost");
  assert.equal(val("landen", "participle"), "geland");
  // the PAST keeps the doubling; a vowel follows the suffix there
  assert.equal(val("praten", "past-sg"), "praatte");
  assert.equal(val("wachten", "past-pl"), "wachtten");
  assert.equal(val("antwoorden", "past-sg"), "antwoordde");
  assert.equal(val("redden", "past-sg"), "redde");
  assert.equal(val("voeden", "past-sg"), "voedde");
});

// T-086 bug 2: the plural row must not repeat the prefix the infinitive carries.
test("separable present plural splits instead of duplicating the prefix", () => {
  assert.equal(val("opbellen", "wij"), "bellen op");
  assert.equal(val("opstaan", "wij"), "staan op");
  assert.equal(val("aankomen", "wij"), "komen aan");
  assert.equal(val("aanraken", "wij"), "raken aan");
  // the example sentence is built from the same value; it must split too
  const r = conjugateNl({ infinitive: "opbellen" });
  assert.ok(r.ok);
  const wij = r.groups[0].forms.find((f) => f.id === "wij");
  assert.equal(wij?.exNl, "Wij bellen op samen.");
  // non-separable verbs keep the bare infinitive
  assert.equal(val("werken", "wij"), "werken");
  assert.equal(val("vergeten", "wij"), "vergeten");
});

// T-086 bug 3: closing the syllable with -t forces the long vowel to double,
// and a vowel-initial stem must still lengthen (eten -> eet).
test("open-syllable stems keep their long vowel", () => {
  assert.equal(val("gaan", "jij"), "gaat");
  assert.equal(val("staan", "jij"), "staat");
  assert.equal(val("slaan", "jij"), "slaat");
  assert.equal(val("gaan", "hij"), "gaat");
  assert.equal(val("eten", "ik"), "eet");
  assert.equal(val("eten", "jij"), "eet");
  // digraph stems already spell the long vowel; no doubling
  assert.equal(val("doen", "jij"), "doet");
  assert.equal(val("zien", "jij"), "ziet");
  // short stems are unaffected
  assert.equal(val("werken", "jij"), "werkt");
  assert.equal(val("zitten", "jij"), "zit");
});

test("inseparable prefix over strong base", () => {
  assert.equal(val("vertrekken", "past-sg"), "vertrok");
  assert.equal(val("vertrekken", "participle"), "vertrokken");
  assert.equal(val("begrijpen", "past-sg"), "begreep");
  assert.equal(val("begrijpen", "participle"), "begrepen");
  assert.equal(val("ontvangen", "participle"), "ontvangen");
  assert.equal(val("lachen", "participle"), "gelachen");
  assert.equal(val("wassen", "past-sg"), "waste");
});
