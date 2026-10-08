import { test } from "node:test";
import assert from "node:assert/strict";
import rawJmdict from "@/lib/jmdict/data.json";
import { JA_KANJI_INDEX } from "@/lib/kanji-index/ja";
import { parseFurigana } from "@/lib/jp";
import {
  GUIDES_JA,
  KANJI_GROUPS_JA,
  PHRASEBOOK_JA,
  type Phrase,
} from "@/lib/travel";

// T-100: mechanical gate over the authored travel content. The content was
// written by hand (LLM-assisted), so what a machine can check is checked
// here: furigana shape, dictionary readings, bilingual parity, no em dash.
// JMdict is a common-words subset, so a missing word is reported, not
// failed; a word that IS in JMdict with a different reading fails.

const KANJI_RE = /[一-鿿々]/;
const KANA_RE = /^[぀-ヿー・]+$/;

/** Katakana to hiragana, so タバコ and たばこ compare equal. */
const hira = (s: string) =>
  s.replace(/[\u30a1-\u30f6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

// Readings JMdict only lists in a loanword spelling (ギョーザ); checked by hand.
const ALLOWED = new Set(["餃子:ぎょうざ"]);

const READINGS = new Map<string, Set<string>>();
for (const [word, reading] of rawJmdict as [string, string, string][]) {
  const set = READINGS.get(word) ?? new Set<string>();
  set.add(hira(reading));
  READINGS.set(word, set);
}
const agrees = (word: string, reading: string) =>
  ALLOWED.has(`${word}:${reading}`) || READINGS.get(word)!.has(hira(reading));
const KANJI_CHARS = new Set(JA_KANJI_INDEX.map((k) => k.char));

/** Every L-shaped object and every string in a value tree. */
function walk(
  value: unknown,
  onString: (s: string, path: string) => void,
  onL: (l: { tr: unknown; en: unknown }, path: string) => void,
  path = ""
) {
  if (typeof value === "string") return onString(value, path);
  if (Array.isArray(value)) {
    value.forEach((v, i) => walk(v, onString, onL, `${path}[${i}]`));
    return;
  }
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    if ("tr" in o && "en" in o && Object.keys(o).length === 2) onL(o as never, path);
    for (const [k, v] of Object.entries(o)) walk(v, onString, onL, `${path}.${k}`);
  }
}

const ALL = { GUIDES_JA, KANJI_GROUPS_JA, PHRASEBOOK_JA };

/** Japanese strings that must carry bracket furigana for every kanji. */
function furiganaStrings(): { s: string; where: string }[] {
  const out: { s: string; where: string }[] = [];
  const phrase = (p: Phrase, where: string) => {
    out.push({ s: p.jp, where });
    if (p.reply) out.push({ s: p.reply.jp, where: `${where} reply` });
  };
  PHRASEBOOK_JA.forEach((sec) => sec.phrases.forEach((p) => phrase(p, `phrasebook/${sec.key}`)));
  for (const g of GUIDES_JA) {
    for (const b of g.blocks) {
      const where = `guide/${g.key}/${b.type}`;
      if (b.type === "phrases") b.items.forEach((p) => phrase(p, where));
      if (b.type === "dialogue") b.lines.forEach((l) => out.push({ s: l.jp, where }));
      if (b.type === "steps") b.steps.forEach((st) => st.jp && out.push({ s: st.jp, where }));
      if (b.type === "table")
        b.rows.forEach((r) => r.forEach((c) => typeof c === "string" && out.push({ s: c, where })));
    }
  }
  return out;
}

test("every L has non-empty tr and en", () => {
  const bad: string[] = [];
  walk(ALL, () => {}, (l, path) => {
    if (typeof l.tr !== "string" || !l.tr.trim()) bad.push(`${path}.tr`);
    if (typeof l.en !== "string" || !l.en.trim()) bad.push(`${path}.en`);
  });
  assert.deepEqual(bad, []);
});

test("no em dash anywhere", () => {
  const bad: string[] = [];
  walk(ALL, (s, path) => s.includes("—") && bad.push(path), () => {});
  assert.deepEqual(bad, []);
});

test("Japanese lines: every kanji bracketed, readings are kana", () => {
  const bad: string[] = [];
  for (const { s, where } of furiganaStrings()) {
    for (const seg of parseFurigana(s)) {
      if (seg.reading === undefined) {
        if (KANJI_RE.test(seg.text)) bad.push(`${where}: unbracketed kanji in "${s}"`);
      } else if (!KANA_RE.test(seg.reading)) {
        bad.push(`${where}: non-kana reading [${seg.reading}] in "${s}"`);
      }
    }
  }
  assert.deepEqual(bad, []);
});

test("bracketed words agree with JMdict when JMdict knows them", () => {
  const bad: string[] = [];
  for (const { s, where } of furiganaStrings()) {
    for (const seg of parseFurigana(s)) {
      if (seg.reading === undefined) continue;
      const known = READINGS.get(seg.text);
      // Only whole-word brackets are comparable (乗[の]り splits a word).
      if (known && seg.text.length > 1 && !agrees(seg.text, seg.reading)) {
        bad.push(`${where}: ${seg.text}[${seg.reading}] vs JMdict ${[...known].join("/")}`);
      }
    }
  }
  if (bad.length) console.log(`furigana/JMdict disagreements:\n  ${bad.join("\n  ")}`);
  assert.deepEqual(bad, []);
});

test("sign kanji: unique, indexed, compounds real", () => {
  const seen = new Set<string>();
  const bad: string[] = [];
  const misses: string[] = [];
  for (const g of KANJI_GROUPS_JA) {
    assert.ok(g.kanji.length > 0, `group ${g.key} empty`);
    for (const k of g.kanji) {
      if ([...k.kanji].length !== 1) bad.push(`${g.key}: "${k.kanji}" is not one char`);
      if (seen.has(k.kanji)) bad.push(`${g.key}: duplicate ${k.kanji}`);
      seen.add(k.kanji);
      if (!KANJI_CHARS.has(k.kanji)) misses.push(`${k.kanji} (not in kanji-index)`);
      for (const c of k.compounds) {
        if (!c.word.includes(k.kanji)) bad.push(`${k.kanji}: compound ${c.word} lacks it`);
        if (!KANA_RE.test(c.reading)) bad.push(`${k.kanji}: reading ${c.reading} not kana`);
        const known = READINGS.get(c.word);
        if (!known) misses.push(`${c.word}[${c.reading}]`);
        else if (!agrees(c.word, c.reading))
          bad.push(`${c.word}[${c.reading}] vs JMdict ${[...known].join("/")}`);
      }
    }
  }
  if (misses.length) console.log(`not in JMdict subset (review by hand):\n  ${misses.join("\n  ")}`);
  assert.deepEqual(bad, []);
});

test("keys unique per collection", () => {
  for (const list of [GUIDES_JA, KANJI_GROUPS_JA, PHRASEBOOK_JA]) {
    const keys = list.map((x) => x.key);
    assert.equal(new Set(keys).size, keys.length);
  }
});
