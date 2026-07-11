// Deterministic, comprehensive Japanese grammar index (N5 → N3).
// This is the cheatsheet skeleton: seeded once per profile, content per
// topic is LLM-generated on demand and cached.

export interface GrammarIndexEntry {
  slug: string;
  title_tr: string;
  category: string;
  level: "N5" | "N4" | "N3";
}

export const JA_GRAMMAR_INDEX: GrammarIndexEntry[] = [
  // --- Yazı sistemi ---
  { slug: "hiragana-chart", title_tr: "Hiragana Tablosu (gojūon)", category: "writing", level: "N5" },
  { slug: "katakana-chart", title_tr: "Katakana Tablosu", category: "writing", level: "N5" },
  { slug: "dakuten-handakuten", title_tr: "Dakuten ve Handakuten (゛゜)", category: "writing", level: "N5" },
  { slug: "small-kana-combos", title_tr: "Küçük Kana Birleşimleri (きゃ, しゅ...)", category: "writing", level: "N5" },
  { slug: "long-vowels-sokuon", title_tr: "Uzun Ünlüler ve Küçük っ", category: "writing", level: "N5" },
  { slug: "kanji-basics", title_tr: "Kanji Temelleri: On/Kun Okunuşları", category: "writing", level: "N5" },
  { slug: "kanji-radicals", title_tr: "Kanji Radikalleri", category: "writing", level: "N4" },

  // --- Edatlar (particles) ---
  { slug: "wa-topic-particle", title_tr: "は Konu Edatı", category: "particles", level: "N5" },
  { slug: "ga-subject-particle", title_tr: "が Özne Edatı (は ile farkı)", category: "particles", level: "N5" },
  { slug: "o-object-particle", title_tr: "を Nesne Edatı", category: "particles", level: "N5" },
  { slug: "ni-particle", title_tr: "に Edatı (yön, zaman, hedef)", category: "particles", level: "N5" },
  { slug: "de-particle", title_tr: "で Edatı (yer, araç)", category: "particles", level: "N5" },
  { slug: "e-direction-particle", title_tr: "へ Yön Edatı", category: "particles", level: "N5" },
  { slug: "no-possessive", title_tr: "の İyelik ve Bağlama Edatı", category: "particles", level: "N5" },
  { slug: "to-particle", title_tr: "と Edatı (ve, ile, alıntı)", category: "particles", level: "N5" },
  { slug: "mo-also-particle", title_tr: "も (de/da) Edatı", category: "particles", level: "N5" },
  { slug: "ka-question", title_tr: "か Soru Edatı", category: "particles", level: "N5" },
  { slug: "kara-made", title_tr: "から / まで (…den …e kadar)", category: "particles", level: "N5" },
  { slug: "yori-comparison", title_tr: "より Karşılaştırma", category: "particles", level: "N4" },
  { slug: "ya-toka-listing", title_tr: "や / とか Örnekleyerek Sayma", category: "particles", level: "N4" },
  { slug: "dake-shika-bakari", title_tr: "だけ / しか / ばかり (sadece)", category: "particles", level: "N4" },
  { slug: "sentence-ending-particles", title_tr: "Cümle Sonu Edatları (ね, よ, な)", category: "particles", level: "N5" },

  // --- İsimler ve zamirler ---
  { slug: "personal-pronouns", title_tr: "Kişi Zamirleri (わたし, あなた...)", category: "nouns", level: "N5" },
  { slug: "kosoado", title_tr: "こそあど Sistemi (これ/それ/あれ/どれ)", category: "nouns", level: "N5" },
  { slug: "counters", title_tr: "Sayaçlar (〜つ, 〜人, 〜本, 〜枚...)", category: "numbers", level: "N5" },
  { slug: "numbers-dates-time", title_tr: "Sayılar, Tarih ve Saat", category: "numbers", level: "N5" },
  { slug: "family-terms", title_tr: "Aile Terimleri (kendi/başkasının ailesi)", category: "nouns", level: "N5" },

  // --- Koşaç ve temel cümle ---
  { slug: "desu-copula", title_tr: "です Koşacı (olumlu/olumsuz/geçmiş)", category: "syntax", level: "N5" },
  { slug: "basic-word-order", title_tr: "Temel Cümle Dizilişi (SOV)", category: "syntax", level: "N5" },
  { slug: "arimasu-imasu", title_tr: "あります / います (var olmak)", category: "verbs", level: "N5" },

  // --- Fiiller ---
  { slug: "verb-groups", title_tr: "Fiil Grupları (godan, ichidan, düzensiz)", category: "verbs", level: "N5" },
  { slug: "masu-form", title_tr: "ます Formu (kibar şimdiki/geniş zaman)", category: "verbs", level: "N5" },
  { slug: "past-tense", title_tr: "Geçmiş Zaman (〜ました / 〜た)", category: "verbs", level: "N5" },
  { slug: "negative-form", title_tr: "Olumsuz Form (〜ません / 〜ない)", category: "verbs", level: "N5" },
  { slug: "te-form", title_tr: "て Formu ve Kullanımları", category: "verbs", level: "N5" },
  { slug: "te-iru", title_tr: "〜ている (şimdiki zaman, süreklilik)", category: "verbs", level: "N5" },
  { slug: "te-kudasai", title_tr: "〜てください (rica)", category: "verbs", level: "N5" },
  { slug: "dictionary-form", title_tr: "Sözlük Formu ve Günlük Konuşma", category: "verbs", level: "N5" },
  { slug: "nai-form", title_tr: "ない Formu ve Türevleri", category: "verbs", level: "N5" },
  { slug: "tai-form", title_tr: "〜たい (istemek)", category: "verbs", level: "N5" },
  { slug: "potential-form", title_tr: "Yeterlilik Formu (〜られる/〜える)", category: "verbs", level: "N4" },
  { slug: "volitional-form", title_tr: "İstek/Öneri Formu (〜よう/〜ましょう)", category: "verbs", level: "N4" },
  { slug: "passive-form", title_tr: "Edilgen Çatı (〜られる)", category: "verbs", level: "N4" },
  { slug: "causative-form", title_tr: "Ettirgen Çatı (〜させる)", category: "verbs", level: "N4" },
  { slug: "conditional-forms", title_tr: "Koşul Formları (〜たら/〜ば/〜と/なら)", category: "verbs", level: "N4" },
  { slug: "giving-receiving", title_tr: "あげる / くれる / もらう (verme-alma)", category: "verbs", level: "N4" },
  { slug: "transitive-intransitive", title_tr: "Geçişli / Geçişsiz Fiil Çiftleri", category: "verbs", level: "N4" },

  // --- Sıfatlar ---
  { slug: "i-adjectives", title_tr: "い-Sıfatları ve Çekimi", category: "adjectives", level: "N5" },
  { slug: "na-adjectives", title_tr: "な-Sıfatları ve Çekimi", category: "adjectives", level: "N5" },
  { slug: "adjective-adverbs", title_tr: "Sıfattan Zarf Yapma (〜く / 〜に)", category: "adjectives", level: "N5" },
  { slug: "comparatives-superlatives", title_tr: "Karşılaştırma ve Üstünlük", category: "adjectives", level: "N4" },

  // --- Cümle yapıları ---
  { slug: "relative-clauses", title_tr: "Sıfat Cümlecikleri (isim nitelemek)", category: "syntax", level: "N4" },
  { slug: "kara-node-reason", title_tr: "から / ので (çünkü)", category: "syntax", level: "N5" },
  { slug: "ga-kedo-contrast", title_tr: "が / けど (ama)", category: "syntax", level: "N5" },
  { slug: "toki-when", title_tr: "とき (…-dığında)", category: "syntax", level: "N4" },
  { slug: "mae-ato-nagara", title_tr: "まえに / あとで / ながら (zaman bağlaçları)", category: "syntax", level: "N4" },
  { slug: "to-omoimasu", title_tr: "と思います (bence, sanırım)", category: "syntax", level: "N4" },
  { slug: "quotation-to-iu", title_tr: "という / と言う (alıntı)", category: "syntax", level: "N4" },
  { slug: "koto-nominalizer", title_tr: "こと / の ile Fiil İsimleştirme", category: "syntax", level: "N4" },
  { slug: "tsumori-yotei", title_tr: "つもり / 予定 (niyet ve plan)", category: "syntax", level: "N4" },
  { slug: "deshou-kamoshirenai", title_tr: "でしょう / かもしれない (olasılık)", category: "syntax", level: "N4" },
  { slug: "sou-you-rashii", title_tr: "そう / よう / らしい (görünüş, söylenti)", category: "syntax", level: "N3" },
  { slug: "hazu-beki", title_tr: "はず / べき (beklenti, gereklilik)", category: "syntax", level: "N3" },
  { slug: "nakereba-narimasen", title_tr: "〜なければなりません (zorunluluk)", category: "syntax", level: "N4" },
  { slug: "temo-ii-dame", title_tr: "〜てもいい / 〜てはだめ (izin, yasak)", category: "syntax", level: "N5" },
  { slug: "ta-koto-ga-aru", title_tr: "〜たことがある (deneyim)", category: "syntax", level: "N4" },

  // --- Kibarlık ---
  { slug: "politeness-levels", title_tr: "Kibarlık Seviyeleri (kazüel/teineigo genel bakış)", category: "honorifics", level: "N4" },
  { slug: "keigo-sonkeigo", title_tr: "Saygı Dili: 尊敬語 (sonkeigo)", category: "honorifics", level: "N3" },
  { slug: "keigo-kenjougo", title_tr: "Alçakgönüllülük Dili: 謙譲語 (kenjōgo)", category: "honorifics", level: "N3" },
  { slug: "honorific-titles", title_tr: "Hitap Ekleri (さん, くん, ちゃん, 様)", category: "honorifics", level: "N5" },

  // --- Günlük ifadeler ---
  { slug: "greetings-expressions", title_tr: "Selamlaşma ve Kalıp İfadeler", category: "expressions", level: "N5" },
  { slug: "onomatopoeia", title_tr: "Yansıma Sözcükler (オノマトペ)", category: "expressions", level: "N3" },
  { slug: "casual-speech", title_tr: "Günlük/Anime Konuşma Dili Kalıpları", category: "expressions", level: "N3" },
];
