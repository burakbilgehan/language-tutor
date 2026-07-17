import { test } from "node:test";
import assert from "node:assert/strict";
import { conjugateJa, guessClassJa, deriveFuriganaJa } from "./conjugation/ja";
import { conjugatorFor } from "./conjugation";
import type { ConjInput, ConjResult } from "./conjugation/types";

function forms(input: ConjInput): Map<string, { surface: string; kana: string | null; furigana: string }> {
  const res: ConjResult = conjugateJa(input);
  assert.ok(res.ok, `expected ok for ${input.surface}: ${!res.ok ? res.errorEn : ""}`);
  const map = new Map<string, { surface: string; kana: string | null; furigana: string }>();
  for (const g of res.groups) {
    for (const f of g.forms) map.set(f.id, f);
  }
  return map;
}

function expectForms(input: ConjInput, expected: Record<string, string>) {
  const m = forms(input);
  for (const [id, want] of Object.entries(expected)) {
    assert.equal(m.get(id)?.surface, want, `${input.surface} ${id}`);
  }
}

test("godan matrix: one verb per sound row, critical forms exact", () => {
  expectForms({ surface: "買う", reading: "かう", wordClass: "godan" }, {
    nai: "買わない", masu: "買います", te: "買って", ta: "買った",
    ba: "買えば", potential: "買える", passive: "買われる",
    causative: "買わせる", volitional: "買おう", imperative: "買え",
  });
  expectForms({ surface: "書く", reading: "かく", wordClass: "godan" }, {
    nai: "書かない", masu: "書きます", te: "書いて", ta: "書いた", ba: "書けば",
  });
  expectForms({ surface: "泳ぐ", reading: "およぐ", wordClass: "godan" }, {
    te: "泳いで", ta: "泳いだ", nai: "泳がない", volitional: "泳ごう",
  });
  expectForms({ surface: "話す", reading: "はなす", wordClass: "godan" }, {
    te: "話して", ta: "話した", nai: "話さない", masu: "話します",
  });
  expectForms({ surface: "立つ", reading: "たつ", wordClass: "godan" }, {
    te: "立って", nai: "立たない", masu: "立ちます", potential: "立てる",
  });
  expectForms({ surface: "死ぬ", reading: "しぬ", wordClass: "godan" }, {
    te: "死んで", ta: "死んだ", nai: "死なない",
  });
  expectForms({ surface: "遊ぶ", reading: "あそぶ", wordClass: "godan" }, {
    te: "遊んで", ta: "遊んだ", masu: "遊びます",
  });
  expectForms({ surface: "読む", reading: "よむ", wordClass: "godan" }, {
    te: "読んで", ta: "読んだ", nai: "読まない", "causative-passive": "読ませられる",
  });
  expectForms({ surface: "取る", reading: "とる", wordClass: "godan" }, {
    te: "取って", nai: "取らない", ba: "取れば", imperative: "取れ",
  });
});

test("godan euphony exceptions", () => {
  expectForms({ surface: "行く", reading: "いく", wordClass: "godan" }, {
    te: "行って", ta: "行った", nai: "行かない", masu: "行きます",
  });
  // compound keeps the exception
  expectForms({ surface: "持っていく", wordClass: "godan" }, {
    te: "持っていって", ta: "持っていった",
  });
  // ある → ない
  expectForms({ surface: "ある", wordClass: "godan" }, {
    nai: "ない", nakatta: "なかった", te: "あって", masu: "あります",
  });
});

test("godan compound forms", () => {
  expectForms({ surface: "飲む", reading: "のむ", wordClass: "godan" }, {
    masen: "飲みません", mashita: "飲みました", nakatta: "飲まなかった",
    masendeshita: "飲みませんでした", tara: "飲んだら", tari: "飲んだり",
    nagara: "飲みながら", teiru: "飲んでいる", teshimau: "飲んでしまう",
    nakereba: "飲まなければ", nara: "飲むなら", to: "飲むと",
    tai: "飲みたい", takunai: "飲みたくない", mashou: "飲みましょう",
    prohibitive: "飲むな", tekudasai: "飲んでください",
    naidekudasai: "飲まないでください", sou: "飲みそう", sugiru: "飲みすぎる",
    yasui: "飲みやすい", nikui: "飲みにくい", naide: "飲まないで",
    nakute: "飲まなくて", stem: "飲み",
  });
});

test("ichidan full sweep", () => {
  expectForms({ surface: "食べる", reading: "たべる", wordClass: "ichidan" }, {
    dict: "食べる", masu: "食べます", nai: "食べない", ta: "食べた",
    te: "食べて", ba: "食べれば", tara: "食べたら",
    potential: "食べられる", passive: "食べられる", causative: "食べさせる",
    "causative-passive": "食べさせられる", volitional: "食べよう",
    imperative: "食べろ", tai: "食べたい", teiru: "食べている",
  });
  // one-mora stem
  expectForms({ surface: "見る", reading: "みる", wordClass: "ichidan" }, {
    nai: "見ない", potential: "見られる", volitional: "見よう", te: "見て",
  });
});

test("suru: する and noun+する, potential is できる", () => {
  expectForms({ surface: "する", wordClass: "suru" }, {
    masu: "します", nai: "しない", ta: "した", te: "して", ba: "すれば",
    volitional: "しよう", potential: "できる", passive: "される",
    causative: "させる", "causative-passive": "させられる", imperative: "しろ",
  });
  const res = conjugateJa({ surface: "勉強する", reading: "べんきょうする", wordClass: "suru" });
  assert.ok(res.ok);
  expectForms({ surface: "勉強する", reading: "べんきょうする", wordClass: "suru" }, {
    masu: "勉強します", potential: "勉強できる", nai: "勉強しない",
    teiru: "勉強している",
  });
  assert.ok(res.notes.some((n) => n.tr.includes("できる")));
});

test("kuru: kana vowel grades and kanji surface derivation", () => {
  expectForms({ surface: "くる", wordClass: "kuru" }, {
    masu: "きます", nai: "こない", ba: "くれば", imperative: "こい",
    potential: "こられる", volitional: "こよう", te: "きて", ta: "きた",
  });
  expectForms({ surface: "来る", reading: "くる", wordClass: "kuru" }, {
    dict: "来る", masu: "来ます", nai: "来ない", ba: "来れば",
    causative: "来させる", te: "来て",
  });
  // prefixed compound
  expectForms({ surface: "持ってくる", wordClass: "kuru" }, {
    masu: "持ってきます", nai: "持ってこない", te: "持ってきて",
  });
});

test("i-adjective incl. いい exception", () => {
  expectForms({ surface: "高い", reading: "たかい", wordClass: "i-adjective" }, {
    dict: "高い", kunai: "高くない", katta: "高かった", kunakatta: "高くなかった",
    kute: "高くて", kereba: "高ければ", kattara: "高かったら", ku: "高く",
    sa: "高さ", sou: "高そう", desu: "高いです",
  });
  expectForms({ surface: "いい", wordClass: "i-adjective" }, {
    dict: "いい", kunai: "よくない", katta: "よかった", kereba: "よければ",
    sou: "よさそう", kute: "よくて",
  });
  expectForms({ surface: "かっこいい", wordClass: "i-adjective" }, {
    kunai: "かっこよくない", katta: "かっこよかった",
  });
});

test("na-adjective + copula", () => {
  expectForms({ surface: "静か", reading: "しずか", wordClass: "na-adjective" }, {
    da: "静かだ", desu: "静かです", janai: "静かじゃない",
    dewaarimasen: "静かではありません", datta: "静かだった",
    deshita: "静かでした", janakatta: "静かじゃなかった", de: "静かで",
    nara: "静かなら", dattara: "静かだったら", na: "静かな", ni: "静かに",
  });
  // trailing な is stripped
  expectForms({ surface: "静かな", reading: "しずかな", wordClass: "na-adjective" }, {
    da: "静かだ", na: "静かな",
  });
});

test("kana + romaji outputs", () => {
  const m = forms({ surface: "食べる", reading: "たべる", wordClass: "ichidan" });
  assert.equal(m.get("masu")?.kana, "たべます");
  const res = conjugateJa({ surface: "食べる", reading: "たべる", wordClass: "ichidan" });
  assert.ok(res.ok);
  const masu = res.groups[0].forms.find((f) => f.id === "masu");
  assert.equal(masu?.romaji, "tabemasu");
  // kanji surface without reading: conjugates, kana/romaji null
  const bare = forms({ surface: "書く", wordClass: "godan" });
  assert.equal(bare.get("te")?.surface, "書いて");
  assert.equal(bare.get("te")?.kana, null);
});

test("furigana bracket derivation", () => {
  assert.equal(deriveFuriganaJa("食べます", "たべます"), "食[た]べます");
  assert.equal(deriveFuriganaJa("来ない", "こない"), "来[こ]ない");
  assert.equal(deriveFuriganaJa("たべます", "たべます"), "たべます");
  assert.equal(deriveFuriganaJa("勉強します", "べんきょうします"), "勉強[べんきょう]します");
  const m = forms({ surface: "食べる", reading: "たべる", wordClass: "ichidan" });
  assert.equal(m.get("masu")?.furigana, "食[た]べます");
});

test("guessClass", () => {
  assert.equal(guessClassJa("かえる"), "godan"); // exception list
  assert.equal(guessClassJa("たべる"), "ichidan");
  assert.equal(guessClassJa("のむ"), "godan");
  assert.equal(guessClassJa("勉強する"), "suru");
  assert.equal(guessClassJa("持ってくる"), "kuru");
  assert.equal(guessClassJa("たかい"), "i-adjective");
  assert.equal(guessClassJa("しずか"), "na-adjective");
});

test("validation errors", () => {
  const bad = conjugateJa({ surface: "たべ", wordClass: "godan" });
  assert.ok(!bad.ok);
  const mismatch = conjugateJa({ surface: "書く", reading: "かき", wordClass: "godan" });
  assert.ok(!mismatch.ok);
  const ichidanBad = conjugateJa({ surface: "書く", wordClass: "ichidan" });
  assert.ok(!ichidanBad.ok);
});

test("conjugatorFor seam", () => {
  assert.ok(conjugatorFor("ja"));
  assert.equal(conjugatorFor("zh"), null);
  assert.equal(conjugatorFor("nl"), null);
});
