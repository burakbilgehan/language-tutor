// Deterministic Dutch grammar index (A1 → B1 skeleton).
import type { GrammarIndexEntry } from "./ja";

export const NL_GRAMMAR_INDEX: (Omit<GrammarIndexEntry, "level"> & {
  level: "A1" | "A2" | "B1"; // CEFR
})[] = [
  { slug: "pronunciation-spelling", title_tr: "Telaffuz ve Yazım (ij, ui, g sesi)", category: "writing", level: "A1" },
  { slug: "de-het-articles", title_tr: "de / het Tanımlıkları", category: "nouns", level: "A1" },
  { slug: "plural-forms", title_tr: "Çoğul Yapımı (-en / -s)", category: "nouns", level: "A1" },
  { slug: "personal-pronouns", title_tr: "Kişi Zamirleri", category: "nouns", level: "A1" },
  { slug: "present-tense", title_tr: "Şimdiki/Geniş Zaman Çekimi", category: "verbs", level: "A1" },
  { slug: "zijn-hebben", title_tr: "zijn ve hebben Fiilleri", category: "verbs", level: "A1" },
  { slug: "word-order-v2", title_tr: "Kelime Dizilişi: V2 Kuralı", category: "syntax", level: "A1" },
  { slug: "negation-niet-geen", title_tr: "Olumsuzluk: niet / geen", category: "syntax", level: "A1" },
  { slug: "question-formation", title_tr: "Soru Cümleleri", category: "syntax", level: "A1" },
  { slug: "numbers-time", title_tr: "Sayılar ve Saat", category: "numbers", level: "A1" },
  { slug: "adjective-inflection", title_tr: "Sıfat Çekimi (-e takısı)", category: "adjectives", level: "A1" },
  { slug: "modal-verbs", title_tr: "Kip Fiilleri (kunnen, moeten, willen...)", category: "verbs", level: "A1" },
  { slug: "separable-verbs", title_tr: "Ayrılabilir Fiiller", category: "verbs", level: "A2" },
  { slug: "perfect-tense", title_tr: "Geçmiş Zaman: Perfectum", category: "verbs", level: "A2" },
  { slug: "imperfect-tense", title_tr: "Geçmiş Zaman: Imperfectum", category: "verbs", level: "A2" },
  { slug: "subordinate-clauses", title_tr: "Yan Cümleler ve Fiil Sona Atma", category: "syntax", level: "A2" },
  { slug: "er-usage", title_tr: "er Kullanımları", category: "syntax", level: "A2" },
  { slug: "comparatives", title_tr: "Karşılaştırma ve Üstünlük", category: "adjectives", level: "A2" },
  { slug: "future-tense", title_tr: "Gelecek Zaman (gaan / zullen)", category: "verbs", level: "A2" },
  { slug: "diminutives", title_tr: "Küçültme Ekleri (-je)", category: "nouns", level: "A2" },
  { slug: "reflexive-verbs", title_tr: "Dönüşlü Fiiller", category: "verbs", level: "B1" },
  { slug: "passive-voice", title_tr: "Edilgen Çatı (worden)", category: "verbs", level: "B1" },
  { slug: "conditional", title_tr: "Koşul Cümleleri (als, zou)", category: "syntax", level: "B1" },
  { slug: "relative-clauses", title_tr: "İlgi Cümlecikleri (die/dat/waar)", category: "syntax", level: "B1" },
];
