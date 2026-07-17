/**
 * Chinese has no conjugation: tense/aspect comes from particles and adverbs.
 * This is a static reference table (the zh counterpart of the ja conjugator),
 * rendered on /conjugate for zh profiles. Examples use the standard bracket
 * notation 汉字[pinyin] so Furigana renders ruby.
 */

export interface ZhRow {
  id: string;
  marker: string; // 了 / 过 / 着…
  labelTr: string;
  labelEn: string;
  pattern: string; // V + 了 …
  exZh: string; // bracket notation
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
        exZh: "我 吃[chī]了 饭[fàn]。", exTr: "Yemek yedim.", exEn: "I ate." },
      { id: "le-change", marker: "了", labelTr: "Durum değişimi (artık)", labelEn: "Change of state", pattern: "Cümle + 了",
        exZh: "下[xià]雨[yǔ]了。", exTr: "Yağmur başladı (artık yağıyor).", exEn: "It's raining now." },
      { id: "guo", marker: "过", labelTr: "Deneyim (…mişliği var)", labelEn: "Experience", pattern: "Fiil + 过",
        exZh: "我 去[qù]过 中[zhōng]国[guó]。", exTr: "Çin'e gitmişliğim var.", exEn: "I have been to China." },
      { id: "zhe", marker: "着", labelTr: "Süregelen durum (…iyor halde)", labelEn: "Continuous state", pattern: "Fiil + 着",
        exZh: "门[mén] 开[kāi]着。", exTr: "Kapı açık (duruyor).", exEn: "The door is (stays) open." },
      { id: "zai", marker: "在", labelTr: "Şu an sürüyor (…iyor)", labelEn: "Progressive", pattern: "在 + Fiil",
        exZh: "我 在 学[xué]习[xí]。", exTr: "Şu an ders çalışıyorum.", exEn: "I am studying." },
      { id: "zhengzai", marker: "正在", labelTr: "Tam şu anda (…makta)", labelEn: "Right now", pattern: "正在 + Fiil",
        exZh: "他 正[zhèng]在 吃[chī]饭[fàn]。", exTr: "Tam şu an yemek yiyor.", exEn: "He is eating right now." },
    ],
  },
  {
    id: "negation",
    labelTr: "Olumsuzlama",
    labelEn: "Negation",
    rows: [
      { id: "bu", marker: "不", labelTr: "Genel olumsuz (…mez/…miyor)", labelEn: "General negation", pattern: "不 + Fiil",
        exZh: "我 不 喝[hē] 咖[kā]啡[fēi]。", exTr: "Kahve içmem.", exEn: "I don't drink coffee." },
      { id: "mei", marker: "没", labelTr: "Geçmiş olumsuz (…medi)", labelEn: "Past negation", pattern: "没(有) + Fiil",
        exZh: "我 没 吃[chī] 早[zǎo]饭[fàn]。", exTr: "Kahvaltı etmedim.", exEn: "I didn't have breakfast." },
      { id: "mei-guo", marker: "没…过", labelTr: "Deneyim yok (hiç …medi)", labelEn: "No experience", pattern: "没 + Fiil + 过",
        exZh: "我 没 去[qù]过 日[rì]本[běn]。", exTr: "Japonya'ya hiç gitmedim.", exEn: "I have never been to Japan." },
      { id: "bie", marker: "别", labelTr: "Yasak (…me!)", labelEn: "Prohibitive", pattern: "别 + Fiil",
        exZh: "别 说[shuō]话[huà]！", exTr: "Konuşma!", exEn: "Don't talk!" },
    ],
  },
  {
    id: "future-modal",
    labelTr: "Gelecek & kiplik",
    labelEn: "Future & modality",
    rows: [
      { id: "hui", marker: "会", labelTr: "Gelecek/olasılık (…ecek)", labelEn: "Future/likelihood", pattern: "会 + Fiil",
        exZh: "明[míng]天[tiān] 会 下[xià]雨[yǔ]。", exTr: "Yarın yağmur yağacak.", exEn: "It will rain tomorrow." },
      { id: "yao", marker: "要", labelTr: "Yakın gelecek/niyet (…mek üzere)", labelEn: "About to / intend", pattern: "要 + Fiil (+了)",
        exZh: "我 要 回[huí]家[jiā]了。", exTr: "Eve dönmek üzereyim.", exEn: "I'm about to go home." },
      { id: "xiang", marker: "想", labelTr: "İstek (…mek istiyor)", labelEn: "Want to", pattern: "想 + Fiil",
        exZh: "我 想 睡[shuì]觉[jiào]。", exTr: "Uyumak istiyorum.", exEn: "I want to sleep." },
      { id: "dasuan", marker: "打算", labelTr: "Plan (…meyi planlıyor)", labelEn: "Plan to", pattern: "打算 + Fiil",
        exZh: "我 打[dǎ]算[suàn] 去[qù] 上[shàng]海[hǎi]。", exTr: "Şanghay'a gitmeyi planlıyorum.", exEn: "I plan to go to Shanghai." },
      { id: "hui-ability", marker: "会", labelTr: "Öğrenilmiş beceri (…ebilir)", labelEn: "Learned ability", pattern: "会 + Fiil",
        exZh: "我 会 说[shuō] 中[zhōng]文[wén]。", exTr: "Çince konuşabilirim.", exEn: "I can speak Chinese." },
      { id: "neng", marker: "能", labelTr: "İmkân (…ebilir)", labelEn: "Can (circumstance)", pattern: "能 + Fiil",
        exZh: "今[jīn]天[tiān] 我 能 来[lái]。", exTr: "Bugün gelebilirim.", exEn: "I can come today." },
      { id: "keyi", marker: "可以", labelTr: "İzin (…ebilir mi)", labelEn: "May (permission)", pattern: "可以 + Fiil",
        exZh: "我 可[kě]以[yǐ] 进[jìn]来[lái] 吗[ma]？", exTr: "Girebilir miyim?", exEn: "May I come in?" },
    ],
  },
  {
    id: "time-frames",
    labelTr: "Zaman çerçeveleri",
    labelEn: "Time frames",
    rows: [
      { id: "yijing", marker: "已经…了", labelTr: "Çoktan (…di bile)", labelEn: "Already", pattern: "已经 + Fiil + 了",
        exZh: "他 已[yǐ]经[jīng] 走[zǒu]了。", exTr: "Çoktan gitti.", exEn: "He has already left." },
      { id: "gang", marker: "刚", labelTr: "Az önce (…di daha yeni)", labelEn: "Just now", pattern: "刚 + Fiil",
        exZh: "我 刚[gāng] 到[dào]。", exTr: "Daha yeni vardım.", exEn: "I just arrived." },
      { id: "kuai-le", marker: "快…了", labelTr: "Neredeyse (…mek üzere)", labelEn: "Almost / about to", pattern: "快 + Fiil + 了",
        exZh: "快 下[xià]课[kè]了。", exTr: "Ders bitmek üzere.", exEn: "Class is about to end." },
      { id: "zai-past", marker: "的时候", labelTr: "…dığı sırada", labelEn: "When / while", pattern: "Fiil + 的时候",
        exZh: "吃[chī]饭[fàn]的[de]时[shí]候[hou] 别 看[kàn] 手[shǒu]机[jī]。", exTr: "Yemek yerken telefona bakma.", exEn: "Don't look at your phone while eating." },
    ],
  },
];
