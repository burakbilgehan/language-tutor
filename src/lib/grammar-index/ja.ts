// Deterministic, comprehensive Japanese grammar index (N5 → N1).
// This is the cheatsheet skeleton: seeded once per profile, content per
// topic is LLM-generated on demand and cached.
//
// Ordering is LEVEL-MAJOR (N5 → N1), category blocks within each level.
// Array order == display order (position = array index).
// Goal: reading this index + a dictionary should be enough for "infinite
// Japanese" — every JLPT grammar pattern plus consolidated conjugation tables.

// `level` is a string drawn from the language's own scheme (JLPT here,
// HSK in zh.ts, CEFR in nl.ts) — see src/lib/curriculum/levels.ts.
export interface GrammarIndexEntry {
  slug: string;
  title_tr: string;
  category: string;
  level: string;
}

export const JA_GRAMMAR_INDEX: (Omit<GrammarIndexEntry, "level"> & {
  level: "N5" | "N4" | "N3" | "N2" | "N1";
})[] = [
  // ===================================================================
  // N5
  // ===================================================================

  // --- Yazı sistemi ---
  { slug: "hiragana-chart", title_tr: "Hiragana Tablosu (gojūon)", category: "writing", level: "N5" },
  { slug: "katakana-chart", title_tr: "Katakana Tablosu", category: "writing", level: "N5" },
  { slug: "dakuten-handakuten", title_tr: "Dakuten ve Handakuten (゛゜)", category: "writing", level: "N5" },
  { slug: "small-kana-combos", title_tr: "Küçük Kana Birleşimleri (きゃ, しゅ...)", category: "writing", level: "N5" },
  { slug: "long-vowels-sokuon", title_tr: "Uzun Ünlüler ve Küçük っ", category: "writing", level: "N5" },
  { slug: "kanji-basics", title_tr: "Kanji Temelleri: On/Kun Okunuşları", category: "writing", level: "N5" },

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
  { slug: "sentence-ending-particles", title_tr: "Cümle Sonu Edatları (ね, よ, な)", category: "particles", level: "N5" },

  // --- İsimler ve zamirler ---
  { slug: "personal-pronouns", title_tr: "Kişi Zamirleri (わたし, あなた...)", category: "nouns", level: "N5" },
  { slug: "kosoado", title_tr: "こそあど Sistemi (これ/それ/あれ/どれ)", category: "nouns", level: "N5" },
  { slug: "family-terms", title_tr: "Aile Terimleri (kendi/başkasının ailesi)", category: "nouns", level: "N5" },
  { slug: "counters", title_tr: "Sayaçlar (〜つ, 〜人, 〜本, 〜枚...)", category: "numbers", level: "N5" },
  { slug: "numbers-dates-time", title_tr: "Sayılar, Tarih ve Saat", category: "numbers", level: "N5" },

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

  // --- Sıfatlar ---
  { slug: "i-adjectives", title_tr: "い-Sıfatları ve Çekimi", category: "adjectives", level: "N5" },
  { slug: "na-adjectives", title_tr: "な-Sıfatları ve Çekimi", category: "adjectives", level: "N5" },
  { slug: "adjective-adverbs", title_tr: "Sıfattan Zarf Yapma (〜く / 〜に)", category: "adjectives", level: "N5" },

  // --- Cümle yapıları (N5) ---
  { slug: "kara-node-reason", title_tr: "から / ので (çünkü)", category: "syntax", level: "N5" },
  { slug: "ga-kedo-contrast", title_tr: "が / けど (ama)", category: "syntax", level: "N5" },
  { slug: "temo-ii-dame", title_tr: "〜てもいい / 〜てはだめ (izin, yasak)", category: "syntax", level: "N5" },

  // --- Kibarlık / ifadeler (N5) ---
  { slug: "honorific-titles", title_tr: "Hitap Ekleri (さん, くん, ちゃん, 様)", category: "honorifics", level: "N5" },
  { slug: "greetings-expressions", title_tr: "Selamlaşma ve Kalıp İfadeler", category: "expressions", level: "N5" },

  // ===================================================================
  // N4
  // ===================================================================

  // --- Yazı sistemi ---
  { slug: "kanji-radicals", title_tr: "Kanji Radikalleri", category: "writing", level: "N4" },

  // --- Edatlar ---
  { slug: "yori-comparison", title_tr: "より Karşılaştırma", category: "particles", level: "N4" },
  { slug: "ya-toka-listing", title_tr: "や / とか Örnekleyerek Sayma", category: "particles", level: "N4" },
  { slug: "dake-shika-bakari", title_tr: "だけ / しか / ばかり (sadece)", category: "particles", level: "N4" },

  // --- Fiiller ---
  { slug: "potential-form", title_tr: "Yeterlilik Formu (〜られる/〜える)", category: "verbs", level: "N4" },
  { slug: "volitional-form", title_tr: "İstek/Öneri Formu (〜よう/〜ましょう)", category: "verbs", level: "N4" },
  { slug: "passive-form", title_tr: "Edilgen Çatı (〜られる)", category: "verbs", level: "N4" },
  { slug: "causative-form", title_tr: "Ettirgen Çatı (〜させる)", category: "verbs", level: "N4" },
  { slug: "conditional-forms", title_tr: "Koşul Formları (〜たら/〜ば/〜と/なら)", category: "verbs", level: "N4" },
  { slug: "giving-receiving", title_tr: "あげる / くれる / もらう (verme-alma)", category: "verbs", level: "N4" },
  { slug: "transitive-intransitive", title_tr: "Geçişli / Geçişsiz Fiil Çiftleri", category: "verbs", level: "N4" },

  // --- Sıfatlar ---
  { slug: "comparatives-superlatives", title_tr: "Karşılaştırma ve Üstünlük", category: "adjectives", level: "N4" },

  // --- Cümle yapıları ---
  { slug: "relative-clauses", title_tr: "Sıfat Cümlecikleri (isim nitelemek)", category: "syntax", level: "N4" },
  { slug: "toki-when", title_tr: "とき (…-dığında)", category: "syntax", level: "N4" },
  { slug: "mae-ato-nagara", title_tr: "まえに / あとで / ながら (zaman bağlaçları)", category: "syntax", level: "N4" },
  { slug: "to-omoimasu", title_tr: "と思います (bence, sanırım)", category: "syntax", level: "N4" },
  { slug: "quotation-to-iu", title_tr: "という / と言う (alıntı)", category: "syntax", level: "N4" },
  { slug: "koto-nominalizer", title_tr: "こと / の ile Fiil İsimleştirme", category: "syntax", level: "N4" },
  { slug: "tsumori-yotei", title_tr: "つもり / 予定 (niyet ve plan)", category: "syntax", level: "N4" },
  { slug: "deshou-kamoshirenai", title_tr: "でしょう / かもしれない (olasılık)", category: "syntax", level: "N4" },
  { slug: "nakereba-narimasen", title_tr: "〜なければなりません (zorunluluk)", category: "syntax", level: "N4" },
  { slug: "ta-koto-ga-aru", title_tr: "〜たことがある (deneyim)", category: "syntax", level: "N4" },

  // --- Kibarlık ---
  { slug: "politeness-levels", title_tr: "Kibarlık Seviyeleri (kazüel/teineigo genel bakış)", category: "honorifics", level: "N4" },

  // ===================================================================
  // N3
  // ===================================================================

  // --- Edatlar ---
  { slug: "nara-baai", title_tr: "なら / 場合 (durum, -sa)", category: "particles", level: "N3" },
  { slug: "ni-tsuite-kanshite", title_tr: "について / に関して (…hakkında)", category: "particles", level: "N3" },
  { slug: "ni-taishite", title_tr: "に対して (…-e karşı/yönelik)", category: "particles", level: "N3" },
  { slug: "to-shite-role", title_tr: "として (…olarak, sıfatıyla)", category: "particles", level: "N3" },
  { slug: "ni-yotte-yoru", title_tr: "によって / による (…-e göre, tarafından)", category: "particles", level: "N3" },
  { slug: "toori-ni", title_tr: "とおりに / どおり (…-diği gibi)", category: "particles", level: "N3" },
  { slug: "hodo-kurai", title_tr: "ほど / くらい (derece, yaklaşık)", category: "particles", level: "N3" },
  { slug: "sae-demo", title_tr: "さえ / でも (bile)", category: "particles", level: "N3" },
  { slug: "koso", title_tr: "こそ (tam da, işte)", category: "particles", level: "N3" },
  { slug: "nante-nanka", title_tr: "なんて / なんか (gibi şeyler, küçümseme)", category: "particles", level: "N3" },

  // --- Fiiller ---
  { slug: "causative-passive", title_tr: "Ettirgen-Edilgen (〜させられる)", category: "verbs", level: "N3" },
  { slug: "te-oku", title_tr: "〜ておく (önceden hazırlık)", category: "verbs", level: "N3" },
  { slug: "te-shimau-chau", title_tr: "〜てしまう / 〜ちゃう (tamamlanma, pişmanlık)", category: "verbs", level: "N3" },
  { slug: "te-miru", title_tr: "〜てみる (deneyerek yapmak)", category: "verbs", level: "N3" },
  { slug: "te-iku-kuru", title_tr: "〜ていく / 〜てくる (zaman/mekân yönü)", category: "verbs", level: "N3" },
  { slug: "te-ageru-kureru-morau", title_tr: "〜てあげる/くれる/もらう (iyilik fiilleri)", category: "verbs", level: "N3" },
  { slug: "masu-stem-uses", title_tr: "ます-kökü kullanımları (〜ながら, 〜やすい, 〜すぎる)", category: "verbs", level: "N3" },
  { slug: "yasui-nikui", title_tr: "〜やすい / 〜にくい (kolay/zor)", category: "verbs", level: "N3" },
  { slug: "sugiru", title_tr: "〜すぎる (aşırılık)", category: "verbs", level: "N3" },
  { slug: "hajimeru-dasu-owaru-tsuzukeru", title_tr: "〜始める/〜出す/〜終わる/〜続ける (safha fiilleri)", category: "verbs", level: "N3" },
  { slug: "you-ni-naru-suru", title_tr: "〜ようになる / 〜ようにする (değişim, çaba)", category: "verbs", level: "N3" },
  { slug: "koto-ni-naru-suru", title_tr: "〜ことになる / 〜ことにする (karar, sonuç)", category: "verbs", level: "N3" },
  { slug: "tokoro", title_tr: "〜ところ (tam …-ecekken/-di)", category: "verbs", level: "N3" },
  { slug: "bakari-verb", title_tr: "〜たばかり / 〜てばかり (yeni …-di, hep …-yor)", category: "verbs", level: "N3" },

  // --- Cümle yapıları ---
  { slug: "noni-contrast", title_tr: "〜のに (…-diği halde)", category: "syntax", level: "N3" },
  { slug: "kke", title_tr: "〜っけ (hatırlama sorusu)", category: "syntax", level: "N3" },
  { slug: "mitai-da", title_tr: "〜みたい (benziyor, gibi)", category: "syntax", level: "N3" },
  { slug: "garu", title_tr: "〜がる (üçüncü şahıs duyguları)", category: "syntax", level: "N3" },
  { slug: "tara-dou", title_tr: "〜たらどう / 〜ばいい (öneri, ne yapmalı)", category: "syntax", level: "N3" },
  { slug: "hou-ga-ii", title_tr: "〜ほうがいい (…-sen iyi olur)", category: "syntax", level: "N3" },
  { slug: "setsuzoku-conjunctions", title_tr: "Bağlaçlar: それで/そこで/すると/ところが", category: "syntax", level: "N3" },
  { slug: "to-iu-wake", title_tr: "〜というわけ (yani, demek ki)", category: "syntax", level: "N3" },
  { slug: "to-iu-koto", title_tr: "〜ということ (…olması, dolaylı anlatım)", category: "syntax", level: "N3" },
  { slug: "sou-you-rashii", title_tr: "そう / よう / らしい (görünüş, söylenti)", category: "syntax", level: "N3" },
  { slug: "hazu-beki", title_tr: "はず / べき (beklenti, gereklilik)", category: "syntax", level: "N3" },

  // --- Kibarlık ---
  { slug: "keigo-sonkeigo", title_tr: "Saygı Dili: 尊敬語 (sonkeigo)", category: "honorifics", level: "N3" },
  { slug: "keigo-kenjougo", title_tr: "Alçakgönüllülük Dili: 謙譲語 (kenjōgo)", category: "honorifics", level: "N3" },
  { slug: "keigo-teichougo", title_tr: "丁重語 (teichōgo, resmî alçakgönüllülük)", category: "honorifics", level: "N3" },
  { slug: "o-verb-ni-naru", title_tr: "お〜になる / お〜する kalıpları", category: "honorifics", level: "N3" },
  { slug: "keigo-special-verbs", title_tr: "Keigo özel fiilleri (いらっしゃる/なさる/おっしゃる...)", category: "honorifics", level: "N3" },

  // --- İfadeler / yazı ---
  { slug: "onomatopoeia", title_tr: "Yansıma Sözcükler (オノマトペ)", category: "expressions", level: "N3" },
  { slug: "casual-speech", title_tr: "Günlük/Anime Konuşma Dili Kalıpları", category: "expressions", level: "N3" },
  { slug: "aizuchi", title_tr: "Aizuchi (dinleyici tepkileri: ええ/うん/そうですね)", category: "expressions", level: "N3" },
  { slug: "kanji-compounds", title_tr: "Kanji Bileşikleri (熟語) ve okuma kalıpları", category: "writing", level: "N3" },

  // ===================================================================
  // N2
  // ===================================================================

  // --- Edatlar / bağlaçlar (büyük kalıp listesi) ---
  { slug: "wake-da", title_tr: "〜わけだ (demek ki, doğal olarak)", category: "particles", level: "N2" },
  { slug: "wake-dewanai", title_tr: "〜わけではない / 〜わけがない (öyle değil/olamaz)", category: "particles", level: "N2" },
  { slug: "mono-da", title_tr: "〜ものだ (genel doğru, nostalji, gereklilik)", category: "particles", level: "N2" },
  { slug: "mono-no", title_tr: "〜ものの (…-mesine rağmen)", category: "particles", level: "N2" },
  { slug: "mono-nara", title_tr: "〜ものなら (…-ebilirsen)", category: "particles", level: "N2" },
  { slug: "mono-dakara", title_tr: "〜ものだから / 〜もので (çünkü, mazeret)", category: "particles", level: "N2" },
  { slug: "koto-da", title_tr: "〜ことだ (tavsiye, ünlem)", category: "particles", level: "N2" },
  { slug: "koto-ka", title_tr: "〜ことか (ne kadar da…!)", category: "particles", level: "N2" },
  { slug: "koto-nashi-ni", title_tr: "〜ことなしに (…-meksizin)", category: "particles", level: "N2" },
  { slug: "dokoro-ka", title_tr: "〜どころか (…şöyle dursun)", category: "particles", level: "N2" },
  { slug: "dokoro-dewanai", title_tr: "〜どころではない (…-ecek durumda değil)", category: "particles", level: "N2" },
  { slug: "bakari-ka", title_tr: "〜ばかりか / 〜ばかりでなく (sadece değil)", category: "particles", level: "N2" },
  { slug: "bakari-ni", title_tr: "〜ばかりに (sırf …yüzünden)", category: "particles", level: "N2" },
  { slug: "nagara-mo", title_tr: "〜ながらも (…-e rağmen)", category: "particles", level: "N2" },
  { slug: "tsutsu", title_tr: "〜つつ / 〜つつある (…-erken, gitgide)", category: "particles", level: "N2" },
  { slug: "tsutsumo", title_tr: "〜つつも (…-e rağmen)", category: "particles", level: "N2" },
  { slug: "kagiri", title_tr: "〜かぎり / 〜ないかぎり (…-diği sürece)", category: "particles", level: "N2" },
  { slug: "ue-de", title_tr: "〜うえで / 〜うえは (…-dikten sonra, madem)", category: "particles", level: "N2" },
  { slug: "uchi-ni", title_tr: "〜うちに / 〜ないうちに (…-ken, …-meden)", category: "particles", level: "N2" },
  { slug: "sai-ni", title_tr: "〜さいに (…sırasında, vesilesiyle)", category: "particles", level: "N2" },
  { slug: "tabi-ni", title_tr: "〜たびに (her …-dığında)", category: "particles", level: "N2" },
  { slug: "ta-tokoro-de", title_tr: "〜たところで (…-sa bile boşuna)", category: "particles", level: "N2" },
  { slug: "mono-o", title_tr: "〜ものを (…-seydi ya, sitem)", category: "particles", level: "N2" },
  { slug: "yara-yara", title_tr: "〜やら〜やら (…falan filan)", category: "particles", level: "N2" },
  { slug: "dano-dano", title_tr: "〜とか〜とか / 〜だの〜だの (sayıp dökme)", category: "particles", level: "N2" },
  { slug: "sae-ba", title_tr: "〜さえ〜ば (yeter ki …-sa)", category: "particles", level: "N2" },
  { slug: "kara-koso", title_tr: "〜からこそ / 〜ばこそ (tam da …-dığı için)", category: "particles", level: "N2" },
  { slug: "nari-nari", title_tr: "〜なり / 〜なり〜なり (…-er …-mez; ya…ya)", category: "particles", level: "N2" },
  { slug: "ka-to-omottara", title_tr: "〜かと思うと / 〜かと思ったら (…-di derken)", category: "particles", level: "N2" },
  { slug: "ta-totan", title_tr: "〜たとたん (…-diği anda)", category: "particles", level: "N2" },
  { slug: "tokoro-wo", title_tr: "〜ところを (…-ken, resmî nezaket)", category: "particles", level: "N2" },
  { slug: "koto-tote", title_tr: "〜こととて (…olduğu için, edebî mazeret)", category: "particles", level: "N2" },

  // --- Kayıt / nedensellik / kapsam kalıpları ---
  { slug: "ni-oite-okeru", title_tr: "〜において / 〜における (…-de, alanında)", category: "syntax", level: "N2" },
  { slug: "wo-hajime", title_tr: "〜をはじめ (…başta olmak üzere)", category: "syntax", level: "N2" },
  { slug: "ni-motozuite", title_tr: "〜に基づいて (…-e dayanarak)", category: "syntax", level: "N2" },
  { slug: "ni-sotte", title_tr: "〜に沿って (…-e uygun olarak)", category: "syntax", level: "N2" },
  { slug: "wo-tsujite", title_tr: "〜を通じて / 〜を通して (…aracılığıyla)", category: "syntax", level: "N2" },
  { slug: "ni-tomonatte", title_tr: "〜に伴って / 〜につれて / 〜にしたがって (…-dikçe)", category: "syntax", level: "N2" },
  { slug: "ni-kuwaete", title_tr: "〜に加えて (…-e ek olarak)", category: "syntax", level: "N2" },
  { slug: "wo-komete", title_tr: "〜を込めて (…-le, duygu katarak)", category: "syntax", level: "N2" },
  { slug: "wo-megutte", title_tr: "〜をめぐって (…etrafında/konusunda)", category: "syntax", level: "N2" },
  { slug: "ni-atatte", title_tr: "〜にあたって (…-e başlarken, vesilesiyle)", category: "syntax", level: "N2" },
  { slug: "ni-saishite", title_tr: "〜に際して (…sırasında, resmî)", category: "syntax", level: "N2" },
  { slug: "wo-towazu", title_tr: "〜を問わず / 〜にかかわらず (…-e bakmaksızın)", category: "syntax", level: "N2" },
  { slug: "nimo-kakawarazu", title_tr: "〜にもかかわらず (…-e rağmen)", category: "syntax", level: "N2" },
  { slug: "shidai", title_tr: "〜次第 / 〜次第で / 〜次第だ (…-e bağlı; …-er …-mez)", category: "syntax", level: "N2" },
  { slug: "you-ni-purpose", title_tr: "〜ように (amaç, tarz, dilek)", category: "syntax", level: "N2" },
  { slug: "you-to-suru", title_tr: "〜ようとする / 〜ようとしない (…-meye çalışmak)", category: "syntax", level: "N2" },
  { slug: "dake-ni", title_tr: "〜だけに / 〜だけあって (…olduğu için haliyle)", category: "syntax", level: "N2" },
  { slug: "wari-ni", title_tr: "〜わりに (…-e göre beklenmedik)", category: "syntax", level: "N2" },
  { slug: "hanmen", title_tr: "〜反面 (…-diği halde öbür yandan)", category: "syntax", level: "N2" },
  { slug: "ippou-de", title_tr: "〜一方(で) (bir yandan…)", category: "syntax", level: "N2" },
  { slug: "to-tomo-ni", title_tr: "〜とともに (…ile birlikte)", category: "syntax", level: "N2" },
  { slug: "to-ieba", title_tr: "〜といえば / 〜というと (…-den bahsetmişken)", category: "syntax", level: "N2" },
  { slug: "to-iu-yori", title_tr: "〜というより (…-den ziyade)", category: "syntax", level: "N2" },
  { slug: "to-shite-mo", title_tr: "〜としても (…olsa bile)", category: "syntax", level: "N2" },
  { slug: "ni-shiro-ni-shiro", title_tr: "〜にしても / 〜にしろ〜にしろ (…olsa da; ha…ha)", category: "syntax", level: "N2" },
  { slug: "wa-betsu-toshite", title_tr: "〜は別として (…-i bir yana)", category: "syntax", level: "N2" },
  { slug: "nashi-dewa", title_tr: "〜なしでは / 〜ぬきで (…olmadan)", category: "syntax", level: "N2" },
  { slug: "mono-to-shite", title_tr: "〜ものとして (…kabul edilerek/sayılarak)", category: "syntax", level: "N2" },

  // --- Fiiller / formlar ---
  { slug: "causative-keigo", title_tr: "Ettirgen kibarlık: 〜させていただく", category: "verbs", level: "N2" },
  { slug: "te-aru", title_tr: "〜てある (hazırlanmış durum, geçişli sonuç)", category: "verbs", level: "N2" },
  { slug: "uru-enai", title_tr: "〜得る / 〜得ない (…-ebilir/olası)", category: "verbs", level: "N2" },
  { slug: "gatai-zurai", title_tr: "〜がたい / 〜づらい (…-mesi güç)", category: "verbs", level: "N2" },
  { slug: "kake-kakeru", title_tr: "〜かける / 〜かけだ (yarım …-mek)", category: "verbs", level: "N2" },
  { slug: "nuku-kiru", title_tr: "〜ぬく / 〜きる (sonuna kadar …-mek)", category: "verbs", level: "N2" },
  { slug: "you-ga-nai", title_tr: "〜ようがない (…-menin yolu yok)", category: "verbs", level: "N2" },
  { slug: "mai", title_tr: "〜まい (…-meyeceğim; …-mez herhalde)", category: "verbs", level: "N2" },
  { slug: "beku", title_tr: "〜べく / 〜べからず (…mak için; yasak, edebî)", category: "verbs", level: "N2" },
  { slug: "zaru-wo-enai", title_tr: "〜ざるを得ない (…-mek zorunda kalmak)", category: "verbs", level: "N2" },
  { slug: "nai-koto-niwa", title_tr: "〜ないことには (…-medikçe olmaz)", category: "verbs", level: "N2" },
  { slug: "zuni-wa-irarenai", title_tr: "〜ずにはいられない (…-meden edememek)", category: "verbs", level: "N2" },
  { slug: "zu-ni", title_tr: "〜ずに / 〜ないで (…-meden)", category: "verbs", level: "N2" },
  { slug: "kanenai-kaneru", title_tr: "〜かねない / 〜かねる (…-ebilir kötü; …-emez)", category: "verbs", level: "N2" },

  // --- Sıfat/isim türevleri ---
  { slug: "gachi", title_tr: "〜がち (sık sık, eğilim)", category: "adjectives", level: "N2" },
  { slug: "gimi", title_tr: "〜気味 (…-imsi, hafif)", category: "adjectives", level: "N2" },
  { slug: "ppoi", title_tr: "〜っぽい (…-imsi, …-e benzer)", category: "adjectives", level: "N2" },
  { slug: "darake", title_tr: "〜だらけ (…dolu, batmış)", category: "adjectives", level: "N2" },
  { slug: "mamire", title_tr: "〜まみれ (…-e bulanmış)", category: "adjectives", level: "N2" },

  // --- Kibarlık ---
  { slug: "keigo-full-system", title_tr: "Keigo Genel Sistemi: 3 eksen (尊敬/謙譲/丁寧)", category: "honorifics", level: "N2" },
  { slug: "keigo-business", title_tr: "İş Japoncası kalıpları (敬語 pratik)", category: "honorifics", level: "N2" },
  { slug: "keigo-humble-special", title_tr: "Kenjōgo özel fiilleri (伺う/申す/いたす...)", category: "honorifics", level: "N2" },

  // --- İfadeler ---
  { slug: "set-phrases-formal", title_tr: "Resmî kalıp ifadeler (よろしく/恐れ入りますが...)", category: "expressions", level: "N2" },
  { slug: "proverbs-yoji", title_tr: "四字熟語 ve atasözleri (giriş)", category: "expressions", level: "N2" },

  // ===================================================================
  // N1
  // ===================================================================

  // --- İleri / edebî kalıplar ---
  { slug: "ni-hokanaranai", title_tr: "〜にほかならない (…-den başkası değil)", category: "syntax", level: "N1" },
  { slug: "ni-suginai", title_tr: "〜にすぎない (…-den ibaret)", category: "syntax", level: "N1" },
  { slug: "ni-katakunai", title_tr: "〜に難くない (…-mesi güç değil)", category: "syntax", level: "N1" },
  { slug: "wo-yoginakusareru", title_tr: "〜を余儀なくされる (…-mek zorunda bırakılmak)", category: "syntax", level: "N1" },
  { slug: "wo-kinjienai", title_tr: "〜を禁じ得ない (…-mekten alıkoyamamak)", category: "syntax", level: "N1" },
  { slug: "to-aimatte", title_tr: "〜と相まって (…ile birleşince)", category: "syntax", level: "N1" },
  { slug: "yue-ni", title_tr: "〜ゆえに / 〜がゆえに (…-den dolayı, edebî)", category: "syntax", level: "N1" },
  { slug: "nagara-ni", title_tr: "〜ながらに (…halinde, doğuştan)", category: "syntax", level: "N1" },
  { slug: "koto-naku", title_tr: "〜ことなく (…-meksizin)", category: "syntax", level: "N1" },
  { slug: "to-wa-ie", title_tr: "〜とはいえ (…olsa da)", category: "syntax", level: "N1" },
  { slug: "to-itte-mo-kagon-dewanai", title_tr: "〜といっても過言ではない (…demek abartı olmaz)", category: "syntax", level: "N1" },
  { slug: "made-mo-nai", title_tr: "〜までもない / 〜までのことだ (…-e gerek yok)", category: "syntax", level: "N1" },
  { slug: "made-da", title_tr: "〜まで(のこと)だ (sadece …-erim, o kadar)", category: "syntax", level: "N1" },
  { slug: "nomi-narazu", title_tr: "〜のみならず (sadece … değil, edebî)", category: "syntax", level: "N1" },
  { slug: "taru-mono", title_tr: "〜たるもの (…olan kişi …-meli)", category: "syntax", level: "N1" },
  { slug: "to-shite-nai", title_tr: "〜として〜ない (hiçbir … …-mez)", category: "syntax", level: "N1" },
  { slug: "ni-taru", title_tr: "〜に足る / 〜に足りない (…-e değer/değmez)", category: "syntax", level: "N1" },
  { slug: "beku-mo-nai", title_tr: "〜べくもない (…-mesi imkânsız)", category: "syntax", level: "N1" },
  { slug: "wo-mono-tomo-sezu", title_tr: "〜をものともせず (…-e aldırmadan)", category: "syntax", level: "N1" },
  { slug: "wo-yoso-ni", title_tr: "〜をよそに (…-e aldırmadan, umursamadan)", category: "syntax", level: "N1" },
  { slug: "nai-mademo", title_tr: "〜ないまでも (…-mese bile)", category: "syntax", level: "N1" },
  { slug: "wa-oroka", title_tr: "〜はおろか (…şöyle dursun)", category: "syntax", level: "N1" },
  { slug: "sura", title_tr: "〜すら (…bile, edebî)", category: "syntax", level: "N1" },
  { slug: "dani", title_tr: "〜だに (…bile, klasik)", category: "syntax", level: "N1" },
  { slug: "koso-sure", title_tr: "〜こそすれ (…-se bile asla …-mez)", category: "syntax", level: "N1" },
  { slug: "ba-koso", title_tr: "〜ばこそ (tam da …-dığı için)", category: "syntax", level: "N1" },
  { slug: "to-omoikiya", title_tr: "〜と思いきや (…sandım oysa)", category: "syntax", level: "N1" },
  { slug: "ya-ina-ya", title_tr: "〜や否や (…-er …-mez)", category: "syntax", level: "N1" },
  { slug: "ga-hayai-ka", title_tr: "〜が早いか (…-ir …-mez)", category: "syntax", level: "N1" },
  { slug: "nari-ni", title_tr: "〜なりに / 〜なりの (…-e özgü, kendince)", category: "syntax", level: "N1" },
  { slug: "to-bakari-ni", title_tr: "〜とばかりに (…-cesine)", category: "syntax", level: "N1" },
  { slug: "imada-ni", title_tr: "〜いまだに / 〜ずじまい (hâlâ; …-emeden kalmak)", category: "syntax", level: "N1" },
  { slug: "mono-ka", title_tr: "〜ものか (asla …-mem!)", category: "syntax", level: "N1" },
  { slug: "kagiri-da", title_tr: "〜かぎりだ (son derece …)", category: "syntax", level: "N1" },
  { slug: "no-itari", title_tr: "〜の至り / 〜の極み (…-nin doruğu)", category: "syntax", level: "N1" },
  { slug: "to-ittara-nai", title_tr: "〜ったらない / 〜といったらない (son derece …)", category: "syntax", level: "N1" },
  { slug: "wa-sate-oki", title_tr: "〜はさておき (…-i bir yana)", category: "syntax", level: "N1" },
  { slug: "ni-hikikae", title_tr: "〜にひきかえ (…-in aksine)", category: "syntax", level: "N1" },
  { slug: "ni-mo-mashite", title_tr: "〜にもまして (…-den de fazla)", category: "syntax", level: "N1" },
  { slug: "wo-kawakiri-ni", title_tr: "〜を皮切りに (…ile başlayarak)", category: "syntax", level: "N1" },
  { slug: "ku-shite", title_tr: "〜くして (…olmadan; kaçınılmaz olarak)", category: "syntax", level: "N1" },

  // --- N1 uzun kuyruk (nadir ama listede olması gereken kalıplar) ---
  { slug: "aru-majiki", title_tr: "〜まじき (…-e yakışmayan, olmaması gereken)", category: "syntax", level: "N1" },
  { slug: "gotoki-gotoku", title_tr: "〜ごとき / 〜ごとく (…gibi, edebî)", category: "syntax", level: "N1" },
  { slug: "zu-ni-wa-sumanai", title_tr: "〜ずにはすまない / 〜ないではすまない (…-meden olmaz)", category: "syntax", level: "N1" },
  { slug: "made-no-koto-mo-nai", title_tr: "〜までもなく (…-e gerek kalmadan)", category: "syntax", level: "N1" },
  { slug: "to-iu-mono-da", title_tr: "〜というものだ / 〜というものではない (işte budur; öyle değil)", category: "syntax", level: "N1" },
  { slug: "ni-itaru", title_tr: "〜に至る / 〜に至って / 〜に至っては (…noktasına varmak)", category: "syntax", level: "N1" },
  { slug: "wo-fumaete", title_tr: "〜を踏まえて (…-i göz önünde tutarak)", category: "syntax", level: "N1" },
  { slug: "wo-motte", title_tr: "〜をもって (…ile, …itibarıyla, resmî)", category: "syntax", level: "N1" },
  { slug: "ni-shite", title_tr: "〜にして (…olmasına rağmen; …-de bile)", category: "syntax", level: "N1" },
  { slug: "to-mo-naku", title_tr: "〜ともなく / 〜ともなしに (farkında olmadan)", category: "syntax", level: "N1" },
  { slug: "tokoro-ka-emphatic", title_tr: "〜たところが / 〜たところ (…-diğinde meğer)", category: "syntax", level: "N1" },
  { slug: "kiwamaru", title_tr: "〜極まる / 〜極まりない (son derece …)", category: "syntax", level: "N1" },
  { slug: "shimatsu-da", title_tr: "〜しまつだ (sonunda …olup çıkmak, kötü sonuç)", category: "syntax", level: "N1" },
  { slug: "arisama", title_tr: "〜ありさま / 〜てい (…hali, durumu, olumsuz)", category: "syntax", level: "N1" },
  { slug: "denai", title_tr: "〜でなくてなんだろう (bu …değilse nedir)", category: "syntax", level: "N1" },
  { slug: "nashi-ni-wa", title_tr: "〜なしに(は) / 〜なくして(は) (…olmadan mümkün değil)", category: "syntax", level: "N1" },
  { slug: "to-kitara", title_tr: "〜ときたら / 〜とくると (…-e gelince, sitem)", category: "syntax", level: "N1" },
  { slug: "hazumi-hyoushi", title_tr: "〜はずみに / 〜拍子に (…anında, o esnada)", category: "syntax", level: "N1" },
  { slug: "te-kara-to-iu-mono", title_tr: "〜てからというもの (…-diğinden beri hep)", category: "syntax", level: "N1" },
  { slug: "wo-kagiri-ni", title_tr: "〜を限りに (…-den itibaren son kez)", category: "syntax", level: "N1" },
  { slug: "wo-hete", title_tr: "〜を経て (…-den geçerek, süreç)", category: "syntax", level: "N1" },
  { slug: "ikan", title_tr: "〜いかんで / 〜いかんによらず (…-e bağlı; …-e bakmaksızın)", category: "syntax", level: "N1" },
  { slug: "ni-kaketewa", title_tr: "〜にかけては (…konusunda üstüne yok)", category: "syntax", level: "N1" },
  { slug: "tari-tomo", title_tr: "〜たりとも (bir tek … bile)", category: "syntax", level: "N1" },
  { slug: "narade-wa", title_tr: "〜ならではの (…-e özgü, ancak …-de)", category: "syntax", level: "N1" },
  { slug: "ga-gotoshi", title_tr: "〜がごとし (…gibi, klasik benzetme)", category: "syntax", level: "N1" },
  { slug: "n-ga-tame", title_tr: "〜んがため(に) (…-mek amacıyla, edebî)", category: "syntax", level: "N1" },
  { slug: "te-mae", title_tr: "〜てまえ / 〜手前 (…olduğu için mecburen)", category: "syntax", level: "N1" },
  { slug: "to-atte", title_tr: "〜とあって (…olduğundan haliyle)", category: "syntax", level: "N1" },
  { slug: "to-areba", title_tr: "〜とあれば (madem … ise)", category: "syntax", level: "N1" },
  { slug: "mo-sarukoto-nagara", title_tr: "〜もさることながら (…-i şöyle dursun, …de)", category: "syntax", level: "N1" },
  { slug: "bekarazaru", title_tr: "〜べからざる (…-emez, yasak sıfat, edebî)", category: "syntax", level: "N1" },
  { slug: "gatera", title_tr: "〜しな / 〜がてら (…sırasında, …-e giderken)", category: "syntax", level: "N1" },
  { slug: "koto-to-natte-iru", title_tr: "〜こととなっている (kural gereği …-dir)", category: "syntax", level: "N1" },
  { slug: "ni-tarinai", title_tr: "〜に足りない (…-e değmez, önemsiz)", category: "syntax", level: "N1" },
  { slug: "tote", title_tr: "〜とて (…bile, …olsa da, edebî)", category: "syntax", level: "N1" },
  { slug: "de-are-darouto", title_tr: "〜(で)あれ / 〜であろうと (…olsa da, ne olursa)", category: "syntax", level: "N1" },
  { slug: "te-shikarubeki", title_tr: "〜てしかるべき (…-mesi uygun/beklenir)", category: "syntax", level: "N1" },
  { slug: "iza-shirazu", title_tr: "〜いざ知らず (…bir yana, …-den öte)", category: "syntax", level: "N1" },
  { slug: "de-are-de-are", title_tr: "〜であれ〜であれ (ister … ister …)", category: "syntax", level: "N1" },

  // --- Klasik kalıntılar ---
  { slug: "nu-zu-negation", title_tr: "〜ぬ / 〜ず (klasik olumsuzluk, modern kalıntılar)", category: "classical", level: "N1" },
  { slug: "beshi-relics", title_tr: "〜べし / 〜べからず (klasik gereklilik/yasak kalıntıları)", category: "classical", level: "N1" },
  { slug: "mu-volitional", title_tr: "〜む→〜ん (klasik istek, 〜んとする)", category: "classical", level: "N1" },
  { slug: "ki-keri-tari", title_tr: "Klasik geçmiş ekleri (〜き/〜けり/〜たり) — okuma için", category: "classical", level: "N1" },
  { slug: "bungo-relic-forms", title_tr: "文語 kalıntı çekimler (〜ざる/〜べき/〜たる sıfat kullanımı)", category: "classical", level: "N1" },
  { slug: "kanbun-kakikudashi", title_tr: "漢文訓読 kalıntıları (formal metinde 〜べく/〜ざる)", category: "classical", level: "N1" },

  // --- Kibarlık (N1) ---
  { slug: "keigo-advanced", title_tr: "İleri Keigo: çift kibarlık, 二重敬語 hataları", category: "honorifics", level: "N1" },
  { slug: "keigo-written", title_tr: "Yazılı resmî dil (拝啓/敬具, mektup kalıpları)", category: "honorifics", level: "N1" },

  // --- Register / stil (N1) ---
  { slug: "written-vs-spoken", title_tr: "Yazı dili vs konuşma dili (である体 / だ・である)", category: "register", level: "N1" },
  { slug: "de-aru-tai", title_tr: "〜である体 (makale/tez register'ı)", category: "register", level: "N1" },
  { slug: "nominalization-advanced", title_tr: "İleri isimleştirme (〜こと/〜の/〜ところ/〜次第 karşılaştırma)", category: "register", level: "N1" },
  { slug: "formal-written-connectives", title_tr: "Resmî yazı bağlaçları (および/ならびに/または/かつ)", category: "register", level: "N1" },

  // ===================================================================
  // KONSOLİDE ÇEKİM TABLOLARI (tam paradigma, tek sayfada — referans)
  // ===================================================================
  { slug: "conj-godan-full", title_tr: "Fiil Çekim Tablosu: Godan (tüm formlar)", category: "conjugation", level: "N4" },
  { slug: "conj-ichidan-full", title_tr: "Fiil Çekim Tablosu: Ichidan (tüm formlar)", category: "conjugation", level: "N4" },
  { slug: "conj-irregular-full", title_tr: "Fiil Çekim Tablosu: する / くる (düzensiz, tüm formlar)", category: "conjugation", level: "N4" },
  { slug: "conj-i-adjective-full", title_tr: "Sıfat Çekim Tablosu: い-sıfatları (tüm formlar)", category: "conjugation", level: "N4" },
  { slug: "conj-na-adjective-full", title_tr: "Sıfat Çekim Tablosu: な-sıfatları + koşaç", category: "conjugation", level: "N4" },
  { slug: "conj-copula-full", title_tr: "です/だ Koşaç Çekim Tablosu (tüm register/zaman)", category: "conjugation", level: "N4" },
  { slug: "conj-conditional-table", title_tr: "Koşul Formları Karşılaştırma Tablosu (と/ば/たら/なら)", category: "conjugation", level: "N4" },
  { slug: "conj-transitivity-pairs", title_tr: "Geçişli-Geçişsiz Fiil Çiftleri Tablosu (kapsamlı)", category: "conjugation", level: "N4" },
  { slug: "conj-keigo-table", title_tr: "Keigo Çekim Tablosu (sonkeigo/kenjougo/teichougo yan yana)", category: "conjugation", level: "N3" },
  { slug: "conj-tense-aspect-map", title_tr: "Zaman-Görünüş Haritası (〜る/〜た/〜ている/〜てある/〜ておく)", category: "conjugation", level: "N3" },
];
