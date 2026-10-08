// Japan travel phrasebook (T-099 part B): authored, static, zero LLM. Bundled
// into the /travel page's JS chunk, so the service worker precaches it and
// it works in airplane mode. Sections mirror the travel sprint units
// (src/lib/curriculum/travel-sprint-ja.ts) so lesson and pocket reference
// use the same phrases.
//
// `jp` uses the app's bracket furigana notation (漢字[かんじ]), rendered by
// <Furigana>; `romaji` is given explicitly so the page never depends on a
// kana-to-romaji conversion of keigo or long vowels.

type L = { tr: string; en: string };

export interface Phrase {
  jp: string;
  romaji: string;
  meaning: L;
  /** Optional usage note. */
  note?: L;
  /** Something you will HEAR (staff speech) rather than say. */
  hear?: boolean;
}

export interface Sign {
  kanji: string;
  reading: string;
  meaning: L;
}

export interface PhraseSection {
  key: string;
  icon: string;
  title: L;
  phrases: Phrase[];
}

const p = (
  jp: string,
  romaji: string,
  tr: string,
  en: string,
  extra?: { note?: L; hear?: boolean }
): Phrase => ({ jp, romaji, meaning: { tr, en }, ...extra });

const hear = { hear: true };

export const PHRASEBOOK_JA: PhraseSection[] = [
  {
    key: "survival",
    icon: "🙇",
    title: { tr: "Temel kalıplar", en: "Essentials" },
    phrases: [
      p("すみません", "sumimasen", "Affedersiniz / pardon / teşekkürler", "Excuse me / sorry / thanks", {
        note: {
          tr: "En çok kullanacağın kelime: garson çağırmak, yol açmak, küçük teşekkür.",
          en: "Your most used word: calling staff, getting past, a small thank-you.",
        },
      }),
      p("ありがとうございます", "arigatou gozaimasu", "Teşekkür ederim", "Thank you very much"),
      p("お願[ねが]いします", "onegai shimasu", "Lütfen (bir şey isterken)", "Please (when requesting)"),
      p("これをください", "kore o kudasai", "Bunu istiyorum, lütfen", "This one, please"),
      p("〜はどこですか", "... wa doko desu ka", "... nerede?", "Where is ...?"),
      p("トイレはどこですか", "toire wa doko desu ka", "Tuvalet nerede?", "Where is the toilet?"),
      p("〜はありますか", "... wa arimasu ka", "... var mı?", "Do you have ...?"),
      p("いくらですか", "ikura desu ka", "Ne kadar?", "How much is it?"),
      p("わかりません", "wakarimasen", "Anlamıyorum", "I don't understand"),
      p("もう一度[いちど]お願[ねが]いします", "mou ichido onegai shimasu", "Bir kez daha, lütfen", "Once more, please"),
      p("ゆっくりお願[ねが]いします", "yukkuri onegai shimasu", "Yavaş, lütfen", "Slowly, please"),
      p("英語[えいご]は大丈夫[だいじょうぶ]ですか", "eigo wa daijoubu desu ka", "İngilizce olur mu?", "Is English OK?"),
      p("大丈夫[だいじょうぶ]です", "daijoubu desu", "Sorun yok / gerek yok", "It's fine / no thanks", {
        note: {
          tr: "Kibar 'hayır, gerek yok' olarak da kullanılır (poşet, ısıtma vb.).",
          en: "Also a polite 'no, thank you' (bags, heating, etc.).",
        },
      }),
      p("はい / いいえ", "hai / iie", "Evet / hayır", "Yes / no"),
    ],
  },
  {
    key: "transport",
    icon: "🚆",
    title: { tr: "Havalimanı ve ulaşım", en: "Airport and transport" },
    phrases: [
      p("観光[かんこう]です", "kankou desu", "Turistik amaçlı", "For sightseeing", {
        note: { tr: "Pasaport kontrolünde amaç sorulursa.", en: "If asked your purpose at immigration." },
      }),
      p("三週間[さんしゅうかん]です", "san-shuukan desu", "Üç hafta", "Three weeks"),
      p("〜に行[い]きたいです", "... ni ikitai desu", "...'e gitmek istiyorum", "I want to go to ..."),
      p("〜行[ゆ]きはどこですか", "... yuki wa doko desu ka", "... yönüne giden (tren) nerede?", "Where is the train bound for ...?"),
      p("この電車[でんしゃ]は〜に行[い]きますか", "kono densha wa ... ni ikimasu ka", "Bu tren ...'e gider mi?", "Does this train go to ...?"),
      p("何番線[なんばんせん]ですか", "nan-bansen desu ka", "Hangi peron?", "Which platform?"),
      p("乗[の]り換[か]えはどこですか", "norikae wa doko desu ka", "Aktarma nerede?", "Where do I transfer?"),
      p("チャージしたいです", "chaaji shitai desu", "Kartıma para yüklemek istiyorum", "I'd like to top up my card"),
      p("カードが使[つか]えません", "kaado ga tsukaemasen", "Kartım çalışmıyor", "My card doesn't work"),
      p("〜まで、大人[おとな]一枚[いちまい]", "... made, otona ichimai", "...'e kadar, bir yetişkin", "To ..., one adult"),
      p("指定席[していせき]でお願[ねが]いします", "shiteiseki de onegai shimasu", "Rezerveli koltuk, lütfen", "A reserved seat, please"),
      p("〜までお願[ねが]いします", "... made onegai shimasu", "(Taksi) ...'e lütfen", "(Taxi) To ..., please"),
      p("ここで止[と]めてください", "koko de tomete kudasai", "Burada durun lütfen", "Please stop here"),
      p("次[つぎ]は〜", "tsugi wa ...", "Sıradaki durak ...", "Next stop ...", hear),
      p("ドアが閉[し]まります", "doa ga shimarimasu", "Kapılar kapanıyor", "The doors are closing", hear),
    ],
  },
  {
    key: "lodging",
    icon: "🏨",
    title: { tr: "Otel ve onsen", en: "Hotel and onsen" },
    phrases: [
      p("予約[よやく]しています", "yoyaku shite imasu", "Rezervasyonum var", "I have a reservation"),
      p("〜という名前[なまえ]です", "... to iu namae desu", "Adım ...", "The name is ..."),
      p("チェックインお願[ねが]いします", "chekku-in onegai shimasu", "Check-in yapmak istiyorum", "Check-in, please"),
      p("荷物[にもつ]を預[あず]かってもらえますか", "nimotsu o azukatte moraemasu ka", "Bagajımı bırakabilir miyim?", "Could you keep my luggage?"),
      p("朝食[ちょうしょく]は何時[なんじ]からですか", "choushoku wa nanji kara desu ka", "Kahvaltı saat kaçta başlıyor?", "What time does breakfast start?"),
      p("Wi-Fiのパスワードは何[なん]ですか", "wai-fai no pasuwaado wa nan desu ka", "Wi-Fi şifresi ne?", "What's the Wi-Fi password?"),
      p("〜が壊[こわ]れています", "... ga kowarete imasu", "... bozuk", "... is broken"),
      p("お湯[ゆ]が出[で]ません", "oyu ga demasen", "Sıcak su gelmiyor", "There's no hot water"),
      p("タオルをもう一枚[いちまい]お願[ねが]いします", "taoru o mou ichimai onegai shimasu", "Bir havlu daha lütfen", "One more towel, please"),
      p("タトゥーは大丈夫[だいじょうぶ]ですか", "tatuu wa daijoubu desu ka", "Dövmeyle girilebiliyor mu?", "Are tattoos OK?", {
        note: {
          tr: "Onsen: önce duşta yıkan, havluyu suya sokma.",
          en: "Onsen: wash before entering, keep the towel out of the water.",
        },
      }),
    ],
  },
  {
    key: "food",
    icon: "🍜",
    title: { tr: "Yemek ve konbini", en: "Food and konbini" },
    phrases: [
      p("何名様[なんめいさま]ですか", "nanmei-sama desu ka", "Kaç kişisiniz?", "How many people?", hear),
      p("二人[ふたり]です", "futari desu", "İki kişiyiz", "Two people", {
        note: { tr: "Tek kişi: 一人[ひとり]です (hitori desu).", en: "One person: 一人[ひとり]です (hitori desu)." },
      }),
      p("メニューをお願[ねが]いします", "menyuu o onegai shimasu", "Menü lütfen", "The menu, please"),
      p("英語[えいご]のメニューはありますか", "eigo no menyuu wa arimasu ka", "İngilizce menü var mı?", "Is there an English menu?"),
      p("おすすめは何[なん]ですか", "osusume wa nan desu ka", "Ne önerirsiniz?", "What do you recommend?"),
      p("これを一[ひと]つください", "kore o hitotsu kudasai", "Bundan bir tane lütfen", "One of these, please"),
      p("豚肉[ぶたにく]は入[はい]っていますか", "butaniku wa haitte imasu ka", "İçinde domuz eti var mı?", "Does it contain pork?"),
      p("〜が食[た]べられません", "... ga taberaremasen", "... yiyemiyorum", "I can't eat ..."),
      p("〜抜[ぬ]きでお願[ねが]いします", "... nuki de onegai shimasu", "... olmadan lütfen", "Without ..., please"),
      p("お会計[かいけい]お願[ねが]いします", "okaikei onegai shimasu", "Hesap lütfen", "The bill, please"),
      p("カードで払[はら]えますか", "kaado de haraemasu ka", "Kartla ödeyebilir miyim?", "Can I pay by card?"),
      p("温[あたた]めますか", "atatamemasu ka", "Isıtayım mı?", "Shall I heat it up?", hear),
      p("袋[ふくろ]はいりますか", "fukuro wa irimasu ka", "Poşet ister misiniz?", "Do you need a bag?", hear),
      p("お願[ねが]いします / 大丈夫[だいじょうぶ]です", "onegai shimasu / daijoubu desu", "Evet lütfen / gerek yok", "Yes please / no thanks"),
      p("ごちそうさまでした", "gochisousama deshita", "Elinize sağlık (yemekten sonra)", "Thank you for the meal", {
        note: { tr: "Japonya'da bahşiş verilmez.", en: "There is no tipping in Japan." },
      }),
    ],
  },
  {
    key: "shopping",
    icon: "🛍️",
    title: { tr: "Alışveriş", en: "Shopping" },
    phrases: [
      p("見[み]ているだけです", "mite iru dake desu", "Sadece bakıyorum", "I'm just looking"),
      p("〜を探[さが]しています", "... o sagashite imasu", "... arıyorum", "I'm looking for ..."),
      p("試着[しちゃく]してもいいですか", "shichaku shite mo ii desu ka", "Deneyebilir miyim?", "May I try it on?"),
      p("もっと大[おお]きいのはありますか", "motto ookii no wa arimasu ka", "Daha büyüğü var mı?", "Do you have a bigger one?"),
      p("他[ほか]の色[いろ]はありますか", "hoka no iro wa arimasu ka", "Başka rengi var mı?", "Do you have other colours?"),
      p("免税[めんぜい]できますか", "menzei dekimasu ka", "Tax-free yapılıyor mu?", "Can I get tax-free?", {
        note: { tr: "Pasaportu yanında taşı.", en: "Carry your passport." },
      }),
      p("これにします", "kore ni shimasu", "Bunu alıyorum", "I'll take this"),
      p("プレゼント用[よう]に包[つつ]んでください", "purezento-you ni tsutsunde kudasai", "Hediye paketi yapar mısınız?", "Please gift-wrap it"),
    ],
  },
  {
    key: "sightseeing",
    icon: "⛩️",
    title: { tr: "Şehirde gezinti", en: "Around town" },
    phrases: [
      p("駅[えき]はどこですか", "eki wa doko desu ka", "İstasyon nerede?", "Where is the station?"),
      p("歩[ある]いて何分[なんぷん]ですか", "aruite nanpun desu ka", "Yürüyerek kaç dakika?", "How many minutes on foot?"),
      p("まっすぐ行[い]って、右[みぎ]です", "massugu itte, migi desu", "Düz gidip sağda", "Go straight, then right", hear),
      p("何時[なんじ]から何時[なんじ]までですか", "nanji kara nanji made desu ka", "Saat kaçtan kaça açık?", "From what time to what time?"),
      p("写真[しゃしん]を撮[と]ってもいいですか", "shashin o totte mo ii desu ka", "Fotoğraf çekebilir miyim?", "May I take a photo?"),
      p("写真[しゃしん]を撮[と]ってもらえますか", "shashin o totte moraemasu ka", "Fotoğrafımı çeker misiniz?", "Could you take our photo?"),
      p("トルコから来[き]ました", "toruko kara kimashita", "Türkiye'den geldim", "I'm from Türkiye"),
      p("三週間[さんしゅうかん]旅行[りょこう]しています", "san-shuukan ryokou shite imasu", "Üç haftadır geziyorum", "I'm travelling for three weeks"),
      p("日本語[にほんご]を勉強[べんきょう]しています", "nihongo o benkyou shite imasu", "Japonca çalışıyorum", "I'm studying Japanese"),
    ],
  },
  {
    key: "emergency",
    icon: "🆘",
    title: { tr: "Sağlık ve acil durum", en: "Health and emergencies" },
    phrases: [
      p("助[たす]けてください", "tasukete kudasai", "Yardım edin!", "Help!"),
      p("救急車[きゅうきゅうしゃ]を呼[よ]んでください", "kyuukyuusha o yonde kudasai", "Ambulans çağırın", "Please call an ambulance", {
        note: { tr: "Ambulans/itfaiye 119, polis 110.", en: "Ambulance/fire 119, police 110." },
      }),
      p("〜が痛[いた]いです", "... ga itai desu", "... ağrıyor", "My ... hurts"),
      p("頭[あたま] / お腹[なか] / 喉[のど]", "atama / onaka / nodo", "Baş / karın / boğaz", "Head / stomach / throat"),
      p("熱[ねつ]があります", "netsu ga arimasu", "Ateşim var", "I have a fever"),
      p("薬局[やっきょく]はどこですか", "yakkyoku wa doko desu ka", "Eczane nerede?", "Where is a pharmacy?"),
      p("〜をなくしました", "... o nakushimashita", "... kaybettim", "I lost my ..."),
      p("財布[さいふ] / 携帯[けいたい] / パスポート", "saifu / keitai / pasupooto", "Cüzdan / telefon / pasaport", "Wallet / phone / passport"),
      p("交番[こうばん]はどこですか", "kouban wa doko desu ka", "Polis kulübesi nerede?", "Where is the police box?"),
    ],
  },
];

/** Signs and labels you will see. Section order roughly follows a trip. */
export const SIGNS_JA: Sign[] = [
  { kanji: "入口", reading: "いりぐち", meaning: { tr: "Giriş", en: "Entrance" } },
  { kanji: "出口", reading: "でぐち", meaning: { tr: "Çıkış", en: "Exit" } },
  { kanji: "到着", reading: "とうちゃく", meaning: { tr: "Varış", en: "Arrivals" } },
  { kanji: "出発", reading: "しゅっぱつ", meaning: { tr: "Kalkış", en: "Departures" } },
  { kanji: "搭乗口", reading: "とうじょうぐち", meaning: { tr: "Biniş kapısı", en: "Boarding gate" } },
  { kanji: "改札", reading: "かいさつ", meaning: { tr: "Turnike (bilet kapısı)", en: "Ticket gate" } },
  { kanji: "乗り換え", reading: "のりかえ", meaning: { tr: "Aktarma", en: "Transfer" } },
  { kanji: "番線", reading: "ばんせん", meaning: { tr: "Peron no.", en: "Platform no." } },
  { kanji: "各駅停車", reading: "かくえきていしゃ", meaning: { tr: "Her durakta duran", en: "Local (all stops)" } },
  { kanji: "快速", reading: "かいそく", meaning: { tr: "Hızlı (bazı duraklar)", en: "Rapid" } },
  { kanji: "急行", reading: "きゅうこう", meaning: { tr: "Ekspres", en: "Express" } },
  { kanji: "指定席", reading: "していせき", meaning: { tr: "Rezerveli koltuk", en: "Reserved seat" } },
  { kanji: "自由席", reading: "じゆうせき", meaning: { tr: "Serbest koltuk", en: "Unreserved seat" } },
  { kanji: "号車", reading: "ごうしゃ", meaning: { tr: "Vagon no.", en: "Car no." } },
  { kanji: "東口", reading: "ひがしぐち", meaning: { tr: "Doğu çıkışı", en: "East exit" } },
  { kanji: "西口", reading: "にしぐち", meaning: { tr: "Batı çıkışı", en: "West exit" } },
  { kanji: "男", reading: "おとこ", meaning: { tr: "Erkek", en: "Men" } },
  { kanji: "女", reading: "おんな", meaning: { tr: "Kadın", en: "Women" } },
  { kanji: "お手洗い", reading: "おてあらい", meaning: { tr: "Tuvalet", en: "Restroom" } },
  { kanji: "湯", reading: "ゆ", meaning: { tr: "Sıcak su / onsen", en: "Hot water / bath" } },
  { kanji: "営業中", reading: "えいぎょうちゅう", meaning: { tr: "Açık", en: "Open" } },
  { kanji: "準備中", reading: "じゅんびちゅう", meaning: { tr: "Hazırlık (kapalı)", en: "Preparing (closed)" } },
  { kanji: "定休日", reading: "ていきゅうび", meaning: { tr: "Haftalık tatil günü", en: "Regular closing day" } },
  { kanji: "食券", reading: "しょっけん", meaning: { tr: "Yemek fişi (makine)", en: "Meal ticket" } },
  { kanji: "定食", reading: "ていしょく", meaning: { tr: "Set menü", en: "Set meal" } },
  { kanji: "大盛り", reading: "おおもり", meaning: { tr: "Büyük porsiyon", en: "Large portion" } },
  { kanji: "肉 / 魚", reading: "にく / さかな", meaning: { tr: "Et / balık", en: "Meat / fish" } },
  { kanji: "豚 / 牛 / 鶏", reading: "ぶた / うし / とり", meaning: { tr: "Domuz / sığır / tavuk", en: "Pork / beef / chicken" } },
  { kanji: "免税", reading: "めんぜい", meaning: { tr: "Vergisiz (tax-free)", en: "Tax-free" } },
  { kanji: "禁止", reading: "きんし", meaning: { tr: "Yasak", en: "Prohibited" } },
  { kanji: "撮影禁止", reading: "さつえいきんし", meaning: { tr: "Fotoğraf yasak", en: "No photography" } },
  { kanji: "禁煙", reading: "きんえん", meaning: { tr: "Sigara içilmez", en: "No smoking" } },
  { kanji: "危険", reading: "きけん", meaning: { tr: "Tehlike", en: "Danger" } },
  { kanji: "注意", reading: "ちゅうい", meaning: { tr: "Dikkat", en: "Caution" } },
  { kanji: "非常口", reading: "ひじょうぐち", meaning: { tr: "Acil çıkış", en: "Emergency exit" } },
  { kanji: "避難所", reading: "ひなんじょ", meaning: { tr: "Tahliye noktası", en: "Evacuation shelter" } },
  { kanji: "地震", reading: "じしん", meaning: { tr: "Deprem", en: "Earthquake" } },
  { kanji: "遅延 / 欠航", reading: "ちえん / けっこう", meaning: { tr: "Gecikme / iptal (uçuş)", en: "Delay / cancelled (flight)" } },
  { kanji: "薬局", reading: "やっきょく", meaning: { tr: "Eczane", en: "Pharmacy" } },
  { kanji: "交番", reading: "こうばん", meaning: { tr: "Polis kulübesi", en: "Police box" } },
];
