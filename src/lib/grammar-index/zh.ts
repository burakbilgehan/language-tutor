// Deterministic, comprehensive Mandarin Chinese grammar index (HSK1 → HSK6).
// This is the cheatsheet skeleton: seeded once per profile, content per
// topic is LLM-generated on demand and cached.
//
// Ordering is LEVEL-MAJOR (HSK1 → HSK6), category blocks within each level.
// Array order == display order (position = array index).
// Coverage is based on the official HSK grammar syllabus and the Chinese
// Grammar Wiki canon: every core pattern from basic word order up to
// literary/formal structures and chengyu usage.
import type { GrammarIndexEntry } from "./ja";

export const ZH_GRAMMAR_INDEX: (Omit<GrammarIndexEntry, "level"> & {
  level: "HSK1" | "HSK2" | "HSK3" | "HSK4" | "HSK5" | "HSK6";
})[] = [
  // ===================================================================
  // HSK1
  // ===================================================================

  // --- Yazı sistemi ---
  { slug: "pinyin-system", title_tr: "Pinyin Sistemi (baş sesler, son sesler)", category: "writing", level: "HSK1" },
  { slug: "tones-basics", title_tr: "Dört Ton ve Nötr Ton", category: "writing", level: "HSK1" },
  { slug: "tone-sandhi", title_tr: "Ton Değişimleri (不, 一, üçüncü ton)", category: "writing", level: "HSK1" },
  { slug: "hanzi-strokes-radicals", title_tr: "Hanzi Temelleri: Çizgi Sırası ve Radikaller", category: "writing", level: "HSK1" },

  // --- Temel cümle ---
  { slug: "basic-word-order", title_tr: "Temel Cümle Dizilişi (SVO)", category: "syntax", level: "HSK1" },
  { slug: "shi-copula", title_tr: "是 (shì): koşaç 'olmak'", category: "syntax", level: "HSK1" },
  { slug: "negation-bu", title_tr: "不 (bù) ile Olumsuzlama", category: "syntax", level: "HSK1" },
  { slug: "meiyou-negation", title_tr: "没有 (méiyǒu): sahip olmama, yapmamış olma", category: "syntax", level: "HSK1" },
  { slug: "time-word-position", title_tr: "Zaman Sözcüklerinin Yeri (今天我去...)", category: "syntax", level: "HSK1" },
  { slug: "question-words", title_tr: "Soru Sözcükleri (什么, 谁, 哪儿, 怎么)", category: "syntax", level: "HSK1" },
  { slug: "ye-dou-adverbs", title_tr: "也 (yě) ve 都 (dōu) Zarfları", category: "syntax", level: "HSK1" },

  // --- Edatlar / parçacıklar ---
  { slug: "de-possession", title_tr: "的 (de): iyelik ve niteleme", category: "particles", level: "HSK1" },
  { slug: "ma-question", title_tr: "吗 (ma) Soru Parçacığı", category: "particles", level: "HSK1" },
  { slug: "ne-question", title_tr: "呢 (ne) Parçacığı (ya sen? soruları)", category: "particles", level: "HSK1" },
  { slug: "zai-preposition", title_tr: "在 (zài) İlgeci (yer bildirme: 在家吃饭)", category: "particles", level: "HSK1" },
  { slug: "he-conjunction", title_tr: "和 (hé): 've/ile' bağlacı", category: "particles", level: "HSK1" },

  // --- İsimler ve zamirler ---
  { slug: "personal-pronouns", title_tr: "Kişi Zamirleri (我, 你, 他/她/它)", category: "nouns", level: "HSK1" },
  { slug: "plural-suffix-men", title_tr: "们 (men) Çoğul Eki (我们, 你们)", category: "nouns", level: "HSK1" },
  { slug: "demonstratives-zhe-na", title_tr: "这 (zhè) / 那 (nà) İşaret Sözcükleri", category: "nouns", level: "HSK1" },

  // --- Sayılar ve ölçü sözcükleri ---
  { slug: "numbers-basics", title_tr: "Sayılar (一'den 百'e, 两 vs 二)", category: "numbers", level: "HSK1" },
  { slug: "measure-word-ge", title_tr: "个 (gè) Ölçü Sözcüğü", category: "numbers", level: "HSK1" },
  { slug: "ji-duoshao", title_tr: "几 (jǐ) / 多少 (duōshao): sayı sorma", category: "numbers", level: "HSK1" },
  { slug: "dates-time", title_tr: "Tarih ve Saat (年, 月, 日, 星期, 点)", category: "numbers", level: "HSK1" },

  // --- Fiiller ---
  { slug: "you-have", title_tr: "有 (yǒu): sahip olmak, var olmak", category: "verbs", level: "HSK1" },
  { slug: "zai-location-verb", title_tr: "在 (zài) Fiili (bir yerde olmak)", category: "verbs", level: "HSK1" },
  { slug: "xiang-want", title_tr: "想 (xiǎng): istemek, düşünmek", category: "verbs", level: "HSK1" },
  { slug: "yao-want", title_tr: "要 (yào): istemek, gereklilik, gelecek", category: "verbs", level: "HSK1" },
  { slug: "hui-can", title_tr: "会 (huì): öğrenilmiş beceri 'yapabilmek'", category: "verbs", level: "HSK1" },
  { slug: "neng-can", title_tr: "能 (néng): fiziksel imkân 'yapabilmek'", category: "verbs", level: "HSK1" },

  // --- Sıfatlar ---
  { slug: "hen-adjective-predicate", title_tr: "很 (hěn) + Sıfat Yüklemi (是 kullanılmaz)", category: "adjectives", level: "HSK1" },
  { slug: "tai-le", title_tr: "太...了 (tài...le): 'fazla ...' kalıbı", category: "adjectives", level: "HSK1" },

  // --- İfadeler ---
  { slug: "greetings-politeness", title_tr: "Selamlaşma ve Nezaket (你好, 谢谢, 请, 对不起)", category: "expressions", level: "HSK1" },
  { slug: "names-jiao-xing", title_tr: "İsim Söyleme: 叫 (jiào) / 姓 (xìng)", category: "expressions", level: "HSK1" },

  // ===================================================================
  // HSK2
  // ===================================================================

  // --- Görünüş (aspekt) ---
  { slug: "le-completed", title_tr: "了 (le): tamamlanmış eylem", category: "verbs", level: "HSK2" },
  { slug: "le-change-of-state", title_tr: "Cümle Sonu 了 (le): durum değişikliği", category: "particles", level: "HSK2" },
  { slug: "guo-experience", title_tr: "过 (guo): deneyim görünüşü ('...mışlığım var')", category: "verbs", level: "HSK2" },
  { slug: "zhe-continuous", title_tr: "着 (zhe): süreklilik görünüşü", category: "verbs", level: "HSK2" },
  { slug: "zai-progressive", title_tr: "正在 / 在...呢: şimdiki zaman", category: "verbs", level: "HSK2" },
  { slug: "bu-vs-mei", title_tr: "不 (bù) vs 没 (méi): olumsuzluk farkı", category: "syntax", level: "HSK2" },

  // --- Karşılaştırma ve tümleçler ---
  { slug: "bi-comparison", title_tr: "比 (bǐ) ile Karşılaştırma", category: "syntax", level: "HSK2" },
  { slug: "zui-superlative", title_tr: "最 (zuì): en üstünlük derecesi", category: "adjectives", level: "HSK2" },
  { slug: "de-degree-complement", title_tr: "得 (de): derece tümleci (说得很好)", category: "verbs", level: "HSK2" },
  { slug: "directional-complements-basic", title_tr: "Yön Tümleçleri Temeli (来/去, 上来/下去)", category: "verbs", level: "HSK2" },

  // --- Fiil kalıpları ---
  { slug: "verb-reduplication", title_tr: "Fiil İkilemesi (看看, 试一试)", category: "verbs", level: "HSK2" },
  { slug: "yixia", title_tr: "V + 一下 (yíxià): 'bir ... -ivermek'", category: "verbs", level: "HSK2" },
  { slug: "keyi-permission", title_tr: "可以 (kěyǐ): izin ve olabilirlik", category: "verbs", level: "HSK2" },
  { slug: "kuai-yao-le", title_tr: "快要...了 / 要...了: 'birazdan ...'", category: "syntax", level: "HSK2" },

  // --- Soru yapıları ---
  { slug: "affirmative-negative-question", title_tr: "Olumlu-Olumsuz Soru (V不V: 去不去?)", category: "syntax", level: "HSK2" },
  { slug: "tag-questions", title_tr: "Onay Soruları (好吗?, 是吗?, 对不对?)", category: "syntax", level: "HSK2" },
  { slug: "huozhe-haishi", title_tr: "或者 (huòzhě) vs 还是 (háishi): 'veya'", category: "syntax", level: "HSK2" },

  // --- Bağlaçlar ---
  { slug: "yinwei-suoyi", title_tr: "因为...所以... (çünkü... bu yüzden...)", category: "syntax", level: "HSK2" },
  { slug: "suiran-danshi", title_tr: "虽然...但是... (gerçi... ama...)", category: "syntax", level: "HSK2" },
  { slug: "yibian-yibian", title_tr: "一边...一边... (bir yandan... bir yandan...)", category: "syntax", level: "HSK2" },
  { slug: "de-shihou", title_tr: "...的时候 (de shíhou): '...-dığı zaman'", category: "syntax", level: "HSK2" },
  { slug: "zai-vs-you", title_tr: "再 (zài) vs 又 (yòu): 'tekrar' farkı", category: "syntax", level: "HSK2" },

  // --- İlgeçler (coverb) ---
  { slug: "gei-coverb", title_tr: "给 (gěi) İlgeci ('-e, için': 给我打电话)", category: "particles", level: "HSK2" },
  { slug: "cong-dao", title_tr: "从...到... (cóng...dào...): '...-den ...-e'", category: "particles", level: "HSK2" },
  { slug: "li-distance", title_tr: "离 (lí): uzaklık bildirme", category: "particles", level: "HSK2" },
  { slug: "ba-suggestion", title_tr: "吧 (ba): öneri ve tahmin parçacığı", category: "particles", level: "HSK2" },

  // --- Sayılar ---
  { slug: "measure-words-common", title_tr: "Yaygın Ölçü Sözcükleri (本, 张, 杯, 件, 只...)", category: "numbers", level: "HSK2" },
  { slug: "ordinal-di", title_tr: "第 (dì) ile Sıra Sayıları", category: "numbers", level: "HSK2" },

  // ===================================================================
  // HSK3
  // ===================================================================

  // --- Temel yapılar ---
  { slug: "ba-construction-basic", title_tr: "把 (bǎ) Yapısı Temeli (nesneyi öne alma)", category: "syntax", level: "HSK3" },
  { slug: "bei-passive-basic", title_tr: "被 (bèi) Edilgen Yapısı Temeli", category: "syntax", level: "HSK3" },
  { slug: "shi-de-construction", title_tr: "是...的 Yapısı (zaman/yer/yöntem vurgusu)", category: "syntax", level: "HSK3" },
  { slug: "topic-comment", title_tr: "Konu-Yorum Cümleleri (那本书我看过)", category: "syntax", level: "HSK3" },

  // --- Tümleçler ---
  { slug: "resultative-complements", title_tr: "Sonuç Tümleçleri (完, 好, 到, 见, 懂, 错)", category: "verbs", level: "HSK3" },
  { slug: "directional-complements-compound", title_tr: "Bileşik Yön Tümleçleri (起来, 下去, 出来...)", category: "verbs", level: "HSK3" },
  { slug: "duration-complement", title_tr: "Süre Tümleci (学了三年汉语)", category: "verbs", level: "HSK3" },
  { slug: "frequency-complement", title_tr: "Sıklık Tümleci (次, 遍, 趟)", category: "verbs", level: "HSK3" },

  // --- Parçacıklar ---
  { slug: "de-adverbial", title_tr: "地 (de): zarf yapma parçacığı", category: "particles", level: "HSK3" },
  { slug: "de-three-way", title_tr: "的 / 得 / 地 Karşılaştırması", category: "particles", level: "HSK3" },
  { slug: "a-particle", title_tr: "啊 (a): cümle sonu ünlem parçacığı", category: "particles", level: "HSK3" },
  { slug: "dui-coverb", title_tr: "对 (duì) İlgeci ('-e karşı, hakkında')", category: "particles", level: "HSK3" },

  // --- Karşılaştırma ---
  { slug: "geng-comparative", title_tr: "更 (gèng): 'daha da'", category: "adjectives", level: "HSK3" },
  { slug: "bi-comparison-extended", title_tr: "比 Genişletilmiş (比...更 / 多了 / 一点儿)", category: "syntax", level: "HSK3" },
  { slug: "gen-yiyang", title_tr: "跟...一样 (gēn...yíyàng): '... ile aynı'", category: "syntax", level: "HSK3" },
  { slug: "yidianr-youdianr", title_tr: "一点儿 vs 有点儿 ('biraz' farkı)", category: "adjectives", level: "HSK3" },

  // --- Kalıplar ---
  { slug: "yuelaiyue", title_tr: "越来越 (yuèláiyuè): 'gitgide daha...'", category: "syntax", level: "HSK3" },
  { slug: "yue-yue", title_tr: "越...越... (yuè...yuè...): '...-dıkça ...'", category: "syntax", level: "HSK3" },
  { slug: "you-you", title_tr: "又...又... (yòu...yòu...): 'hem... hem...'", category: "syntax", level: "HSK3" },
  { slug: "zhiyao-jiu", title_tr: "只要...就... (yeter ki... o zaman...)", category: "syntax", level: "HSK3" },
  { slug: "zhiyou-cai", title_tr: "只有...才... (ancak... -sa ...)", category: "syntax", level: "HSK3" },
  { slug: "ruguo-jiu", title_tr: "如果...就... (eğer... o zaman...)", category: "syntax", level: "HSK3" },
  { slug: "chule-yiwai", title_tr: "除了...以外 (...dışında, ...-den başka)", category: "syntax", level: "HSK3" },
  { slug: "weile-purpose", title_tr: "为了 (wèile): '... için, amacıyla'", category: "syntax", level: "HSK3" },
  { slug: "xian-ranhou-zai", title_tr: "先...然后...再... (önce... sonra... daha sonra...)", category: "syntax", level: "HSK3" },
  { slug: "jiu-vs-cai", title_tr: "就 (jiù) vs 才 (cái): erken/geç vurgusu", category: "syntax", level: "HSK3" },
  { slug: "duo-questions", title_tr: "多 (duō) + Sıfat Soruları (多长, 多高, 多远)", category: "syntax", level: "HSK3" },

  // --- Fiiller ---
  { slug: "rang-jiao-causative", title_tr: "让 / 叫 (ràng/jiào): ettirgen 'yaptırmak'", category: "verbs", level: "HSK3" },
  { slug: "yinggai-dei-modals", title_tr: "应该 / 得 (děi) / 必须: gereklilik kipleri", category: "verbs", level: "HSK3" },
  { slug: "xiang-resemble", title_tr: "像 (xiàng): 'benzemek, gibi'", category: "verbs", level: "HSK3" },
  { slug: "double-object-verbs", title_tr: "Çift Nesneli Fiiller (给, 教, 送, 问)", category: "verbs", level: "HSK3" },

  // --- Sayılar ---
  { slug: "approximate-numbers", title_tr: "Yaklaşık Sayılar (几, 多, 左右, 大概)", category: "numbers", level: "HSK3" },

  // ===================================================================
  // HSK4
  // ===================================================================

  // --- Temel yapılar (tam kapsam) ---
  { slug: "ba-construction-full", title_tr: "把 (bǎ) Yapısı Tam Kapsam (tümleç zorunluluğu)", category: "syntax", level: "HSK4" },
  { slug: "bei-passive-full", title_tr: "Edilgen Tam Kapsam (被 / 叫 / 让)", category: "syntax", level: "HSK4" },
  { slug: "potential-complements", title_tr: "Yeterlilik Tümleçleri (听得懂 / 听不懂)", category: "verbs", level: "HSK4" },
  { slug: "separable-verbs", title_tr: "Ayrılabilir Fiiller 离合词 (见面, 帮忙, 睡觉)", category: "verbs", level: "HSK4" },
  { slug: "qilai-extended", title_tr: "起来 (qǐlai) Genişletilmiş (看起来, 想起来)", category: "verbs", level: "HSK4" },
  { slug: "xiaqu-continue", title_tr: "下去 (xiàqu): 'sürdürmek' (说下去)", category: "verbs", level: "HSK4" },
  { slug: "budebu", title_tr: "不得不 (bùdébù): 'mecbur kalmak'", category: "verbs", level: "HSK4" },

  // --- Bağlaçlar ---
  { slug: "budan-erqie", title_tr: "不但...而且... (yalnızca değil... üstelik...)", category: "syntax", level: "HSK4" },
  { slug: "jinguan-danshi", title_tr: "尽管...但是... (her ne kadar... yine de...)", category: "syntax", level: "HSK4" },
  { slug: "buguan-dou", title_tr: "不管...都... (... olursa olsun)", category: "syntax", level: "HSK4" },
  { slug: "wulun-dou", title_tr: "无论...都... (ne olursa olsun, resmî)", category: "syntax", level: "HSK4" },
  { slug: "jishi-ye", title_tr: "即使...也... (... olsa bile)", category: "syntax", level: "HSK4" },
  { slug: "jiran-jiu", title_tr: "既然...就... (madem... o halde...)", category: "syntax", level: "HSK4" },
  { slug: "ji-you", title_tr: "既...又... (hem... hem..., resmî)", category: "syntax", level: "HSK4" },
  { slug: "yaoshi-dehua", title_tr: "Koşul Çeşitleri (要是, ...的话)", category: "syntax", level: "HSK4" },
  { slug: "yi-jiu", title_tr: "一...就... (... -er -ermez)", category: "syntax", level: "HSK4" },
  { slug: "yushi-yinci", title_tr: "于是 / 因此 (bunun üzerine / bu nedenle)", category: "syntax", level: "HSK4" },

  // --- Vurgu ve söylem ---
  { slug: "lian-dou", title_tr: "连...都/也 (lián...dōu): '... bile'", category: "syntax", level: "HSK4" },
  { slug: "nandao-rhetorical", title_tr: "难道 (nándào): retorik soru 'yoksa... mı?'", category: "syntax", level: "HSK4" },
  { slug: "shenzhi", title_tr: "甚至 (shènzhì): 'hatta, üstelik'", category: "syntax", level: "HSK4" },
  { slug: "que-contrast", title_tr: "却 (què): beklenti kıran 'ama, oysa'", category: "syntax", level: "HSK4" },
  { slug: "buru-comparison", title_tr: "不如 / 没有...那么 (olumsuz karşılaştırma)", category: "syntax", level: "HSK4" },
  { slug: "haoxiang-sihu", title_tr: "好像 / 似乎 ('sanki, gibi görünmek')", category: "syntax", level: "HSK4" },
  { slug: "gang-vs-gangcai", title_tr: "刚 (gāng) vs 刚才 (gāngcái): 'demin' farkı", category: "syntax", level: "HSK4" },
  { slug: "daodi-jiujing", title_tr: "到底 / 究竟 ('Allah aşkına, aslında')", category: "expressions", level: "HSK4" },
  { slug: "zhihao", title_tr: "只好 (zhǐhǎo): 'çaresiz, mecburen'", category: "expressions", level: "HSK4" },
  { slug: "kongpa", title_tr: "恐怕 (kǒngpà): 'korkarım ki'", category: "expressions", level: "HSK4" },
  { slug: "qianwan-imperative", title_tr: "千万 (qiānwàn): 'sakın, ne olursa olsun'", category: "expressions", level: "HSK4" },
  { slug: "shouxian-qici", title_tr: "Söylem Sıralayıcıları (首先, 其次, 最后)", category: "expressions", level: "HSK4" },

  // --- İkileme ve sayılar ---
  { slug: "adjective-reduplication", title_tr: "Sıfat İkilemesi (AABB: 高高兴兴)", category: "adjectives", level: "HSK4" },
  { slug: "measure-word-reduplication", title_tr: "Ölçü Sözcüğü İkilemesi (个个, 天天: 'her')", category: "numbers", level: "HSK4" },
  { slug: "fractions-multiples", title_tr: "Kesirler, Yüzdeler ve Katlar (分之, 倍)", category: "numbers", level: "HSK4" },

  // ===================================================================
  // HSK5
  // ===================================================================

  // --- Yazılı/resmî ilgeçler ---
  { slug: "zhi-attributive", title_tr: "之 (zhī): yazı dilinde 的 (百分之十, 之间)", category: "particles", level: "HSK5" },
  { slug: "yu-preposition", title_tr: "于 (yú): yazı dili ilgeci (位于, 等于, 在于)", category: "particles", level: "HSK5" },
  { slug: "duiyu-guanyu", title_tr: "对于 / 关于 ('... konusunda / hakkında')", category: "particles", level: "HSK5" },
  { slug: "anzhao-genju", title_tr: "按照 / 根据 ('...-e göre, uyarınca')", category: "particles", level: "HSK5" },
  { slug: "jingguo-tongguo", title_tr: "经过 / 通过 ('... yoluyla, aracılığıyla')", category: "particles", level: "HSK5" },
  { slug: "yiji", title_tr: "以及 (yǐjí): resmî 've, ile birlikte'", category: "particles", level: "HSK5" },
  { slug: "zhiyu", title_tr: "至于 (zhìyú): '...-e gelince'", category: "particles", level: "HSK5" },

  // --- Resmî bağlaçlar ---
  { slug: "zhi-suoyi", title_tr: "之所以...是因为... ('...-mesinin nedeni ...')", category: "syntax", level: "HSK5" },
  { slug: "er-contrast", title_tr: "而 (ér): yazı dili 've/ama' bağlacı", category: "syntax", level: "HSK5" },
  { slug: "conger", title_tr: "从而 (cóng'ér): 'böylece, bu sayede'", category: "syntax", level: "HSK5" },
  { slug: "faner", title_tr: "反而 (fǎn'ér): 'tam tersine'", category: "syntax", level: "HSK5" },
  { slug: "fouze-buran", title_tr: "否则 / 不然 ('aksi takdirde')", category: "syntax", level: "HSK5" },
  { slug: "hekuang", title_tr: "更/何况 (hékuàng): 'kaldı ki, nerede kaldı'", category: "syntax", level: "HSK5" },
  { slug: "youyu-daozhi", title_tr: "由于 / 导致 ('...-den ötürü / ...-e yol açmak')", category: "syntax", level: "HSK5" },
  { slug: "suizhe", title_tr: "随着 (suízhe): '... ile birlikte, ...-dikçe'", category: "syntax", level: "HSK5" },
  { slug: "yilai", title_tr: "以来 (yǐlái): '...-den beri'", category: "syntax", level: "HSK5" },

  // --- Kalıplar ---
  { slug: "ningke-yebu", title_tr: "宁可...也不... ('... -meyi yeğlerim, ... -mem')", category: "syntax", level: "HSK5" },
  { slug: "yaome-yaome", title_tr: "要么...要么... ('ya... ya...')", category: "syntax", level: "HSK5" },
  { slug: "bushi-jiushi", title_tr: "不是...就是... ('değilse... o zaman...')", category: "syntax", level: "HSK5" },
  { slug: "bushi-ershi", title_tr: "不是...而是... ('... değil, aksine ...')", category: "syntax", level: "HSK5" },
  { slug: "chufei", title_tr: "除非...才/否则 ('... olmadıkça')", category: "syntax", level: "HSK5" },
  { slug: "jiaru-jiashi", title_tr: "Resmî Koşul (假如, 假使)", category: "syntax", level: "HSK5" },
  { slug: "wanyi", title_tr: "万一 (wànyī): 'olur da, ya ... -sa'", category: "syntax", level: "HSK5" },
  { slug: "fei-buke", title_tr: "非...不可 ('mutlaka ... -meli')", category: "syntax", level: "HSK5" },
  { slug: "shifou", title_tr: "是否 (shìfǒu): resmî '... olup olmadığı'", category: "syntax", level: "HSK5" },
  { slug: "jiang-formal-ba", title_tr: "将 (jiāng): resmî 把 ve gelecek işareti", category: "syntax", level: "HSK5" },
  { slug: "suo-structure", title_tr: "所 (suǒ) Yapısı (所+V, 所谓, 所有)", category: "syntax", level: "HSK5" },
  { slug: "you-shoudao-zaodao", title_tr: "Resmî Edilgen (由, 受到, 遭到)", category: "syntax", level: "HSK5" },

  // --- Fiil / derece ---
  { slug: "degree-complements-advanced", title_tr: "İleri Derece Tümleçleri (得很, 极了, 死了)", category: "verbs", level: "HSK5" },
  { slug: "yiwei-vs-renwei", title_tr: "以为 vs 认为 ('sanmak' vs 'düşünmek')", category: "verbs", level: "HSK5" },

  // --- İfadeler / sicil ---
  { slug: "nanguai-guaibude", title_tr: "难怪 / 怪不得 ('demek o yüzden')", category: "expressions", level: "HSK5" },
  { slug: "jianzhi", title_tr: "简直 (jiǎnzhí): 'resmen, adeta'", category: "expressions", level: "HSK5" },
  { slug: "weibi", title_tr: "未必 (wèibì): 'illa ki değil'", category: "expressions", level: "HSK5" },
  { slug: "written-vs-spoken", title_tr: "Yazı Dili vs Konuşma Dili (书面语 / 口语)", category: "register", level: "HSK5" },

  // ===================================================================
  // HSK6
  // ===================================================================

  // --- Edebî / resmî bağlaçlar ---
  { slug: "tangruo", title_tr: "倘若 (tǎngruò): edebî 'şayet'", category: "syntax", level: "HSK6" },
  { slug: "guran", title_tr: "固然...但是... ('gerçi öyledir ama...')", category: "syntax", level: "HSK6" },
  { slug: "yimian-miande", title_tr: "以便 / 以免 / 免得 ('...-mek için / ...-memek için')", category: "syntax", level: "HSK6" },
  { slug: "yizhi-yizhi", title_tr: "以至 / 以致 ('öyle ki, sonucunda')", category: "syntax", level: "HSK6" },
  { slug: "fanshi-dou", title_tr: "凡是...都... ('her kim/ne ... ise')", category: "syntax", level: "HSK6" },
  { slug: "yuqi-buru", title_tr: "与其...不如... ('...-maktansa ...-mak yeğdir')", category: "syntax", level: "HSK6" },
  { slug: "yidan-jiu", title_tr: "一旦...就... ('bir kez ... oldu mu')", category: "syntax", level: "HSK6" },
  { slug: "buzhiyu", title_tr: "不至于 (búzhìyú): 'o raddeye varmaz'", category: "syntax", level: "HSK6" },
  { slug: "jianyu-benzhe", title_tr: "Resmî Gerekçe İlgeçleri (鉴于, 基于, 本着)", category: "particles", level: "HSK6" },

  // --- Retorik ve vurgu ---
  { slug: "qi-hechang-rhetorical", title_tr: "İleri Retorik Sorular (岂, 何尝)", category: "syntax", level: "HSK6" },
  { slug: "double-negation", title_tr: "Çifte Olumsuzlama (不无, 未尝不, 无不)", category: "syntax", level: "HSK6" },
  { slug: "hebi-heku", title_tr: "何必 / 何苦 ('ne gerek var / ne diye')", category: "expressions", level: "HSK6" },
  { slug: "henbude-babude", title_tr: "恨不得 / 巴不得 ('can atmak' kalıpları)", category: "expressions", level: "HSK6" },
  { slug: "bukui-nanmian", title_tr: "不愧 / 难免 ('adına yakışır / kaçınılmaz')", category: "expressions", level: "HSK6" },
  { slug: "wufei-buwaihu", title_tr: "无非 / 不外乎 ('...-den ibaret')", category: "expressions", level: "HSK6" },
  { slug: "shibi-weimian", title_tr: "势必 / 未免 ('kaçınılmaz olarak / doğrusu biraz')", category: "expressions", level: "HSK6" },

  // --- Edebî dil ---
  { slug: "chengyu-patterns", title_tr: "成语 (chéngyǔ) Kullanım Kalıpları", category: "classical", level: "HSK6" },
  { slug: "literary-negation", title_tr: "Edebî Olumsuzlama (未, 无, 非, 勿)", category: "classical", level: "HSK6" },
  { slug: "qi-zhe-literary", title_tr: "Edebî Zamir ve Parçacıklar (其, 者, 也, 矣)", category: "classical", level: "HSK6" },
  { slug: "yi-wei-literary", title_tr: "以...为... (yǐ...wéi...): '...-i ... saymak'", category: "classical", level: "HSK6" },
  { slug: "cengjing-weiceng", title_tr: "曾经 / 未曾 / 不曾 (edebî geçmiş deneyim)", category: "classical", level: "HSK6" },
  { slug: "zhiji-zhiyu", title_tr: "之际 / 之余 ('... esnasında / ...-den arta kalan')", category: "classical", level: "HSK6" },

  // --- Söylem ve sicil ---
  { slug: "liushuiju-topic-chains", title_tr: "Akan Cümleler 流水句 ve Konu Zincirleri", category: "syntax", level: "HSK6" },
  { slug: "four-char-parallelism", title_tr: "Dört Karakterli Kalıplar ve Koşutluk (四字格)", category: "register", level: "HSK6" },
  { slug: "chucizhiwai", title_tr: "Resmî Söylem Geçişleri (除此之外, 此外, 总而言之)", category: "register", level: "HSK6" },
];
