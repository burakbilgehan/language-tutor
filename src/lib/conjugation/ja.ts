import { toRomajiReading } from "../jp";
import type {
  ConjForm,
  ConjGroup,
  ConjInput,
  ConjPreset,
  ConjResult,
  JaWordClass,
} from "./types";

/**
 * Deterministic Japanese conjugator. Given the dictionary form and its class,
 * every form is rule-derived — no LLM, no dictionary. The only irregulars are
 * encoded here: する/来る paradigms, the 行く te/ta euphony, ある→ない and
 * いい→よ〜.
 */

// ---------------------------------------------------------------------------
// Godan sound table: for each dictionary-form ending, the five vowel-grade
// kana plus the euphonic (音便) te/ta suffixes. The u-row grade is the ending
// itself. う・つ・る → 促音便 (って), く → イ音便 (いて), ぐ → イ音便+dakuten
// (いで), ぬ・ぶ・む → 撥音便 (んで), す → no euphony (して).
// ---------------------------------------------------------------------------
type GodanEnding = "う" | "く" | "ぐ" | "す" | "つ" | "ぬ" | "ぶ" | "む" | "る";

interface GodanRow {
  a: string;
  i: string;
  e: string;
  o: string;
  te: string;
  ta: string;
}

const GODAN: Record<GodanEnding, GodanRow> = {
  う: { a: "わ", i: "い", e: "え", o: "お", te: "って", ta: "った" }, // a-grade is わ, not あ
  く: { a: "か", i: "き", e: "け", o: "こ", te: "いて", ta: "いた" },
  ぐ: { a: "が", i: "ぎ", e: "げ", o: "ご", te: "いで", ta: "いだ" },
  す: { a: "さ", i: "し", e: "せ", o: "そ", te: "して", ta: "した" },
  つ: { a: "た", i: "ち", e: "て", o: "と", te: "って", ta: "った" },
  ぬ: { a: "な", i: "に", e: "ね", o: "の", te: "んで", ta: "んだ" },
  ぶ: { a: "ば", i: "び", e: "べ", o: "ぼ", te: "んで", ta: "んだ" },
  む: { a: "ま", i: "み", e: "め", o: "も", te: "んで", ta: "んだ" },
  る: { a: "ら", i: "り", e: "れ", o: "ろ", te: "って", ta: "った" },
};

// Core forms every verb class produces; compound forms derive from these.
interface CoreForms {
  dict: string;
  nai: string;
  stemI: string; // 連用形 / masu stem
  te: string;
  ta: string;
  ba: string;
  potential: string;
  passive: string;
  causative: string;
  causativePassive: string;
  volitional: string;
  imperative: string;
}

/**
 * Build core forms from a base string (surface OR kana — the machinery only
 * touches the inflecting tail, so 書く and かく work identically). Returns
 * null when the base doesn't fit the class.
 */
function buildCore(base: string, wordClass: JaWordClass): CoreForms | null {
  if (wordClass === "godan") {
    const last = base.slice(-1) as GodanEnding;
    const row = GODAN[last];
    if (!row || base.length < 2) return null;
    const stem = base.slice(0, -1);
    // 行く(いく)/逝く/ゆく take 促音便 te/ta despite the く ending. Matching on
    // the base tail also catches compounds like 持っていく. Rare いく-tailed
    // godan verbs that are NOT 行く barely exist in learner vocabulary.
    const iku = /(いく|ゆく|行く|逝く)$/.test(base);
    // ある has no *あらない; its plain negative is bare ない.
    const nai =
      base === "ある" ? "ない" : stem + row.a + "ない";
    return {
      dict: base,
      nai,
      stemI: stem + row.i,
      te: iku ? stem + "って" : stem + row.te,
      ta: iku ? stem + "った" : stem + row.ta,
      ba: stem + row.e + "ば",
      potential: stem + row.e + "る",
      passive: stem + row.a + "れる",
      causative: stem + row.a + "せる",
      causativePassive: stem + row.a + "せられる",
      volitional: stem + row.o + "う",
      imperative: stem + row.e,
    };
  }

  if (wordClass === "ichidan") {
    if (!base.endsWith("る") || base.length < 2) return null;
    const stem = base.slice(0, -1);
    return {
      dict: base,
      nai: stem + "ない",
      stemI: stem,
      te: stem + "て",
      ta: stem + "た",
      ba: stem + "れば",
      potential: stem + "られる",
      passive: stem + "られる",
      causative: stem + "させる",
      causativePassive: stem + "させられる",
      volitional: stem + "よう",
      imperative: stem + "ろ",
    };
  }

  if (wordClass === "suru") {
    if (!base.endsWith("する")) return null;
    const prefix = base.slice(0, -2);
    return {
      dict: base,
      nai: prefix + "しない",
      stemI: prefix + "し",
      te: prefix + "して",
      ta: prefix + "した",
      ba: prefix + "すれば",
      potential: prefix + "できる",
      passive: prefix + "される",
      causative: prefix + "させる",
      causativePassive: prefix + "させられる",
      volitional: prefix + "しよう",
      imperative: prefix + "しろ",
    };
  }

  if (wordClass === "kuru") {
    // The inflecting tail is 来る/くる; the prefix (e.g. 持って) is inert.
    // With a 来る surface, each kana rest starts with the single mora き/く/こ,
    // so the surface form is prefix + 来 + rest.slice(1).
    const kanji = base.endsWith("来る");
    if (!kanji && !base.endsWith("くる")) return null;
    const prefix = base.slice(0, -2);
    const t = (rest: string) => prefix + (kanji ? "来" + rest.slice(1) : rest);
    return {
      dict: t("くる"),
      nai: t("こない"),
      stemI: t("き"),
      te: t("きて"),
      ta: t("きた"),
      ba: t("くれば"),
      potential: t("こられる"),
      passive: t("こられる"),
      causative: t("こさせる"),
      causativePassive: t("こさせられる"),
      volitional: t("こよう"),
      imperative: t("こい"),
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Form registry: a verb form = one entry. Compounds build on core forms;
// naiStem drops the い of ない (なかった, なければ, なくて).
// ---------------------------------------------------------------------------
interface FormDef {
  id: string;
  labelTr: string;
  labelEn: string;
  pattern: string;
  build: (c: CoreForms) => string;
  /** Verb-agnostic frame; 〇 is replaced with the conjugated word. */
  exJa?: string;
  exTr?: string;
  exEn?: string;
}

interface GroupDef {
  id: string;
  labelTr: string;
  labelEn: string;
  forms: FormDef[];
}

const naiStem = (c: CoreForms) => c.nai.slice(0, -1);

const VERB_GROUPS: GroupDef[] = [
  {
    id: "basic",
    labelTr: "Temel",
    labelEn: "Basic",
    forms: [
      { id: "dict", labelTr: "Sözlük — şimdiki/gelecek (düz)", labelEn: "Dictionary — present/future (plain)", pattern: "〜る", build: (c) => c.dict,
        exJa: "明日[あした]も〇。", exTr: "Yarın da 〜.", exEn: "Tomorrow too, 〜." },
      { id: "masu", labelTr: "Şimdiki/gelecek (kibar)", labelEn: "Present/future (polite)", pattern: "〜ます", build: (c) => c.stemI + "ます",
        exJa: "毎日[まいにち]〇。", exTr: "Her gün 〜.", exEn: "Every day 〜." },
      { id: "nai", labelTr: "Olumsuz (düz)", labelEn: "Negative (plain)", pattern: "〜ない", build: (c) => c.nai,
        exJa: "今日[きょう]は〇。", exTr: "Bugün 〜(-me-).", exEn: "Today, (not) 〜." },
      { id: "masen", labelTr: "Olumsuz (kibar)", labelEn: "Negative (polite)", pattern: "〜ません", build: (c) => c.stemI + "ません",
        exJa: "すみません、今日[きょう]は〇。", exTr: "Kusura bakmayın, bugün 〜(-me-).", exEn: "Sorry, today (not) 〜." },
      { id: "ta", labelTr: "Geçmiş (düz)", labelEn: "Past (plain)", pattern: "〜た", build: (c) => c.ta,
        exJa: "昨日[きのう]〇。", exTr: "Dün 〜(-di).", exEn: "Yesterday, 〜." },
      { id: "mashita", labelTr: "Geçmiş (kibar)", labelEn: "Past (polite)", pattern: "〜ました", build: (c) => c.stemI + "ました",
        exJa: "先週[せんしゅう]〇。", exTr: "Geçen hafta 〜(-di).", exEn: "Last week, 〜." },
      { id: "nakatta", labelTr: "Olumsuz geçmiş (düz)", labelEn: "Negative past (plain)", pattern: "〜なかった", build: (c) => naiStem(c) + "かった",
        exJa: "昨日[きのう]は〇。", exTr: "Dün 〜(-medi).", exEn: "Yesterday, (not) 〜." },
      { id: "masendeshita", labelTr: "Olumsuz geçmiş (kibar)", labelEn: "Negative past (polite)", pattern: "〜ませんでした", build: (c) => c.stemI + "ませんでした",
        exJa: "先週[せんしゅう]は〇。", exTr: "Geçen hafta 〜(-medi).", exEn: "Last week, (not) 〜." },
    ],
  },
  {
    id: "connective",
    labelTr: "Bağlayıcı",
    labelEn: "Connective",
    forms: [
      { id: "te", labelTr: "Te-formu", labelEn: "Te-form", pattern: "〜て", build: (c) => c.te,
        exJa: "〇から、寝[ね]ました。", exTr: "〜dikten sonra uyudum.", exEn: "After 〜, I slept." },
      { id: "nakute", labelTr: "Olumsuz te (sebep)", labelEn: "Negative te (cause)", pattern: "〜なくて", build: (c) => naiStem(c) + "くて",
        exJa: "〇、困[こま]りました。", exTr: "〜meyince zor durumda kaldım.", exEn: "Not 〜, I was in trouble." },
      { id: "naide", labelTr: "…meden", labelEn: "Without doing", pattern: "〜ないで", build: (c) => c.nai + "で",
        exJa: "〇、出[で]かけました。", exTr: "〜meden çıktım.", exEn: "I went out without 〜." },
      { id: "stem", labelTr: "Gövde (連用形)", labelEn: "Stem (ren'yōkei)", pattern: "〜ます kökü", build: (c) => c.stemI,
        exJa: "〇に行[い]きます。", exTr: "〜meye gidiyorum.", exEn: "I'm going in order to 〜." },
      { id: "tari", labelTr: "…ip …ip (liste)", labelEn: "…and so on", pattern: "〜たり", build: (c) => c.ta + "り",
        exJa: "〇、休[やす]んだりしました。", exTr: "Kâh 〜, kâh dinlendim.", exEn: "I 〜, rested, and so on." },
      { id: "nagara", labelTr: "…iyorken (eşzamanlı)", labelEn: "While doing", pattern: "〜ながら", build: (c) => c.stemI + "ながら",
        exJa: "〇、音楽[おんがく]を聞[き]きます。", exTr: "〜irken müzik dinlerim.", exEn: "I listen to music while 〜." },
    ],
  },
  {
    id: "aspect",
    labelTr: "Görünüş",
    labelEn: "Aspect",
    forms: [
      { id: "teiru", labelTr: "Sürerlik / durum", labelEn: "Progressive/state", pattern: "〜ている", build: (c) => c.te + "いる",
        exJa: "今[いま]、〇。", exTr: "Şu anda 〜(-iyor).", exEn: "Right now, 〜(-ing)." },
      { id: "teita", labelTr: "Sürerlik geçmiş", labelEn: "Past progressive", pattern: "〜ていた", build: (c) => c.te + "いた",
        exJa: "さっきまで〇。", exTr: "Az önceye kadar 〜(-iyordu).", exEn: "Until a moment ago, 〜(-ing)." },
      { id: "tearu", labelTr: "Yapılmış halde", labelEn: "Resultant state", pattern: "〜てある", build: (c) => c.te + "ある",
        exJa: "もう〇。", exTr: "Çoktan 〜(-ilmiş durumda).", exEn: "Already 〜 (done and in place)." },
      { id: "teoku", labelTr: "Önceden yapmak", labelEn: "Do in advance", pattern: "〜ておく", build: (c) => c.te + "おく",
        exJa: "先[さき]に〇。", exTr: "Önceden 〜(-ivereyim).", exEn: "I'll 〜 in advance." },
      { id: "teshimau", labelTr: "Bitirivermek / kazara", labelEn: "Completely/regret", pattern: "〜てしまう", build: (c) => c.te + "しまう",
        exJa: "全部[ぜんぶ]〇。", exTr: "Hepsini 〜(-iverdim).", exEn: "I 〜 it all (completely)." },
      { id: "takotogaaru", labelTr: "…mişliği olmak (deneyim)", labelEn: "Have done before", pattern: "〜たことがある", build: (c) => c.ta + "ことがある",
        exJa: "一度[いちど]〇。", exTr: "Bir kez 〜mişliğim var.", exEn: "I have 〜 once before." },
    ],
  },
  {
    id: "conditional",
    labelTr: "Koşul",
    labelEn: "Conditional",
    forms: [
      { id: "tara", labelTr: "…ince / …irse", labelEn: "If/when (tara)", pattern: "〜たら", build: (c) => c.ta + "ら",
        exJa: "〇、電話[でんわ]してください。", exTr: "〜ince arayın.", exEn: "When 〜, please call." },
      { id: "ba", labelTr: "…irse (ba)", labelEn: "If (ba)", pattern: "〜ば", build: (c) => c.ba,
        exJa: "〇、間[ま]に合[あ]います。", exTr: "〜irsen yetişirsin.", exEn: "If 〜, you'll make it." },
      { id: "nakereba", labelTr: "…mezse", labelEn: "If not", pattern: "〜なければ", build: (c) => naiStem(c) + "ければ",
        exJa: "〇、だめです。", exTr: "〜mezsen olmaz.", exEn: "If not 〜, it won't do." },
      { id: "nara", labelTr: "…iyorsa (bağlam)", labelEn: "If (contextual)", pattern: "〜なら", build: (c) => c.dict + "なら",
        exJa: "〇、私[わたし]も行[い]きます。", exTr: "〜eceksen ben de gelirim.", exEn: "If (you) 〜, I'll come too." },
      { id: "to", labelTr: "…ince hep (doğal sonuç)", labelEn: "Whenever (to)", pattern: "〜と", build: (c) => c.dict + "と",
        exJa: "〇、うれしいです。", exTr: "〜ince sevinirim.", exEn: "Whenever 〜, I'm happy." },
    ],
  },
  {
    id: "desire",
    labelTr: "İstek & niyet",
    labelEn: "Desire & intent",
    forms: [
      { id: "tai", labelTr: "…mek istemek", labelEn: "Want to", pattern: "〜たい", build: (c) => c.stemI + "たい",
        exJa: "早[はや]く〇です。", exTr: "Bir an önce 〜mek istiyorum.", exEn: "I want to 〜 soon." },
      { id: "takunai", labelTr: "…mek istememek", labelEn: "Not want to", pattern: "〜たくない", build: (c) => c.stemI + "たくない",
        exJa: "全然[ぜんぜん]〇です。", exTr: "Hiç 〜mek istemiyorum.", exEn: "I don't want to 〜 at all." },
      { id: "volitional", labelTr: "…elim (düz niyet)", labelEn: "Volitional (plain)", pattern: "〜(よ)う", build: (c) => c.volitional,
        exJa: "一緒[いっしょ]に〇！", exTr: "Hadi birlikte 〜elim!", exEn: "Let's 〜 together!" },
      { id: "mashou", labelTr: "…elim (kibar)", labelEn: "Volitional (polite)", pattern: "〜ましょう", build: (c) => c.stemI + "ましょう",
        exJa: "一緒[いっしょ]に〇！", exTr: "Hadi birlikte 〜elim!", exEn: "Let's 〜 together!" },
      { id: "tsumori", labelTr: "…me niyetinde olmak", labelEn: "Intend to", pattern: "〜つもり", build: (c) => c.dict + "つもり",
        exJa: "来年[らいねん]、〇です。", exTr: "Seneye 〜 niyetindeyim.", exEn: "Next year, I intend to 〜." },
      { id: "deshou", labelTr: "…se gerek (tahmin)", labelEn: "Probably", pattern: "〜でしょう", build: (c) => c.dict + "でしょう",
        exJa: "明日[あした]〇。", exTr: "Yarın muhtemelen 〜.", exEn: "Tomorrow, probably 〜." },
    ],
  },
  {
    id: "voice",
    labelTr: "Çatı",
    labelEn: "Voice",
    forms: [
      { id: "potential", labelTr: "Yeterlik (…ebilmek)", labelEn: "Potential", pattern: "〜(ら)れる", build: (c) => c.potential,
        exJa: "ここで〇。", exTr: "Burada 〜ebilirim.", exEn: "I can 〜 here." },
      { id: "passive", labelTr: "Edilgen", labelEn: "Passive", pattern: "〜(ら)れる", build: (c) => c.passive,
        exJa: "先生[せんせい]に〇。", exTr: "Öğretmen tarafından 〜.", exEn: "〜 by the teacher." },
      { id: "causative", labelTr: "Ettirgen", labelEn: "Causative", pattern: "〜(さ)せる", build: (c) => c.causative,
        exJa: "子供[こども]に〇。", exTr: "Çocuğa 〜tiririm.", exEn: "I make the child 〜." },
      { id: "causative-passive", labelTr: "Ettirgen edilgen (zorla)", labelEn: "Causative-passive", pattern: "〜(さ)せられる", build: (c) => c.causativePassive,
        exJa: "母[はは]に〇。", exTr: "Annem zorla 〜tirdi.", exEn: "I was made to 〜 by my mother." },
    ],
  },
  {
    id: "command",
    labelTr: "Emir, rica & tavsiye",
    labelEn: "Command, request & advice",
    forms: [
      { id: "imperative", labelTr: "Emir (kaba)", labelEn: "Imperative (blunt)", pattern: "〜ろ / e-kökü", build: (c) => c.imperative,
        exJa: "早[はや]く〇！", exTr: "Çabuk 〜!", exEn: "〜, quick!" },
      { id: "prohibitive", labelTr: "Yasak (…me!)", labelEn: "Prohibitive", pattern: "〜るな", build: (c) => c.dict + "な",
        exJa: "ここで〇！", exTr: "Burada 〜me!", exEn: "Don't 〜 here!" },
      { id: "tekudasai", labelTr: "Lütfen …in", labelEn: "Please do", pattern: "〜てください", build: (c) => c.te + "ください",
        exJa: "どうぞ、〇。", exTr: "Buyurun, lütfen 〜.", exEn: "Please, go ahead and 〜." },
      { id: "naidekudasai", labelTr: "Lütfen …meyin", labelEn: "Please don't", pattern: "〜ないでください", build: (c) => c.nai + "でください",
        exJa: "ここでは〇。", exTr: "Burada lütfen 〜meyin.", exEn: "Please don't 〜 here." },
      { id: "tahougaii", labelTr: "…se iyi olur (tavsiye)", labelEn: "Had better", pattern: "〜たほうがいい", build: (c) => c.ta + "ほうがいい",
        exJa: "早[はや]く〇ですよ。", exTr: "Erkenden 〜sen iyi olur.", exEn: "You'd better 〜 soon." },
    ],
  },
  {
    id: "other",
    labelTr: "Diğer",
    labelEn: "Other",
    forms: [
      { id: "sou", labelTr: "…ecek gibi görünmek", labelEn: "Looks about to", pattern: "〜そう", build: (c) => c.stemI + "そう",
        exJa: "今[いま]にも〇です。", exTr: "Neredeyse 〜ecek gibi.", exEn: "Looks about to 〜 any moment." },
      { id: "sugiru", labelTr: "Fazla …mek", labelEn: "Too much", pattern: "〜すぎる", build: (c) => c.stemI + "すぎる",
        exJa: "最近[さいきん]、〇。", exTr: "Son zamanlarda fazla 〜.", exEn: "Lately, 〜 too much." },
      { id: "yasui", labelTr: "…mesi kolay", labelEn: "Easy to", pattern: "〜やすい", build: (c) => c.stemI + "やすい",
        exJa: "これは〇です。", exTr: "Bunun 〜mesi kolay.", exEn: "This is easy to 〜." },
      { id: "nikui", labelTr: "…mesi zor", labelEn: "Hard to", pattern: "〜にくい", build: (c) => c.stemI + "にくい",
        exJa: "これは〇です。", exTr: "Bunun 〜mesi zor.", exEn: "This is hard to 〜." },
    ],
  },
];

// ---------------------------------------------------------------------------
// Adjectives. Builders take the base (surface or kana) directly.
// i-adjective: stem = base minus い; anything ending in いい (いい itself,
// かっこいい…) inflects on よ (よくない, よかった) while the dictionary form
// keeps いい. そう also irregular there: よさそう.
// ---------------------------------------------------------------------------
interface AdjFormDef {
  id: string;
  labelTr: string;
  labelEn: string;
  pattern: string;
  build: (base: string) => string;
  exJa?: string;
  exTr?: string;
  exEn?: string;
}

const iStem = (base: string) =>
  base.endsWith("いい") ? base.slice(0, -2) + "よ" : base.slice(0, -1);

const I_ADJ_FORMS: AdjFormDef[] = [
  { id: "dict", labelTr: "Sözlük", labelEn: "Dictionary", pattern: "〜い", build: (b) => b,
    exJa: "この店[みせ]は〇。", exTr: "Bu dükkân 〜.", exEn: "This shop is 〜." },
  { id: "desu", labelTr: "Kibar", labelEn: "Polite", pattern: "〜いです", build: (b) => b + "です",
    exJa: "この店[みせ]は〇。", exTr: "Bu dükkân 〜. (kibar)", exEn: "This shop is 〜. (polite)" },
  { id: "kunai", labelTr: "Olumsuz", labelEn: "Negative", pattern: "〜くない", build: (b) => iStem(b) + "くない",
    exJa: "あまり〇。", exTr: "Pek 〜 değil.", exEn: "Not very 〜." },
  { id: "kunaidesu", labelTr: "Kibar olumsuz", labelEn: "Polite negative", pattern: "〜くないです", build: (b) => iStem(b) + "くないです",
    exJa: "あまり〇。", exTr: "Pek 〜 değil. (kibar)", exEn: "Not very 〜. (polite)" },
  { id: "katta", labelTr: "Geçmiş", labelEn: "Past", pattern: "〜かった", build: (b) => iStem(b) + "かった",
    exJa: "昨日[きのう]は〇。", exTr: "Dün 〜ydi.", exEn: "Yesterday it was 〜." },
  { id: "kattadesu", labelTr: "Kibar geçmiş", labelEn: "Polite past", pattern: "〜かったです", build: (b) => iStem(b) + "かったです",
    exJa: "昨日[きのう]は〇。", exTr: "Dün 〜ydi. (kibar)", exEn: "Yesterday it was 〜. (polite)" },
  { id: "kunakatta", labelTr: "Olumsuz geçmiş", labelEn: "Negative past", pattern: "〜くなかった", build: (b) => iStem(b) + "くなかった",
    exJa: "全然〇。", exTr: "Hiç 〜 değildi.", exEn: "It was not 〜 at all." },
  { id: "kute", labelTr: "Te-formu (bağlama)", labelEn: "Te-form", pattern: "〜くて", build: (b) => iStem(b) + "くて",
    exJa: "〇、有名[ゆうめい]です。", exTr: "Hem 〜 hem ünlü.", exEn: "〜 and famous." },
  { id: "kunakute", labelTr: "Olumsuz te", labelEn: "Negative te", pattern: "〜くなくて", build: (b) => iStem(b) + "くなくて",
    exJa: "〇、安心[あんしん]した。", exTr: "〜 olmayınca rahatladım.", exEn: "Not being 〜, I was relieved." },
  { id: "kereba", labelTr: "…ysa (ba)", labelEn: "If (ba)", pattern: "〜ければ", build: (b) => iStem(b) + "ければ",
    exJa: "〇、買[か]います。", exTr: "〜ysa alırım.", exEn: "If 〜, I will buy it." },
  { id: "kunakereba", labelTr: "…değilse", labelEn: "If not", pattern: "〜くなければ", build: (b) => iStem(b) + "くなければ",
    exJa: "〇、買[か]いません。", exTr: "〜 değilse almam.", exEn: "If not 〜, I will not buy it." },
  { id: "kattara", labelTr: "…ysa (tara)", labelEn: "If/when (tara)", pattern: "〜かったら", build: (b) => iStem(b) + "かったら",
    exJa: "〇、やめましょう。", exTr: "〜ysa vazgeçelim.", exEn: "If 〜, let us not." },
  { id: "ku", labelTr: "Zarf (…şekilde)", labelEn: "Adverb", pattern: "〜く", build: (b) => iStem(b) + "く",
    exJa: "〇なります。", exTr: "〜 hale gelir (〜laşır).", exEn: "It becomes 〜." },
  { id: "sa", labelTr: "İsimleşme (…lik)", labelEn: "Noun (-ness)", pattern: "〜さ", build: (b) => iStem(b) + "さ",
    exJa: "〇はどのくらい？", exTr: "〜liği ne kadar?", exEn: "How much is its 〜ness?" },
  { id: "sou", labelTr: "…görünümlü", labelEn: "Looks", pattern: "〜そう", build: (b) => (b.endsWith("いい") ? iStem(b) + "さそう" : iStem(b) + "そう"),
    exJa: "〇ですね。", exTr: "〜 görünüyor.", exEn: "It looks 〜." },
];

const NA_ADJ_FORMS: AdjFormDef[] = [
  { id: "da", labelTr: "Düz (…dır)", labelEn: "Plain copula", pattern: "〜だ", build: (b) => b + "だ",
    exJa: "この町[まち]は〇。", exTr: "Bu şehir 〜.", exEn: "This town is 〜." },
  { id: "desu", labelTr: "Kibar", labelEn: "Polite", pattern: "〜です", build: (b) => b + "です",
    exJa: "この町[まち]は〇。", exTr: "Bu şehir 〜. (kibar)", exEn: "This town is 〜. (polite)" },
  { id: "janai", labelTr: "Olumsuz", labelEn: "Negative", pattern: "〜じゃない", build: (b) => b + "じゃない",
    exJa: "あまり〇。", exTr: "Pek 〜 değil.", exEn: "Not very 〜." },
  { id: "dewaarimasen", labelTr: "Kibar olumsuz", labelEn: "Polite negative", pattern: "〜ではありません", build: (b) => b + "ではありません",
    exJa: "あまり〇。", exTr: "Pek 〜 değil. (kibar)", exEn: "Not very 〜. (polite)" },
  { id: "datta", labelTr: "Geçmiş", labelEn: "Past", pattern: "〜だった", build: (b) => b + "だった",
    exJa: "昔[むかし]は〇。", exTr: "Eskiden 〜ydi.", exEn: "It used to be 〜." },
  { id: "deshita", labelTr: "Kibar geçmiş", labelEn: "Polite past", pattern: "〜でした", build: (b) => b + "でした",
    exJa: "昔[むかし]は〇。", exTr: "Eskiden 〜ydi. (kibar)", exEn: "It used to be 〜. (polite)" },
  { id: "janakatta", labelTr: "Olumsuz geçmiş", labelEn: "Negative past", pattern: "〜じゃなかった", build: (b) => b + "じゃなかった",
    exJa: "全然〇。", exTr: "Hiç 〜 değildi.", exEn: "It was not 〜 at all." },
  { id: "de", labelTr: "Te-formu (bağlama)", labelEn: "Te-form", pattern: "〜で", build: (b) => b + "で",
    exJa: "〇、きれいです。", exTr: "Hem 〜 hem güzel.", exEn: "〜 and beautiful." },
  { id: "nara", labelTr: "…ysa", labelEn: "If", pattern: "〜なら", build: (b) => b + "なら",
    exJa: "〇、行[い]きます。", exTr: "〜ysa giderim.", exEn: "If it is 〜, I will go." },
  { id: "dattara", labelTr: "…ysa (tara)", labelEn: "If/when (tara)", pattern: "〜だったら", build: (b) => b + "だったら",
    exJa: "〇、行[い]きましょう。", exTr: "〜ysa gidelim.", exEn: "If it is 〜, let us go." },
  { id: "na", labelTr: "Niteleme (…olan)", labelEn: "Attributive", pattern: "〜な", build: (b) => b + "な",
    exJa: "〇ところが好[す]きです。", exTr: "〜 yerleri severim.", exEn: "I like 〜 places." },
  { id: "ni", labelTr: "Zarf (…şekilde)", labelEn: "Adverb", pattern: "〜に", build: (b) => b + "に",
    exJa: "〇してください。", exTr: "Lütfen 〜 yapın (〜leştirin).", exEn: "Please make it 〜." },
  { id: "sa", labelTr: "İsimleşme (…lik)", labelEn: "Noun (-ness)", pattern: "〜さ", build: (b) => b + "さ",
    exJa: "〇はどのくらい？", exTr: "〜liği ne kadar?", exEn: "How much is its 〜ness?" },
  { id: "sou", labelTr: "…görünümlü", labelEn: "Looks", pattern: "〜そう", build: (b) => b + "そう",
    exJa: "〇ですね。", exTr: "〜 görünüyor.", exEn: "It looks 〜." },
];

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

/** 食べます + たべます → 食[た]べます (longest common suffix keeps the tail bare). */
export function deriveFuriganaJa(surface: string, kana: string | null): string {
  if (!kana || surface === kana) return surface;
  let i = 0;
  while (
    i < surface.length &&
    i < kana.length &&
    surface[surface.length - 1 - i] === kana[kana.length - 1 - i]
  ) {
    i++;
  }
  const sPre = surface.slice(0, surface.length - i);
  const kPre = kana.slice(0, kana.length - i);
  if (!sPre || !kPre) return surface;
  return `${sPre}[${kPre}]${surface.slice(surface.length - i)}`;
}

const KANA_RE = /^[぀-ゟ゠-ヿー]+$/;

function validate(input: ConjInput): { tr: string; en: string } | null {
  const { surface, reading, wordClass } = input;
  if (!surface) return { tr: "Kelime boş.", en: "Empty word." };
  if (reading && reading.slice(-1) !== surface.slice(-1) && wordClass !== "na-adjective") {
    // Okurigana means the inflecting tail is identical in both spellings.
    return {
      tr: "Okunuş ile kelimenin son hecesi uyuşmuyor.",
      en: "The reading's last kana doesn't match the word's.",
    };
  }
  const tailOk = (() => {
    switch (wordClass) {
      case "godan":
        return surface.slice(-1) in GODAN && surface.length >= 2;
      case "ichidan":
        return surface.endsWith("る") && surface.length >= 2;
      case "suru":
        return surface.endsWith("する");
      case "kuru":
        return surface.endsWith("くる") || surface.endsWith("来る");
      case "i-adjective":
        return surface.endsWith("い") && surface.length >= 2;
      case "na-adjective":
        return surface.length >= 1;
    }
  })();
  if (!tailOk) {
    const need: Record<JaWordClass, string> = {
      godan: "う/く/ぐ/す/つ/ぬ/ぶ/む/る",
      ichidan: "る",
      suru: "する",
      kuru: "くる / 来る",
      "i-adjective": "い",
      "na-adjective": "",
    };
    return {
      tr: `Bu sınıf için kelime ${need[wordClass]} ile bitmeli.`,
      en: `For this class the word must end in ${need[wordClass]}.`,
    };
  }
  return null;
}

export function conjugateJa(input: ConjInput): ConjResult {
  const surface = input.surface.trim();
  const reading = input.reading?.trim() || undefined;
  const { wordClass } = input;

  const err = validate({ surface, reading, wordClass });
  if (err) return { ok: false, errorTr: err.tr, errorEn: err.en };

  const surfaceIsKana = KANA_RE.test(surface);
  // The kana rendering comes from the reading, or from the surface itself
  // when it's already kana. A kanji surface without a reading still
  // conjugates (the machinery only touches the tail) — kana/romaji are null.
  const kanaBase = reading ?? (surfaceIsKana ? surface : null);
  const notes: { tr: string; en: string }[] = [];

  const toForm = (
    def: {
      id: string;
      labelTr: string;
      labelEn: string;
      pattern: string;
      exJa?: string;
      exTr?: string;
      exEn?: string;
    },
    surfaceForm: string,
    kanaForm: string | null
  ): ConjForm => {
    const furigana = deriveFuriganaJa(surfaceForm, kanaForm);
    return {
      id: def.id,
      labelTr: def.labelTr,
      labelEn: def.labelEn,
      pattern: def.pattern,
      surface: surfaceForm,
      kana: kanaForm,
      romaji: kanaForm ? toRomajiReading(kanaForm) : null,
      furigana,
      example: def.exJa
        ? {
            ja: def.exJa.replace("〇", furigana),
            tr: def.exTr ?? "",
            en: def.exEn ?? "",
          }
        : null,
    };
  };

  if (wordClass === "i-adjective" || wordClass === "na-adjective") {
    const base =
      wordClass === "na-adjective" && surface.endsWith("な")
        ? surface.slice(0, -1)
        : surface;
    const kBase =
      kanaBase &&
      (wordClass === "na-adjective" && kanaBase.endsWith("な")
        ? kanaBase.slice(0, -1)
        : kanaBase);
    const defs = wordClass === "i-adjective" ? I_ADJ_FORMS : NA_ADJ_FORMS;
    const group: ConjGroup = {
      id: wordClass,
      labelTr: wordClass === "i-adjective" ? "い-sıfat çekimi" : "な-sıfat + koşaç",
      labelEn: wordClass === "i-adjective" ? "い-adjective" : "な-adjective + copula",
      forms: defs.map((d) => toForm(d, d.build(base), kBase ? d.build(kBase) : null)),
    };
    if (wordClass === "i-adjective" && base.endsWith("いい")) {
      notes.push({
        tr: "いい, çekimde よ köküne döner: よくない, よかった, よさそう.",
        en: "いい inflects on the よ stem: よくない, よかった, よさそう.",
      });
    }
    return { ok: true, groups: [group], notes };
  }

  const surfaceCore = buildCore(surface, wordClass);
  if (!surfaceCore) {
    return {
      ok: false,
      errorTr: "Kelime bu sınıfla çekimlenemedi.",
      errorEn: "Could not conjugate the word with this class.",
    };
  }
  const kanaCore = kanaBase && kanaBase !== surface ? buildCore(kanaBase, wordClass) : surfaceIsKana ? surfaceCore : null;

  const groups: ConjGroup[] = VERB_GROUPS.map((g) => ({
    id: g.id,
    labelTr: g.labelTr,
    labelEn: g.labelEn,
    forms: g.forms.map((d) =>
      toForm(d, d.build(surfaceCore), kanaCore ? d.build(kanaCore) : null)
    ),
  }));

  notes.push({
    tr: "Japoncada ayrı bir gelecek zaman eki yok: sözlük/ます formu bağlama göre şimdiki VE gelecek zamanı karşılar (明日行く = yarın gideceğim).",
    en: "Japanese has no separate future tense: the dictionary/ます form covers both present and future depending on context (明日行く = I will go tomorrow).",
  });
  if (wordClass === "suru") {
    notes.push({
      tr: "Yeterlik biçiminde する yerine できる gelir: 勉強する → 勉強できる.",
      en: "The potential replaces する with できる: 勉強する → 勉強できる.",
    });
  }
  if (surface === "ある" || kanaBase === "ある") {
    notes.push({
      tr: "ある'ın düz olumsuzu ない'dır (あらない değil).",
      en: "The plain negative of ある is ない (not あらない).",
    });
  }

  return { ok: true, groups, notes };
}

// ---------------------------------------------------------------------------
// Class guessing — preselects the radio in the UI, never overrides the user.
// ---------------------------------------------------------------------------

// Common る-ending verbs whose preceding mora is i/e-row but which are godan.
// Ambiguous kana pairs (かえる 帰る/変える, きる 切る/着る, いる 要る/居る)
// resolve to the reading a learner more likely means; the radio fixes the rest.
const RU_GODAN = new Set([
  "かえる", "はいる", "はしる", "しる", "きる", "へる", "かぎる", "しゃべる",
  "ける", "すべる", "にぎる", "まいる", "いじる", "ちる", "けずる",
]);

const I_ROW = "きぎしじちにひびぴみりい";
const E_ROW = "けげせぜてでねへべぺめれえ";

export function guessClassJa(kanaOrSurface: string): JaWordClass | null {
  const w = kanaOrSurface.trim();
  if (!w) return null;
  if (w.endsWith("する")) return "suru";
  if (w.endsWith("くる") || w.endsWith("来る")) return "kuru";
  if (w.endsWith("い") && !w.endsWith("ない")) return "i-adjective";
  if (w.endsWith("る")) {
    if (RU_GODAN.has(w)) return "godan";
    const prev = w.slice(-2, -1);
    if (I_ROW.includes(prev) || E_ROW.includes(prev)) return "ichidan";
    return "godan";
  }
  if (w.slice(-1) in GODAN) return "godan";
  return "na-adjective";
}

// Presets double as a live 音便 reference: every godan row, the 行く
// exception, the 帰る ru-godan trap, both irregulars and both adjective types.
export const JA_PRESETS: ConjPreset[] = [
  { surface: "買う", reading: "かう", wordClass: "godan", hintTr: "う-satırı (わ!)", hintEn: "う row (わ!)" },
  { surface: "行く", reading: "いく", wordClass: "godan", hintTr: "istisna: 行って", hintEn: "exception: 行って" },
  { surface: "書く", reading: "かく", wordClass: "godan", hintTr: "く-satırı (いて)", hintEn: "く row (いて)" },
  { surface: "泳ぐ", reading: "およぐ", wordClass: "godan", hintTr: "ぐ-satırı (いで)", hintEn: "ぐ row (いで)" },
  { surface: "話す", reading: "はなす", wordClass: "godan", hintTr: "す-satırı (して)", hintEn: "す row (して)" },
  { surface: "待つ", reading: "まつ", wordClass: "godan", hintTr: "つ-satırı (って)", hintEn: "つ row (って)" },
  { surface: "死ぬ", reading: "しぬ", wordClass: "godan", hintTr: "ぬ-satırı (んで)", hintEn: "ぬ row (んで)" },
  { surface: "遊ぶ", reading: "あそぶ", wordClass: "godan", hintTr: "ぶ-satırı (んで)", hintEn: "ぶ row (んで)" },
  { surface: "読む", reading: "よむ", wordClass: "godan", hintTr: "む-satırı (んで)", hintEn: "む row (んで)" },
  { surface: "帰る", reading: "かえる", wordClass: "godan", hintTr: "る ile biten godan!", hintEn: "ru-ending godan!" },
  { surface: "食べる", reading: "たべる", wordClass: "ichidan", hintTr: "ichidan", hintEn: "ichidan" },
  { surface: "見る", reading: "みる", wordClass: "ichidan", hintTr: "tek moralı kök", hintEn: "one-mora stem" },
  { surface: "する", reading: "する", wordClass: "suru", hintTr: "düzensiz", hintEn: "irregular" },
  { surface: "勉強する", reading: "べんきょうする", wordClass: "suru", hintTr: "isim+する", hintEn: "noun+する" },
  { surface: "来る", reading: "くる", wordClass: "kuru", hintTr: "düzensiz (き/く/こ)", hintEn: "irregular (き/く/こ)" },
  { surface: "高い", reading: "たかい", wordClass: "i-adjective", hintTr: "い-sıfat", hintEn: "い-adjective" },
  { surface: "いい", reading: "いい", wordClass: "i-adjective", hintTr: "istisna: よくない", hintEn: "exception: よくない" },
  { surface: "静か", reading: "しずか", wordClass: "na-adjective", hintTr: "な-sıfat", hintEn: "な-adjective" },
];

export const JA_WORD_CLASSES: { id: JaWordClass; labelTr: string; labelEn: string }[] = [
  { id: "godan", labelTr: "Godan (u-fiil)", labelEn: "Godan (u-verb)" },
  { id: "ichidan", labelTr: "Ichidan (ru-fiil)", labelEn: "Ichidan (ru-verb)" },
  { id: "suru", labelTr: "する", labelEn: "する" },
  { id: "kuru", labelTr: "来る", labelEn: "来る" },
  { id: "i-adjective", labelTr: "い-sıfat", labelEn: "い-adjective" },
  { id: "na-adjective", labelTr: "な-sıfat", labelEn: "な-adjective" },
];
