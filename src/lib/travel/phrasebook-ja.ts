// Japan travel phrasebook (T-100): authored, static, zero LLM; works offline.
// Conventions (bracket furigana, explicit romaji, tr + en) are in ./types.

import type { L, Phrase, PhraseSection } from "./types";

const n = (tr: string, en: string): L => ({ tr, en });

const r = (jp: string, romaji: string, tr: string, en: string): NonNullable<Phrase["reply"]> => ({
  jp,
  romaji,
  meaning: { tr, en },
});

const p = (
  jp: string,
  romaji: string,
  tr: string,
  en: string,
  extra?: { note?: L; hear?: boolean; reply?: Phrase["reply"] }
): Phrase => ({ jp, romaji, meaning: { tr, en }, ...extra });

const okPlease = r("はい、お願[ねが]いします", "hai, onegai shimasu", "Evet, lütfen", "Yes, please");
const noThanks = r("大丈夫[だいじょうぶ]です", "daijoubu desu", "Gerek yok, teşekkürler", "No, thank you");

export const PHRASEBOOK_JA: PhraseSection[] = [
  {
    key: "essentials",
    icon: "🙇",
    title: n("Temel kalıplar", "Essentials"),
    intro: n(
      "Her gün, her yerde kullanacağın kalıplar. Bunlarla Japonya'nın yarısını idare edersin.",
      "The phrases you will use every day, everywhere. With these alone you can handle half of Japan."
    ),
    phrases: [
      p("すみません", "sumimasen", "Affedersiniz / pardon / teşekkürler", "Excuse me / sorry / thanks", {
        note: n(
          "En çok kullanacağın kelime: garson çağırmak, yol açmak, küçük bir teşekkür.",
          "Your most used word: calling staff, getting past someone, a small thank-you."
        ),
      }),
      p("ありがとうございます", "arigatou gozaimasu", "Teşekkür ederim", "Thank you very much"),
      p("どうも", "doumo", "Sağ olun (kısa teşekkür)", "Thanks (short)", {
        note: n(
          "Kasada, kapı tutulunca: kısa ve yeterince kibar.",
          "At the till, when someone holds a door: short and polite enough."
        ),
      }),
      p("お願[ねが]いします", "onegai shimasu", "Lütfen (bir şey isterken)", "Please (when requesting)", {
        note: n(
          "Bir şeyi işaret edip söylemen yeter: \"bunu lütfen\" anlamına gelir.",
          "Point at something and say it: it means \"this, please\"."
        ),
      }),
      p("これをください", "kore o kudasai", "Bunu istiyorum, lütfen", "This one, please", {
        reply: r("はい、かしこまりました", "hai, kashikomarimashita", "Tabii efendim (personel)", "Certainly (staff)"),
      }),
      p("これは何[なん]ですか", "kore wa nan desu ka", "Bu ne?", "What is this?"),
      p("トイレはどこですか", "toire wa doko desu ka", "Tuvalet nerede?", "Where is the toilet?", {
        reply: r("あちらです", "achira desu", "Şu tarafta (personel)", "Over there (staff)"),
      }),
      p("京都[きょうと]駅[えき]はどこですか", "kyouto eki wa doko desu ka", "Kyoto İstasyonu nerede?", "Where is Kyoto Station?", {
        note: n(
          "Kalıp: [yer]はどこですか. Yer adını değiştir.",
          "Pattern: [place]はどこですか. Swap in any place name."
        ),
      }),
      p("コンセントはありますか", "konsento wa arimasu ka", "Priz var mı?", "Is there a power outlet?", {
        note: n(
          "Kalıp: [şey]はありますか, \"... var mı?\"",
          "Pattern: [thing]はありますか, \"do you have ...?\""
        ),
        reply: r("すみません、ありません", "sumimasen, arimasen", "Maalesef yok (personel)", "Sorry, we don't (staff)"),
      }),
      p("いくらですか", "ikura desu ka", "Ne kadar?", "How much is it?", {
        reply: r("五百[ごひゃく]円[えん]です", "gohyaku en desu", "500 yen (personel)", "500 yen (staff)"),
      }),
      p("わかりました", "wakarimashita", "Anladım / tamam", "I understand / OK"),
      p("わかりません", "wakarimasen", "Anlamıyorum", "I don't understand", {
        note: n(
          "Daha yumuşak: すみません、よくわかりません (sumimasen, yoku wakarimasen).",
          "Softer: すみません、よくわかりません (sumimasen, yoku wakarimasen)."
        ),
      }),
      p("もう一度[いちど]お願[ねが]いします", "mou ichido onegai shimasu", "Bir kez daha, lütfen", "Once more, please"),
      p("ゆっくりお願[ねが]いします", "yukkuri onegai shimasu", "Yavaş, lütfen", "Slowly, please"),
      p("英語[えいご]を話[はな]せますか", "eigo o hanasemasu ka", "İngilizce konuşabiliyor musunuz?", "Do you speak English?", {
        reply: r("少[すこ]しだけです", "sukoshi dake desu", "Sadece biraz (personel)", "Just a little (staff)"),
      }),
      p("日本語[にほんご]は少[すこ]しだけ話[はな]せます", "nihongo wa sukoshi dake hanasemasu", "Biraz Japonca konuşabiliyorum", "I speak a little Japanese"),
      p("書[か]いてもらえますか", "kaite moraemasu ka", "Yazabilir misiniz?", "Could you write it down?", {
        note: n(
          "Telefonundaki not uygulamasını uzat; rakamlar ve yer adları yazılınca çok daha kolay anlaşılır.",
          "Hand over your phone's notes app; numbers and place names are much easier to understand written."
        ),
      }),
      p("大丈夫[だいじょうぶ]です", "daijoubu desu", "Sorun yok / gerek yok", "It's fine / no, thank you", {
        note: n(
          "Kibar \"hayır, gerek yok\" olarak çok kullanılır (poşet, ısıtma vb.). Dikkat: \"evet, olur\" da demek olabilir; emin değilsen söylerken elini hafifçe salla.",
          "Very common as a polite \"no, thank you\" (bags, heating, etc.). Careful: it can also mean \"yes, that's fine\"; if in doubt, add a small wave of the hand."
        ),
      }),
      p("大丈夫[だいじょうぶ]ですか", "daijoubu desu ka", "İyi misiniz? / Olur mu?", "Are you OK? / Is that OK?", {
        reply: r("はい、大丈夫[だいじょうぶ]です", "hai, daijoubu desu", "Evet, sorun yok", "Yes, it's fine"),
      }),
      p("はい / いいえ", "hai / iie", "Evet / hayır", "Yes / no", {
        note: n(
          "いいえ sert duyulabilir; günlük hayatta \"hayır\" çoğu zaman 大丈夫[だいじょうぶ]です ya da いえ ile söylenir.",
          "いいえ can sound blunt; in daily life \"no\" is often 大丈夫[だいじょうぶ]です or a soft いえ."
        ),
      }),
      p("ちょっと待[ま]ってください", "chotto matte kudasai", "Bir dakika bekleyin lütfen", "Please wait a moment"),
      p("これ、使[つか]ってもいいですか", "kore, tsukatte mo ii desu ka", "Bunu kullanabilir miyim?", "May I use this?", {
        note: n(
          "Kalıp: [fiil]てもいいですか, \"... yapabilir miyim?\"",
          "Pattern: [verb]てもいいですか, \"may I ...?\""
        ),
        reply: r("どうぞ", "douzo", "Buyurun", "Go ahead"),
      }),
      p("どうぞ", "douzo", "Buyurun", "Here you are / go ahead", {
        hear: true,
        reply: r("ありがとうございます", "arigatou gozaimasu", "Teşekkür ederim", "Thank you"),
      }),
      p("お先[さき]にどうぞ", "osaki ni douzo", "Önce siz buyurun", "After you"),
      p("失礼[しつれい]します", "shitsurei shimasu", "İzninizle (girerken, çıkarken)", "Excuse me (entering or leaving)"),
      p("ごめんなさい", "gomen nasai", "Özür dilerim", "I'm sorry", {
        note: n(
          "Gerçekten bir hata yaptığında. Birine çarpmak gibi küçük şeylerde すみません yeterli.",
          "When you really did something wrong. For small things like bumping someone, すみません is enough."
        ),
      }),
      p("おはようございます", "ohayou gozaimasu", "Günaydın", "Good morning", {
        note: n("Öğleye kadar kullanılır.", "Used until about midday."),
      }),
      p("こんにちは", "konnichiwa", "Merhaba / iyi günler", "Hello / good afternoon"),
      p("こんばんは", "konbanwa", "İyi akşamlar", "Good evening"),
      p("いらっしゃいませ", "irasshaimase", "Hoş geldiniz (dükkanda)", "Welcome (in a shop)", {
        hear: true,
        note: n(
          "Cevap beklenmez; hafif bir baş selamı yeter.",
          "No reply expected; a slight nod is enough."
        ),
      }),
      p("少々[しょうしょう]お待[ま]ちください", "shoushou omachi kudasai", "Biraz bekler misiniz", "One moment, please", {
        hear: true,
        reply: r("はい", "hai", "Tamam", "OK"),
      }),
    ],
  },
  {
    key: "conversation",
    icon: "💬",
    title: n("Sohbet", "Small talk"),
    intro: n(
      "Kendini tanıtmak, nereden geldiğini söylemek, havadan ve sonbahar yapraklarından konuşmak. Japonca denemen çoğu zaman sıcak karşılanır.",
      "Introducing yourself, saying where you're from, talking about the weather and autumn leaves. Trying Japanese is usually warmly received."
    ),
    phrases: [
      p("はじめまして", "hajimemashite", "Tanıştığımıza memnun oldum", "Nice to meet you", {
        note: n("Sadece ilk tanışmada.", "Only on first meeting."),
      }),
      p("ビルゲハンです", "birugehan desu", "Ben Bilgehan", "I'm Bilgehan", {
        note: n(
          "Japonlar kendini genelde soyadıyla tanıtır. Kalıp: [isim]です.",
          "Japanese people usually introduce themselves by surname. Pattern: [name]です."
        ),
      }),
      p("よろしくお願[ねが]いします", "yoroshiku onegai shimasu", "Memnun oldum (tanışınca)", "Pleased to meet you", {
        reply: r(
          "こちらこそ、よろしくお願[ねが]いします",
          "kochira koso, yoroshiku onegai shimasu",
          "Ben de memnun oldum",
          "Likewise, pleased to meet you"
        ),
      }),
      p("お名前[なまえ]は何[なん]ですか", "onamae wa nan desu ka", "Adınız ne?", "What's your name?"),
      p("どちらから来[き]ましたか", "dochira kara kimashita ka", "Nereden geldiniz?", "Where are you from?", {
        hear: true,
        reply: r("トルコから来[き]ました", "toruko kara kimashita", "Türkiye'den geldim", "I'm from Türkiye"),
      }),
      p("トルコから来[き]ました", "toruko kara kimashita", "Türkiye'den geldim", "I'm from Türkiye", {
        note: n("Türkiye Japoncada トルコ (toruko).", "Türkiye is トルコ (toruko) in Japanese."),
        reply: r("へえ、トルコですか", "hee, toruko desu ka", "Aa, Türkiye mi! (karşı taraf)", "Oh, Türkiye! (them)"),
      }),
      p("トルコ人[じん]です", "torukojin desu", "Türküm", "I'm Turkish"),
      p("イスタンブールに住[す]んでいます", "isutanbuuru ni sunde imasu", "İstanbul'da yaşıyorum", "I live in Istanbul", {
        note: n(
          "Kalıp: [şehir]に住[す]んでいます. Ankara: アンカラ, İzmir: イズミル.",
          "Pattern: [city]に住[す]んでいます. Ankara: アンカラ, İzmir: イズミル."
        ),
      }),
      p("日本[にほん]は初[はじ]めてですか", "nihon wa hajimete desu ka", "Japonya'ya ilk gelişiniz mi?", "Is this your first time in Japan?", {
        hear: true,
        reply: r("はい、初[はじ]めてです", "hai, hajimete desu", "Evet, ilk kez geliyorum", "Yes, it's my first time"),
      }),
      p("三週間[さんしゅうかん]旅行[りょこう]しています", "sanshuukan ryokou shite imasu", "Üç haftalığına geziyorum", "I'm travelling for three weeks"),
      p("日本語[にほんご]を勉強[べんきょう]しています", "nihongo o benkyou shite imasu", "Japonca öğreniyorum", "I'm learning Japanese", {
        reply: r("すごいですね", "sugoi desu ne", "Harika! (karşı taraf)", "That's great! (them)"),
      }),
      p("日本語[にほんご]が上手[じょうず]ですね", "nihongo ga jouzu desu ne", "Japoncanız çok iyi", "Your Japanese is good", {
        hear: true,
        note: n(
          "Birkaç kelime söylesen bile duyarsın. İltifatı kabul etmek yerine alçakgönüllü cevap vermek doğaldır.",
          "You'll hear it even after a few words. A modest reply is more natural than accepting the compliment."
        ),
        reply: r("いえいえ、まだまだです", "ieie, madamada desu", "Yok canım, daha çok yolum var", "Oh no, I still have a long way to go"),
      }),
      p("まだ勉強中[べんきょうちゅう]です", "mada benkyouchuu desu", "Hâlâ öğreniyorum", "I'm still learning"),
      p("お仕事[しごと]は何[なん]ですか", "oshigoto wa nan desu ka", "Ne iş yapıyorsunuz?", "What do you do for work?", {
        hear: true,
        reply: r("エンジニアです", "enjinia desu", "Mühendisim (kendi mesleğini koy)", "I'm an engineer (use your own job)"),
      }),
      p("趣味[しゅみ]は何[なん]ですか", "shumi wa nan desu ka", "Hobileriniz neler?", "What are your hobbies?", {
        reply: r("写真[しゃしん]と旅行[りょこう]です", "shashin to ryokou desu", "Fotoğraf ve seyahat", "Photography and travel"),
      }),
      p("日本[にほん]が大好[だいす]きです", "nihon ga daisuki desu", "Japonya'yı çok seviyorum", "I love Japan"),
      p("日本[にほん]の食[た]べ物[もの]が好[す]きです", "nihon no tabemono ga suki desu", "Japon yemeklerini seviyorum", "I like Japanese food", {
        note: n(
          "Kalıp: [şey]が好[す]きです. Çok seviyorsan 大好[だいす]きです.",
          "Pattern: [thing]が好[す]きです. For \"love\", 大好[だいす]きです."
        ),
      }),
      p("ラーメンが一番[いちばん]好[す]きです", "raamen ga ichiban suki desu", "En çok ramen'i seviyorum", "I like ramen best"),
      p("何[なに]がおすすめですか", "nani ga osusume desu ka", "Ne tavsiye edersiniz?", "What would you recommend?", {
        reply: r("お寿司[すし]がおすすめですよ", "osushi ga osusume desu yo", "Suşi tavsiye ederim (karşı taraf)", "I'd recommend sushi (them)"),
      }),
      p("京都[きょうと]はとてもきれいですね", "kyouto wa totemo kirei desu ne", "Kyoto çok güzel, değil mi", "Kyoto is really beautiful"),
      p("今日[きょう]はいい天気[てんき]ですね", "kyou wa ii tenki desu ne", "Bugün hava çok güzel", "Lovely weather today", {
        note: n(
          "Sonundaki ね karşındakini onaya davet eder; havadan konuşmanın en doğal yolu.",
          "The final ね invites agreement; the most natural way to talk about the weather."
        ),
        reply: r("そうですね", "sou desu ne", "Evet, öyle", "It is, isn't it"),
      }),
      p("寒[さむ]いですね", "samui desu ne", "Soğuk, değil mi", "It's cold, isn't it", {
        reply: r("そうですね", "sou desu ne", "Evet, öyle", "It is, isn't it"),
      }),
      p("紅葉[こうよう]がきれいですね", "kouyou ga kirei desu ne", "Sonbahar yaprakları çok güzel", "The autumn leaves are beautiful", {
        note: n(
          "Kırmızı akçaağaç için 紅葉[もみじ] diye de okunur. Kasım, Kyoto ve Tokyo'da yaprakların en güzel olduğu dönemdir.",
          "For red maples it is also read 紅葉[もみじ]. November is peak foliage season in Kyoto and Tokyo."
        ),
      }),
      p("紅葉[こうよう]はどこがおすすめですか", "kouyou wa doko ga osusume desu ka", "Sonbahar yaprakları için nereyi önerirsiniz?", "Where do you recommend for autumn leaves?", {
        reply: r("嵐山[あらしやま]がいいですよ", "arashiyama ga ii desu yo", "Arashiyama güzeldir (karşı taraf)", "Arashiyama is nice (them)"),
      }),
      p("明日[あした]は雨[あめ]ですか", "ashita wa ame desu ka", "Yarın yağmur yağacak mı?", "Will it rain tomorrow?", {
        reply: r("晴[は]れるみたいですよ", "hareru mitai desu yo", "Güneşli olacakmış (karşı taraf)", "Looks like it'll be sunny (them)"),
      }),
      p("すごいですね", "sugoi desu ne", "Harika / çok etkileyici", "Amazing"),
      p("おいしいです", "oishii desu", "Çok lezzetli", "It's delicious"),
      p("楽[たの]しかったです", "tanoshikatta desu", "Çok eğlenceliydi", "It was fun"),
      p("一緒[いっしょ]に写真[しゃしん]を撮[と]りませんか", "issho ni shashin o torimasen ka", "Birlikte fotoğraf çekelim mi?", "Shall we take a photo together?", {
        reply: r("いいですよ", "ii desu yo", "Olur (karşı taraf)", "Sure (them)"),
      }),
      p("お話[はなし]できて楽[たの]しかったです", "ohanashi dekite tanoshikatta desu", "Sizinle konuşmak çok keyifliydi", "It was lovely talking with you"),
      p("お元気[げんき]で", "ogenki de", "Kendinize iyi bakın (vedalaşırken)", "Take care (when parting)"),
    ],
  },
  {
    key: "numbers-time",
    icon: "🕐",
    title: n("Sayılar ve zaman", "Numbers and time"),
    intro: n(
      "Saat sormak, ne kadar süreceğini, kaç tane olduğunu ve açılış saatlerini öğrenmek. Japonca sayma şekli nesneye göre değişir; en sık lazım olanlar burada.",
      "Asking the time, how long something takes, how many, and opening hours. Japanese counting changes with the object; the ones you need most are here."
    ),
    phrases: [
      p("今[いま]、何時[なんじ]ですか", "ima, nanji desu ka", "Saat kaç?", "What time is it?", {
        reply: r("三時[さんじ]半[はん]です", "sanji han desu", "Üç buçuk", "Half past three"),
      }),
      p("四時[よじ]、七時[しちじ]、九時[くじ]", "yoji, shichiji, kuji", "Saat 4, 7, 9", "4, 7, 9 o'clock", {
        note: n(
          "Tuzak: 4 よじ (yonji değil), 7 しちじ, 9 くじ (kyuuji değil).",
          "Pitfall: 4 is よじ (not yonji), 7 is しちじ, 9 is くじ (not kyuuji)."
        ),
      }),
      p("午前[ごぜん] / 午後[ごご]", "gozen / gogo", "Öğleden önce / öğleden sonra", "a.m. / p.m."),
      p("朝[あさ] / 昼[ひる] / 夜[よる]", "asa / hiru / yoru", "Sabah / öğle / akşam-gece", "Morning / noon / night"),
      p("五[ご]分[ふん]、十[じゅっ]分[ぷん]", "gofun, juppun", "5 dakika, 10 dakika", "5 minutes, 10 minutes", {
        note: n(
          "Dakika sesi değişir: 1 いっぷん, 3 さんぷん, 4 よんぷん, 6 ろっぷん, 8 はっぷん, 10 じゅっぷん.",
          "The minute sound shifts: 1 いっぷん, 3 さんぷん, 4 よんぷん, 6 ろっぷん, 8 はっぷん, 10 じゅっぷん."
        ),
      }),
      p("何時[なんじ]に開[あ]きますか", "nanji ni akimasu ka", "Saat kaçta açılıyor?", "What time does it open?", {
        reply: r("九時[くじ]に開[あ]きます", "kuji ni akimasu", "Dokuzda açılıyor", "It opens at nine"),
      }),
      p("何時[なんじ]に閉[し]まりますか", "nanji ni shimarimasu ka", "Saat kaçta kapanıyor?", "What time does it close?", {
        reply: r("五時[ごじ]までです", "goji made desu", "Beşe kadar", "Until five"),
      }),
      p("何時[なんじ]から何時[なんじ]までですか", "nanji kara nanji made desu ka", "Saat kaçtan kaça?", "From what time until what time?"),
      p("今日[きょう]は開[あ]いていますか", "kyou wa aite imasu ka", "Bugün açık mı?", "Is it open today?", {
        reply: r(
          "申[もう]し訳[わけ]ありません、今日[きょう]は休[やす]みです",
          "moushiwake arimasen, kyou wa yasumi desu",
          "Kusura bakmayın, bugün kapalıyız",
          "Sorry, we're closed today"
        ),
      }),
      p("何曜日[なんようび]が休[やす]みですか", "nan'youbi ga yasumi desu ka", "Hangi gün kapalı?", "Which day is it closed?", {
        note: n(
          "Müzeler çoğunlukla Pazartesi kapalıdır: 月曜日[げつようび].",
          "Museums are often closed on Mondays: 月曜日[げつようび]."
        ),
      }),
      p("月[げつ]・火[か]・水[すい]・木[もく]・金[きん]・土[ど]・日[にち]", "getsu, ka, sui, moku, kin, do, nichi", "Pzt, Sal, Çar, Per, Cum, Cmt, Paz", "Mon, Tue, Wed, Thu, Fri, Sat, Sun", {
        note: n(
          "Tabelalarda tek kanji olarak görürsün. Tam hali: 月曜日[げつようび], 火曜日[かようび] ...",
          "Signs show the single kanji. Full form: 月曜日[げつようび], 火曜日[かようび] ..."
        ),
      }),
      p("今日[きょう] / 明日[あした] / 昨日[きのう]", "kyou / ashita / kinou", "Bugün / yarın / dün", "Today / tomorrow / yesterday"),
      p("今日[きょう]は何日[なんにち]ですか", "kyou wa nannichi desu ka", "Bugün ayın kaçı?", "What's the date today?", {
        reply: r("十一月[じゅういちがつ]十日[とおか]です", "juuichigatsu tooka desu", "10 Kasım", "November 10th"),
      }),
      p("十一月[じゅういちがつ]七日[なのか]", "juuichigatsu nanoka", "7 Kasım", "November 7th", {
        note: n(
          "Ayın ilk 10 günü düzensiz: ついたち, ふつか, みっか, よっか, いつか, むいか, なのか, ようか, ここのか, とおか. Ayrıca 14 じゅうよっか, 20 はつか, 24 にじゅうよっか.",
          "Days 1 to 10 are irregular: ついたち, ふつか, みっか, よっか, いつか, むいか, なのか, ようか, ここのか, とおか. Also 14 じゅうよっか, 20 はつか, 24 にじゅうよっか."
        ),
      }),
      p("一週間[いっしゅうかん] / 三週間[さんしゅうかん]", "isshuukan / sanshuukan", "Bir hafta / üç hafta", "One week / three weeks"),
      p("どのくらいかかりますか", "dono kurai kakarimasu ka", "Ne kadar sürer?", "How long does it take?", {
        reply: r("三十分[さんじゅっぷん]くらいです", "sanjuppun kurai desu", "Yarım saat kadar", "About thirty minutes"),
      }),
      p("何分[なんぷん]かかりますか", "nanpun kakarimasu ka", "Kaç dakika sürer?", "How many minutes does it take?"),
      p("次[つぎ]のバスは何時[なんじ]ですか", "tsugi no basu wa nanji desu ka", "Sonraki otobüs saat kaçta?", "What time is the next bus?", {
        reply: r("十時[じゅうじ]十五[じゅうご]分[ふん]です", "juuji juugofun desu", "10.15'te", "At 10:15"),
      }),
      p("ラストオーダーは何時[なんじ]ですか", "rasuto oodaa wa nanji desu ka", "Son sipariş saat kaçta?", "What time is last order?", {
        reply: r("九時[くじ]半[はん]です", "kuji han desu", "Dokuz buçukta", "Half past nine"),
      }),
      p("最終[さいしゅう]入場[にゅうじょう]は何時[なんじ]ですか", "saishuu nyuujou wa nanji desu ka", "Son giriş saat kaçta?", "What time is last entry?", {
        reply: r("四時[よじ]半[はん]までです", "yoji han made desu", "Dört buçuğa kadar", "Until half past four"),
      }),
      p("空[す]いている時間[じかん]はいつですか", "suite iru jikan wa itsu desu ka", "Ne zaman daha tenha olur?", "When is it less crowded?", {
        reply: r("朝[あさ]早[はや]い時間[じかん]がいいですよ", "asa hayai jikan ga ii desu yo", "Sabah erken saatler iyidir", "Early morning is best"),
      }),
      p("十[じゅっ]分[ぷん]くらい遅[おく]れます", "juppun kurai okuremasu", "On dakika kadar gecikeceğim", "I'll be about ten minutes late", {
        note: n(
          "Restoran ya da otel rezervasyonu için arayınca.",
          "When calling a restaurant or hotel about a booking."
        ),
      }),
      p("一[ひと]つ、二[ふた]つ、三[みっ]つ", "hitotsu, futatsu, mittsu", "Bir, iki, üç (tane)", "One, two, three (things)", {
        note: n(
          "Genel sayma, 10'a kadar: よっつ, いつつ, むっつ, ななつ, やっつ, ここのつ, とお. Sipariş verirken en güvenli yol.",
          "General counter up to 10: よっつ, いつつ, むっつ, ななつ, やっつ, ここのつ, とお. The safest way to order."
        ),
      }),
      p("二[ふた]つください", "futatsu kudasai", "İki tane lütfen", "Two, please"),
      p("いくつですか", "ikutsu desu ka", "Kaç tane?", "How many?", {
        hear: true,
        reply: r("三[みっ]つお願[ねが]いします", "mittsu onegai shimasu", "Üç tane lütfen", "Three, please"),
      }),
      p("一人[ひとり] / 二人[ふたり] / 三人[さんにん]", "hitori / futari / sannin", "Bir / iki / üç kişi", "One / two / three people"),
      p("一枚[いちまい] / 二枚[にまい]", "ichimai / nimai", "Bir / iki adet (bilet, kağıt)", "One / two (tickets, sheets)", {
        note: n("Bilet, kağıt, tişört gibi yassı şeyler için.", "For flat things: tickets, paper, T-shirts."),
      }),
      p("一本[いっぽん] / 二本[にほん] / 三本[さんぼん]", "ippon / nihon / sanbon", "Bir / iki / üç adet (şişe, uzun şey)", "One / two / three (bottles, long things)"),
      p("百[ひゃく] / 千[せん] / 一万[いちまん]", "hyaku / sen / ichiman", "Yüz / bin / on bin", "Hundred / thousand / ten thousand", {
        note: n(
          "Japonca on binlerle sayar: 一万[いちまん]円[えん] = 10.000 yen, 三万[さんまん] = 30.000. Ses değişimleri: 300 さんびゃく, 600 ろっぴゃく, 800 はっぴゃく, 3000 さんぜん, 8000 はっせん.",
          "Japanese counts in ten-thousands: 一万[いちまん]円[えん] = 10,000 yen, 三万[さんまん] = 30,000. Sound changes: 300 さんびゃく, 600 ろっぴゃく, 800 はっぴゃく, 3000 さんぜん, 8000 はっせん."
        ),
      }),
      p("三千[さんぜん]八百[はっぴゃく]円[えん]です", "sanzen happyaku en desu", "3.800 yen", "3,800 yen", { hear: true }),
      p("何泊[なんぱく]ですか", "nanpaku desu ka", "Kaç gece?", "How many nights?", {
        hear: true,
        note: n("Geceler: 一泊[いっぱく], 二泊[にはく], 三泊[さんぱく].", "Nights: 一泊[いっぱく], 二泊[にはく], 三泊[さんぱく]."),
        reply: r("三泊[さんぱく]です", "sanpaku desu", "Üç gece", "Three nights"),
      }),
    ],
  },
  {
    key: "transport",
    icon: "🚆",
    title: n("Havalimanı ve ulaşım", "Airport and transport"),
    intro: n(
      "Pasaport kontrolü, tren, Shinkansen, otobüs ve taksi. Peron numarasını ve aktarmayı sormayı bilmek, Japonya'daki günlerinin en büyük kısmını kurtarır.",
      "Immigration, trains, the Shinkansen, buses and taxis. Knowing how to ask about platforms and transfers saves most of your days in Japan."
    ),
    phrases: [
      p("入国[にゅうこく]の目的[もくてき]は何[なん]ですか", "nyuukoku no mokuteki wa nan desu ka", "Ziyaret amacınız nedir?", "What is the purpose of your visit?", {
        hear: true,
        reply: r("観光[かんこう]です", "kankou desu", "Turistik amaçlı", "Sightseeing"),
      }),
      p("どのくらい滞在[たいざい]しますか", "dono kurai taizai shimasu ka", "Ne kadar kalacaksınız?", "How long will you stay?", {
        hear: true,
        reply: r("三週間[さんしゅうかん]です", "sanshuukan desu", "Üç hafta", "Three weeks"),
      }),
      p("東京[とうきょう]駅[えき]に行[い]きたいです", "toukyou eki ni ikitai desu", "Tokyo İstasyonu'na gitmek istiyorum", "I want to go to Tokyo Station", {
        note: n("Kalıp: [yer]に行[い]きたいです.", "Pattern: [place]に行[い]きたいです."),
      }),
      p("京都[きょうと]行[ゆ]きは何番線[なんばんせん]ですか", "kyouto yuki wa nanbansen desu ka", "Kyoto treni hangi perondan kalkıyor?", "Which platform for Kyoto?", {
        note: n(
          "行[ゆ]き = \"... yönüne giden\". Tabelalarda 京都行[きょうとゆき] olarak görürsün.",
          "行[ゆ]き means \"bound for\". Boards show it as 京都行[きょうとゆき]."
        ),
        reply: r("十四番線[じゅうよんばんせん]です", "juuyonbansen desu", "14. peron", "Platform 14"),
      }),
      p("この電車[でんしゃ]は新宿[しんじゅく]に行[い]きますか", "kono densha wa shinjuku ni ikimasu ka", "Bu tren Shinjuku'ya gider mi?", "Does this train go to Shinjuku?", {
        reply: r(
          "いいえ、反対[はんたい]のホームですよ",
          "iie, hantai no hoomu desu yo",
          "Hayır, karşı perondan (karşı taraf)",
          "No, it's the opposite platform (them)"
        ),
      }),
      p("乗[の]り換[か]えはどこですか", "norikae wa doko desu ka", "Aktarma nerede?", "Where do I transfer?"),
      p("どこで乗[の]り換[か]えればいいですか", "doko de norikaereba ii desu ka", "Nerede aktarma yapmalıyım?", "Where should I change trains?", {
        reply: r("品川[しながわ]で乗[の]り換[か]えてください", "shinagawa de norikaete kudasai", "Shinagawa'da aktarma yapın", "Change at Shinagawa"),
      }),
      p("切符[きっぷ]はどこで買[か]えますか", "kippu wa doko de kaemasu ka", "Bileti nereden alabilirim?", "Where can I buy a ticket?", {
        reply: r("あちらの券売機[けんばいき]です", "achira no kenbaiki desu", "Şuradaki bilet makinesinden", "At the ticket machine over there"),
      }),
      p("京都[きょうと]まで、大人[おとな]一枚[いちまい]お願[ねが]いします", "kyouto made, otona ichimai onegai shimasu", "Kyoto'ya bir yetişkin bileti lütfen", "One adult to Kyoto, please"),
      p("指定席[していせき]でお願[ねが]いします", "shiteiseki de onegai shimasu", "Rezerveli koltuk lütfen", "A reserved seat, please", {
        note: n(
          "Rezervesiz vagon: 自由席[じゆうせき] (jiyuuseki). Hafta sonu ve tatilde rezerve almak daha güvenli.",
          "Unreserved car: 自由席[じゆうせき] (jiyuuseki). Reserve at weekends and holidays to be safe."
        ),
      }),
      p("窓側[まどがわ]の席[せき]をお願[ねが]いします", "madogawa no seki o onegai shimasu", "Cam kenarı lütfen", "A window seat, please", {
        note: n(
          "Koridor: 通路側[つうろがわ]. Tokyo'dan Kyoto'ya giderken Fuji dağı sağda kalır (E koltuğu).",
          "Aisle: 通路側[つうろがわ]. Going from Tokyo to Kyoto, Mt Fuji is on the right (seat E)."
        ),
      }),
      p("次[つぎ]の新幹線[しんかんせん]に乗[の]れますか", "tsugi no shinkansen ni noremasu ka", "Sonraki Shinkansen'e binebilir miyim?", "Can I get on the next Shinkansen?", {
        reply: r(
          "指定席[していせき]は満席[まんせき]です。自由席[じゆうせき]なら乗[の]れます",
          "shiteiseki wa manseki desu. jiyuuseki nara noremasu",
          "Rezerveli koltuklar dolu. Rezervesiz vagona binebilirsiniz",
          "Reserved seats are full. You can ride in the unreserved cars"
        ),
      }),
      p("新幹線[しんかんせん]の乗[の]り場[ば]はどこですか", "shinkansen no noriba wa doko desu ka", "Shinkansen binişi nerede?", "Where do I board the Shinkansen?"),
      p("東口[ひがしぐち]はどちらですか", "higashiguchi wa dochira desu ka", "Doğu çıkışı ne tarafta?", "Which way is the east exit?", {
        note: n(
          "Büyük istasyonlarda yanlış çıkış 15 dakikalık yürüyüş demek; buluşma yerini çıkış adıyla belirle. Batı: 西口[にしぐち], kuzey: 北口[きたぐち], güney: 南口[みなみぐち].",
          "At big stations the wrong exit can mean a 15-minute walk; agree on meeting points by exit name. West: 西口[にしぐち], north: 北口[きたぐち], south: 南口[みなみぐち]."
        ),
      }),
      p("チャージしたいです", "chaaji shitai desu", "Kartıma para yüklemek istiyorum", "I'd like to top up my card", {
        note: n(
          "IC kart (Suica, ICOCA, PASMO) yüklemesi. Makinelerde チャージ düğmesini ara; çoğu sadece nakit kabul eder.",
          "Topping up an IC card (Suica, ICOCA, PASMO). Look for the チャージ button on machines; most take cash only."
        ),
      }),
      p("改札[かいさつ]を通[とお]れません", "kaisatsu o tooremasen", "Turnikeden geçemiyorum", "I can't get through the ticket gate", {
        note: n(
          "Genelde bakiye yetersizdir. Turnikenin yanındaki görevli penceresine git.",
          "Usually it's low balance. Go to the staffed window beside the gates."
        ),
        reply: r("カードを拝見[はいけん]します", "kaado o haiken shimasu", "Kartınıza bakayım (personel)", "Let me see your card (staff)"),
      }),
      p("乗[の]り越[こ]し精算[せいさん]はどこですか", "norikoshi seisan wa doko desu ka", "Ücret farkını nerede öderim?", "Where do I pay the fare difference?", {
        note: n(
          "Daha uzağa gittiysen çıkıştan önce 精算機[せいさんき] (fare adjustment) makinesinde farkı öde.",
          "If you rode further than your ticket, pay the difference at the 精算機[せいさんき] (fare adjustment) machine before the gate."
        ),
      }),
      p("終電[しゅうでん]は何時[なんじ]ですか", "shuuden wa nanji desu ka", "Son tren saat kaçta?", "What time is the last train?", {
        note: n(
          "Son trenler gece yarısı civarında kalkar; sonrası sadece taksi.",
          "Last trains leave around midnight; after that it's taxis only."
        ),
        reply: r("十二時[じゅうにじ]五[ご]分[ふん]です", "juuniji gofun desu", "Gece 12.05'te", "At 12:05"),
      }),
      p("このバスは清水寺[きよみずでら]に行[い]きますか", "kono basu wa kiyomizudera ni ikimasu ka", "Bu otobüs Kiyomizu-dera'ya gider mi?", "Does this bus go to Kiyomizu-dera?", {
        reply: r("はい、五条坂[ごじょうざか]で降[お]りてください", "hai, gojouzaka de orite kudasai", "Evet, Gojozaka'da inin", "Yes, get off at Gojozaka"),
      }),
      p("ここで降[お]りればいいですか", "koko de orireba ii desu ka", "Burada mı inmeliyim?", "Should I get off here?"),
      p("降[お]ります", "orimasu", "İnecek var!", "Getting off!", {
        note: n(
          "Kalabalık tren ya da otobüste kapıya doğru ilerlerken.",
          "When pushing towards the door on a crowded train or bus."
        ),
      }),
      p("この住所[じゅうしょ]までお願[ねが]いします", "kono juusho made onegai shimasu", "(Taksi) Bu adrese lütfen", "(Taxi) To this address, please", {
        note: n(
          "Adresi telefonda göster. Taksi kapısı otomatik açılıp kapanır; kendin kapatma.",
          "Show the address on your phone. Taxi doors open and close automatically; don't shut it yourself."
        ),
      }),
      p("京都[きょうと]駅[えき]までお願[ねが]いします", "kyouto eki made onegai shimasu", "(Taksi) Kyoto İstasyonu'na lütfen", "(Taxi) Kyoto Station, please"),
      p("いくらぐらいかかりますか", "ikura gurai kakarimasu ka", "Yaklaşık ne kadar tutar?", "About how much will it cost?", {
        reply: r("二千[にせん]円[えん]ぐらいです", "nisen en gurai desu", "2.000 yen civarı", "About 2,000 yen"),
      }),
      p("ここで止[と]めてください", "koko de tomete kudasai", "Burada durun lütfen", "Please stop here"),
      p("次[つぎ]は渋谷[しぶや]です", "tsugi wa shibuya desu", "Sıradaki durak Shibuya", "Next stop: Shibuya", { hear: true }),
      p("ドアが閉[し]まります", "doa ga shimarimasu", "Kapılar kapanıyor", "The doors are closing", { hear: true }),
      p("黄色[きいろ]い線[せん]の内側[うちがわ]までお下[さ]がりください", "kiiroi sen no uchigawa made osagari kudasai", "Lütfen sarı çizginin gerisine çekilin", "Please stand behind the yellow line", { hear: true }),
      p("ただいま、電車[でんしゃ]が遅[おく]れております", "tadaima, densha ga okurete orimasu", "Şu anda trenler gecikmeli", "Trains are currently delayed", { hear: true }),
      p("運転[うんてん]を見[み]合[あ]わせています", "unten o miawasete imasu", "Seferler geçici olarak durduruldu", "Service is suspended", {
        hear: true,
        note: n(
          "Bunu duyarsan alternatif hat ya da otobüse geç; personel 振替輸送[ふりかえゆそう] (alternatif ulaşım) diyebilir.",
          "If you hear this, switch lines or take a bus; staff may mention 振替輸送[ふりかえゆそう] (alternative transport)."
        ),
      }),
    ],
  },
  {
    key: "lodging",
    icon: "🏨",
    title: n("Otel, ryokan ve onsen", "Hotel, ryokan and onsen"),
    intro: n(
      "Giriş, bagaj, oda sorunları ve onsen. Ryokanlarda akşam yemeği saati sorulur, banyoların kadın ve erkek tarafları gece değişebilir.",
      "Check-in, luggage, room problems and onsen. Ryokan staff will ask your dinner time, and baths may swap men's and women's sides overnight."
    ),
    phrases: [
      p("チェックインお願[ねが]いします", "chekku in onegai shimasu", "Giriş yapmak istiyorum", "Check-in, please", {
        reply: r(
          "お名前[なまえ]を伺[うかが]ってもよろしいですか",
          "onamae o ukagatte mo yoroshii desu ka",
          "Adınızı alabilir miyim? (personel)",
          "May I have your name? (staff)"
        ),
      }),
      p("予約[よやく]しています", "yoyaku shite imasu", "Rezervasyonum var", "I have a reservation"),
      p("ビルゲハンという名前[なまえ]で予約[よやく]しました", "birugehan to iu namae de yoyaku shimashita", "Bilgehan adına rezervasyon yaptım", "I booked under the name Bilgehan", {
        note: n(
          "Kalıp: [soyad]という名前[なまえ]で予約[よやく]しました. Otel sistemlerinde genelde soyadı aranır.",
          "Pattern: [surname]という名前[なまえ]で予約[よやく]しました. Hotels usually look you up by surname."
        ),
      }),
      p("パスポートを拝見[はいけん]できますか", "pasupooto o haiken dekimasu ka", "Pasaportunuzu görebilir miyim?", "May I see your passport?", {
        hear: true,
        note: n(
          "Yabancı misafirlerin pasaportunun fotokopisi yasal zorunluluktur.",
          "Copying foreign guests' passports is a legal requirement."
        ),
        reply: r("はい、どうぞ", "hai, douzo", "Buyurun", "Here you are"),
      }),
      p("こちらにご記入[きにゅう]ください", "kochira ni gokinyuu kudasai", "Lütfen burayı doldurun", "Please fill this in", { hear: true }),
      p("荷物[にもつ]を預[あず]かってもらえますか", "nimotsu o azukatte moraemasu ka", "Bagajımı bırakabilir miyim?", "Could you keep my luggage?", {
        note: n(
          "Girişten önce ve çıkıştan sonra çoğu otel ücretsiz saklar.",
          "Most hotels store bags for free before check-in and after check-out."
        ),
        reply: r("はい、お預[あず]かりします", "hai, oazukari shimasu", "Tabii, alalım (personel)", "Certainly, we'll keep them (staff)"),
      }),
      p("荷物[にもつ]を取[と]りに来[き]ました", "nimotsu o tori ni kimashita", "Bagajımı almaya geldim", "I've come to pick up my luggage"),
      p("チェックアウトは何時[なんじ]ですか", "chekku auto wa nanji desu ka", "Çıkış saat kaçta?", "What time is check-out?", {
        reply: r("十一時[じゅういちじ]までです", "juuichiji made desu", "On bire kadar", "By eleven"),
      }),
      p("朝食[ちょうしょく]は何時[なんじ]からですか", "choushoku wa nanji kara desu ka", "Kahvaltı saat kaçta başlıyor?", "What time does breakfast start?", {
        reply: r("七時[しちじ]からです", "shichiji kara desu", "Yedide başlıyor", "From seven"),
      }),
      p("朝食[ちょうしょく]付[つ]きですか", "choushoku tsuki desu ka", "Kahvaltı dahil mi?", "Is breakfast included?"),
      p("Wi-Fiのパスワードは何[なん]ですか", "wai fai no pasuwaado wa nan desu ka", "Wi-Fi şifresi ne?", "What's the Wi-Fi password?"),
      p("部屋[へや]は何階[なんがい]ですか", "heya wa nangai desu ka", "Oda kaçıncı katta?", "Which floor is the room on?", {
        reply: r("五階[ごかい]です", "gokai desu", "Beşinci katta (asansörde 5F)", "The fifth floor (5F)"),
      }),
      p("お湯[ゆ]が出[で]ません", "oyu ga demasen", "Sıcak su gelmiyor", "There's no hot water"),
      p("エアコンが壊[こわ]れています", "eakon ga kowarete imasu", "Klima bozuk", "The air conditioner is broken", {
        note: n(
          "Kalıp: [şey]が壊[こわ]れています. Japon klimaları ısıtır da: 暖房[だんぼう] düğmesine bak.",
          "Pattern: [thing]が壊[こわ]れています. Japanese air conditioners also heat: look for the 暖房[だんぼう] button."
        ),
      }),
      p("タオルをもう一枚[いちまい]お願[ねが]いします", "taoru o mou ichimai onegai shimasu", "Bir havlu daha lütfen", "One more towel, please"),
      p("毛布[もうふ]をもう一枚[いちまい]いただけますか", "moufu o mou ichimai itadakemasu ka", "Bir battaniye daha alabilir miyim?", "Could I have another blanket?"),
      p("鍵[かぎ]を部屋[へや]に忘[わす]れました", "kagi o heya ni wasuremashita", "Anahtarı odada unuttum", "I left my key in the room"),
      p("近[ちか]くにコンビニはありますか", "chikaku ni konbini wa arimasu ka", "Yakında market var mı?", "Is there a convenience store nearby?", {
        reply: r("駅[えき]の前[まえ]にありますよ", "eki no mae ni arimasu yo", "İstasyonun önünde var", "There's one in front of the station"),
      }),
      p("コインランドリーはありますか", "koin randorii wa arimasu ka", "Çamaşırhane var mı?", "Is there a coin laundry?", {
        reply: r("二階[にかい]にございます", "nikai ni gozaimasu", "İkinci katta, asansörde 2F (personel)", "On the second floor, 2F (staff)"),
      }),
      p("タクシーを呼[よ]んでもらえますか", "takushii o yonde moraemasu ka", "Bana taksi çağırabilir misiniz?", "Could you call me a taxi?"),
      p("もう一泊[いっぱく]できますか", "mou ippaku dekimasu ka", "Bir gece daha kalabilir miyim?", "Can I stay one more night?"),
      p("チェックアウトお願[ねが]いします", "chekku auto onegai shimasu", "Çıkış yapmak istiyorum", "Check-out, please"),
      p("夕食[ゆうしょく]は何時[なんじ]になさいますか", "yuushoku wa nanji ni nasaimasu ka", "Akşam yemeğini saat kaçta istersiniz?", "What time would you like dinner?", {
        hear: true,
        reply: r("七時[しちじ]でお願[ねが]いします", "shichiji de onegai shimasu", "Yedide lütfen", "Seven o'clock, please"),
      }),
      p("ご案内[あんない]します", "goannai shimasu", "Size yol göstereyim", "Let me show you the way", { hear: true }),
      p("浴衣[ゆかた]で食事[しょくじ]に行[い]ってもいいですか", "yukata de shokuji ni itte mo ii desu ka", "Yemeğe yukatayla gidebilir miyim?", "May I go to dinner in my yukata?", {
        note: n(
          "Yukatanın sol tarafı sağın üstüne gelir; tersi cenazeler içindir.",
          "Wrap the left side over the right; the reverse is for funerals."
        ),
        reply: r("はい、どうぞ", "hai, douzo", "Tabii, buyurun", "Of course"),
      }),
      p("大浴場[だいよくじょう]は何時[なんじ]までですか", "daiyokujou wa nanji made desu ka", "Ortak banyo saat kaça kadar açık?", "Until what time is the large bath open?", {
        reply: r("夜[よる]十二時[じゅうにじ]までです", "yoru juuniji made desu", "Gece on ikiye kadar", "Until midnight"),
      }),
      p("男湯[おとこゆ]はどちらですか", "otokoyu wa dochira desu ka", "Erkekler banyosu ne tarafta?", "Which way is the men's bath?", {
        note: n(
          "Kadınlar: 女湯[おんなゆ]. Perdelerde genelde 男[おとこ] / 女[おんな] yazar; bazı onsenlerde sabah taraflar değişir.",
          "Women: 女湯[おんなゆ]. Curtains usually show 男[おとこ] / 女[おんな]; some onsen swap sides in the morning."
        ),
      }),
      p("タトゥーがあるんですが、入[はい]れますか", "tatuu ga arun desu ga, hairemasu ka", "Dövmem var, girebilir miyim?", "I have a tattoo; can I go in?", {
        note: n(
          "Onsen kuralları: önce oturarak duşta yıkan, küçük havluyu suya sokma, başının üstüne koy.",
          "Onsen rules: wash seated at the showers first, keep the small towel out of the water (rest it on your head)."
        ),
        reply: r(
          "申[もう]し訳[わけ]ございませんが、タトゥーのある方[かた]はご遠慮[えんりょ]いただいております",
          "moushiwake gozaimasen ga, tatuu no aru kata wa goenryo itadaite orimasu",
          "Kusura bakmayın, dövmesi olan misafirleri kabul edemiyoruz",
          "We're sorry, but guests with tattoos may not enter"
        ),
      }),
      p("貸切風呂[かしきりぶろ]はありますか", "kashikiri buro wa arimasu ka", "Özel (kiralık) banyo var mı?", "Is there a private bath?", {
        note: n(
          "Saatlik ayrılan özel banyo; dövme varsa iyi bir çözüm.",
          "A bath you book by the hour; a good option if you have tattoos."
        ),
      }),
    ],
  },
  {
    key: "restaurant",
    icon: "🍜",
    title: n("Restoran", "Restaurant"),
    intro: n(
      "Kaç kişi olduğun sorulur, garsonu すみません diye çağırırsın, hesap kasada ödenir. Bahşiş verilmez.",
      "You'll be asked how many you are, you call staff with すみません, and you pay at the register. There's no tipping."
    ),
    phrases: [
      p("いらっしゃいませ。何名様[なんめいさま]ですか", "irasshaimase. nanmeisama desu ka", "Hoş geldiniz. Kaç kişisiniz?", "Welcome. How many people?", {
        hear: true,
        note: n(
          "Parmakla göstermek de olur. Tek kişi: 一人[ひとり]です (hitori desu).",
          "Holding up fingers works too. One person: 一人[ひとり]です (hitori desu)."
        ),
        reply: r("二人[ふたり]です", "futari desu", "İki kişiyiz", "Two people"),
      }),
      p("一人[ひとり]です", "hitori desu", "Tek kişiyim", "Just one person"),
      p("予約[よやく]していないんですが、大丈夫[だいじょうぶ]ですか", "yoyaku shite inain desu ga, daijoubu desu ka", "Rezervasyonum yok, olur mu?", "I don't have a reservation; is that OK?", {
        reply: r("はい、こちらへどうぞ", "hai, kochira e douzo", "Tabii, buyurun bu taraftan", "Yes, this way please"),
      }),
      p("ただいま満席[まんせき]です", "tadaima manseki desu", "Şu an tüm masalar dolu", "We're full at the moment", {
        hear: true,
        note: n(
          "Kapıda bir listeye adını yazman istenebilir.",
          "You may be asked to write your name on a list by the door."
        ),
        reply: r("どのくらい待[ま]ちますか", "dono kurai machimasu ka", "Ne kadar bekleriz?", "How long is the wait?"),
      }),
      p("カウンター席[せき]でもよろしいですか", "kauntaa seki demo yoroshii desu ka", "Bar tezgahında oturmak olur mu?", "Is the counter OK?", {
        hear: true,
        reply: r("はい、大丈夫[だいじょうぶ]です", "hai, daijoubu desu", "Evet, olur", "Yes, that's fine"),
      }),
      p("お好[す]きな席[せき]へどうぞ", "osuki na seki e douzo", "İstediğiniz yere oturun", "Sit anywhere you like", { hear: true }),
      p("食券[しょっけん]はどこで買[か]いますか", "shokken wa doko de kaimasu ka", "Yemek fişini nereden alıyorum?", "Where do I buy a meal ticket?", {
        note: n(
          "Ramen ve gyudon dükkanlarında: önce girişteki makineden fiş al, sonra fişi tezgaha ver.",
          "At ramen and gyudon shops: buy a ticket from the machine at the door first, then hand it over at the counter."
        ),
        reply: r("入口[いりぐち]の券売機[けんばいき]でお願[ねが]いします", "iriguchi no kenbaiki de onegai shimasu", "Girişteki makineden lütfen", "At the machine by the entrance, please"),
      }),
      p("メニューをお願[ねが]いします", "menyuu o onegai shimasu", "Menü lütfen", "The menu, please"),
      p("英語[えいご]のメニューはありますか", "eigo no menyuu wa arimasu ka", "İngilizce menü var mı?", "Is there an English menu?", {
        reply: r("はい、こちらです", "hai, kochira desu", "Evet, buyurun", "Yes, here you are"),
      }),
      p("おすすめは何[なん]ですか", "osusume wa nan desu ka", "Ne önerirsiniz?", "What do you recommend?", {
        reply: r("こちらの定食[ていしょく]が人気[にんき]です", "kochira no teishoku ga ninki desu", "Bu set menü çok tutuluyor", "This set meal is popular"),
      }),
      p("ご注文[ちゅうもん]はお決[き]まりですか", "gochuumon wa okimari desu ka", "Siparişinize karar verdiniz mi?", "Are you ready to order?", {
        hear: true,
        reply: r("もう少[すこ]し待[ま]ってください", "mou sukoshi matte kudasai", "Biraz daha bekleyin lütfen", "A little more time, please"),
      }),
      p("すみません、注文[ちゅうもん]お願[ねが]いします", "sumimasen, chuumon onegai shimasu", "Pardon, sipariş verebilir miyiz?", "Excuse me, we'd like to order", {
        note: n(
          "Garson çoğu zaman kendiliğinden gelmez; elini kaldırıp seslen. Masada zil varsa ona bas.",
          "Staff often won't come by on their own; raise your hand and call out. If there's a button on the table, press it."
        ),
      }),
      p("これを一[ひと]つください", "kore o hitotsu kudasai", "Bundan bir tane lütfen", "One of these, please", {
        note: n("Menüde parmağınla göster.", "Point at it on the menu."),
      }),
      p("あれと同[おな]じものをください", "are to onaji mono o kudasai", "Şunun aynısından istiyorum", "I'll have the same as that"),
      p("これは辛[から]いですか", "kore wa karai desu ka", "Bu acı mı?", "Is this spicy?", {
        reply: r("少[すこ]し辛[から]いです", "sukoshi karai desu", "Biraz acı", "A little spicy"),
      }),
      p("豚肉[ぶたにく]は入[はい]っていますか", "butaniku wa haitte imasu ka", "İçinde domuz eti var mı?", "Does it contain pork?", {
        note: n(
          "Domuz sık gizlenir: gyoza, ramen suyu (豚骨[とんこつ]), tonkatsu, bazı et suları ve soslar.",
          "Pork hides often: gyoza, ramen broth (豚骨[とんこつ]), tonkatsu, some stocks and sauces."
        ),
        reply: r("はい、入[はい]っています", "hai, haitte imasu", "Evet, var", "Yes, it does"),
      }),
      p("このスープは何[なん]のスープですか", "kono suupu wa nan no suupu desu ka", "Bu çorba neyle yapılıyor?", "What is this broth made from?", {
        reply: r("豚骨[とんこつ]です", "tonkotsu desu", "Domuz kemiği suyu", "Pork bone broth"),
      }),
      p("豚肉[ぶたにく]が食[た]べられません", "butaniku ga taberaremasen", "Domuz eti yiyemiyorum", "I can't eat pork", {
        note: n("Kalıp: [yiyecek]が食[た]べられません.", "Pattern: [food]が食[た]べられません."),
      }),
      p("えびのアレルギーがあります", "ebi no arerugii ga arimasu", "Karidese alerjim var", "I'm allergic to shrimp"),
      p("ネギ抜[ぬ]きでお願[ねが]いします", "negi nuki de onegai shimasu", "Yeşil soğansız lütfen", "Without green onion, please", {
        note: n("Kalıp: [malzeme]抜[ぬ]きで, \"... olmadan\".", "Pattern: [ingredient]抜[ぬ]きで, \"without ...\"."),
      }),
      p("大[おお]盛[も]りにできますか", "oomori ni dekimasu ka", "Büyük porsiyon yapabilir misiniz?", "Can I get a large portion?", {
        reply: r("プラス百[ひゃく]円[えん]です", "purasu hyaku en desu", "100 yen fark var", "It's 100 yen extra"),
      }),
      p("麺[めん]の硬[かた]さはどうなさいますか", "men no katasa wa dou nasaimasu ka", "Erişteniz nasıl olsun (sert/yumuşak)?", "How firm would you like your noodles?", {
        hear: true,
        note: n("Sert: かため, yumuşak: やわらかめ.", "Firm: かため, soft: やわらかめ."),
        reply: r("普通[ふつう]でお願[ねが]いします", "futsuu de onegai shimasu", "Normal lütfen", "Regular, please"),
      }),
      p("お水[みず]をください", "omizu o kudasai", "Su lütfen", "Water, please", {
        note: n(
          "Su ve çay genelde ücretsizdir; bazen self-servistir.",
          "Water and tea are usually free; sometimes self-service."
        ),
      }),
      p("生[なま]ビールを二[ふた]つお願[ねが]いします", "nama biiru o futatsu onegai shimasu", "İki fıçı bira lütfen", "Two draught beers, please"),
      p("取[と]り皿[ざら]をください", "torizara o kudasai", "Paylaşım tabağı alabilir miyim?", "Could we have small plates for sharing?"),
      p("フォークはありますか", "fooku wa arimasu ka", "Çatal var mı?", "Do you have a fork?"),
      p("いただきます", "itadakimasu", "Yemeğe başlarken kendin söylersin", "Said before eating"),
      p("おいしかったです", "oishikatta desu", "Çok lezzetliydi", "That was delicious"),
      p("お下[さ]げしてもよろしいですか", "osage shite mo yoroshii desu ka", "Tabağı alabilir miyim?", "May I clear this?", {
        hear: true,
        reply: okPlease,
      }),
      p("持[も]ち帰[かえ]りできますか", "mochikaeri dekimasu ka", "Paket yapabilir misiniz?", "Can I take this to go?"),
      p("お会計[かいけい]お願[ねが]いします", "okaikei onegai shimasu", "Hesap lütfen", "The bill, please", {
        note: n(
          "Çoğu yerde hesap masaya gelmez; fişi alıp kasada (レジ) ödersin. İşaretle: işaret parmaklarıyla küçük bir X.",
          "Usually the bill doesn't come to you; take the slip and pay at the register (レジ). Gesture: a small X with your index fingers."
        ),
      }),
      p("別々[べつべつ]でお願[ねが]いします", "betsubetsu de onegai shimasu", "Ayrı ayrı ödeyeceğiz", "Separate bills, please"),
      p("ごちそうさまでした", "gochisousama deshita", "Elinize sağlık (yemekten sonra)", "Thank you for the meal", {
        note: n(
          "Çıkarken söylenir. Bahşiş verilmez; masada para bırakırsan peşinden koşarlar.",
          "Said as you leave. There's no tipping; leave money on the table and they'll chase you with it."
        ),
      }),
    ],
  },
  {
    key: "konbini",
    icon: "🏪",
    title: n("Konbini", "Konbini"),
    intro: n(
      "7-Eleven, Lawson, FamilyMart: yemek, ATM, tuvalet, bilet. Kasada hep aynı birkaç soru sorulur; bunları tanırsan konbini çok kolay.",
      "7-Eleven, Lawson, FamilyMart: food, ATMs, toilets, tickets. The cashier always asks the same few questions; recognise them and konbini is easy."
    ),
    phrases: [
      p("温[あたた]めますか", "atatamemasu ka", "Isıtayım mı?", "Shall I heat it up?", {
        hear: true,
        note: n("Bento, makarna gibi ısıtılabilen yemekler için.", "For bento, pasta and other heatable food."),
        reply: okPlease,
      }),
      p("これ、温[あたた]めてもらえますか", "kore, atatamete moraemasu ka", "Bunu ısıtabilir misiniz?", "Could you heat this up?"),
      p("袋[ふくろ]はご利用[りよう]ですか", "fukuro wa goriyou desu ka", "Poşet ister misiniz?", "Would you like a bag?", {
        hear: true,
        note: n("Poşetler birkaç yen ücretlidir.", "Bags cost a few yen."),
        reply: noThanks,
      }),
      p("袋[ふくろ]はいりますか", "fukuro wa irimasu ka", "Poşet lazım mı?", "Do you need a bag?", {
        hear: true,
        note: n("Küçük dükkanlarda daha sade hali.", "The plainer version, heard at small shops."),
        reply: okPlease,
      }),
      p("袋[ふくろ]をください", "fukuro o kudasai", "Poşet istiyorum", "A bag, please"),
      p("袋[ふくろ]、お分[わ]けしますか", "fukuro, owake shimasu ka", "Ayrı poşetlere koyayım mı?", "Shall I bag them separately?", {
        hear: true,
        note: n("Sıcak ve soğuk ürünleri ayırmak için sorulur.", "Asked to keep hot and cold items apart."),
        reply: okPlease,
      }),
      p("お箸[はし]はお付[つ]けしますか", "ohashi wa otsuke shimasu ka", "Yemek çubuğu ekleyeyim mi?", "Would you like chopsticks?", {
        hear: true,
        reply: okPlease,
      }),
      p("スプーンはお付[つ]けしますか", "supuun wa otsuke shimasu ka", "Kaşık ekleyeyim mi?", "Would you like a spoon?", {
        hear: true,
        reply: noThanks,
      }),
      p("ポイントカードはお持[も]ちですか", "pointo kaado wa omochi desu ka", "Puan kartınız var mı?", "Do you have a points card?", {
        hear: true,
        reply: r("いいえ、ありません", "iie, arimasen", "Hayır, yok", "No, I don't"),
      }),
      p("お支[し]払[はら]いはどうなさいますか", "oshiharai wa dou nasaimasu ka", "Nasıl ödemek istersiniz?", "How would you like to pay?", {
        hear: true,
        reply: r("カードでお願[ねが]いします", "kaado de onegai shimasu", "Kartla lütfen", "By card, please"),
      }),
      p("お支[し]払[はら]いは機械[きかい]でお願[ねが]いします", "oshiharai wa kikai de onegai shimasu", "Ödemeyi makineden yapın lütfen", "Please pay at the machine", {
        hear: true,
        note: n(
          "Kasiyer okutur, sen yandaki ekrandan ödersin. Nakit de o makineye verilir.",
          "The cashier scans, you pay at the screen beside the till. Cash also goes into that machine."
        ),
      }),
      p("画面[がめん]のタッチをお願[ねが]いします", "gamen no tacchi o onegai shimasu", "Ekrana dokunun lütfen", "Please touch the screen", {
        hear: true,
        note: n(
          "Alkol ya da sigara alırken yaş onayı: ekranda はい'ye bas.",
          "Age confirmation when buying alcohol or cigarettes: press はい on the screen."
        ),
      }),
      p("千[せん]円[えん]お預[あず]かりします", "sen en oazukari shimasu", "1.000 yen aldım", "Out of 1,000 yen", { hear: true }),
      p("二百[にひゃく]円[えん]のお返[かえ]しです", "nihyaku en no okaeshi desu", "200 yen para üstünüz", "Here's 200 yen change", { hear: true }),
      p("レシートはご入用[いりよう]ですか", "reshiito wa goiriyou desu ka", "Fiş ister misiniz?", "Do you need the receipt?", {
        hear: true,
        reply: noThanks,
      }),
      p("ホットとアイス、どちらになさいますか", "hotto to aisu, dochira ni nasaimasu ka", "Sıcak mı, soğuk mu?", "Hot or iced?", {
        hear: true,
        note: n(
          "Kahvede boş bardak verilir; makinede kendin doldurursun.",
          "For coffee you get an empty cup and fill it yourself at the machine."
        ),
        reply: r("ホットでお願[ねが]いします", "hotto de onegai shimasu", "Sıcak lütfen", "Hot, please"),
      }),
      p("次[つぎ]の方[かた]、どうぞ", "tsugi no kata, douzo", "Sıradaki, buyurun", "Next, please", { hear: true }),
      p("こちらへどうぞ", "kochira e douzo", "Bu taraftan buyurun", "This way, please", { hear: true }),
      p("トイレを借[か]りてもいいですか", "toire o karite mo ii desu ka", "Tuvaleti kullanabilir miyim?", "May I use the toilet?", {
        note: n(
          "Çoğu konbinide müşteri tuvaleti var; kullandıktan sonra küçük bir şey almak nezaket.",
          "Most konbini have a customer toilet; buying something small afterwards is good manners."
        ),
        reply: r("はい、奥[おく]にあります", "hai, oku ni arimasu", "Evet, arkada", "Yes, it's at the back"),
      }),
      p("お湯[ゆ]はありますか", "oyu wa arimasu ka", "Sıcak su var mı?", "Is there hot water?", {
        note: n("Hazır erişte (cup ramen) için.", "For instant cup noodles."),
        reply: r("あちらにございます", "achira ni gozaimasu", "Şu tarafta (personel)", "Over there (staff)"),
      }),
      p("ゴミ箱[ばこ]はどこですか", "gomibako wa doko desu ka", "Çöp kutusu nerede?", "Where's the bin?", {
        note: n(
          "Sokakta neredeyse hiç çöp kutusu yok; konbininin önündekiler ya da çantan.",
          "Public bins are almost nonexistent; use the ones at konbini or carry your rubbish."
        ),
      }),
      p("このおにぎりの中[なか]は何[なん]ですか", "kono onigiri no naka wa nan desu ka", "Bu onigirinin içinde ne var?", "What's inside this onigiri?", {
        reply: r("ツナマヨです", "tsuna mayo desu", "Ton balıklı mayonez", "Tuna mayo"),
      }),
      p("これは何[なん]の味[あじ]ですか", "kore wa nan no aji desu ka", "Bu ne aromalı?", "What flavour is this?", {
        reply: r("抹茶[まっちゃ]味[あじ]です", "matcha aji desu", "Matcha aromalı", "Matcha flavour"),
      }),
      p("傘[かさ]はありますか", "kasa wa arimasu ka", "Şemsiye var mı?", "Do you sell umbrellas?", {
        reply: r("入口[いりぐち]の近[ちか]くにあります", "iriguchi no chikaku ni arimasu", "Girişin yanında", "Near the entrance"),
      }),
      p("Suicaで払[はら]えますか", "suika de haraemasu ka", "Suica ile ödeyebilir miyim?", "Can I pay with Suica?", {
        reply: r("はい、使[つか]えます", "hai, tsukaemasu", "Evet, geçiyor", "Yes, you can"),
      }),
    ],
  },
  {
    key: "shopping",
    icon: "🛍️",
    title: n("Alışveriş", "Shopping"),
    intro: n(
      "Mağaza, hediyelik eşya ve beden sormak. Normal dükkanlarda pazarlık yapılmaz; hediye paketi ise çoğu zaman ücretsizdir.",
      "Shops, souvenirs and sizes. Haggling isn't done in ordinary shops; gift wrapping is often free."
    ),
    phrases: [
      p("何[なに]かお探[さが]しですか", "nanika osagashi desu ka", "Bir şey mi arıyorsunuz?", "Are you looking for something?", {
        hear: true,
        reply: r("見[み]ているだけです", "mite iru dake desu", "Sadece bakıyorum", "I'm just looking"),
      }),
      p("お土産[みやげ]を探[さが]しています", "omiyage o sagashite imasu", "Hediyelik bir şey arıyorum", "I'm looking for souvenirs", {
        note: n("Kalıp: [şey]を探[さが]しています.", "Pattern: [thing]を探[さが]しています."),
      }),
      p("これはいくらですか", "kore wa ikura desu ka", "Bu ne kadar?", "How much is this?"),
      p("これを見[み]せてください", "kore o misete kudasai", "Bunu görebilir miyim?", "Could I see this one?"),
      p("試着[しちゃく]してもいいですか", "shichaku shite mo ii desu ka", "Deneyebilir miyim?", "May I try it on?", {
        reply: r("はい、こちらへどうぞ", "hai, kochira e douzo", "Tabii, bu taraftan", "Of course, this way"),
      }),
      p("もっと大[おお]きいのはありますか", "motto ookii no wa arimasu ka", "Daha büyüğü var mı?", "Do you have a bigger one?", {
        note: n(
          "Japon bedenleri küçük kalır; bir beden büyüğünü dene.",
          "Japanese sizes run small; try one size up."
        ),
        reply: r(
          "少々[しょうしょう]お待[ま]ちください、確認[かくにん]します",
          "shoushou omachi kudasai, kakunin shimasu",
          "Bir dakika, bakayım",
          "One moment, I'll check"
        ),
      }),
      p("もっと小[ちい]さいのはありますか", "motto chiisai no wa arimasu ka", "Daha küçüğü var mı?", "Do you have a smaller one?"),
      p("Mサイズはありますか", "emu saizu wa arimasu ka", "M beden var mı?", "Do you have a medium?", {
        reply: r(
          "申[もう]し訳[わけ]ございません、在庫[ざいこ]がございません",
          "moushiwake gozaimasen, zaiko ga gozaimasen",
          "Kusura bakmayın, stokta yok",
          "I'm sorry, it's out of stock"
        ),
      }),
      p("他[ほか]の色[いろ]はありますか", "hoka no iro wa arimasu ka", "Başka rengi var mı?", "Do you have other colours?"),
      p("これの黒[くろ]はありますか", "kore no kuro wa arimasu ka", "Bunun siyahı var mı?", "Do you have this in black?", {
        note: n(
          "Beyaz: 白[しろ], kırmızı: 赤[あか], mavi: 青[あお].",
          "White: 白[しろ], red: 赤[あか], blue: 青[あお]."
        ),
      }),
      p("日本製[にほんせい]ですか", "nihonsei desu ka", "Japon malı mı?", "Is it made in Japan?"),
      p("京都[きょうと]の名物[めいぶつ]は何[なん]ですか", "kyouto no meibutsu wa nan desu ka", "Kyoto'nun meşhur ürünü ne?", "What is Kyoto famous for (to buy)?", {
        reply: r("八[や]つ橋[はし]が有名[ゆうめい]ですよ", "yatsuhashi ga yuumei desu yo", "Yatsuhashi meşhurdur", "Yatsuhashi is famous"),
      }),
      p("試食[ししょく]してもいいですか", "shishoku shite mo ii desu ka", "Tadına bakabilir miyim?", "May I try a sample?", {
        reply: r("どうぞ、お召[め]し上[あ]がりください", "douzo, omeshiagari kudasai", "Buyurun, tadın", "Please, go ahead and try"),
      }),
      p("賞味[しょうみ]期限[きげん]はいつまでですか", "shoumi kigen wa itsu made desu ka", "Son kullanma tarihi ne zaman?", "What's the best-before date?", {
        note: n("Yiyecek hediyelikler için.", "For food souvenirs."),
        reply: r("二週間[にしゅうかん]です", "nishuukan desu", "İki hafta", "Two weeks"),
      }),
      p("飛行機[ひこうき]に持[も]ち込[こ]めますか", "hikouki ni mochikomemasu ka", "Uçakta kabine alabilir miyim?", "Can I take this on the plane?", {
        note: n("Sıvılar, bıçaklar, sake için sor.", "Ask about liquids, knives, sake."),
      }),
      p("靴[くつ]売[う]り場[ば]は何階[なんがい]ですか", "kutsu uriba wa nangai desu ka", "Ayakkabı reyonu kaçıncı katta?", "Which floor is shoes on?", {
        note: n(
          "Kalıp: [ürün]売[う]り場[ば]. Katlar: 一階[いっかい], 二階[にかい], 三階[さんがい].",
          "Pattern: [item]売[う]り場[ば]. Floors: 一階[いっかい], 二階[にかい], 三階[さんがい]."
        ),
        reply: r("三階[さんがい]です", "sangai desu", "Üçüncü katta (asansörde 3F)", "The third floor (3F)"),
      }),
      p("ちょっと考[かんが]えます", "chotto kangaemasu", "Biraz düşüneyim", "Let me think about it", {
        note: n(
          "Almadan çıkmanın kibar yolu.",
          "The polite way to leave without buying."
        ),
      }),
      p("これにします", "kore ni shimasu", "Bunu alıyorum", "I'll take this"),
      p("全部[ぜんぶ]でいくらですか", "zenbu de ikura desu ka", "Hepsi ne kadar?", "How much is it altogether?"),
      p("合計[ごうけい]で三千[さんぜん]円[えん]になります", "goukei de sanzen en ni narimasu", "Toplam 3.000 yen", "That comes to 3,000 yen in total", { hear: true }),
      p("免税[めんぜい]できますか", "menzei dekimasu ka", "Vergisiz alabilir miyim?", "Can I buy this tax-free?", {
        note: n(
          "Pasaportunu yanında taşı. Japonya'nın tax-free sistemi Kasım 2026'da değişiyor; usulü kasada sor.",
          "Carry your passport. Japan's tax-free system is changing in November 2026; ask at the till how it works."
        ),
        reply: r("パスポートをお願[ねが]いします", "pasupooto o onegai shimasu", "Pasaportunuz lütfen", "Your passport, please"),
      }),
      p("免税[めんぜい]カウンターはどこですか", "menzei kauntaa wa doko desu ka", "Tax-free bankosu nerede?", "Where is the tax-free counter?", {
        reply: r("一階[いっかい]にございます", "ikkai ni gozaimasu", "1. katta, giriş katında (personel)", "On the first floor, the ground level (staff)"),
      }),
      p("ご自宅[じたく]用[よう]ですか", "gojitaku you desu ka", "Kendiniz için mi?", "Is it for yourself?", {
        hear: true,
        note: n(
          "\"Hediye mi, kendiniz için mi?\" sorusu: cevaba göre paketlerler.",
          "\"Gift or for yourself?\": they wrap according to your answer."
        ),
        reply: r("プレゼント用[よう]です", "purezento you desu", "Hediye olacak", "It's a gift"),
      }),
      p("プレゼント用[よう]に包[つつ]んでもらえますか", "purezento you ni tsutsunde moraemasu ka", "Hediye paketi yapar mısınız?", "Could you gift-wrap it?", {
        reply: r("かしこまりました", "kashikomarimashita", "Tabii efendim", "Certainly"),
      }),
      p("別々[べつべつ]に包[つつ]んでもらえますか", "betsubetsu ni tsutsunde moraemasu ka", "Ayrı ayrı paketler misiniz?", "Could you wrap them separately?"),
      p("小[ちい]さい袋[ふくろ]をもらえますか", "chiisai fukuro o moraemasu ka", "Küçük poşet alabilir miyim?", "Could I have some small bags?", {
        note: n(
          "Dağıtacağın hediyelikler için; çoğu dükkan ücretsiz verir.",
          "For souvenirs you'll hand out; most shops give them free."
        ),
      }),
      p("ありがとうございました。またお越[こ]しくださいませ", "arigatou gozaimashita. mata okoshi kudasaimase", "Teşekkürler, yine bekleriz", "Thank you, please come again", { hear: true }),
    ],
  },
  {
    key: "money",
    icon: "💴",
    title: n("Para ve ödeme", "Money and payment"),
    intro: n(
      "Kart artık çoğu yerde geçiyor ama küçük restoranlar, tapınaklar ve otobüsler hâlâ nakit istiyor. Yabancı kartlar 7-Eleven ve postane ATM'lerinde çalışır.",
      "Cards work in most places now, but small restaurants, temples and buses still want cash. Foreign cards work at 7-Eleven and Japan Post ATMs."
    ),
    phrases: [
      p("近[ちか]くにATMはありますか", "chikaku ni ee tii emu wa arimasu ka", "Yakında ATM var mı?", "Is there an ATM nearby?", {
        reply: r("コンビニにありますよ", "konbini ni arimasu yo", "Konbinide var", "There's one in the konbini"),
      }),
      p("海外[かいがい]のカードは使[つか]えますか", "kaigai no kaado wa tsukaemasu ka", "Yabancı kart geçiyor mu?", "Do foreign cards work?"),
      p("カードで払[はら]えますか", "kaado de haraemasu ka", "Kartla ödeyebilir miyim?", "Can I pay by card?", {
        reply: r("すみません、現金[げんきん]のみです", "sumimasen, genkin nomi desu", "Kusura bakmayın, sadece nakit", "Sorry, cash only"),
      }),
      p("現金[げんきん]のみとなっております", "genkin nomi to natte orimasu", "Sadece nakit kabul ediyoruz", "We only take cash", {
        hear: true,
        reply: r("わかりました、現金[げんきん]で払[はら]います", "wakarimashita, genkin de haraimasu", "Tamam, nakit öderim", "OK, I'll pay cash"),
      }),
      p("現金[げんきん]で払[はら]います", "genkin de haraimasu", "Nakit ödeyeceğim", "I'll pay in cash"),
      p("交通系[こうつうけい]ICカードは使[つか]えますか", "koutsuukei aishii kaado wa tsukaemasu ka", "Ulaşım kartı (Suica vb.) geçiyor mu?", "Can I use a transit IC card?", {
        note: n(
          "Suica, ICOCA, PASMO konbinide, otomatlarda ve birçok dükkanda para gibi geçer.",
          "Suica, ICOCA and PASMO work like cash at konbini, vending machines and many shops."
        ),
        reply: r("はい、ご利用[りよう]いただけます", "hai, goriyou itadakemasu", "Evet, kullanabilirsiniz", "Yes, you can use it"),
      }),
      p("こちらにタッチしてください", "kochira ni tacchi shite kudasai", "Buraya dokundurun", "Please tap here", { hear: true }),
      p("暗証[あんしょう]番号[ばんごう]を入力[にゅうりょく]してください", "anshou bangou o nyuuryoku shite kudasai", "Şifrenizi girin", "Please enter your PIN", { hear: true }),
      p("一括払[いっかつばら]いでよろしいですか", "ikkatsubarai de yoroshii desu ka", "Tek çekim olsun mu?", "In a single payment?", {
        hear: true,
        note: n("Kredi kartında taksit sorusu; her zaman evet de.", "The instalments question on credit cards; always say yes."),
        reply: r("はい、一括[いっかつ]で", "hai, ikkatsu de", "Evet, tek çekim", "Yes, one payment"),
      }),
      p("サインをお願[ねが]いします", "sain o onegai shimasu", "İmzanız lütfen", "Your signature, please", { hear: true }),
      p("こちらのトレーにお願[ねが]いします", "kochira no toree ni onegai shimasu", "Lütfen bu tepsiye koyun", "Please place it on this tray", {
        hear: true,
        note: n(
          "Parayı kasiyerin eline değil, kasadaki küçük tepsiye koy.",
          "Put cash on the little tray at the till, not into the cashier's hand."
        ),
      }),
      p("細[こま]かいのはありますか", "komakai no wa arimasu ka", "Bozuk paranız var mı?", "Do you have smaller change?", {
        hear: true,
        reply: r("すみません、ありません", "sumimasen, arimasen", "Maalesef yok", "Sorry, I don't"),
      }),
      p("一万[いちまん]円[えん]札[さつ]でもいいですか", "ichiman en satsu demo ii desu ka", "10.000 yenlik banknot olur mu?", "Is a 10,000 yen note OK?", {
        reply: r("はい、大丈夫[だいじょうぶ]です", "hai, daijoubu desu", "Evet, olur", "Yes, that's fine"),
      }),
      p("細[こま]かくしてもらえますか", "komakaku shite moraemasu ka", "Bozabilir misiniz?", "Could you break this note?", {
        note: n(
          "Otobüs ve emanet dolabı için bozuk lazım olur. Otobüslerde genelde bozdurma makinesi vardır.",
          "Buses and lockers need coins. Buses usually have a change machine by the driver."
        ),
        reply: r(
          "申[もう]し訳[わけ]ありません、両替[りょうがえ]はできません",
          "moushiwake arimasen, ryougae wa dekimasen",
          "Kusura bakmayın, bozamıyoruz",
          "Sorry, we can't make change"
        ),
      }),
      p("両替[りょうがえ]はどこでできますか", "ryougae wa doko de dekimasu ka", "Döviz nerede bozdurabilirim?", "Where can I exchange money?"),
      p("手数料[てすうりょう]はかかりますか", "tesuuryou wa kakarimasu ka", "Komisyon var mı?", "Is there a fee?"),
      p("お釣[つ]りです", "otsuri desu", "Para üstünüz", "Here's your change", { hear: true }),
      p("税[ぜい]込[こ]みですか", "zeikomi desu ka", "Vergi dahil mi?", "Does that include tax?", {
        note: n(
          "Etiketlerde 税込[ぜいこみ] = vergi dahil, 税抜[ぜいぬき] = vergi hariç (%10 eklenir; paket yiyecekte %8).",
          "On price tags 税込[ぜいこみ] means tax included, 税抜[ぜいぬき] tax excluded (add 10%; 8% for takeaway food)."
        ),
        reply: r("はい、税[ぜい]込[こ]みです", "hai, zeikomi desu", "Evet, dahil", "Yes, it's included"),
      }),
      p("一人[ひとり]いくらですか", "hitori ikura desu ka", "Kişi başı ne kadar?", "How much per person?"),
      p("レシートをください", "reshiito o kudasai", "Fiş alabilir miyim?", "A receipt, please"),
      p("領収書[りょうしゅうしょ]をお願[ねが]いします", "ryoushuusho o onegai shimasu", "Fatura/makbuz lütfen", "A formal receipt, please", {
        note: n(
          "Sigorta ya da iş masrafı için resmi makbuz. Basit fiş: レシート.",
          "An official receipt, for insurance or expenses. A plain receipt is レシート."
        ),
      }),
      p("パスポートは必要[ひつよう]ですか", "pasupooto wa hitsuyou desu ka", "Pasaport gerekli mi?", "Do I need my passport?", {
        note: n("Tax-free alışverişte gerekir.", "Needed for tax-free shopping."),
      }),
      p("残高[ざんだか]を確認[かくにん]したいです", "zandaka o kakunin shitai desu", "Bakiyemi görmek istiyorum", "I'd like to check my balance", {
        note: n(
          "IC kart bakiyesi istasyon makinelerinde ve turnike ekranında görünür.",
          "IC card balance shows at station machines and on the gate display."
        ),
      }),
      p("払[はら]い戻[もど]しはできますか", "haraimodoshi wa dekimasu ka", "Para iadesi yapılabilir mi?", "Can I get a refund?", {
        note: n(
          "Kullanılmamış bilet ya da IC kart bakiyesi için. Japonya'dan ayrılmadan önce istasyon penceresine sor.",
          "For an unused ticket or IC card balance. Ask at the station window before you leave Japan."
        ),
      }),
      p("お金[かね]が足[た]りません", "okane ga tarimasen", "Param yetmiyor", "I don't have enough money"),
    ],
  },
  {
    key: "sightseeing",
    icon: "⛩️",
    title: n("Gezi, tapınak ve yol sorma", "Sightseeing, temples and directions"),
    intro: n(
      "Yol sormak, bilet, fotoğraf ve tapınak adabı. Japonlar yol tarif ederken çok yardımseverdir; çoğu zaman seni oraya kadar götürürler.",
      "Asking the way, tickets, photos and temple etiquette. People are very helpful with directions and often walk you there."
    ),
    phrases: [
      p("金閣寺[きんかくじ]へはどう行[い]けばいいですか", "kinkakuji e wa dou ikeba ii desu ka", "Kinkaku-ji'ye nasıl gidebilirim?", "How do I get to Kinkaku-ji?", {
        note: n("Kalıp: [yer]へはどう行[い]けばいいですか.", "Pattern: [place]へはどう行[い]けばいいですか."),
        reply: r("205番[ばん]のバスに乗[の]ってください", "nihyaku go ban no basu ni notte kudasai", "205 numaralı otobüse binin", "Take bus number 205"),
      }),
      p("ここから遠[とお]いですか", "koko kara tooi desu ka", "Buradan uzak mı?", "Is it far from here?", {
        reply: r("歩[ある]いて十[じゅっ]分[ぷん]くらいです", "aruite juppun kurai desu", "Yürüyerek on dakika kadar", "About ten minutes on foot"),
      }),
      p("歩[ある]いて行[い]けますか", "aruite ikemasu ka", "Yürüyerek gidilir mi?", "Can I walk there?"),
      p("一番[いちばん]近[ちか]い駅[えき]はどこですか", "ichiban chikai eki wa doko desu ka", "En yakın istasyon nerede?", "Where's the nearest station?"),
      p("今[いま]、この地図[ちず]のどこにいますか", "ima, kono chizu no doko ni imasu ka", "Şu an haritada neredeyiz?", "Where are we on this map?"),
      p("まっすぐ行[い]って、二[ふた]つ目[め]の角[かど]を右[みぎ]です", "massugu itte, futatsume no kado o migi desu", "Düz gidin, ikinci köşeden sağa", "Go straight, turn right at the second corner", {
        hear: true,
        reply: r("ありがとうございます", "arigatou gozaimasu", "Teşekkür ederim", "Thank you"),
      }),
      p("右[みぎ] / 左[ひだり] / まっすぐ", "migi / hidari / massugu", "Sağ / sol / düz", "Right / left / straight on", { hear: true }),
      p("信号[しんごう]を渡[わた]って左[ひだり]です", "shingou o watatte hidari desu", "Işıklardan karşıya geçip solda", "Cross at the lights, then it's on the left", { hear: true }),
      p("突[つ]き当[あ]たりです", "tsukiatari desu", "Yolun sonunda", "It's at the end of the street", { hear: true }),
      p("入場料[にゅうじょうりょう]はいくらですか", "nyuujouryou wa ikura desu ka", "Giriş ücreti ne kadar?", "How much is admission?", {
        reply: r("大人[おとな]五百[ごひゃく]円[えん]です", "otona gohyaku en desu", "Yetişkin 500 yen", "500 yen for adults"),
      }),
      p("大人[おとな]二枚[にまい]お願[ねが]いします", "otona nimai onegai shimasu", "İki yetişkin bileti lütfen", "Two adults, please"),
      p("英語[えいご]のパンフレットはありますか", "eigo no panfuretto wa arimasu ka", "İngilizce broşür var mı?", "Is there an English leaflet?"),
      p("音声[おんせい]ガイドはありますか", "onsei gaido wa arimasu ka", "Sesli rehber var mı?", "Is there an audio guide?"),
      p("写真[しゃしん]を撮[と]ってもいいですか", "shashin o totte mo ii desu ka", "Fotoğraf çekebilir miyim?", "May I take photos?", {
        note: n(
          "Tapınak salonlarının içinde çoğu zaman yasak. Tabela: 撮影[さつえい]禁止[きんし].",
          "Often forbidden inside temple halls. Sign: 撮影[さつえい]禁止[きんし]."
        ),
        reply: r(
          "すみません、ここは撮影[さつえい]禁止[きんし]です",
          "sumimasen, koko wa satsuei kinshi desu",
          "Kusura bakmayın, burada fotoğraf yasak",
          "Sorry, no photos here"
        ),
      }),
      p("写真[しゃしん]を撮[と]ってもらえますか", "shashin o totte moraemasu ka", "Fotoğrafımı çeker misiniz?", "Could you take our photo?", {
        reply: r("いいですよ。はい、撮[と]りますよ", "ii desu yo. hai, torimasu yo", "Tabii. Hazır, çekiyorum", "Sure. Ready, here goes"),
      }),
      p("このボタンを押[お]すだけです", "kono botan o osu dake desu", "Sadece bu tuşa basın", "Just press this button"),
      p("もう一枚[いちまい]お願[ねが]いします", "mou ichimai onegai shimasu", "Bir tane daha lütfen", "One more, please"),
      p("中[なか]に入[はい]ってもいいですか", "naka ni haitte mo ii desu ka", "İçeri girebilir miyim?", "May I go inside?", {
        reply: r(
          "すみません、ここは立入[たちいり]禁止[きんし]です",
          "sumimasen, koko wa tachiiri kinshi desu",
          "Kusura bakmayın, buraya giriş yasak",
          "Sorry, no entry here"
        ),
      }),
      p("靴[くつ]をお脱[ぬ]ぎください", "kutsu o onugi kudasai", "Lütfen ayakkabılarınızı çıkarın", "Please take off your shoes", {
        hear: true,
        note: n(
          "Tapınak salonları, ryokan, bazı restoranlar. Temiz çorap giy.",
          "Temple halls, ryokan, some restaurants. Wear clean socks."
        ),
      }),
      p("靴[くつ]はどこに置[お]けばいいですか", "kutsu wa doko ni okeba ii desu ka", "Ayakkabıları nereye koyayım?", "Where should I put my shoes?", {
        reply: r("こちらの袋[ふくろ]に入[い]れてください", "kochira no fukuro ni irete kudasai", "Bu poşete koyun", "Put them in this bag"),
      }),
      p("お参[まい]りの仕方[しかた]を教[おし]えてもらえますか", "omairi no shikata o oshiete moraemasu ka", "Nasıl dua edildiğini gösterir misiniz?", "Could you show me how to pray here?", {
        note: n(
          "Şinto tapınağı (神社[じんじゃ]): iki eğil, iki alkış, bir eğil. Budist tapınağı (お寺[てら]): alkış yok, sessizce ellerini birleştir.",
          "Shinto shrine (神社[じんじゃ]): two bows, two claps, one bow. Buddhist temple (お寺[てら]): no clapping, just join your hands quietly."
        ),
      }),
      p("御朱印[ごしゅいん]をお願[ねが]いします", "goshuin o onegai shimasu", "Goshuin (tapınak mührü) rica ediyorum", "A goshuin stamp, please", {
        note: n(
          "Mühür defterine (御朱印帳[ごしゅいんちょう]) el yazısıyla yazılan tapınak mührü; birkaç yüz yen.",
          "A hand-written temple seal in your stamp book (御朱印帳[ごしゅいんちょう]); a few hundred yen."
        ),
        reply: r(
          "書[か]き置[お]きでもよろしいですか",
          "kakioki demo yoroshii desu ka",
          "Önceden yazılmış kağıt olur mu? (personel)",
          "Is a pre-written sheet OK? (staff)"
        ),
      }),
      p("御朱印[ごしゅいん]はどこでいただけますか", "goshuin wa doko de itadakemasu ka", "Goshuin nereden alınıyor?", "Where can I get a goshuin?", {
        reply: r("あちらの授与所[じゅよしょ]です", "achira no juyosho desu", "Şuradaki tılsım bankosunda", "At the amulet counter over there"),
      }),
      p("お守[まも]りはどこで買[か]えますか", "omamori wa doko de kaemasu ka", "Tılsımı (omamori) nereden alabilirim?", "Where can I buy an omamori?"),
      p("おすすめの場所[ばしょ]はありますか", "osusume no basho wa arimasu ka", "Önerdiğiniz bir yer var mı?", "Is there a place you'd recommend?", {
        reply: r("伏見[ふしみ]稲荷[いなり]がおすすめです", "fushimi inari ga osusume desu", "Fushimi Inari'yi öneririm", "I'd recommend Fushimi Inari"),
      }),
      p("地元[じもと]の人[ひと]が行[い]くお店[みせ]を教[おし]えてください", "jimoto no hito ga iku omise o oshiete kudasai", "Yerlilerin gittiği bir yer söyler misiniz?", "Could you tell me a place locals go?"),
      p("紅葉[こうよう]は今[いま]見頃[みごろ]ですか", "kouyou wa ima migoro desu ka", "Yapraklar şu an en güzel halinde mi?", "Are the autumn leaves at their best now?", {
        reply: r("来週[らいしゅう]が見頃[みごろ]ですね", "raishuu ga migoro desu ne", "Haftaya tam zamanı olur", "Next week will be the peak"),
      }),
      p("ライトアップは何時[なんじ]からですか", "raito appu wa nanji kara desu ka", "Gece ışıklandırması saat kaçta başlıyor?", "What time does the illumination start?", {
        note: n(
          "Kasımda birçok tapınak sonbahar yapraklarını akşam ışıklandırır; ayrı bilet gerekir.",
          "In November many temples light up the autumn leaves in the evening; it needs a separate ticket."
        ),
        reply: r("五時[ごじ]半[はん]からです", "goji han kara desu", "Beş buçukta", "From half past five"),
      }),
      p("コインロッカーはありますか", "koin rokkaa wa arimasu ka", "Emanet dolabı var mı?", "Are there coin lockers?", {
        reply: r("駅[えき]の中[なか]にあります", "eki no naka ni arimasu", "İstasyonun içinde var", "Inside the station"),
      }),
    ],
  },
  {
    key: "health-emergency",
    icon: "🆘",
    title: n("Sağlık ve acil durum", "Health and emergencies"),
    intro: n(
      "Ambulans ve itfaiye 119, polis 110. Eczanede (薬局[やっきょく] ya da ドラッグストア) hafif ilaçlar reçetesiz satılır.",
      "Ambulance and fire 119, police 110. Pharmacies (薬局[やっきょく] or ドラッグストア) sell mild medicine without a prescription."
    ),
    phrases: [
      p("助[たす]けてください", "tasukete kudasai", "Yardım edin!", "Help!"),
      p("救急車[きゅうきゅうしゃ]を呼[よ]んでください", "kyuukyuusha o yonde kudasai", "Ambulans çağırın", "Please call an ambulance", {
        note: n("Ambulans ve itfaiye 119, polis 110.", "Ambulance and fire 119, police 110."),
      }),
      p("警察[けいさつ]を呼[よ]んでください", "keisatsu o yonde kudasai", "Polis çağırın", "Please call the police"),
      p("火事[かじ]です", "kaji desu", "Yangın var!", "Fire!"),
      p("どうしましたか", "dou shimashita ka", "Neyiniz var? / Ne oldu?", "What's wrong?", {
        hear: true,
        reply: r("頭[あたま]が痛[いた]いです", "atama ga itai desu", "Başım ağrıyor", "I have a headache"),
      }),
      p("気分[きぶん]が悪[わる]いです", "kibun ga warui desu", "Kendimi iyi hissetmiyorum", "I feel unwell"),
      p("頭[あたま]が痛[いた]いです", "atama ga itai desu", "Başım ağrıyor", "I have a headache", {
        note: n(
          "Kalıp: [yer]が痛[いた]いです. Diş: 歯[は], sırt: 背中[せなか], ayak: 足[あし].",
          "Pattern: [body part]が痛[いた]いです. Tooth: 歯[は], back: 背中[せなか], foot/leg: 足[あし]."
        ),
      }),
      p("お腹[なか]が痛[いた]いです", "onaka ga itai desu", "Karnım ağrıyor", "I have a stomach ache"),
      p("喉[のど]が痛[いた]いです", "nodo ga itai desu", "Boğazım ağrıyor", "I have a sore throat"),
      p("熱[ねつ]があります", "netsu ga arimasu", "Ateşim var", "I have a fever"),
      p("風邪[かぜ]をひきました", "kaze o hikimashita", "Üşüttüm / soğuk algınlığım var", "I've caught a cold"),
      p("咳[せき]が出[で]ます", "seki ga demasu", "Öksürüyorum", "I have a cough"),
      p("吐[は]き気[け]がします", "hakike ga shimasu", "Midem bulanıyor", "I feel nauseous"),
      p("めまいがします", "memai ga shimasu", "Başım dönüyor", "I feel dizzy"),
      p("足[あし]をけがしました", "ashi o kega shimashita", "Ayağımı yaraladım", "I hurt my leg"),
      p("アレルギーがあります", "arerugii ga arimasu", "Alerjim var", "I have an allergy", {
        reply: r("何[なん]のアレルギーですか", "nan no arerugii desu ka", "Neye alerjiniz var? (personel)", "What are you allergic to? (staff)"),
      }),
      p("薬局[やっきょく]はどこですか", "yakkyoku wa doko desu ka", "Eczane nerede?", "Where is a pharmacy?"),
      p("風邪薬[かぜぐすり]はありますか", "kazegusuri wa arimasu ka", "Soğuk algınlığı ilacı var mı?", "Do you have cold medicine?", {
        reply: r("こちらです", "kochira desu", "Burada", "Here it is"),
      }),
      p("痛[いた]み止[ど]めをください", "itamidome o kudasai", "Ağrı kesici istiyorum", "Painkillers, please"),
      p("一日[いちにち]三回[さんかい]、食後[しょくご]に飲[の]んでください", "ichinichi sankai, shokugo ni nonde kudasai", "Günde üç kez, yemekten sonra alın", "Take it three times a day after meals", { hear: true }),
      p("病院[びょういん]に行[い]きたいです", "byouin ni ikitai desu", "Hastaneye gitmek istiyorum", "I want to go to a hospital"),
      p("英語[えいご]が話[はな]せる医者[いしゃ]はいますか", "eigo ga hanaseru isha wa imasu ka", "İngilizce konuşan doktor var mı?", "Is there a doctor who speaks English?"),
      p("保険証[ほけんしょう]はお持[も]ちですか", "hokenshou wa omochi desu ka", "Sigorta kartınız var mı?", "Do you have an insurance card?", {
        hear: true,
        note: n(
          "Japon sağlık sigortası kartı kastedilir; turist olarak tam ücreti ödeyip sigortandan geri istersin.",
          "They mean a Japanese health insurance card; as a tourist you pay in full and claim from your travel insurance."
        ),
        reply: r("海外[かいがい]旅行[りょこう]保険[ほけん]があります", "kaigai ryokou hoken ga arimasu", "Seyahat sigortam var", "I have travel insurance"),
      }),
      p("診断書[しんだんしょ]をもらえますか", "shindansho o moraemasu ka", "Doktor raporu alabilir miyim?", "Could I get a medical certificate?", {
        note: n("Sigorta başvurusu için.", "For your insurance claim."),
      }),
      p("落[お]ち着[つ]いてください", "ochitsuite kudasai", "Sakin olun", "Please stay calm", { hear: true }),
      p("避難[ひなん]してください", "hinan shite kudasai", "Lütfen tahliye edin", "Please evacuate", { hear: true }),
      p("避難所[ひなんじょ]はどこですか", "hinanjo wa doko desu ka", "Tahliye noktası nerede?", "Where is the evacuation shelter?", {
        note: n(
          "Depremde: masanın altına gir, sarsıntı bitene kadar bekle, sonra personeli izle.",
          "In an earthquake: get under a table, wait until the shaking stops, then follow staff."
        ),
      }),
    ],
  },
  {
    key: "problems",
    icon: "🧭",
    title: n("Sorunlar ve aksilikler", "Problems and mishaps"),
    intro: n(
      "Kaybolmak, eşya kaybetmek, yanlış sipariş, iade. Şikayeti kibarca söylemek (と思[おも]います, \"sanırım\") Japonya'da çok daha hızlı sonuç verir.",
      "Getting lost, losing things, wrong orders, refunds. Raising a problem softly (と思[おも]います, \"I think\") gets much faster results in Japan."
    ),
    phrases: [
      p("道[みち]に迷[まよ]いました", "michi ni mayoimashita", "Yolumu kaybettim", "I'm lost", {
        reply: r("どこに行[い]きたいですか", "doko ni ikitai desu ka", "Nereye gitmek istiyorsunuz?", "Where do you want to go?"),
      }),
      p("ここはどこですか", "koko wa doko desu ka", "Burası neresi?", "Where am I?"),
      p("この住所[じゅうしょ]に行[い]きたいんですが", "kono juusho ni ikitain desu ga", "Bu adrese gitmek istiyorum ama...", "I'm trying to get to this address", {
        note: n(
          "Sondaki が cümleyi yumuşatır ve yardım ister: \"... ama nasıl gideceğimi bilmiyorum\".",
          "The trailing が softens it into a request for help: \"... but I don't know how\"."
        ),
      }),
      p("財布[さいふ]をなくしました", "saifu o nakushimashita", "Cüzdanımı kaybettim", "I lost my wallet", {
        note: n(
          "Kalıp: [eşya]をなくしました. Japonya'da kayıp eşyalar çok sık geri bulunur; hemen polis kulübesine (交番[こうばん]) git.",
          "Pattern: [item]をなくしました. Lost things are very often returned in Japan; go to a police box (交番[こうばん]) right away."
        ),
      }),
      p("財布[さいふ] / 携帯[けいたい] / パスポート", "saifu / keitai / pasupooto", "Cüzdan / telefon / pasaport", "Wallet / phone / passport"),
      p("交番[こうばん]はどこですか", "kouban wa doko desu ka", "Polis kulübesi nerede?", "Where is the police box?"),
      p("電車[でんしゃ]に忘[わす]れ物[もの]をしました", "densha ni wasuremono o shimashita", "Trende bir şey unuttum", "I left something on the train", {
        note: n(
          "Hat adını, saati ve vagon numarasını söylersen bulmak kolaylaşır.",
          "Giving the line, time and car number makes it much easier to find."
        ),
        reply: r("何時[なんじ]ごろの電車[でんしゃ]ですか", "nanji goro no densha desu ka", "Saat kaç civarındaki trendi?", "Around what time was the train?"),
      }),
      p("切符[きっぷ]をなくしました", "kippu o nakushimashita", "Biletimi kaybettim", "I lost my ticket", {
        reply: r("どこから乗[の]りましたか", "doko kara norimashita ka", "Nereden bindiniz?", "Where did you get on?"),
      }),
      p("電車[でんしゃ]を乗[の]り間違[まちが]えました", "densha o norimachigaemashita", "Yanlış trene bindim", "I took the wrong train"),
      p("乗[の]り過[す]ごしました", "norisugoshimashita", "Durağımı kaçırdım", "I missed my stop"),
      p("終電[しゅうでん]を逃[のが]しました", "shuuden o nogashimashita", "Son treni kaçırdım", "I missed the last train"),
      p("すみません、意味[いみ]がわかりません", "sumimasen, imi ga wakarimasen", "Pardon, ne demek istediğinizi anlamadım", "Sorry, I don't understand what that means"),
      p("「満席[まんせき]」ってどういう意味[いみ]ですか", "\"manseki\" tte dou iu imi desu ka", "\"Manseki\" ne demek?", "What does \"manseki\" mean?", {
        note: n("Kalıp: [kelime]ってどういう意味[いみ]ですか.", "Pattern: [word]ってどういう意味[いみ]ですか."),
        reply: r("席[せき]がいっぱいという意味[いみ]です", "seki ga ippai to iu imi desu", "Yerlerin dolu olduğu anlamına gelir", "It means all the seats are taken"),
      }),
      p("翻訳[ほんやく]アプリを使[つか]ってもいいですか", "hon'yaku apuri o tsukatte mo ii desu ka", "Çeviri uygulaması kullanabilir miyim?", "May I use a translation app?", {
        reply: r("はい、どうぞ", "hai, douzo", "Tabii, buyurun", "Sure, go ahead"),
      }),
      p("これは注文[ちゅうもん]していません", "kore wa chuumon shite imasen", "Bunu sipariş etmedim", "I didn't order this", {
        reply: r("大変[たいへん]失礼[しつれい]しました", "taihen shitsurei shimashita", "Çok özür dileriz", "We're very sorry"),
      }),
      p("注文[ちゅうもん]したものがまだ来[き]ていません", "chuumon shita mono ga mada kite imasen", "Siparişim hâlâ gelmedi", "My order hasn't arrived yet", {
        reply: r("確認[かくにん]いたします", "kakunin itashimasu", "Hemen kontrol ediyorum", "I'll check right away"),
      }),
      p("注文[ちゅうもん]をキャンセルできますか", "chuumon o kyanseru dekimasu ka", "Siparişi iptal edebilir miyim?", "Can I cancel my order?"),
      p("お会計[かいけい]が違[ちが]うと思[おも]います", "okaikei ga chigau to omoimasu", "Hesapta bir yanlışlık var sanırım", "I think the bill is wrong", {
        note: n(
          "と思[おも]います (\"sanırım\") eklemek suçlamayı yumuşatır; doğrudan \"yanlış\" demekten daha iyi karşılanır.",
          "Adding と思[おも]います (\"I think\") softens it; it lands much better than saying \"it's wrong\"."
        ),
        reply: r("確認[かくにん]いたします", "kakunin itashimasu", "Hemen kontrol ediyorum", "I'll check right away"),
      }),
      p("お釣[つ]りが足[た]りないと思[おも]います", "otsuri ga tarinai to omoimasu", "Para üstü eksik sanırım", "I think I was short-changed"),
      p("返品[へんぴん]できますか", "henpin dekimasu ka", "İade edebilir miyim?", "Can I return this?", {
        reply: r("レシートはお持[も]ちですか", "reshiito wa omochi desu ka", "Fişiniz yanınızda mı?", "Do you have the receipt?"),
      }),
      p("交換[こうかん]できますか", "koukan dekimasu ka", "Değiştirebilir miyim?", "Can I exchange this?"),
      p("これ、壊[こわ]れています", "kore, kowarete imasu", "Bu bozuk", "This is broken"),
      p("予約[よやく]したはずなんですが", "yoyaku shita hazu nan desu ga", "Rezervasyon yapmıştım ama...", "I'm sure I made a reservation...", {
        reply: r("お調[しら]べいたします", "oshirabe itashimasu", "Hemen bakıyorum", "Let me look into it"),
      }),
      p("部屋[へや]を変[か]えてもらえますか", "heya o kaete moraemasu ka", "Odamı değiştirebilir misiniz?", "Could I change rooms?"),
      p("隣[となり]の部屋[へや]がうるさいです", "tonari no heya ga urusai desu", "Yan oda çok gürültülü", "The room next door is noisy"),
      p("困[こま]っています", "komatte imasu", "Zor durumdayım", "I'm in trouble / I need help"),
      p("手伝[てつだ]ってもらえますか", "tetsudatte moraemasu ka", "Yardım edebilir misiniz?", "Could you help me?"),
      p("携帯[けいたい]を充電[じゅうでん]してもいいですか", "keitai o juuden shite mo ii desu ka", "Telefonumu şarj edebilir miyim?", "May I charge my phone?"),
      p("遅[おく]れてすみません", "okurete sumimasen", "Geciktiğim için özür dilerim", "Sorry I'm late"),
    ],
  },
];
