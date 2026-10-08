// Japan travel sprint (T-099): an authored block of units that
// `insertTravelSprint` (core/travel-sprint.ts) splices into an existing ja
// curriculum right before the learner's frontier node. Structure is static
// (zero LLM for the skeleton); each node's lesson is generated on open like
// any other node, steered by the objectives below plus the travel rules the
// lesson prompt adds for `TRAVEL_SPRINT_THEME_PREFIX` units.
//
// Titles/objectives come in tr + en because unit/node titles are plain
// columns in the curriculum's content language (T-031).

export const TRAVEL_SPRINT_THEME_PREFIX = "travel-sprint";

type L = { tr: string; en: string };

export interface SprintNode {
  lessonType: "lesson" | "checkpoint" | "boss";
  title: L;
  subtitle: L;
  objectives: { tr: string[]; en: string[] };
  xp: number;
}

export interface SprintUnit {
  /** Suffix of the unit theme: `travel-sprint:<key>`. */
  key: string;
  title: L;
  description: L;
  nodes: SprintNode[];
}

const lesson = (
  title: L,
  subtitle: L,
  tr: string[],
  en: string[],
  xp = 30
): SprintNode => ({ lessonType: "lesson", title, subtitle, objectives: { tr, en }, xp });

export const TRAVEL_SPRINT_JA: SprintUnit[] = [
  {
    key: "survival",
    title: { tr: "Seyahat sprinti 1: Hayatta kalma kalıpları", en: "Travel sprint 1: Survival phrases" },
    description: {
      tr: "Japonya'da her gün kullanacağın 15 kalıp: rica, teşekkür, soru, anlamadığını söyleme.",
      en: "The 15 phrases you will use every day in Japan: asking, thanking, questions, saying you did not understand.",
    },
    nodes: [
      lesson(
        { tr: "すみません ve お願いします", en: "すみません and お願いします" },
        { tr: "Dikkat çekmek, rica etmek, teşekkür", en: "Getting attention, asking, thanking" },
        [
          "すみません'in üç kullanımı: özür, dikkat çekme, teşekkür",
          "〜をお願いします / 〜をください ile bir şey isteme",
          "ありがとうございます / どうも ile teşekkür etme",
        ],
        [
          "The three uses of すみません: apology, getting attention, thanks",
          "Asking for things with 〜をお願いします / 〜をください",
          "Thanking with ありがとうございます / どうも",
        ]
      ),
      lesson(
        { tr: "Nerede? Var mı?", en: "Where is it? Do you have it?" },
        { tr: "〜はどこですか・〜はありますか", en: "〜はどこですか and 〜はありますか" },
        [
          "〜はどこですか ile yer sorma (トイレ, 駅, 出口)",
          "〜はありますか ile bir şeyin olup olmadığını sorma",
          "あそこ・こちら・まっすぐ gibi kısa cevapları anlama",
        ],
        [
          "Asking where things are with 〜はどこですか (トイレ, 駅, 出口)",
          "Asking whether something is available with 〜はありますか",
          "Understanding short answers like あそこ, こちら, まっすぐ",
        ]
      ),
      lesson(
        { tr: "Fiyat ve sayılar", en: "Prices and numbers" },
        { tr: "いくらですか, yen fiyatlarını duyup anlama", en: "いくらですか, hearing and reading yen prices" },
        [
          "100-10.000 arası sayıları duyunca anlama (百, 千, 万)",
          "いくらですか ile fiyat sorma, 円 fiyat etiketlerini okuma",
          "Adet sayma: ひとつ〜みっつ ve 〜つ ile sipariş",
        ],
        [
          "Understanding numbers 100 to 10,000 by ear (百, 千, 万)",
          "Asking the price with いくらですか and reading 円 price tags",
          "Counting items with ひとつ〜みっつ and ordering with 〜つ",
        ]
      ),
      lesson(
        { tr: "Anlamadım, tekrar eder misiniz?", en: "I did not understand, could you repeat?" },
        { tr: "Konuşmayı kurtaran kalıplar", en: "Phrases that rescue a conversation" },
        [
          "わかりません / もう一度お願いします / ゆっくりお願いします",
          "英語は大丈夫ですか ile İngilizce sorma",
          "Telefonda/yazıyla gösterme: これです, ここに書いてください",
        ],
        [
          "わかりません / もう一度お願いします / ゆっくりお願いします",
          "Asking whether English is OK with 英語は大丈夫ですか",
          "Pointing and writing: これです, ここに書いてください",
        ]
      ),
      {
        lessonType: "checkpoint",
        title: { tr: "Kontrol: İlk gün", en: "Checkpoint: Day one" },
        subtitle: { tr: "Hayatta kalma kalıplarının karışık tekrarı", en: "Mixed review of the survival phrases" },
        objectives: {
          tr: ["Ünitedeki kalıpları gerçek mini durumlarda karışık kullanma"],
          en: ["Using the unit's phrases mixed together in real mini situations"],
        },
        xp: 45,
      },
    ],
  },
  {
    key: "transport",
    title: { tr: "Seyahat sprinti 2: Havalimanı ve trenler", en: "Travel sprint 2: Airport and trains" },
    description: {
      tr: "Pasaport kontrolünden Shinkansen'e: tabelaları okumak ve doğru trene binmek.",
      en: "From passport control to the Shinkansen: reading the signs and boarding the right train.",
    },
    nodes: [
      lesson(
        { tr: "Varış: pasaport ve gümrük", en: "Arrival: passport and customs" },
        { tr: "入国審査・税関 kelimeleri", en: "入国審査 and 税関 vocabulary" },
        [
          "入国・出国・税関・到着・出発 tabelalarını tanıma",
          "Kalış amacı ve süresi sorusuna cevap: 観光です, 三週間です",
          "Japonya'ya giriş formalitelerinde duyulan kısa soruları anlama",
        ],
        [
          "Recognising the 入国, 出国, 税関, 到着, 出発 signs",
          "Answering purpose and length of stay: 観光です, 三週間です",
          "Understanding the short questions asked at entry formalities",
        ]
      ),
      lesson(
        { tr: "IC kart ve bilet makinesi", en: "IC card and ticket machine" },
        { tr: "Suica/Pasmo, チャージ, 切符", en: "Suica/Pasmo, チャージ, 切符" },
        [
          "切符・乗車券・チャージ・残高 kelimeleri",
          "Bilet makinesindeki 大人/小人, 現金, 領収書 düğmeleri",
          "改札 geçişi: 入口/出口, ピッという sesler, kart okumadığında ne denir",
        ],
        [
          "The words 切符, 乗車券, チャージ, 残高",
          "Ticket machine buttons: 大人/小人, 現金, 領収書",
          "Passing the 改札: 入口/出口 and what to say when the card does not read",
        ]
      ),
      lesson(
        { tr: "Peron ve aktarma", en: "Platforms and transfers" },
        { tr: "番線・乗り換え・各駅停車/快速/急行", en: "番線, 乗り換え, local/rapid/express" },
        [
          "〜番線, 乗り換え, 〜行き, 次は〜 duyuru ve tabelalarını anlama",
          "各駅停車・快速・急行・特急 farkı",
          "〜に行きたいです / 〜行きはどこですか ile yön sorma",
        ],
        [
          "Understanding 〜番線, 乗り換え, 〜行き and 次は〜 in signs and announcements",
          "The difference between 各駅停車, 快速, 急行, 特急",
          "Asking the way with 〜に行きたいです / 〜行きはどこですか",
        ]
      ),
      lesson(
        { tr: "Shinkansen ve taksi", en: "Shinkansen and taxi" },
        { tr: "指定席/自由席, 号車, taksiye adres verme", en: "Reserved/unreserved seats, car numbers, giving a taxi an address" },
        [
          "指定席・自由席・号車・〜番 A席 bilgisini okuma",
          "みどりの窓口'da bilet alma: 〜まで、大人一枚、指定席で",
          "Taksi: 〜までお願いします, ここで止めてください, カードで",
        ],
        [
          "Reading 指定席, 自由席, 号車 and seat numbers",
          "Buying at みどりの窓口: 〜まで、大人一枚、指定席で",
          "Taxi: 〜までお願いします, ここで止めてください, カードで",
        ]
      ),
      {
        lessonType: "boss",
        title: { tr: "Boss: Havalimanından otele", en: "Boss: Airport to hotel" },
        subtitle: { tr: "Uçaktan inip otel kapısına kadar her adım", en: "Every step from landing to the hotel door" },
        objectives: {
          tr: ["Varış, IC kart, aktarma ve taksi adımlarını tek bir senaryoda birleştirme"],
          en: ["Combining arrival, IC card, transfer and taxi steps in one scenario"],
        },
        xp: 70,
      },
    ],
  },
  {
    key: "lodging",
    title: { tr: "Seyahat sprinti 3: Otel, ryokan, onsen", en: "Travel sprint 3: Hotel, ryokan, onsen" },
    description: {
      tr: "Check-in, bagaj, sorun bildirme ve onsen görgü kuralları.",
      en: "Check-in, luggage, reporting a problem and onsen etiquette.",
    },
    nodes: [
      lesson(
        { tr: "Check-in ve check-out", en: "Check-in and check-out" },
        { tr: "予約・チェックイン・名前", en: "予約, チェックイン, giving your name" },
        [
          "予約しています / 〜という名前です ile giriş yapma",
          "チェックイン・チェックアウト saatini sorma ve anlama",
          "朝食・Wi-Fi・パスワード sorularını sorma",
        ],
        [
          "Checking in with 予約しています / 〜という名前です",
          "Asking and understanding check-in and check-out times",
          "Asking about 朝食, Wi-Fi and the パスワード",
        ]
      ),
      lesson(
        { tr: "Bagaj ve küçük istekler", en: "Luggage and small requests" },
        { tr: "荷物を預ける, 〜てもいいですか", en: "Leaving luggage, 〜てもいいですか" },
        [
          "荷物を預かってもらえますか ile bagaj bırakma",
          "〜てもいいですか ile izin isteme",
          "タオル・毛布・充電器 gibi şeyleri isteme",
        ],
        [
          "Leaving luggage with 荷物を預かってもらえますか",
          "Asking permission with 〜てもいいですか",
          "Asking for タオル, 毛布, 充電器 and similar items",
        ]
      ),
      lesson(
        { tr: "Bir sorun var", en: "There is a problem" },
        { tr: "〜が壊れています, 〜が使えません", en: "〜が壊れています, 〜が使えません" },
        [
          "〜が壊れています / 〜が使えません / 〜がつきません ile arıza bildirme",
          "部屋・鍵・エアコン・お湯 kelimeleri",
          "Kibar şikayet: すみません、ちょっと問題があって…",
        ],
        [
          "Reporting faults with 〜が壊れています / 〜が使えません / 〜がつきません",
          "The words 部屋, 鍵, エアコン, お湯",
          "Complaining politely: すみません、ちょっと問題があって…",
        ]
      ),
      lesson(
        { tr: "Ryokan ve onsen", en: "Ryokan and onsen" },
        { tr: "男湯/女湯, kurallar, yukata", en: "男湯/女湯, rules, yukata" },
        [
          "男・女・湯・入口・禁止 tabelalarını tanıma",
          "Onsen kuralları: önce yıkanma, havlu suya girmez, dövme politikası (タトゥー)",
          "夕食は何時ですか gibi ryokan soruları",
        ],
        [
          "Recognising the 男, 女, 湯, 入口, 禁止 signs",
          "Onsen rules: wash first, no towel in the water, tattoo policy (タトゥー)",
          "Ryokan questions like 夕食は何時ですか",
        ]
      ),
      {
        lessonType: "checkpoint",
        title: { tr: "Kontrol: Konaklama", en: "Checkpoint: Lodging" },
        subtitle: { tr: "Otel ve ryokan kalıplarının karışık tekrarı", en: "Mixed review of hotel and ryokan phrases" },
        objectives: {
          tr: ["Check-in, istek ve sorun bildirme kalıplarını karışık kullanma"],
          en: ["Mixing check-in, request and problem-report phrases"],
        },
        xp: 45,
      },
    ],
  },
  {
    key: "food",
    title: { tr: "Seyahat sprinti 4: Yemek ve konbini", en: "Travel sprint 4: Food and konbini" },
    description: {
      tr: "Restorana girişten hesaba, bilet makineli ramenden konbiniye.",
      en: "From entering a restaurant to the bill, from ticket-machine ramen to the konbini.",
    },
    nodes: [
      lesson(
        { tr: "Restorana giriş", en: "Entering a restaurant" },
        { tr: "何名様ですか, 二人です, 予約", en: "何名様ですか, 二人です, reservations" },
        [
          "いらっしゃいませ / 何名様ですか sorularını anlama ve 一人/二人です ile cevaplama",
          "禁煙・喫煙, カウンター・テーブル seçimi",
          "Bekleme: 待ちます, どのくらいですか",
        ],
        [
          "Understanding いらっしゃいませ / 何名様ですか and answering with 一人/二人です",
          "Choosing 禁煙/喫煙 and カウンター/テーブル",
          "Waiting: 待ちます, どのくらいですか",
        ]
      ),
      lesson(
        { tr: "Menü ve sipariş", en: "Menu and ordering" },
        { tr: "〜をください, おすすめ, 大盛り", en: "〜をください, おすすめ, 大盛り" },
        [
          "Menüde sık kanjiler: 肉・魚・鶏・豚・牛・飯・麺・定食",
          "おすすめは何ですか ile öneri isteme",
          "〜を一つください / これとこれ, 大盛り・並 seçimi",
        ],
        [
          "Common menu kanji: 肉, 魚, 鶏, 豚, 牛, 飯, 麺, 定食",
          "Asking for a recommendation with おすすめは何ですか",
          "Ordering with 〜を一つください / これとこれ, choosing 大盛り or 並",
        ]
      ),
      lesson(
        { tr: "Alerji ve özel istekler", en: "Allergies and special requests" },
        { tr: "〜が食べられません, 〜抜きで", en: "〜が食べられません, 〜抜きで" },
        [
          "〜が食べられません / 〜アレルギーがあります ile kısıt bildirme",
          "〜抜きで / 〜なしで ile bir malzemeyi çıkartma",
          "Domuz, alkol, deniz ürünü sorma: 豚肉は入っていますか",
        ],
        [
          "Stating restrictions with 〜が食べられません / 〜アレルギーがあります",
          "Leaving an ingredient out with 〜抜きで / 〜なしで",
          "Asking about pork, alcohol, seafood: 豚肉は入っていますか",
        ]
      ),
      lesson(
        { tr: "Bilet makinesi, hesap ve konbini", en: "Ticket machines, the bill and the konbini" },
        { tr: "食券, お会計, 温めますか, 袋", en: "食券, お会計, 温めますか, 袋" },
        [
          "食券 makinesinde düğme okuma ve 食券を買ってください talimatını anlama",
          "お会計お願いします, 別々で, カードで払えますか",
          "Konbinide 温めますか・袋はいりますか・ポイントカード sorularını anlayıp cevaplama",
        ],
        [
          "Reading 食券 machine buttons and understanding 食券を買ってください",
          "お会計お願いします, 別々で, カードで払えますか",
          "Understanding and answering 温めますか, 袋はいりますか, ポイントカード at the konbini",
        ]
      ),
      {
        lessonType: "boss",
        title: { tr: "Boss: Izakaya akşamı", en: "Boss: Izakaya night" },
        subtitle: { tr: "Girişten hesaba bir akşam yemeği", en: "A dinner from the door to the bill" },
        objectives: {
          tr: ["Giriş, sipariş, özel istek ve hesap adımlarını tek senaryoda birleştirme"],
          en: ["Combining entry, ordering, special requests and the bill in one scenario"],
        },
        xp: 70,
      },
    ],
  },
  {
    key: "shopping",
    title: { tr: "Seyahat sprinti 5: Alışveriş", en: "Travel sprint 5: Shopping" },
    description: {
      tr: "Beden ve renk sorma, deneme, tax-free ve ödeme.",
      en: "Asking for sizes and colours, trying on, tax-free and paying.",
    },
    nodes: [
      lesson(
        { tr: "Bunu arıyorum", en: "I am looking for this" },
        { tr: "〜を探しています, 見ているだけです", en: "〜を探しています, 見ているだけです" },
        [
          "〜を探しています ile ürün sorma",
          "見ているだけです ile kibarca yalnız bakmak",
          "Kat ve bölüm: 〜階, 売り場, エレベーター",
        ],
        [
          "Asking for a product with 〜を探しています",
          "Saying politely you are just looking: 見ているだけです",
          "Floors and sections: 〜階, 売り場, エレベーター",
        ]
      ),
      lesson(
        { tr: "Beden, renk, deneme", en: "Size, colour, trying on" },
        { tr: "試着, もっと大きい, 色違い", en: "試着, もっと大きい, other colours" },
        [
          "試着してもいいですか ile deneme isteme",
          "もっと大きい/小さいのはありますか, 他の色はありますか",
          "S/M/L ve renk kelimeleri: 黒・白・赤・青",
        ],
        [
          "Asking to try on with 試着してもいいですか",
          "もっと大きい/小さいのはありますか, 他の色はありますか",
          "S/M/L and colour words: 黒, 白, 赤, 青",
        ]
      ),
      lesson(
        { tr: "Tax-free ve ödeme", en: "Tax-free and paying" },
        { tr: "免税, パスポート, カード/現金", en: "免税, passport, card or cash" },
        [
          "免税できますか ve パスポート talebini anlama",
          "カードで / 現金で / 一括で ödeme kalıpları",
          "Hediye paketi: プレゼント用に包んでください",
        ],
        [
          "免税できますか and understanding the passport request",
          "Payment phrases: カードで / 現金で / 一括で",
          "Gift wrapping: プレゼント用に包んでください",
        ]
      ),
      {
        lessonType: "checkpoint",
        title: { tr: "Kontrol: Alışveriş", en: "Checkpoint: Shopping" },
        subtitle: { tr: "Alışveriş kalıplarının karışık tekrarı", en: "Mixed review of shopping phrases" },
        objectives: {
          tr: ["Arama, deneme ve ödeme kalıplarını karışık kullanma"],
          en: ["Mixing searching, trying on and paying phrases"],
        },
        xp: 45,
      },
    ],
  },
  {
    key: "sightseeing",
    title: { tr: "Seyahat sprinti 6: Şehirde gezinti", en: "Travel sprint 6: Getting around town" },
    description: {
      tr: "Yol tarifi, tapınak ve türbe görgüsü, saat ve tarih.",
      en: "Directions, temple and shrine manners, times and dates.",
    },
    nodes: [
      lesson(
        { tr: "Yol tarifi", en: "Directions" },
        { tr: "右・左・まっすぐ・角・信号", en: "右, 左, まっすぐ, 角, 信号" },
        [
          "右・左・まっすぐ・角・信号・〜目 ile verilen yol tarifini anlama",
          "歩いて何分ですか ile mesafe sorma",
          "東・西・南・北・口 ile istasyon çıkışlarını okuma (東口)",
        ],
        [
          "Following directions given with 右, 左, まっすぐ, 角, 信号, 〜目",
          "Asking the distance with 歩いて何分ですか",
          "Reading station exits with 東, 西, 南, 北, 口 (東口)",
        ]
      ),
      lesson(
        { tr: "Saat, tarih, açık mı?", en: "Time, dates, is it open?" },
        { tr: "何時から何時まで, 休み, 営業中", en: "何時から何時まで, closed days, 営業中" },
        [
          "何時から何時までですか ile çalışma saatini sorma",
          "営業中・準備中・定休日 tabelalarını okuma",
          "Kasım tarihleri ve gün adları: 十一月七日, 月曜日〜日曜日",
        ],
        [
          "Asking opening hours with 何時から何時までですか",
          "Reading the 営業中, 準備中, 定休日 signs",
          "November dates and weekdays: 十一月七日, 月曜日〜日曜日",
        ]
      ),
      lesson(
        { tr: "Tapınak, türbe, müze", en: "Temples, shrines, museums" },
        { tr: "お寺・神社, görgü kuralları, 写真", en: "お寺 and 神社, manners, 写真" },
        [
          "お寺 ile 神社 farkı ve temel görgü (鳥居, 手水, お参り)",
          "写真を撮ってもいいですか / 撮影禁止 tabelası",
          "Müze bileti: 入場料, 大人一枚, 何時までですか",
        ],
        [
          "The difference between お寺 and 神社 and basic manners (鳥居, 手水, お参り)",
          "写真を撮ってもいいですか and the 撮影禁止 sign",
          "Museum tickets: 入場料, 大人一枚, 何時までですか",
        ]
      ),
      lesson(
        { tr: "Küçük sohbet", en: "Small talk" },
        { tr: "どこから来ましたか, トルコから来ました", en: "Where are you from, I am from Türkiye" },
        [
          "どこから来ましたか sorusuna トルコから来ました ile cevap",
          "Kendini tanıtma ve seyahati anlatma: 三週間旅行しています",
          "Övgüye kibar cevap: いいえ、まだまだです",
        ],
        [
          "Answering どこから来ましたか with your country",
          "Introducing yourself and your trip: 三週間旅行しています",
          "Answering compliments politely: いいえ、まだまだです",
        ]
      ),
      {
        lessonType: "checkpoint",
        title: { tr: "Kontrol: Şehir", en: "Checkpoint: Around town" },
        subtitle: { tr: "Yön, saat ve görgü kalıplarının tekrarı", en: "Review of directions, times and manners" },
        objectives: {
          tr: ["Yol tarifi, saat ve tapınak kalıplarını karışık kullanma"],
          en: ["Mixing direction, time and temple phrases"],
        },
        xp: 45,
      },
    ],
  },
  {
    key: "emergency",
    title: { tr: "Seyahat sprinti 7: Sağlık ve acil durum", en: "Travel sprint 7: Health and emergencies" },
    description: {
      tr: "Eczane, belirtiler, kayıp eşya, yardım isteme ve afet uyarıları.",
      en: "Pharmacy, symptoms, lost items, asking for help and disaster alerts.",
    },
    nodes: [
      lesson(
        { tr: "Eczane ve belirtiler", en: "Pharmacy and symptoms" },
        { tr: "薬局, 〜が痛いです, 熱があります", en: "薬局, 〜が痛いです, 熱があります" },
        [
          "〜が痛いです (頭・お腹・喉) ve 熱があります ile belirti anlatma",
          "薬局・薬・風邪薬・痛み止め kelimeleri",
          "Kullanım talimatı: 一日三回, 食後",
        ],
        [
          "Describing symptoms with 〜が痛いです (頭, お腹, 喉) and 熱があります",
          "The words 薬局, 薬, 風邪薬, 痛み止め",
          "Dosage instructions: 一日三回, 食後",
        ]
      ),
      lesson(
        { tr: "Kayıp eşya ve yardım", en: "Lost items and help" },
        { tr: "交番, 〜をなくしました, 助けて", en: "交番, 〜をなくしました, 助けて" },
        [
          "〜をなくしました / 〜を忘れました ile kayıp bildirme (財布, 携帯, パスポート)",
          "交番 ve 落とし物 kavramı",
          "助けてください / 救急車を呼んでください / 110・119",
        ],
        [
          "Reporting a loss with 〜をなくしました / 〜を忘れました (財布, 携帯, パスポート)",
          "The 交番 and 落とし物",
          "助けてください / 救急車を呼んでください / 110 and 119",
        ]
      ),
      lesson(
        { tr: "Uyarı tabelaları ve afet", en: "Warning signs and disasters" },
        { tr: "危険・注意・非常口・地震", en: "危険, 注意, 非常口, 地震" },
        [
          "危険・注意・禁止・非常口・避難所 tabelalarını tanıma",
          "地震・津波・台風 uyarılarında anahtar kelimeleri anlama",
          "Gidiş: 出発・搭乗口・遅延・欠航 havalimanı tabelaları",
        ],
        [
          "Recognising the 危険, 注意, 禁止, 非常口, 避難所 signs",
          "Catching key words in 地震, 津波, 台風 alerts",
          "Departure signs: 出発, 搭乗口, 遅延, 欠航",
        ]
      ),
      {
        lessonType: "boss",
        title: { tr: "Final boss: Japonya'da bir gün", en: "Final boss: A day in Japan" },
        subtitle: { tr: "Sprintin tamamını birleştiren gün boyu senaryo", en: "A full-day scenario combining the whole sprint" },
        objectives: {
          tr: ["Ulaşım, yemek, alışveriş, yön ve küçük bir aksilik içeren gün boyu senaryoyu tamamlama"],
          en: ["Completing a full-day scenario with transport, food, shopping, directions and a small mishap"],
        },
        xp: 80,
      },
    ],
  },
];
