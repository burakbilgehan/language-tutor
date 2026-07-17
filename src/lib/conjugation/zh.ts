/**
 * Chinese has no conjugation: tense/aspect comes from particles and adverbs.
 * This is a static reference chart (the zh counterpart of the ja conjugator),
 * rendered on /conjugate for zh profiles. EVERY hanzi carries bracket pinyin
 * (汉字[hànzì]) so the Furigana component renders uniform ruby — no bare
 * characters, no mixed typography.
 */

export interface ZhRow {
  id: string;
  marker: string;
  labelTr: string;
  labelEn: string;
  pattern: string;
  exZh: string; // bracket notation, pinyin on every hanzi run
  exTr: string;
  exEn: string;
}

export interface ZhGroup {
  id: string;
  labelTr: string;
  labelEn: string;
  rows: ZhRow[];
}

export const ZH_ASPECT_GROUPS: ZhGroup[] = [
  {
    id: "aspect",
    labelTr: "Görünüş partikelleri",
    labelEn: "Aspect particles",
    rows: [
      { id: "le-completed", marker: "了", labelTr: "Tamamlanma (…di)", labelEn: "Completed action", pattern: "Fiil + 了",
        exZh: "我[wǒ]吃[chī]了[le]饭[fàn]。", exTr: "Yemek yedim.", exEn: "I ate." },
      { id: "le-change", marker: "了", labelTr: "Durum değişimi (artık)", labelEn: "Change of state", pattern: "Cümle + 了",
        exZh: "下[xià]雨[yǔ]了[le]。", exTr: "Yağmur başladı (artık yağıyor).", exEn: "It's raining now." },
      { id: "guo", marker: "过", labelTr: "Deneyim (…mişliği var)", labelEn: "Experience", pattern: "Fiil + 过",
        exZh: "我[wǒ]去[qù]过[guo]中[zhōng]国[guó]。", exTr: "Çin'e gitmişliğim var.", exEn: "I have been to China." },
      { id: "zhe", marker: "着", labelTr: "Süregelen durum (…iyor halde)", labelEn: "Continuous state", pattern: "Fiil + 着",
        exZh: "门[mén]开[kāi]着[zhe]。", exTr: "Kapı açık (duruyor).", exEn: "The door is (stays) open." },
      { id: "zai", marker: "在", labelTr: "Şu an sürüyor (…iyor)", labelEn: "Progressive", pattern: "在 + Fiil",
        exZh: "我[wǒ]在[zài]学[xué]习[xí]。", exTr: "Şu an ders çalışıyorum.", exEn: "I am studying." },
      { id: "zhengzai", marker: "正在", labelTr: "Tam şu anda (…makta)", labelEn: "Right now", pattern: "正在 + Fiil",
        exZh: "他[tā]正[zhèng]在[zài]吃[chī]饭[fàn]。", exTr: "Tam şu an yemek yiyor.", exEn: "He is eating right now." },
      { id: "zhe-manner", marker: "着", labelTr: "…erek (eşzamanlı tarz)", labelEn: "While/by doing", pattern: "F1 + 着 + F2",
        exZh: "他[tā]笑[xiào]着[zhe]说[shuō]。", exTr: "Gülerek söyledi.", exEn: "He said it smiling." },
    ],
  },
  {
    id: "negation",
    labelTr: "Olumsuzlama",
    labelEn: "Negation",
    rows: [
      { id: "bu", marker: "不", labelTr: "Genel olumsuz (…mez/…miyor)", labelEn: "General negation", pattern: "不 + Fiil",
        exZh: "我[wǒ]不[bù]喝[hē]咖[kā]啡[fēi]。", exTr: "Kahve içmem.", exEn: "I don't drink coffee." },
      { id: "mei", marker: "没", labelTr: "Geçmiş olumsuz (…medi)", labelEn: "Past negation", pattern: "没(有) + Fiil",
        exZh: "我[wǒ]没[méi]吃[chī]早[zǎo]饭[fàn]。", exTr: "Kahvaltı etmedim.", exEn: "I didn't have breakfast." },
      { id: "mei-guo", marker: "没…过", labelTr: "Deneyim yok (hiç …medi)", labelEn: "No experience", pattern: "没 + Fiil + 过",
        exZh: "我[wǒ]没[méi]去[qù]过[guo]日[rì]本[běn]。", exTr: "Japonya'ya hiç gitmedim.", exEn: "I have never been to Japan." },
      { id: "bie", marker: "别", labelTr: "Yasak (…me!)", labelEn: "Prohibitive", pattern: "别 + Fiil",
        exZh: "别[bié]说[shuō]话[huà]！", exTr: "Konuşma!", exEn: "Don't talk!" },
      { id: "budei", marker: "不用", labelTr: "Gerek yok (…mene gerek yok)", labelEn: "No need to", pattern: "不用 + Fiil",
        exZh: "你[nǐ]不[bú]用[yòng]来[lái]。", exTr: "Gelmene gerek yok.", exEn: "You don't need to come." },
    ],
  },
  {
    id: "future-modal",
    labelTr: "Gelecek & kiplik",
    labelEn: "Future & modality",
    rows: [
      { id: "hui", marker: "会", labelTr: "Gelecek/olasılık (…ecek)", labelEn: "Future/likelihood", pattern: "会 + Fiil",
        exZh: "明[míng]天[tiān]会[huì]下[xià]雨[yǔ]。", exTr: "Yarın yağmur yağacak.", exEn: "It will rain tomorrow." },
      { id: "yao", marker: "要", labelTr: "Yakın gelecek/niyet (…mek üzere)", labelEn: "About to / intend", pattern: "要 + Fiil (+了)",
        exZh: "我[wǒ]要[yào]回[huí]家[jiā]了[le]。", exTr: "Eve dönmek üzereyim.", exEn: "I'm about to go home." },
      { id: "xiang", marker: "想", labelTr: "İstek (…mek istiyor)", labelEn: "Want to", pattern: "想 + Fiil",
        exZh: "我[wǒ]想[xiǎng]睡[shuì]觉[jiào]。", exTr: "Uyumak istiyorum.", exEn: "I want to sleep." },
      { id: "dasuan", marker: "打算", labelTr: "Plan (…meyi planlıyor)", labelEn: "Plan to", pattern: "打算 + Fiil",
        exZh: "我[wǒ]打[dǎ]算[suàn]去[qù]上[shàng]海[hǎi]。", exTr: "Şanghay'a gitmeyi planlıyorum.", exEn: "I plan to go to Shanghai." },
      { id: "hui-ability", marker: "会", labelTr: "Öğrenilmiş beceri (…ebilir)", labelEn: "Learned ability", pattern: "会 + Fiil",
        exZh: "我[wǒ]会[huì]说[shuō]中[zhōng]文[wén]。", exTr: "Çince konuşabilirim.", exEn: "I can speak Chinese." },
      { id: "neng", marker: "能", labelTr: "İmkân (…ebilir)", labelEn: "Can (circumstance)", pattern: "能 + Fiil",
        exZh: "今[jīn]天[tiān]我[wǒ]能[néng]来[lái]。", exTr: "Bugün gelebilirim.", exEn: "I can come today." },
      { id: "keyi", marker: "可以", labelTr: "İzin (…ebilir mi)", labelEn: "May (permission)", pattern: "可以 + Fiil",
        exZh: "我[wǒ]可[kě]以[yǐ]进[jìn]来[lái]吗[ma]？", exTr: "Girebilir miyim?", exEn: "May I come in?" },
      { id: "yinggai", marker: "应该", labelTr: "…meli (tavsiye/tahmin)", labelEn: "Should", pattern: "应该 + Fiil",
        exZh: "你[nǐ]应[yīng]该[gāi]休[xiū]息[xi]。", exTr: "Dinlenmelisin.", exEn: "You should rest." },
      { id: "dei", marker: "得", labelTr: "Zorunda (…mek zorunda)", labelEn: "Must / have to", pattern: "得 + Fiil",
        exZh: "我[wǒ]得[děi]走[zǒu]了[le]。", exTr: "Gitmem lazım.", exEn: "I have to go." },
    ],
  },
  {
    id: "time-frames",
    labelTr: "Zaman çerçeveleri",
    labelEn: "Time frames",
    rows: [
      { id: "yijing", marker: "已经…了", labelTr: "Çoktan (…di bile)", labelEn: "Already", pattern: "已经 + Fiil + 了",
        exZh: "他[tā]已[yǐ]经[jīng]走[zǒu]了[le]。", exTr: "Çoktan gitti.", exEn: "He has already left." },
      { id: "gang", marker: "刚", labelTr: "Az önce (…di daha yeni)", labelEn: "Just now", pattern: "刚 + Fiil",
        exZh: "我[wǒ]刚[gāng]到[dào]。", exTr: "Daha yeni vardım.", exEn: "I just arrived." },
      { id: "kuai-le", marker: "快…了", labelTr: "Neredeyse (…mek üzere)", labelEn: "Almost / about to", pattern: "快 + Fiil + 了",
        exZh: "快[kuài]下[xià]课[kè]了[le]。", exTr: "Ders bitmek üzere.", exEn: "Class is about to end." },
      { id: "deshihou", marker: "…的时候", labelTr: "…dığı sırada", labelEn: "When / while", pattern: "Fiil + 的时候",
        exZh: "吃[chī]饭[fàn]的[de]时[shí]候[hou]别[bié]看[kàn]手[shǒu]机[jī]。", exTr: "Yemek yerken telefona bakma.", exEn: "Don't look at your phone while eating." },
      { id: "yibian", marker: "一边…一边", labelTr: "Hem …ip hem …mek", labelEn: "Doing two things at once", pattern: "一边 F1 一边 F2",
        exZh: "他[tā]一[yì]边[biān]走[zǒu]一[yì]边[biān]唱[chàng]。", exTr: "Hem yürüyor hem şarkı söylüyor.", exEn: "He walks while singing." },
      { id: "xian-zai", marker: "先…再", labelTr: "Önce …, sonra …", labelEn: "First …, then …", pattern: "先 F1 再 F2",
        exZh: "先[xiān]吃[chī]饭[fàn]，再[zài]看[kàn]电[diàn]影[yǐng]。", exTr: "Önce yemek, sonra film.", exEn: "First eat, then a movie." },
      { id: "jiu", marker: "一…就", labelTr: "…ir …mez", labelEn: "As soon as", pattern: "一 F1 就 F2",
        exZh: "我[wǒ]一[yí]到[dào]家[jiā]就[jiù]睡[shuì]了[le]。", exTr: "Eve varır varmaz uyudum.", exEn: "I slept as soon as I got home." },
    ],
  },
  {
    id: "structures",
    labelTr: "Temel cümle kalıpları",
    labelEn: "Core sentence patterns",
    rows: [
      { id: "shi-de", marker: "是…的", labelTr: "Vurgu: ne zaman/nerede/nasıl", labelEn: "Emphasis (time/place/manner)", pattern: "是 + odak + Fiil + 的",
        exZh: "我[wǒ]是[shì]坐[zuò]飞[fēi]机[jī]来[lái]的[de]。", exTr: "Uçakla geldim (vurgu: uçakla).", exEn: "It was by plane that I came." },
      { id: "ba", marker: "把", labelTr: "Nesneyi öne al (…yı …yap)", labelEn: "Disposal (object fronting)", pattern: "把 + Nesne + Fiil + sonuç",
        exZh: "请[qǐng]把[bǎ]门[mén]关[guān]上[shàng]。", exTr: "Kapıyı kapat(ıver).", exEn: "Please close the door." },
      { id: "bei", marker: "被", labelTr: "Edilgen", labelEn: "Passive", pattern: "被 (+fail) + Fiil",
        exZh: "蛋[dàn]糕[gāo]被[bèi]吃[chī]了[le]。", exTr: "Pasta yenildi.", exEn: "The cake got eaten." },
      { id: "bi", marker: "比", labelTr: "Karşılaştırma (…den daha)", labelEn: "Comparison", pattern: "A 比 B + sıfat",
        exZh: "他[tā]比[bǐ]我[wǒ]高[gāo]。", exTr: "O benden uzun.", exEn: "He is taller than me." },
      { id: "yue", marker: "越来越", labelTr: "Gitgide daha …", labelEn: "More and more", pattern: "越来越 + sıfat",
        exZh: "天[tiān]气[qì]越[yuè]来[lái]越[yuè]冷[lěng]。", exTr: "Hava gitgide soğuyor.", exEn: "It's getting colder and colder." },
      { id: "you-you", marker: "又…又", labelTr: "Hem … hem …", labelEn: "Both … and …", pattern: "又 A 又 B",
        exZh: "这[zhè]个[ge]又[yòu]便[pián]宜[yi]又[yòu]好[hǎo]。", exTr: "Bu hem ucuz hem iyi.", exEn: "This is both cheap and good." },
      { id: "de-degree", marker: "得", labelTr: "Derece tümleci (…acak kadar)", labelEn: "Degree complement", pattern: "Fiil + 得 + derece",
        exZh: "他[tā]跑[pǎo]得[de]很[hěn]快[kuài]。", exTr: "Çok hızlı koşuyor.", exEn: "He runs very fast." },
      { id: "result-complement", marker: "完/好/到", labelTr: "Sonuç tümleci (bitirdi/başardı)", labelEn: "Result complement", pattern: "Fiil + 完/好/到",
        exZh: "我[wǒ]看[kàn]完[wán]了[le]这[zhè]本[běn]书[shū]。", exTr: "Bu kitabı bitirdim.", exEn: "I finished reading this book." },
      { id: "direction-complement", marker: "来/去", labelTr: "Yön tümleci (gelerek/giderek)", labelEn: "Direction complement", pattern: "Fiil + 上/下/进/出 + 来/去",
        exZh: "他[tā]走[zǒu]进[jìn]来[lái]了[le]。", exTr: "Yürüyerek içeri girdi.", exEn: "He walked in (toward me)." },
      { id: "potential-complement", marker: "得/不", labelTr: "Yapabilirlik tümleci (…abilir/…amaz)", labelEn: "Potential complement", pattern: "Fiil + 得/不 + sonuç",
        exZh: "我[wǒ]听[tīng]不[bu]懂[dǒng]。", exTr: "Anlayamıyorum (duyup çözemiyorum).", exEn: "I can't understand (by listening)." },
    ],
  },
  {
    id: "questions",
    labelTr: "Soru kalıpları",
    labelEn: "Question patterns",
    rows: [
      { id: "ma", marker: "吗", labelTr: "Evet/hayır sorusu", labelEn: "Yes/no question", pattern: "Cümle + 吗",
        exZh: "你[nǐ]是[shì]学[xué]生[sheng]吗[ma]？", exTr: "Öğrenci misin?", exEn: "Are you a student?" },
      { id: "ne", marker: "呢", labelTr: "Peki ya …? / yumuşak soru", labelEn: "What about …?", pattern: "İsim + 呢",
        exZh: "我[wǒ]很[hěn]好[hǎo]，你[nǐ]呢[ne]？", exTr: "İyiyim, ya sen?", exEn: "I'm fine — and you?" },
      { id: "ba-q", marker: "吧", labelTr: "Öneri / tahmin (…elim / değil mi)", labelEn: "Suggestion / assumption", pattern: "Cümle + 吧",
        exZh: "我[wǒ]们[men]走[zǒu]吧[ba]！", exTr: "Hadi gidelim!", exEn: "Let's go!" },
      { id: "a-not-a", marker: "V不V", labelTr: "Fiil-değil-fiil sorusu", labelEn: "A-not-A question", pattern: "Fiil + 不 + Fiil",
        exZh: "你[nǐ]去[qù]不[bu]去[qù]？", exTr: "Gidiyor musun, gitmiyor musun?", exEn: "Are you going or not?" },
      { id: "duoshao", marker: "多少/几", labelTr: "Kaç? (miktar)", labelEn: "How many/much", pattern: "多少 / 几 + ölçü",
        exZh: "这[zhè]个[ge]多[duō]少[shao]钱[qián]？", exTr: "Bu kaç para?", exEn: "How much is this?" },
    ],
  },
];
