/**
 * Static pinyin reference data for the /pinyin chart page (zh counterpart of
 * the kana chart). Turkish sound approximations are rough anchors, not IPA.
 */

export interface PinyinRow {
  symbol: string;
  exampleZh: string; // bracket notation for Furigana ruby
  hintTr: string;
  hintEn: string;
}

export const TONES: PinyinRow[] = [
  { symbol: "1. ton  ā", exampleZh: "妈[mā]", hintTr: "Düz ve yüksek: notayı tutar gibi", hintEn: "High and flat" },
  { symbol: "2. ton  á", exampleZh: "麻[má]", hintTr: "Yükselen: soru sorar gibi (ha?)", hintEn: "Rising, like a question" },
  { symbol: "3. ton  ǎ", exampleZh: "马[mǎ]", hintTr: "Alçalıp yükselen: şaşkın 'haa?'", hintEn: "Dip then rise" },
  { symbol: "4. ton  à", exampleZh: "骂[mà]", hintTr: "Sert düşen: emir verir gibi (Ha!)", hintEn: "Sharp falling" },
  { symbol: "hafif  a", exampleZh: "吗[ma]", hintTr: "Vurgusuz, kısa", hintEn: "Neutral, short" },
];

export const INITIALS: PinyinRow[] = [
  { symbol: "b", exampleZh: "爸[bà]", hintTr: "p ile b arası, patlamasız", hintEn: "unaspirated p/b" },
  { symbol: "p", exampleZh: "怕[pà]", hintTr: "nefesli p (pha)", hintEn: "aspirated p" },
  { symbol: "m", exampleZh: "妈[mā]", hintTr: "m", hintEn: "m" },
  { symbol: "f", exampleZh: "饭[fàn]", hintTr: "f", hintEn: "f" },
  { symbol: "d", exampleZh: "大[dà]", hintTr: "t ile d arası", hintEn: "unaspirated t/d" },
  { symbol: "t", exampleZh: "他[tā]", hintTr: "nefesli t", hintEn: "aspirated t" },
  { symbol: "n", exampleZh: "你[nǐ]", hintTr: "n", hintEn: "n" },
  { symbol: "l", exampleZh: "来[lái]", hintTr: "l", hintEn: "l" },
  { symbol: "g", exampleZh: "狗[gǒu]", hintTr: "k ile g arası", hintEn: "unaspirated k/g" },
  { symbol: "k", exampleZh: "看[kàn]", hintTr: "nefesli k", hintEn: "aspirated k" },
  { symbol: "h", exampleZh: "好[hǎo]", hintTr: "gırtlaktan h (ha)", hintEn: "throaty h" },
  { symbol: "j", exampleZh: "家[jiā]", hintTr: "ince c (ci)", hintEn: "like 'j' in jeep, soft" },
  { symbol: "q", exampleZh: "去[qù]", hintTr: "ince ç (çi)", hintEn: "like 'ch' in cheese, soft" },
  { symbol: "x", exampleZh: "谢[xiè]", hintTr: "ince ş (şi)", hintEn: "like 'sh' in sheep, soft" },
  { symbol: "zh", exampleZh: "中[zhōng]", hintTr: "kalın c, dil kıvrık", hintEn: "retroflex j" },
  { symbol: "ch", exampleZh: "吃[chī]", hintTr: "kalın ç, dil kıvrık", hintEn: "retroflex ch" },
  { symbol: "sh", exampleZh: "是[shì]", hintTr: "kalın ş, dil kıvrık", hintEn: "retroflex sh" },
  { symbol: "r", exampleZh: "人[rén]", hintTr: "j ile r arası (jın)", hintEn: "retroflex r, like 'zh' in vision" },
  { symbol: "z", exampleZh: "在[zài]", hintTr: "dz (dzay)", hintEn: "dz" },
  { symbol: "c", exampleZh: "菜[cài]", hintTr: "ts (tsay)", hintEn: "ts" },
  { symbol: "s", exampleZh: "三[sān]", hintTr: "s", hintEn: "s" },
  { symbol: "y", exampleZh: "一[yī]", hintTr: "y", hintEn: "y" },
  { symbol: "w", exampleZh: "我[wǒ]", hintTr: "v/u arası", hintEn: "w" },
];

export const FINALS: PinyinRow[] = [
  { symbol: "a", exampleZh: "他[tā]", hintTr: "a", hintEn: "a as in father" },
  { symbol: "o", exampleZh: "我[wǒ]", hintTr: "o (uo gibi)", hintEn: "o" },
  { symbol: "e", exampleZh: "喝[hē]", hintTr: "ı ile ö arası (hı)", hintEn: "uh" },
  { symbol: "i", exampleZh: "一[yī]", hintTr: "i; zh/ch/sh/r/z/c/s'den sonra ı", hintEn: "ee; after retroflex: buzzed i" },
  { symbol: "u", exampleZh: "不[bù]", hintTr: "u", hintEn: "oo" },
  { symbol: "ü", exampleZh: "绿[lǜ]", hintTr: "ü (Türkçedeki gibi)", hintEn: "like German ü" },
  { symbol: "ai", exampleZh: "爱[ài]", hintTr: "ay", hintEn: "eye" },
  { symbol: "ei", exampleZh: "美[měi]", hintTr: "ey", hintEn: "ay in day" },
  { symbol: "ui", exampleZh: "水[shuǐ]", hintTr: "uey", hintEn: "way" },
  { symbol: "ao", exampleZh: "好[hǎo]", hintTr: "av/au", hintEn: "ow" },
  { symbol: "ou", exampleZh: "有[yǒu]", hintTr: "ou", hintEn: "oh" },
  { symbol: "iu", exampleZh: "六[liù]", hintTr: "iyo(u)", hintEn: "yo" },
  { symbol: "ie", exampleZh: "谢[xiè]", hintTr: "iye", hintEn: "ye in yes" },
  { symbol: "üe", exampleZh: "月[yuè]", hintTr: "üe", hintEn: "ü+e" },
  { symbol: "er", exampleZh: "二[èr]", hintTr: "ar (dil kıvrık)", hintEn: "ar with curled tongue" },
  { symbol: "an", exampleZh: "看[kàn]", hintTr: "an", hintEn: "an" },
  { symbol: "en", exampleZh: "很[hěn]", hintTr: "ın", hintEn: "un" },
  { symbol: "in", exampleZh: "新[xīn]", hintTr: "in", hintEn: "in" },
  { symbol: "un", exampleZh: "婚[hūn]", hintTr: "uın", hintEn: "won" },
  { symbol: "ün", exampleZh: "云[yún]", hintTr: "ün", hintEn: "ün" },
  { symbol: "ang", exampleZh: "忙[máng]", hintTr: "ang (genizden)", hintEn: "ahng" },
  { symbol: "eng", exampleZh: "冷[lěng]", hintTr: "ıng", hintEn: "ung" },
  { symbol: "ing", exampleZh: "行[xíng]", hintTr: "ing", hintEn: "ing" },
  { symbol: "ong", exampleZh: "东[dōng]", hintTr: "ung (genizden)", hintEn: "oong" },
];

export const PINYIN_NOTES: { tr: string; en: string }[] = [
  {
    tr: "j/q/x'ten sonra yazılan u aslında ü'dür: ju = jü, qu = çü, xu = şü.",
    en: "After j/q/x the written u is actually ü: ju, qu, xu.",
  },
  {
    tr: "İki 3. ton yan yana gelirse ilki 2. tona döner: nǐ hǎo → ní hǎo okunur.",
    en: "Two third tones in a row: the first becomes second tone (nǐ hǎo → ní hǎo).",
  },
  {
    tr: "不 (bù) 4. tondan önce bú olur; 一 (yī) bağlama göre yí/yì olur.",
    en: "不 becomes bú before a 4th tone; 一 shifts to yí/yì by context.",
  },
];
