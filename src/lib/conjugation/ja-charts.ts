/**
 * Static Japanese reference charts rendered under the conjugator: particles,
 * counters, ko-so-a-do demonstratives and keigo verb pairs. Deterministic
 * data, bracket furigana everywhere (the Furigana component renders ruby).
 */

export interface JaChartGroup {
  id: string;
  labelTr: string;
  labelEn: string;
  headersTr: string[];
  headersEn: string[];
  /** Cells may carry bracket furigana; the last column is prose (tr/en pair). */
  rows: { cells: string[]; noteTr: string; noteEn: string }[];
}

export const JA_CHART_GROUPS: JaChartGroup[] = [
  {
    id: "particles",
    labelTr: "Partikeller",
    labelEn: "Particles",
    headersTr: ["Partikel", "Örnek"],
    headersEn: ["Particle", "Example"],
    rows: [
      { cells: ["は", "私[わたし]は学生[がくせい]です。"], noteTr: "Konu işareti (wa okunur)", noteEn: "Topic marker (read wa)" },
      { cells: ["が", "雨[あめ]が降[ふ]っています。"], noteTr: "Özne / yeni bilgi", noteEn: "Subject / new info" },
      { cells: ["を", "パンを食[た]べます。"], noteTr: "Nesne (o okunur)", noteEn: "Direct object (read o)" },
      { cells: ["に", "七時[しちじ]に起[お]きます。"], noteTr: "Hedef, zaman, alıcı", noteEn: "Target, time, recipient" },
      { cells: ["で", "図書館[としょかん]で勉強[べんきょう]します。"], noteTr: "Eylem yeri, araç", noteEn: "Place of action, means" },
      { cells: ["へ", "日本[にほん]へ行[い]きます。"], noteTr: "Yön (e okunur)", noteEn: "Direction (read e)" },
      { cells: ["と", "友達[ともだち]と話[はな]します。"], noteTr: "…ile; ve (liste)", noteEn: "With; and (list)" },
      { cells: ["から", "九時[くじ]から始[はじ]まります。"], noteTr: "…den (başlangıç); çünkü", noteEn: "From; because" },
      { cells: ["まで", "五時[ごじ]まで働[はたら]きます。"], noteTr: "…e kadar", noteEn: "Until" },
      { cells: ["より", "電車[でんしゃ]の方[ほう]がバスより速[はや]い。"], noteTr: "…den daha (karşılaştırma)", noteEn: "Than (comparison)" },
      { cells: ["の", "私[わたし]の本[ほん]", ], noteTr: "İyelik / tamlama", noteEn: "Possession / linking" },
      { cells: ["も", "私[わたし]も行[い]きます。"], noteTr: "…de/da (dahi)", noteEn: "Also" },
      { cells: ["か", "行[い]きますか。"], noteTr: "Soru", noteEn: "Question" },
      { cells: ["ね / よ", "いい天気[てんき]ですね。"], noteTr: "ne: onay arar; yo: bilgi verir", noteEn: "ne seeks agreement; yo asserts" },
    ],
  },
  {
    id: "counters",
    labelTr: "Sayaçlar",
    labelEn: "Counters",
    headersTr: ["Sayaç", "Örnek"],
    headersEn: ["Counter", "Example"],
    rows: [
      { cells: ["〜つ", "りんごを三[みっ]つください。"], noteTr: "Genel (1-10: ひとつ, ふたつ…)", noteEn: "Generic (hitotsu, futatsu…)" },
      { cells: ["〜人[にん]", "学生[がくせい]が二人[ふたり]います。"], noteTr: "İnsan (1: ひとり, 2: ふたり!)", noteEn: "People (hitori, futari!)" },
      { cells: ["〜本[ほん]", "ペンを二本[にほん]買[か]いました。"], noteTr: "Uzun ince şeyler (ほん/ぼん/ぽん)", noteEn: "Long thin objects" },
      { cells: ["〜枚[まい]", "切符[きっぷ]を三枚[さんまい]。"], noteTr: "Düz ince şeyler", noteEn: "Flat objects" },
      { cells: ["〜匹[ひき]", "猫[ねこ]が一匹[いっぴき]。"], noteTr: "Küçük hayvanlar (ひき/びき/ぴき)", noteEn: "Small animals" },
      { cells: ["〜冊[さつ]", "本[ほん]を五冊[ごさつ]。"], noteTr: "Kitap/defter", noteEn: "Books" },
      { cells: ["〜台[だい]", "車[くるま]が二台[にだい]。"], noteTr: "Makine, araç", noteEn: "Machines, vehicles" },
      { cells: ["〜回[かい]", "三回[さんかい]行[い]きました。"], noteTr: "Kere, defa", noteEn: "Times (occurrences)" },
      { cells: ["〜歳[さい]", "二十歳[はたち]です。"], noteTr: "Yaş (20: はたち istisna)", noteEn: "Age (20 = hatachi)" },
      { cells: ["〜個[こ]", "卵[たまご]を六個[ろっこ]。"], noteTr: "Küçük nesneler", noteEn: "Small objects" },
    ],
  },
  {
    id: "kosoado",
    labelTr: "Ko-so-a-do (işaret sistemi)",
    labelEn: "Ko-so-a-do demonstratives",
    headersTr: ["こ〜 (bu)", "そ〜 (şu)", "あ〜 (o)", "ど〜 (hangi)"],
    headersEn: ["ko- (this)", "so- (that)", "a- (that over there)", "do- (which)"],
    rows: [
      { cells: ["これ", "それ", "あれ", "どれ"], noteTr: "Nesne zamiri", noteEn: "Thing pronoun" },
      { cells: ["この", "その", "あの", "どの"], noteTr: "+isim (bu kitap)", noteEn: "+noun" },
      { cells: ["ここ", "そこ", "あそこ", "どこ"], noteTr: "Yer", noteEn: "Place" },
      { cells: ["こちら", "そちら", "あちら", "どちら"], noteTr: "Yön (kibar)", noteEn: "Direction (polite)" },
      { cells: ["こう", "そう", "ああ", "どう"], noteTr: "Şekilde / nasıl", noteEn: "Manner / how" },
      { cells: ["こんな", "そんな", "あんな", "どんな"], noteTr: "Böyle bir / ne tür", noteEn: "Such a / what kind" },
    ],
  },
  {
    id: "keigo",
    labelTr: "Keigo — saygı ve alçakgönüllülük fiilleri",
    labelEn: "Keigo — honorific & humble verbs",
    headersTr: ["Fiil", "Saygılı (尊敬語)", "Alçakgönüllü (謙譲語)"],
    headersEn: ["Verb", "Honorific", "Humble"],
    rows: [
      { cells: ["行[い]く / 来[く]る", "いらっしゃる", "参[まい]る"], noteTr: "gitmek/gelmek", noteEn: "go / come" },
      { cells: ["いる", "いらっしゃる", "おる"], noteTr: "olmak (canlı)", noteEn: "be (animate)" },
      { cells: ["食[た]べる / 飲[の]む", "召[め]し上[あ]がる", "いただく"], noteTr: "yemek/içmek", noteEn: "eat / drink" },
      { cells: ["言[い]う", "おっしゃる", "申[もう]す"], noteTr: "söylemek", noteEn: "say" },
      { cells: ["見[み]る", "ご覧[らん]になる", "拝見[はいけん]する"], noteTr: "görmek", noteEn: "see" },
      { cells: ["する", "なさる", "いたす"], noteTr: "yapmak", noteEn: "do" },
      { cells: ["知[し]る", "ご存[ぞん]じだ", "存[ぞん]じる"], noteTr: "bilmek", noteEn: "know" },
      { cells: ["もらう", "—", "いただく"], noteTr: "almak (birinden)", noteEn: "receive" },
      { cells: ["あげる", "—", "差[さ]し上[あ]げる"], noteTr: "vermek", noteEn: "give" },
      { cells: ["会[あ]う", "—", "お目[め]にかかる"], noteTr: "buluşmak", noteEn: "meet" },
    ],
  },
];
