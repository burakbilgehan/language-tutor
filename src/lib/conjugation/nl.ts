/**
 * Deterministic Dutch verb conjugator. Weak verbs are fully rule-derived
 * (stem spelling adjustments + 't kofschip); strong/irregular verbs come from
 * a built-in principal-parts table of the ~70 most common ones. Unknown
 * strong verbs fall back to weak with a warning note.
 */

export interface NlConjInput {
  /** Infinitive: werken, lopen, opstaan… */
  infinitive: string;
}

export interface NlForm {
  id: string;
  labelTr: string;
  labelEn: string;
  pattern: string;
  value: string;
  exNl?: string;
  exTr?: string;
  exEn?: string;
}

export interface NlGroup {
  id: string;
  labelTr: string;
  labelEn: string;
  forms: NlForm[];
}

export type NlConjResult =
  | {
      ok: true;
      groups: NlGroup[];
      notes: { tr: string; en: string }[];
      verbType: "zwak" | "sterk" | "onregelmatig";
    }
  | { ok: false; errorTr: string; errorEn: string };

// Principal parts: [past singular, past plural, participle, aux ("h"|"z"|"hz")]
type Parts = [string, string, string, "h" | "z" | "hz"];

// Common strong/irregular verbs (simple forms; separable prefixes are handled
// by prefix-stripping below, e.g. opstaan → staan).
const STRONG: Record<string, Parts> = {
  zijn: ["was", "waren", "geweest", "z"],
  hebben: ["had", "hadden", "gehad", "h"],
  worden: ["werd", "werden", "geworden", "z"],
  kunnen: ["kon", "konden", "gekund", "h"],
  zullen: ["zou", "zouden", "—", "h"],
  willen: ["wilde", "wilden", "gewild", "h"],
  moeten: ["moest", "moesten", "gemoeten", "h"],
  mogen: ["mocht", "mochten", "gemogen", "h"],
  weten: ["wist", "wisten", "geweten", "h"],
  doen: ["deed", "deden", "gedaan", "h"],
  gaan: ["ging", "gingen", "gegaan", "z"],
  staan: ["stond", "stonden", "gestaan", "h"],
  slaan: ["sloeg", "sloegen", "geslagen", "h"],
  zien: ["zag", "zagen", "gezien", "h"],
  komen: ["kwam", "kwamen", "gekomen", "z"],
  nemen: ["nam", "namen", "genomen", "h"],
  geven: ["gaf", "gaven", "gegeven", "h"],
  lezen: ["las", "lazen", "gelezen", "h"],
  eten: ["at", "aten", "gegeten", "h"],
  vergeten: ["vergat", "vergaten", "vergeten", "hz"],
  spreken: ["sprak", "spraken", "gesproken", "h"],
  breken: ["brak", "braken", "gebroken", "h"],
  stelen: ["stal", "stalen", "gestolen", "h"],
  liggen: ["lag", "lagen", "gelegen", "h"],
  zitten: ["zat", "zaten", "gezeten", "h"],
  kijken: ["keek", "keken", "gekeken", "h"],
  schrijven: ["schreef", "schreven", "geschreven", "h"],
  blijven: ["bleef", "bleven", "gebleven", "z"],
  rijden: ["reed", "reden", "gereden", "hz"],
  snijden: ["sneed", "sneden", "gesneden", "h"],
  lijken: ["leek", "leken", "geleken", "h"],
  krijgen: ["kreeg", "kregen", "gekregen", "h"],
  vliegen: ["vloog", "vlogen", "gevlogen", "hz"],
  kiezen: ["koos", "kozen", "gekozen", "h"],
  verliezen: ["verloor", "verloren", "verloren", "h"],
  schieten: ["schoot", "schoten", "geschoten", "h"],
  sluiten: ["sloot", "sloten", "gesloten", "h"],
  buigen: ["boog", "bogen", "gebogen", "h"],
  ruiken: ["rook", "roken", "geroken", "h"],
  fluiten: ["floot", "floten", "gefloten", "h"],
  duiken: ["dook", "doken", "gedoken", "hz"],
  vinden: ["vond", "vonden", "gevonden", "h"],
  drinken: ["dronk", "dronken", "gedronken", "h"],
  beginnen: ["begon", "begonnen", "begonnen", "z"],
  winnen: ["won", "wonnen", "gewonnen", "h"],
  zingen: ["zong", "zongen", "gezongen", "h"],
  springen: ["sprong", "sprongen", "gesprongen", "hz"],
  binden: ["bond", "bonden", "gebonden", "h"],
  zinken: ["zonk", "zonken", "gezonken", "z"],
  helpen: ["hielp", "hielpen", "geholpen", "h"],
  lopen: ["liep", "liepen", "gelopen", "hz"],
  laten: ["liet", "lieten", "gelaten", "h"],
  slapen: ["sliep", "sliepen", "geslapen", "h"],
  vallen: ["viel", "vielen", "gevallen", "z"],
  houden: ["hield", "hielden", "gehouden", "h"],
  roepen: ["riep", "riepen", "geroepen", "h"],
  hangen: ["hing", "hingen", "gehangen", "h"],
  vangen: ["ving", "vingen", "gevangen", "h"],
  dragen: ["droeg", "droegen", "gedragen", "h"],
  vragen: ["vroeg", "vroegen", "gevraagd", "h"],
  varen: ["voer", "voeren", "gevaren", "hz"],
  kopen: ["kocht", "kochten", "gekocht", "h"],
  zoeken: ["zocht", "zochten", "gezocht", "h"],
  denken: ["dacht", "dachten", "gedacht", "h"],
  brengen: ["bracht", "brachten", "gebracht", "h"],
  zeggen: ["zei", "zeiden", "gezegd", "h"],
  leggen: ["legde", "legden", "gelegd", "h"],
  bewegen: ["bewoog", "bewogen", "bewogen", "h"],
  sterven: ["stierf", "stierven", "gestorven", "z"],
  werpen: ["wierp", "wierpen", "geworpen", "h"],
  treffen: ["trof", "troffen", "getroffen", "h"],
  trekken: ["trok", "trokken", "getrokken", "h"],
  spreiden: ["spreidde", "spreidden", "gespreid", "h"],
  vechten: ["vocht", "vochten", "gevochten", "h"],
  vriezen: ["vroor", "vroren", "gevroren", "h"],
  wegen: ["woog", "wogen", "gewogen", "h"],
  zwemmen: ["zwom", "zwommen", "gezwommen", "hz"],
  bidden: ["bad", "baden", "gebeden", "h"],
};

// Irregular PRESENT stems ([ik, jij, hij]) — the weak stem rule breaks for
// these (zijn → *zij) and for komen (vowel-restore would give *koom).
const PRESENT: Record<string, [string, string, string]> = {
  zijn: ["ben", "bent", "is"],
  hebben: ["heb", "hebt", "heeft"],
  kunnen: ["kan", "kunt", "kan"],
  zullen: ["zal", "zult", "zal"],
  mogen: ["mag", "mag", "mag"],
  willen: ["wil", "wilt", "wil"],
  komen: ["kom", "komt", "komt"],
  houden: ["houd", "houdt", "houdt"],
};

// Inseparable prefixes: participle takes no ge-.
const INSEP = ["be", "ge", "er", "her", "ont", "ver"];

const VOWELS = "aeiou";
const KOFSCHIP = new Set(["t", "k", "f", "s", "ch", "p", "x"]);

/**
 * werken→werk, maken→maak, stoppen→stop, leven→leef, reizen→reis.
 * decisionChar is the stem-final consonant BEFORE the v→f/z→s spelling swap:
 * 't kofschip runs on the underlying sound, so leven→leefde (v is voiced),
 * even though the written stem is leef.
 */
export function nlStemParts(infinitive: string): {
  stem: string;
  decisionChar: string;
} {
  // gaan/staan/slaan → ga/sta/sla; doen/zien → doe/zie; rest drops -en.
  let s = infinitive.endsWith("aan")
    ? infinitive.slice(0, -2)
    : /(?:ien|oen)$/.test(infinitive)
      ? infinitive.slice(0, -1)
      : infinitive.endsWith("en")
        ? infinitive.slice(0, -2)
        : infinitive.slice(0, -1);
  // double consonant → single: stopp→stop
  let deDoubled = false;
  if (
    s.length >= 2 &&
    s.slice(-1) === s.slice(-2, -1) &&
    !VOWELS.includes(s.slice(-1))
  ) {
    s = s.slice(0, -1);
    deDoubled = true;
  }
  // Open-syllable long vowel restore: mak→maak. Only when the infinitive
  // syllable was open — a de-doubled stem (stop) keeps its short vowel.
  const m = s.match(/^(.*?)([aeou])([bcdfgklmnprstvz])$/);
  if (m && !deDoubled && !VOWELS.includes(m[1].slice(-1) ?? "")) {
    s = m[1] + m[2] + m[2] + m[3];
  }
  const decisionChar = s.endsWith("ch") ? "ch" : s.slice(-1);
  // v→f, z→s at stem end (spelling only)
  if (s.endsWith("v")) s = s.slice(0, -1) + "f";
  if (s.endsWith("z")) s = s.slice(0, -1) + "s";
  return { stem: s, decisionChar };
}

export function nlStem(infinitive: string): string {
  return nlStemParts(infinitive).stem;
}

function isKofschip(decisionChar: string): boolean {
  return KOFSCHIP.has(decisionChar) || decisionChar === "ch";
}

// Unambiguously separable prefixes. onder/over/om/voor/door are excluded:
// they can be inseparable (onderzoeken → onderzocht), and guessing wrong
// there is worse than treating the verb as simple. Weak separable verbs
// whose base isn't in STRONG (opbellen) are a known v1 limitation.
const SEP_PREFIXES = [
  "op", "af", "aan", "uit", "mee", "na", "terug", "in", "toe", "weg",
  "samen", "binnen", "neer", "langs",
];

/** opstaan → ["op", "staan"] when the remainder is a known strong verb. */
function splitSeparable(inf: string): [string, string] {
  for (const p of SEP_PREFIXES) {
    if (inf.startsWith(p) && STRONG[inf.slice(p.length)]) {
      return [p, inf.slice(p.length)];
    }
  }
  return ["", inf];
}

export function conjugateNl(input: NlConjInput): NlConjResult {
  const inf = input.infinitive.trim().toLowerCase();
  if (!inf || inf.length < 3 || !/^[a-zë]+$/.test(inf) || !inf.endsWith("n")) {
    return {
      ok: false,
      errorTr: "Mastar (-en ile biten) bir fiil gir: werken, lopen…",
      errorEn: "Enter an infinitive ending in -en: werken, lopen…",
    };
  }

  const notes: { tr: string; en: string }[] = [];
  const [sepPrefix, base] = splitSeparable(inf);
  const strong = STRONG[base] ?? null;

  // Weak path sanity: a real infinitive ends in -en/-aan and leaves a stem
  // with a vowel. "ben" (stem "b") is a conjugated form, not an infinitive.
  if (!strong) {
    const probe = nlStemParts(base).stem;
    if (!/(?:en|aan)$/.test(base) || probe.length < 2 || !/[aeiouyë]/.test(probe)) {
      return {
        ok: false,
        errorTr: "Bu bir mastar görünmüyor. Fiilin sözlük halini gir (werken, zijn, opstaan…).",
        errorEn: "This doesn't look like an infinitive. Enter the dictionary form (werken, zijn, opstaan…).",
      };
    }
  }
  const inseparable = INSEP.some(
    (p) => inf.startsWith(p) && !sepPrefix && inf.length > p.length + 3
  );

  const { stem, decisionChar } = nlStemParts(base);

  let pastSg: string, pastPl: string, part: string, aux: "h" | "z" | "hz";
  let verbType: "zwak" | "sterk" | "onregelmatig";
  if (strong) {
    [pastSg, pastPl, part, aux] = strong;
    part = sepPrefix ? sepPrefix + part : part;
    verbType = ["zijn", "hebben", "worden", "kunnen", "zullen", "willen", "moeten", "mogen"].includes(base)
      ? "onregelmatig"
      : "sterk";
  } else {
    const d = isKofschip(decisionChar) ? "t" : "d";
    pastSg = stem + d + "e";
    pastPl = stem + d + "en";
    part = inseparable ? stem + d : "ge" + stem + d;
    if (sepPrefix) part = sepPrefix + "ge" + stem + d;
    aux = "h";
    verbType = "zwak";
    if (!inf.endsWith("en")) {
      notes.push({
        tr: "Bu fiil tabloda yok; zayıf (düzenli) varsayıldı.",
        en: "Verb not in the table; assumed weak (regular).",
      });
    }
  }

  const auxV = aux === "z" ? "is" : "heeft";
  const auxNote =
    aux === "hz"
      ? {
          tr: "Bu fiil yön/hedef varsa zijn, yoksa hebben alır (is/heeft).",
          en: "Takes zijn with direction/destination, otherwise hebben.",
        }
      : null;
  if (auxNote) notes.push(auxNote);
  if (verbType !== "zwak") {
    notes.push({
      tr: "Kuvvetli/düzensiz fiil: geçmiş gövdesi ünlü değişimiyle kurulur, tablodan gelir.",
      en: "Strong/irregular verb: past stem comes from the ablaut table.",
    });
  }

  // Present forms (separable verbs split in main clauses).
  const pres = PRESENT[base];
  const presIk = pres?.[0] ?? stem;
  const presJij = pres?.[1] ?? (stem.endsWith("t") ? stem : stem + "t");
  const presHij = pres?.[2] ?? presJij;
  const impStem = base === "zijn" ? "wees" : presIk;
  const sepTail = sepPrefix ? " " + sepPrefix : "";
  const show = (core: string) => (sepPrefix ? `${core}${sepTail}` : core);

  const groups: NlGroup[] = [
    {
      id: "present",
      labelTr: "Şimdiki / geniş zaman (presens)",
      labelEn: "Present (presens)",
      forms: [
        { id: "inf", labelTr: "Mastar", labelEn: "Infinitive", pattern: "-en", value: inf,
          exNl: `Ik ga morgen ${inf}.`, exTr: "Yarın 〜eceğim (gaan + mastar).", exEn: "I'm going to 〜 tomorrow." },
        { id: "ik", labelTr: "ik (1. tekil)", labelEn: "ik (1sg)", pattern: "kök", value: show(presIk),
          exNl: `Ik ${show(presIk)} elke dag.`, exTr: "Her gün 〜rım.", exEn: "I 〜 every day." },
        { id: "jij", labelTr: "jij/u (2. tekil)", labelEn: "jij/u (2sg)", pattern: "kök + t", value: show(presJij),
          exNl: `Jij ${show(presJij)} goed.`, exTr: "Sen iyi 〜rsın.", exEn: "You 〜 well." },
        { id: "hij", labelTr: "hij/zij (3. tekil)", labelEn: "hij/zij (3sg)", pattern: "kök + t", value: show(presHij),
          exNl: `Hij ${show(presHij)} vaak.`, exTr: "O sık sık 〜r.", exEn: "He often 〜s." },
        { id: "wij", labelTr: "wij/jullie/zij (çoğul)", labelEn: "plural", pattern: "mastar", value: show(inf),
          exNl: `Wij ${show(inf)} samen.`, exTr: "Birlikte 〜rız.", exEn: "We 〜 together." },
      ],
    },
    {
      id: "past",
      labelTr: "Geçmiş zaman (imperfectum)",
      labelEn: "Past (imperfectum)",
      forms: [
        { id: "past-sg", labelTr: "Tekil (ik/jij/hij)", labelEn: "Singular", pattern: verbType === "zwak" ? "kök + te/de" : "ünlü değişimi", value: show(pastSg),
          exNl: `Gisteren ${show(pastSg)} ik veel.`, exTr: "Dün çok 〜dım.", exEn: "Yesterday I 〜ed a lot." },
        { id: "past-pl", labelTr: "Çoğul (wij/jullie/zij)", labelEn: "Plural", pattern: verbType === "zwak" ? "kök + ten/den" : "ünlü değişimi + en", value: show(pastPl),
          exNl: `Vroeger ${show(pastPl)} we vaak.`, exTr: "Eskiden sık 〜rdik.", exEn: "We used to 〜 often." },
      ],
    },
    {
      id: "perfect",
      labelTr: "Bileşik geçmiş (perfectum)",
      labelEn: "Perfect (perfectum)",
      forms: [
        { id: "participle", labelTr: "Ortaç (voltooid deelwoord)", labelEn: "Past participle", pattern: inseparable ? "kök + t/d (ge- yok)" : "ge + kök + t/d", value: part,
          exNl: `Ik heb/ben net ${part}.`, exTr: "Az önce 〜dım.", exEn: "I have just 〜ed." },
        { id: "perfect", labelTr: "Perfectum (3. tekil)", labelEn: "Perfect (3sg)", pattern: `${auxV} + ortaç`, value: `${auxV} ${part}`,
          exNl: `Hij ${auxV} al ${part}.`, exTr: "O çoktan 〜dı.", exEn: "He has already 〜ed." },
        { id: "pluperfect", labelTr: "Plusquamperfectum", labelEn: "Pluperfect", pattern: "had/was + ortaç", value: `${aux === "z" ? "was" : "had"} ${part}`,
          exNl: `Zij ${aux === "z" ? "was" : "had"} al ${part}.`, exTr: "O çoktan 〜mıştı.", exEn: "She had already 〜ed." },
      ],
    },
    {
      id: "future-modal",
      labelTr: "Gelecek & kip",
      labelEn: "Future & modal",
      forms: [
        { id: "future", labelTr: "Gelecek (zullen)", labelEn: "Future (zullen)", pattern: "zal/zullen + mastar", value: `zal ${inf}`,
          exNl: `Ik zal morgen ${inf}.`, exTr: "Yarın 〜eceğim.", exEn: "I will 〜 tomorrow." },
        { id: "future-gaan", labelTr: "Yakın gelecek (gaan)", labelEn: "Near future (gaan)", pattern: "ga/gaat + mastar", value: `gaat ${inf}`,
          exNl: `Hij gaat straks ${inf}.`, exTr: "Birazdan 〜ecek.", exEn: "He is going to 〜 soon." },
        { id: "conditional", labelTr: "Koşul kipi (zou)", labelEn: "Conditional (zou)", pattern: "zou/zouden + mastar", value: `zou ${inf}`,
          exNl: `Ik zou graag ${inf}.`, exTr: "Memnuniyetle 〜rdım.", exEn: "I would like to 〜." },
        { id: "imperative", labelTr: "Emir", labelEn: "Imperative", pattern: "kök", value: sepPrefix ? `${impStem} ${sepPrefix}!` : `${impStem}!`,
          exNl: sepPrefix ? `${impStem[0].toUpperCase()}${impStem.slice(1)} nu ${sepPrefix}!` : `${impStem[0].toUpperCase()}${impStem.slice(1)} nu!`, exTr: "Hemen 〜!", exEn: "〜 now!" },
        { id: "present-participle", labelTr: "Şimdiki ortaç", labelEn: "Present participle", pattern: "mastar + d", value: inf + "d",
          exNl: `${inf[0].toUpperCase()}${inf.slice(1)}d kwam hij binnen.`, exTr: "〜erek içeri girdi.", exEn: "He came in 〜ing." },
      ],
    },
  ];

  if (sepPrefix) {
    notes.push({
      tr: `Ayrılabilir fiil: ana cümlede önek sona gider (ik ${presIk} … ${sepPrefix}), ortaçta -ge- araya girer (${part}).`,
      en: `Separable verb: the prefix moves to the end in main clauses; -ge- goes inside the participle (${part}).`,
    });
  }

  return { ok: true, groups, notes, verbType };
}

export const NL_PRESETS: { infinitive: string; hintTr: string; hintEn: string }[] = [
  { infinitive: "werken", hintTr: "zayıf, 't kofschip → -te", hintEn: "weak, kofschip → -te" },
  { infinitive: "wonen", hintTr: "zayıf → -de", hintEn: "weak → -de" },
  { infinitive: "maken", hintTr: "uzun ünlü kökü (maak)", hintEn: "long-vowel stem" },
  { infinitive: "stoppen", hintTr: "çift ünsüz teklenir", hintEn: "double consonant simplifies" },
  { infinitive: "leven", hintTr: "v→f (leef)", hintEn: "v→f (leef)" },
  { infinitive: "reizen", hintTr: "z→s (reis)", hintEn: "z→s (reis)" },
  { infinitive: "lopen", hintTr: "kuvvetli (liep)", hintEn: "strong (liep)" },
  { infinitive: "eten", hintTr: "kuvvetli (at/gegeten)", hintEn: "strong (at/gegeten)" },
  { infinitive: "zijn", hintTr: "düzensiz", hintEn: "irregular" },
  { infinitive: "hebben", hintTr: "düzensiz", hintEn: "irregular" },
  { infinitive: "gaan", hintTr: "düzensiz (zijn ile)", hintEn: "irregular (with zijn)" },
  { infinitive: "opstaan", hintTr: "ayrılabilir", hintEn: "separable" },
  { infinitive: "vergeten", hintTr: "ge- almaz", hintEn: "no ge-" },
];
