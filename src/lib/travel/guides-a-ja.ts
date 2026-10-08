// T-100: long-form travel guides, part A (train, arrival, money, numbers,
// taxi-bus). Authored and static, zero LLM at runtime; ships in the
// precached /travel chunk so it works offline.
//
// Japanese strings use bracket furigana (漢字[かんじ], one bracket per kanji
// run); SignMock `jp` is plain text as printed. Romaji is Hepburn with long
// vowels written ou/uu. tr is canonical, en mirrors it.

import type { DialogueLine, Guide, GuideBlock, L, Phrase, SignMock, SignStyle } from "./types";

const l = (tr: string, en: string): L => ({ tr, en });

const ph = (
  jp: string,
  romaji: string,
  tr: string,
  en: string,
  extra?: { note?: L; hear?: boolean; reply?: [string, string, string, string] }
): Phrase => {
  const p: Phrase = { jp, romaji, meaning: { tr, en } };
  if (extra?.note) p.note = extra.note;
  if (extra?.hear) p.hear = true;
  if (extra?.reply) {
    const [rj, rr, rtr, ren] = extra.reply;
    p.reply = { jp: rj, romaji: rr, meaning: { tr: rtr, en: ren } };
  }
  return p;
};

const S = (jp: string, romaji: string, tr: string, en: string): DialogueLine => ({
  who: "staff",
  jp,
  romaji,
  meaning: { tr, en },
});
const Y = (jp: string, romaji: string, tr: string, en: string): DialogueLine => ({
  who: "you",
  jp,
  romaji,
  meaning: { tr, en },
});

const heading = (tr: string, en: string): GuideBlock => ({ type: "heading", text: { tr, en } });
const text = (tr: string, en: string): GuideBlock => ({ type: "text", body: { tr, en } });
const tip = (tr: string, en: string): GuideBlock => ({ type: "tip", body: { tr, en } });
const phrases = (title: L, items: Phrase[]): GuideBlock => ({ type: "phrases", title, items });
const dialogue = (title: L, lines: DialogueLine[]): GuideBlock => ({
  type: "dialogue",
  title,
  lines,
});
const table = (title: L, columns: L[], rows: (string | L)[][]): GuideBlock => ({
  type: "table",
  title,
  columns,
  rows,
});
const signs = (title: L, items: SignMock[]): GuideBlock => ({ type: "signs", title, items });
const sign = (
  style: SignStyle,
  jp: string,
  tr: string,
  en: string,
  sub?: string,
  arrow?: SignMock["arrow"]
): SignMock => {
  const s: SignMock = { style, jp, meaning: { tr, en } };
  if (sub) s.sub = sub;
  if (arrow) s.arrow = arrow;
  return s;
};
type Step = { title: L; body: L; jp?: string; romaji?: string };
const step = (title: L, body: L, jp?: string, romaji?: string): Step => {
  const s: Step = { title, body };
  if (jp) s.jp = jp;
  if (romaji) s.romaji = romaji;
  return s;
};
const steps = (title: L, items: Step[]): GuideBlock => ({ type: "steps", title, steps: items });

// ---------------------------------------------------------------------------
// 1. Trains
// ---------------------------------------------------------------------------

const TRAIN: Guide = {
  key: "train",
  icon: "🚆",
  title: l("Trenle yolculuk", "Riding trains"),
  summary: l(
    "IC kart, bilet makinesi, turnike, peron, tren türleri, anonslar, Shinkansen rezervasyonu ve yanlış turnikeden çıkınca ne yapacağın.",
    "IC cards, ticket machines, gates, platforms, train types, announcements, Shinkansen reservations and what to do at the wrong gate."
  ),
  blocks: [
    text(
      "Japonya'da şehir içi ve şehirler arası ulaşımın omurgası tren. Sistem çok düzenli ama ilk gün yoğun gelebilir: aynı istasyonda JR, metro ve özel demiryolu şirketleri yan yana çalışır ve her birinin kendi **改札[かいさつ]** (turnike) hattı vardır. Bu rehber seni bilet almaktan inmeye kadar adım adım götürüyor. Tabelaların çoğunda İngilizce de var; buradaki Japonca, anonsları ve personelin söylediklerini anlaman için.",
      "Trains are the backbone of travel in Japan, both inside cities and between them. The system is very orderly but can feel dense on day one: JR, subway and private railway companies run side by side in the same station, each with its own **改札[かいさつ]** (ticket gate) line. This guide walks you from buying a ticket to getting off. Most signs have English too; the Japanese here is for understanding announcements and what staff say."
    ),
    heading("IC kart mı, kağıt bilet mi?", "IC card or paper ticket?"),
    text(
      "Şehir içi trenler, metro ve otobüsler için en kolay yol bir IC kart: Tokyo'da **Suica** ya da **PASMO**, Kansai'de **ICOCA**. Bu kartlar birbirinin bölgesinde de çalışır, yani Tokyo'da aldığın Suica Kyoto ve Osaka'da da geçer. iPhone'un Cüzdan uygulamasına Suica, PASMO veya ICOCA ekleyip telefonla da geçebilirsin; Android'de bu genellikle yalnızca Japonya modeli telefonlarda çalışır. Kartı turnikedeki okuyucuya dokundurursun, ücret inerken otomatik hesaplanır.",
      "For city trains, subways and buses the easiest option is an IC card: **Suica** or **PASMO** in Tokyo, **ICOCA** in Kansai. They work in each other's areas, so a Suica bought in Tokyo also works in Kyoto and Osaka. On iPhone you can add Suica, PASMO or ICOCA to the Wallet app and tap your phone; on Android this usually only works on Japan-model phones. You tap the card on the gate reader and the fare is calculated automatically when you exit."
    ),
    table(
      l("Bilet makinesi ekranındaki kelimeler", "Words on the ticket machine screen"),
      [l("Japonca", "Japanese"), l("Okunuş", "Reading"), l("Anlamı", "Meaning")],
      [
        ["切符[きっぷ]", "kippu", l("bilet", "ticket")],
        ["乗車券[じょうしゃけん]", "joushaken", l("yolcu bileti (temel ücret)", "basic fare ticket")],
        ["運賃[うんちん]", "unchin", l("ücret (yol parası)", "fare")],
        ["大人[おとな]", "otona", l("yetişkin", "adult")],
        ["小児[しょうに]", "shouni", l("çocuk", "child")],
        ["チャージ", "chaaji", l("IC karta para yükleme", "top up an IC card")],
        ["入金[にゅうきん]", "nyuukin", l("para yatırma (yükleme)", "deposit (top-up)")],
        ["片道[かたみち]", "katamichi", l("tek yön", "one way")],
        ["往復[おうふく]", "oufuku", l("gidiş dönüş", "round trip")],
        ["取消[とりけし]", "torikeshi", l("iptal", "cancel")],
        ["領収書[りょうしゅうしょ]", "ryoushuusho", l("makbuz", "receipt")],
        ["呼出[よびだし]", "yobidashi", l("personel çağırma düğmesi", "call-staff button")],
        ["路線図[ろせんず]", "rosenzu", l("hat haritası", "route map")],
      ]
    ),
    steps(l("Makineden kağıt bilet almak", "Buying a paper ticket at a machine"), [
      step(
        l("Hat haritasında ücreti bul", "Find the fare on the route map"),
        l(
          "Makinelerin üstündeki **路線図[ろせんず]** haritasında gideceğin istasyonun yanında ücret yazar. Bulamazsan en ucuz bileti al; inerken farkı ödersin.",
          "The **路線図[ろせんず]** map above the machines shows the fare next to each station. If you cannot find it, buy the cheapest ticket and pay the difference when you get off."
        )
      ),
      step(
        l("Dili değiştir", "Switch the language"),
        l(
          "Ekranda genellikle **English** düğmesi vardır. Japonca kalmak istersen aşağıdaki adımlar aynı.",
          "The screen usually has an **English** button. If you stay in Japanese, the steps below are the same."
        )
      ),
      step(
        l("Bileti seç", "Choose the ticket"),
        l(
          "**切符[きっぷ]** ya da **乗車券[じょうしゃけん]** düğmesine bas, sonra ücreti seç. Kişi sayısını değiştirmek için **大人[おとな]** düğmesini kullan.",
          "Press **切符[きっぷ]** or **乗車券[じょうしゃけん]**, then choose the fare. Use the **大人[おとな]** button to change the number of people."
        ),
        "切符[きっぷ]を買[か]う",
        "kippu o kau"
      ),
      step(
        l("Öde ve al", "Pay and collect"),
        l(
          "Nakit ya da IC kartla öde. Bilet ve para üstü alttaki ağızdan çıkar; ikisini de al.",
          "Pay with cash or an IC card. The ticket and change come out at the bottom; take both."
        )
      ),
      step(
        l("Takılırsan yardım iste", "If stuck, ask for help"),
        l(
          "**呼出[よびだし]** düğmesine basınca bir personel gelir ya da konuşur. Turnikenin yanındaki camlı kabinde de görevli bulunur.",
          "Pressing **呼出[よびだし]** brings a staff member or a voice. There is also staff in the glass booth beside the gates."
        )
      ),
    ]),
    signs(l("İstasyonda göreceğin tabelalar", "Signs you will see in the station"), [
      sign("info", "きっぷうりば", "bilet satış yeri", "ticket sales", "Tickets"),
      sign("info", "改札口", "turnike girişi", "ticket gates", "Ticket Gates", "up"),
      sign("info", "のりかえ", "aktarma", "transfer", "Transfer", "right"),
      sign("ticket", "のりこし精算機", "ücret farkı makinesi", "fare adjustment machine", "Fare Adjustment"),
      sign("station", "しんじゅく", "Shinjuku istasyonu tabelası", "Shinjuku station name board", "Shinjuku"),
      sign("exit", "東口", "doğu çıkışı", "east exit", "East Exit", "left"),
      sign("warning", "駆け込み乗車はおやめください", "trene koşarak binmeyin", "do not rush onto the train"),
      sign("info", "優先席", "öncelikli koltuk", "priority seats", "Priority Seat"),
    ]),
    steps(l("Turnikeden geçip doğru trene binmek", "Through the gate and onto the right train"), [
      step(
        l("Turnikeden geç", "Go through the gate"),
        l(
          "IC kartı sağdaki mavi okuyucuya bir an dokundur. Kağıt bileti öndeki yuvaya sok; karşı uçtan geri çıkar, almayı unutma. Kırmızı çarpı ya da giriş yasak işareti olan turnikeyi kullanma; o yön çıkış içindir.",
          "Tap the IC card briefly on the reader on the right. Insert a paper ticket in the slot at the front; it comes back out at the far end, so take it. Do not use a gate showing a red cross or no-entry mark; that one is for the other direction."
        ),
        "改札[かいさつ]を通[とお]る",
        "kaisatsu o tooru"
      ),
      step(
        l("Hattı ve yönü bul", "Find the line and direction"),
        l(
          "Tabelalarda hat adı (ör. 山手線[やまのてせん]) ve yön yazar. Yön, hattın büyük duraklarıyla gösterilir: 〇〇方面[ほうめん] '〇〇 yönü' demek.",
          "Signs show the line name (e.g. 山手線[やまのてせん]) and direction. Direction is shown by major stops on the line: 〇〇方面[ほうめん] means 'towards 〇〇'."
        ),
        "〇〇方面[ほうめん]",
        "〇〇 houmen"
      ),
      step(
        l("Peron numarasına git", "Go to the platform number"),
        l(
          "Peronlar **番線[ばんせん]** ile numaralanır: 一番線[いちばんせん], 二番線[にばんせん]. Kalkış panosu hangi trenin hangi perondan kalktığını gösterir.",
          "Platforms are numbered with **番線[ばんせん]**: 一番線[いちばんせん], 二番線[にばんせん]. The departure board shows which train leaves from which platform."
        ),
        "三番線[さんばんせん]",
        "sanbansen"
      ),
      step(
        l("Tren türünü kontrol et", "Check the train type"),
        l(
          "Aynı perondan farklı hızda trenler kalkar. Ekspres tren senin istasyonunda durmayabilir; aşağıdaki tabloya bak.",
          "Trains of different speeds leave from the same platform. An express may not stop at your station; see the table below."
        )
      ),
      step(
        l("Yerdeki işaretlerde sıraya gir", "Queue at the floor markings"),
        l(
          "Perondaki işaretler kapıların duracağı yeri gösterir. İnenler önce iner; sen kapının iki yanında beklersin.",
          "Markings on the platform show where the doors will stop. People getting off go first; you wait on either side of the door."
        )
      ),
    ]),
    table(
      l("Tren türleri (yavaştan hızlıya)", "Train types (slow to fast)"),
      [l("Japonca", "Japanese"), l("Okunuş", "Reading"), l("Anlamı", "Meaning"), l("Not", "Note")],
      [
        ["各駅停車[かくえきていしゃ]", "kakuekiteisha", l("her istasyonda durur", "stops at every station"), l("En güvenli seçim.", "The safest choice.")],
        ["普通[ふつう]", "futsuu", l("normal (yerel)", "local"), l("Çoğu zaman her istasyonda durur.", "Usually stops everywhere.")],
        ["準急[じゅんきゅう]", "junkyuu", l("yarı ekspres", "semi-express"), l("Bazı istasyonları atlar.", "Skips some stations.")],
        ["快速[かいそく]", "kaisoku", l("hızlı", "rapid"), l("JR'de ek ücret yok, istasyon atlar.", "No surcharge on JR, skips stations.")],
        ["急行[きゅうこう]", "kyuukou", l("ekspres", "express"), l("Daha çok istasyon atlar.", "Skips more stations.")],
        ["特急[とっきゅう]", "tokkyuu", l("özel ekspres", "limited express"), l("JR'de genelde ek bilet ister; bazı özel hatlarda ücretsiz.", "Usually needs a surcharge ticket on JR; free on some private lines.")],
        ["始発[しはつ]", "shihatsu", l("ilk tren / ilk kalkış", "first train / starts here"), l("Bu istasyondan boş kalkar.", "Leaves empty from this station.")],
        ["終電[しゅうでん]", "shuuden", l("son tren", "last train"), l("Gece yarısı civarı; kaçırma.", "Around midnight; do not miss it.")],
      ]
    ),
    tip(
      "Durağından emin değilsen trene binmeden önce peron ekranına ya da kapının üstündeki durak listesine bak. Yanlış ekspres trene bindiysen bir sonraki durakta in, karşı perondaki **各駅停車[かくえきていしゃ]** trene geç. Bu çok normal, kimse dönüp bakmaz.",
      "If you are not sure about your stop, check the platform screen or the stop list above the doors before boarding. If you took the wrong express, get off at the next stop and switch to the **各駅停車[かくえきていしゃ]** on the opposite side. This is completely normal; nobody will look twice."
    ),
    table(
      l("Kalkış panosunu okumak", "Reading the departure board"),
      [l("Japonca", "Japanese"), l("Okunuş", "Reading"), l("Anlamı", "Meaning")],
      [
        ["発車[はっしゃ]", "hassha", l("kalkış", "departure")],
        ["時刻[じこく]", "jikoku", l("saat (tarife)", "time (scheduled)")],
        ["行[ゆ]き先[さき]", "yukisaki", l("varış yeri (son durak)", "destination (terminus)")],
        ["〇〇行[ゆ]き", "〇〇 yuki", l("〇〇'ya giden", "bound for 〇〇")],
        ["番線[ばんせん]", "bansen", l("peron numarası", "platform number")],
        ["両[りょう]", "ryou", l("vagon sayısı (ör. 10両[りょう])", "number of cars (e.g. 10両[りょう])")],
        ["遅[おく]れ", "okure", l("gecikme", "delay")],
        ["運転見合[うんてんみあ]わせ", "unten miawase", l("seferler durduruldu", "service suspended")],
        ["先発[せんぱつ]", "senpatsu", l("ilk kalkacak tren", "next departure")],
        ["次発[じはつ]", "jihatsu", l("ondan sonraki tren", "the one after")],
      ]
    ),
    dialogue(l("İstasyon görevlisine yol sormak", "Asking station staff the way"), [
      Y("すみません、渋谷[しぶや]に行[い]きたいんですが。", "sumimasen, Shibuya ni ikitai n desu ga.", "Affedersiniz, Shibuya'ya gitmek istiyorum.", "Excuse me, I'd like to go to Shibuya."),
      S("渋谷[しぶや]ですね。山手線[やまのてせん]で行[い]けますよ。", "Shibuya desu ne. Yamanote-sen de ikemasu yo.", "Shibuya, değil mi? Yamanote hattıyla gidebilirsiniz.", "Shibuya, right? You can go on the Yamanote line."),
      Y("何番線[なんばんせん]ですか。", "nanbansen desu ka.", "Hangi peron?", "Which platform?"),
      S("三番線[さんばんせん]です。あちらの階段[かいだん]を上[あ]がってください。", "sanbansen desu. achira no kaidan o agatte kudasai.", "Üç numaralı peron. Şuradaki merdivenden çıkın.", "Platform three. Please go up those stairs."),
      Y("乗[の]り換[か]えはありますか。", "norikae wa arimasu ka.", "Aktarma var mı?", "Is there a transfer?"),
      S("いいえ、乗[の]り換[か]えなしで行[い]けます。", "iie, norikae nashi de ikemasu.", "Hayır, aktarmasız gidebilirsiniz.", "No, you can go without transferring."),
      Y("どのぐらいかかりますか。", "dono gurai kakarimasu ka.", "Ne kadar sürer?", "How long does it take?"),
      S("十五分[じゅうごふん]ぐらいです。", "juugofun gurai desu.", "Yaklaşık on beş dakika.", "About fifteen minutes."),
      Y("ありがとうございます。", "arigatou gozaimasu.", "Teşekkür ederim.", "Thank you."),
    ]),
    dialogue(l("Ekspres tren durmuyor", "The express does not stop"), [
      Y("すみません、この電車[でんしゃ]は〇〇駅[えき]に止[と]まりますか。", "sumimasen, kono densha wa 〇〇-eki ni tomarimasu ka.", "Affedersiniz, bu tren 〇〇 istasyonunda duruyor mu?", "Excuse me, does this train stop at 〇〇 station?"),
      S("この電車[でんしゃ]は快速[かいそく]なので、止[と]まりません。", "kono densha wa kaisoku na node, tomarimasen.", "Bu tren hızlı tren, o yüzden durmuyor.", "This is a rapid train, so it does not stop there."),
      Y("じゃあ、どれに乗[の]ればいいですか。", "jaa, dore ni noreba ii desu ka.", "O zaman hangisine binmeliyim?", "Then which one should I take?"),
      S("次[つぎ]の各駅停車[かくえきていしゃ]に乗[の]ってください。", "tsugi no kakuekiteisha ni notte kudasai.", "Bir sonraki her istasyonda duran trene binin.", "Please take the next local train."),
      Y("同[おな]じホームですか。", "onaji hoomu desu ka.", "Aynı peron mu?", "Same platform?"),
      S("はい、同[おな]じホームです。五分後[ごふんご]に来[き]ます。", "hai, onaji hoomu desu. gofungo ni kimasu.", "Evet, aynı peron. Beş dakika sonra geliyor.", "Yes, the same platform. It comes in five minutes."),
      Y("わかりました。ありがとうございます。", "wakarimashita. arigatou gozaimasu.", "Anladım. Teşekkürler.", "Got it. Thank you."),
    ]),
    phrases(l("İstasyonda soracakların", "Things to ask at the station"), [
      ph("〇〇に行[い]きたいんですが。", "〇〇 ni ikitai n desu ga.", "〇〇'ya gitmek istiyorum.", "I'd like to go to 〇〇.", {
        note: l("Cümleyi yarım bırakmak kibar bir rica şekli; görevli devamını anlar.", "Leaving the sentence open is a polite request; staff will take it from there."),
      }),
      ph("何番線[なんばんせん]ですか。", "nanbansen desu ka.", "Hangi peron?", "Which platform?", {
        reply: ["二番線[にばんせん]です。", "nibansen desu.", "İki numaralı peron.", "Platform two."],
      }),
      ph("この電車[でんしゃ]は〇〇に止[と]まりますか。", "kono densha wa 〇〇 ni tomarimasu ka.", "Bu tren 〇〇'da duruyor mu?", "Does this train stop at 〇〇?", {
        reply: ["はい、止[と]まります。", "hai, tomarimasu.", "Evet, duruyor.", "Yes, it stops there."],
      }),
      ph("どこで乗[の]り換[か]えますか。", "doko de norikaemasu ka.", "Nerede aktarma yapacağım?", "Where do I transfer?", {
        reply: ["品川[しながわ]で乗[の]り換[か]えてください。", "Shinagawa de norikaete kudasai.", "Shinagawa'da aktarma yapın.", "Please transfer at Shinagawa."],
      }),
      ph("次[つぎ]の電車[でんしゃ]は何時[なんじ]ですか。", "tsugi no densha wa nanji desu ka.", "Bir sonraki tren saat kaçta?", "What time is the next train?"),
      ph("〇〇まで、いくらですか。", "〇〇 made, ikura desu ka.", "〇〇'ya kadar ne kadar?", "How much is it to 〇〇?"),
      ph("東口[ひがしぐち]はどこですか。", "higashiguchi wa doko desu ka.", "Doğu çıkışı nerede?", "Where is the east exit?", {
        reply: ["あちらの階段[かいだん]を上[あ]がって、右[みぎ]です。", "achira no kaidan o agatte, migi desu.", "Şu merdivenden çıkın, sağda.", "Go up those stairs; it's on the right."],
      }),
      ph("エレベーターはありますか。", "erebeetaa wa arimasu ka.", "Asansör var mı?", "Is there an elevator?"),
      ph("コインロッカーはどこですか。", "koin rokkaa wa doko desu ka.", "Bozuk paralı dolaplar nerede?", "Where are the coin lockers?"),
      ph("この席[せき]、空[あ]いていますか。", "kono seki, aite imasu ka.", "Bu koltuk boş mu?", "Is this seat free?", {
        reply: ["はい、どうぞ。", "hai, douzo.", "Evet, buyurun.", "Yes, go ahead."],
      }),
      ph("切符[きっぷ]をなくしました。", "kippu o nakushimashita.", "Biletimi kaybettim.", "I lost my ticket."),
      ph("電車[でんしゃ]に忘[わす]れ物[もの]をしました。", "densha ni wasuremono o shimashita.", "Trende bir şey unuttum.", "I left something on the train.", {
        reply: ["何時[なんじ]ごろの電車[でんしゃ]ですか。何号車[なんごうしゃ]でしたか。", "nanji goro no densha desu ka. nangousha deshita ka.", "Saat kaç civarındaki trendi? Kaçıncı vagondaydınız?", "Around what time was the train? Which car were you in?"],
      }),
    ]),
    phrases(l("Duyacağın anonslar", "Announcements you will hear"), [
      ph("まもなく、三番線[さんばんせん]に電車[でんしゃ]が参[まい]ります。", "mamonaku, sanbansen ni densha ga mairimasu.", "Birazdan üç numaralı perona tren geliyor.", "A train will shortly arrive at platform three.", { hear: true }),
      ph("黄色[きいろ]い線[せん]の内側[うちがわ]までお下[さ]がりください。", "kiiroi sen no uchigawa made osagari kudasai.", "Lütfen sarı çizginin gerisine çekilin.", "Please stand behind the yellow line.", { hear: true }),
      ph("この電車[でんしゃ]は、各駅停車[かくえきていしゃ]、東京[とうきょう]行[ゆ]きです。", "kono densha wa, kakuekiteisha, Toukyou yuki desu.", "Bu tren her istasyonda duran, Tokyo'ya giden tren.", "This is a local train bound for Tokyo.", { hear: true }),
      ph("次[つぎ]は、新宿[しんじゅく]、新宿[しんじゅく]です。", "tsugi wa, Shinjuku, Shinjuku desu.", "Sonraki durak Shinjuku.", "The next stop is Shinjuku.", { hear: true }),
      ph("お出口[でぐち]は右側[みぎがわ]です。", "odeguchi wa migigawa desu.", "Çıkış sağ taraftan.", "The doors on the right side will open.", { hear: true, reply: ["お出口[でぐち]は左側[ひだりがわ]です。", "odeguchi wa hidarigawa desu.", "Çıkış sol taraftan.", "The doors on the left side will open."] }),
      ph("山手線[やまのてせん]はお乗[の]り換[か]えです。", "Yamanote-sen wa onorikae desu.", "Yamanote hattına buradan aktarma yapılır.", "Transfer here for the Yamanote line.", { hear: true }),
      ph("ドアが閉[し]まります。ご注意[ちゅうい]ください。", "doa ga shimarimasu. go-chuui kudasai.", "Kapılar kapanıyor. Dikkat edin.", "The doors are closing. Please be careful.", { hear: true }),
      ph("駆[か]け込[こ]み乗車[じょうしゃ]はおやめください。", "kakekomi jousha wa oyame kudasai.", "Lütfen trene koşarak binmeyin.", "Please do not rush onto the train.", { hear: true }),
      ph("足元[あしもと]にご注意[ちゅうい]ください。", "ashimoto ni go-chuui kudasai.", "Adımınıza dikkat edin.", "Please watch your step.", { hear: true }),
      ph("終点[しゅうてん]です。お忘[わす]れ物[もの]のないよう、ご注意[ちゅうい]ください。", "shuuten desu. owasuremono no nai you, go-chuui kudasai.", "Son durak. Lütfen eşyalarınızı unutmayın.", "This is the last stop. Please make sure you have all your belongings.", { hear: true }),
      ph("ただいま、電車[でんしゃ]が遅[おく]れております。", "tadaima, densha ga okurete orimasu.", "Şu anda trenler gecikmeli.", "Trains are currently delayed.", { hear: true }),
      ph("運転[うんてん]を見[み]合[あ]わせております。", "unten o miawasete orimasu.", "Seferler geçici olarak durduruldu.", "Service is currently suspended.", {
        hear: true,
        note: l("Bunu duyarsan görevliye alternatif yolu sor: 振替輸送[ふりかえゆそう] başka hatla ek ücretsiz aktarım demek; genelde kağıt bilet ve pass sahipleri içindir, IC kartla binenler çoğu zaman kapsam dışıdır.", "If you hear this, ask staff for another route: 振替輸送[ふりかえゆそう] means transfer to another line at no extra charge; it usually covers paper tickets and passes, and IC card riders are often not included."),
      }),
    ]),
    heading("Shinkansen", "Shinkansen"),
    text(
      "Tokyo, Kyoto ve Osaka arasında Tokaido Shinkansen çalışır. Bilet iki parçadan oluşur: **乗車券[じょうしゃけん]** (yol bileti) ve **特急券[とっきゅうけん]** (Shinkansen ek bileti); makine genelde ikisini tek seferde verir ve turnikeye ikisini birlikte sokarsın. Kayıtsız bir IC kart tek başına Shinkansen için genelde yetmez. Rezervasyonu **みどりの窓口[まどぐち]** (JR bilet ofisi), istasyondaki rezervasyon makinesi ya da çevrimiçi yapabilirsin. Kasımın son haftaları Kyoto'da sonbahar yaprakları zamanı; o tarihlerde koltuğu günler önceden ayırt.",
      "The Tokaido Shinkansen connects Tokyo, Kyoto and Osaka. The ticket has two parts: **乗車券[じょうしゃけん]** (basic fare) and **特急券[とっきゅうけん]** (Shinkansen surcharge); the machine usually issues both together and you insert both into the gate at once. An unregistered IC card on its own is generally not enough for the Shinkansen. You can reserve at the **みどりの窓口[まどぐち]** (JR ticket office), at the station's reservation machines, or online. The last weeks of November are autumn-leaf season in Kyoto; book seats days ahead for those dates."
    ),
    table(
      l("Shinkansen kelimeleri", "Shinkansen vocabulary"),
      [l("Japonca", "Japanese"), l("Okunuş", "Reading"), l("Anlamı", "Meaning")],
      [
        ["指定席[していせき]", "shiteiseki", l("rezerveli koltuk", "reserved seat")],
        ["自由席[じゆうせき]", "jiyuuseki", l("rezervasyonsuz koltuk (ilk gelen oturur)", "unreserved seat (first come)")],
        ["グリーン車[しゃ]", "guriinsha", l("birinci sınıf vagon", "first-class car")],
        ["号車[ごうしゃ]", "gousha", l("vagon numarası", "car number")],
        ["窓側[まどがわ]", "madogawa", l("cam kenarı", "window side")],
        ["通路側[つうろがわ]", "tsuurogawa", l("koridor tarafı", "aisle side")],
        ["特急券[とっきゅうけん]", "tokkyuuken", l("ekspres ek bileti", "limited express ticket")],
        ["乗車券[じょうしゃけん]", "joushaken", l("yol bileti", "basic fare ticket")],
        ["発車時刻[はっしゃじこく]", "hassha jikoku", l("kalkış saati", "departure time")],
        ["満席[まんせき]", "manseki", l("tüm koltuklar dolu", "fully booked")],
        ["新幹線[しんかんせん]のりかえ口[ぐち]", "shinkansen norikaeguchi", l("Shinkansen aktarma turnikesi", "Shinkansen transfer gate")],
      ]
    ),
    dialogue(l("みどりの窓口[まどぐち]'nda koltuk ayırtmak", "Reserving a seat at the ticket office"), [
      S("次[つぎ]の方[かた]、どうぞ。", "tsugi no kata, douzo.", "Sıradaki, buyurun.", "Next, please."),
      Y("京都[きょうと]までの新幹線[しんかんせん]の指定席[していせき]をお願[ねが]いします。", "Kyouto made no shinkansen no shiteiseki o onegai shimasu.", "Kyoto'ya Shinkansen rezerveli koltuk istiyorum.", "A reserved Shinkansen seat to Kyoto, please."),
      S("何日[なんにち]の何時[なんじ]ごろですか。", "nannichi no nanji goro desu ka.", "Hangi gün, saat kaç civarı?", "Which day and around what time?"),
      Y("十一月[じゅういちがつ]十日[とおか]の朝[あさ]、九時[くじ]ごろです。", "juuichigatsu tooka no asa, kuji goro desu.", "10 Kasım sabahı, saat dokuz civarı.", "The morning of November 10th, around nine."),
      S("九時[くじ]発[はつ]の「のぞみ」はいかがですか。", "kuji hatsu no Nozomi wa ikaga desu ka.", "Saat dokuzda kalkan Nozomi nasıl olur?", "How about the Nozomi leaving at nine?"),
      Y("はい、それでお願[ねが]いします。窓側[まどがわ]の席[せき]はありますか。", "hai, sore de onegai shimasu. madogawa no seki wa arimasu ka.", "Evet, o olsun. Cam kenarı koltuk var mı?", "Yes, that one please. Is there a window seat?"),
      S("窓側[まどがわ]のE席[せき]がございます。七号車[ななごうしゃ]の十二番[じゅうにばん]です。", "madogawa no ii-seki ga gozaimasu. nanagousha no juuniban desu.", "E koltuğunda cam kenarı var. Yedinci vagon, on iki numara.", "There is an E window seat. Car seven, row twelve."),
      Y("じゃあ、それでお願[ねが]いします。", "jaa, sore de onegai shimasu.", "O zaman onu alayım.", "That one, then."),
      S("お支[し]払[はら]いは現金[げんきん]ですか、カードですか。", "oshiharai wa genkin desu ka, kaado desu ka.", "Ödeme nakit mi, kart mı?", "Cash or card?"),
      Y("カードでお願[ねが]いします。", "kaado de onegai shimasu.", "Kartla lütfen.", "Card, please."),
      S("こちら、乗車券[じょうしゃけん]と特急券[とっきゅうけん]です。二枚[にまい]一緒[いっしょ]に改札[かいさつ]に入[い]れてください。", "kochira, joushaken to tokkyuuken desu. nimai issho ni kaisatsu ni irete kudasai.", "Buyurun, yol bileti ve ekspres bileti. İkisini birlikte turnikeye sokun.", "Here are your fare ticket and express ticket. Insert both into the gate together."),
    ]),
    tip(
      "Tokyo'dan Kyoto yönüne giderken Fuji Dağı sağ tarafta kalır; Tokaido Shinkansen'de bu taraf **E** koltuğudur. Hava açıksa Shin-Fuji civarında görünür. Büyük bavul taşıyorsan Tokaido Shinkansen'de büyük bagaj alanlı koltuk için önceden rezervasyon gerekebilir; bileti alırken bavulunu söyle.",
      "Going from Tokyo towards Kyoto, Mount Fuji is on the right; on the Tokaido Shinkansen that is the **E** seat. On a clear day it appears around Shin-Fuji. If you carry a large suitcase, the Tokaido Shinkansen may require a seat reserved with an oversized-luggage area; mention your bag when you book."
    ),
    phrases(l("Shinkansen için cümleler", "Shinkansen phrases"), [
      ph("自由席[じゆうせき]は何号車[なんごうしゃ]ですか。", "jiyuuseki wa nangousha desu ka.", "Rezervasyonsuz vagonlar hangileri?", "Which cars are unreserved?", {
        reply: ["一号車[いちごうしゃ]から三号車[さんごうしゃ]です。", "ichigousha kara sangousha desu.", "Birinci vagondan üçüncü vagona kadar.", "Cars one to three."],
      }),
      ph("次[つぎ]の新幹線[しんかんせん]、空[あ]いていますか。", "tsugi no shinkansen, aite imasu ka.", "Bir sonraki Shinkansen'de yer var mı?", "Are there seats on the next Shinkansen?", {
        reply: ["申[もう]し訳[わけ]ございません、満席[まんせき]です。", "moushiwake gozaimasen, manseki desu.", "Çok üzgünüm, tamamen dolu.", "I'm very sorry, it's fully booked."],
      }),
      ph("二人[ふたり]並[なら]んで座[すわ]れますか。", "futari narande suwaremasu ka.", "İki kişi yan yana oturabilir miyiz?", "Can two of us sit together?"),
      ph("大[おお]きい荷物[にもつ]があります。", "ookii nimotsu ga arimasu.", "Büyük bir bavulum var.", "I have a large suitcase."),
      ph("予約[よやく]を変更[へんこう]したいです。", "yoyaku o henkou shitai desu.", "Rezervasyonumu değiştirmek istiyorum.", "I'd like to change my reservation."),
      ph("この席[せき]は私[わたし]の席[せき]だと思[おも]います。", "kono seki wa watashi no seki da to omoimasu.", "Sanırım bu koltuk benim.", "I think this is my seat.", {
        note: l("Biletini göstererek, yumuşak bir ses tonuyla söyle.", "Say it softly while showing your ticket."),
      }),
    ]),
    heading("Görgü kuralları ve yoğun saatler", "Etiquette and rush hour"),
    text(
      "Trende telefonla konuşulmaz; telefonunu **マナーモード** (sessiz mod) yap. Yüksek sesle sohbet de hoş karşılanmaz. **優先席[ゆうせんせき]** (öncelikli koltuklar) yaşlılar, hamileler ve engelliler içindir; boşsa oturabilirsin ama ihtiyacı olan biri gelince hemen kalk. Sırt çantanı kalabalık trende öne ya da raf üstüne al. Şehir içi trenlerde yemek yenmez; Shinkansen'de ise **駅弁[えきべん]** yemek normaldir.",
      "No phone calls on trains; put your phone in **マナーモード** (silent mode). Loud conversation is frowned on too. **優先席[ゆうせんせき]** (priority seats) are for the elderly, pregnant and disabled people; you may sit there if empty, but stand up right away when someone needs it. In a crowded train wear your backpack on the front or put it on the rack. People do not eat on city trains; on the Shinkansen, eating an **駅弁[えきべん]** is normal."
    ),
    tip(
      "Hafta içi sabah 7:30-9:30 ve akşam 17:30-19:30 arası Tokyo trenleri çok kalabalıktır. Bavulla bu saatlere denk gelme. Bazı hatlarda yoğun saatlerde **女性専用車[じょせいせんようしゃ]** (sadece kadınlar vagonu) olur; yerdeki ve kapıdaki pembe işaretlere dikkat et.",
      "On weekdays from about 7:30 to 9:30 and 17:30 to 19:30, Tokyo trains are packed. Avoid those hours with a suitcase. Some lines have a **女性専用車[じょせいせんようしゃ]** (women-only car) at rush hour; watch for the pink markings on the floor and doors."
    ),
    steps(l("Turnike seni durdurursa", "If the gate stops you"), [
      step(
        l("Geri çekil", "Step back"),
        l(
          "Turnike ötüp kapakları kapanırsa panik yapma, geri çekil ve arkandakilere yol ver. Ekranda neden durdurduğu yazar: çoğu zaman bakiye yetmemiştir ya da bilet ücreti eksiktir.",
          "If the gate beeps and closes its flaps, do not panic; step back and let people behind you through. The screen shows why: usually the balance or ticket fare is too low."
        )
      ),
      step(
        l("Ücret farkı makinesini bul", "Find the fare adjustment machine"),
        l(
          "Turnikelerin hemen önünde **精算機[せいさんき]** ya da **のりこし精算機[せいさんき]** yazan makineler vardır. Bileti ya da IC kartı makineye sok; eksik tutarı gösterir.",
          "Right before the gates there are machines marked **精算機[せいさんき]** or **のりこし精算機[せいさんき]**. Insert your ticket or IC card; it shows the amount owed."
        ),
        "乗[の]り越[こ]し精算[せいさん]",
        "norikoshi seisan"
      ),
      step(
        l("Farkı öde", "Pay the difference"),
        l(
          "Kağıt bilette makine farkı alıp sana yeni bir **精算券[せいさんけん]** verir; onunla çıkarsın. IC kartta makine kartı doldurur (チャージ), sonra kartla normal çıkarsın.",
          "For a paper ticket the machine takes the difference and gives you a new **精算券[せいさんけん]**; exit with that. For an IC card the machine tops it up (チャージ), then you exit normally with the card."
        )
      ),
      step(
        l("Olmadıysa görevliye git", "If that fails, go to staff"),
        l(
          "Turnike hattının kenarında görevli olan kabin (**有人改札[ゆうじんかいさつ]**) vardır. Yanlış şirketin turnikesinden girdiysen ya da kartın okunmuyorsa oraya git; işlemi elle düzeltirler.",
          "At the side of the gate line there is a staffed booth (**有人改札[ゆうじんかいさつ]**). If you entered through the wrong company's gate or your card will not read, go there; they fix it by hand."
        )
      ),
    ]),
    dialogue(l("Görevli kabininde", "At the staffed gate"), [
      S("どうされましたか。", "dou saremashita ka.", "Ne oldu, bir sorun mu var?", "What seems to be the problem?"),
      Y("すみません、カードが通[とお]りません。", "sumimasen, kaado ga toorimasen.", "Affedersiniz, kartım geçmiyor.", "Excuse me, my card won't go through."),
      S("拝見[はいけん]します。…残高[ざんだか]が足[た]りないですね。", "haiken shimasu. … zandaka ga tarinai desu ne.", "Bakayım. …Bakiyeniz yetmiyor.", "Let me see. …Your balance is too low."),
      S("あちらの精算機[せいさんき]でチャージしてください。", "achira no seisanki de chaaji shite kudasai.", "Şuradaki ücret farkı makinesinden para yükleyin.", "Please top up at that fare adjustment machine."),
      Y("わかりました。それから、間違[まちが]えてこの改札[かいさつ]に入[はい]ってしまいました。", "wakarimashita. sorekara, machigaete kono kaisatsu ni haitte shimaimashita.", "Anladım. Bir de yanlışlıkla bu turnikeden girdim.", "Understood. Also, I came in through this gate by mistake."),
      S("どちらの駅[えき]から乗[の]りましたか。", "dochira no eki kara norimashita ka.", "Hangi istasyondan bindiniz?", "Which station did you board at?"),
      Y("この駅[えき]です。まだ乗[の]っていません。", "kono eki desu. mada notte imasen.", "Bu istasyon. Henüz trene binmedim.", "This station. I haven't ridden yet."),
      S("では、こちらで処理[しょり]します。カードをお預[あず]かりします。", "dewa, kochira de shori shimasu. kaado o oazukari shimasu.", "O zaman burada işlemi yapayım. Kartınızı alayım.", "Then I'll process it here. Let me take your card."),
      S("はい、どうぞ。お気[き]をつけて。", "hai, douzo. oki o tsukete.", "Buyurun. İyi yolculuklar.", "Here you go. Take care."),
    ]),
  ],
};

// ---------------------------------------------------------------------------
// 2. Airport arrival and departure
// ---------------------------------------------------------------------------

const ARRIVAL: Guide = {
  key: "arrival",
  icon: "🛬",
  title: l("Havalimanı: varış ve dönüş", "Airport: arrival and departure"),
  summary: l(
    "Visit Japan Web, pasaport kontrolü, gümrük, IC kart ve SIM almak, şehre ulaşım; dönüşte check-in, kapı, gecikme ve vergi iadesi.",
    "Visit Japan Web, immigration, customs, getting an IC card and SIM, reaching the city; on the way home check-in, gates, delays and tax refunds."
  ),
  blocks: [
    text(
      "Japonya'ya iniş genellikle hızlı ve düzenlidir: uçaktan çıkıp tabelaları takip edersin, sırayla **入国審査[にゅうこくしんさ]** (pasaport kontrolü), bagaj alma ve **税関[ぜいかん]** (gümrük) gelir. Görevliler çoğu zaman İngilizce de konuşur ama soruları Japonca tanımak seni rahatlatır. Türk pasaportuyla kısa turistik ziyaret için şu an vize gerekmiyor; yine de uçuştan önce güncel kuralı kontrol et.",
      "Landing in Japan is usually quick and orderly: you leave the plane and follow the signs to **入国審査[にゅうこくしんさ]** (immigration), baggage claim and **税関[ぜいかん]** (customs), in that order. Officers often speak English, but recognising the questions in Japanese puts you at ease. Turkish passport holders currently need no visa for short tourist visits; still, check the current rule before you fly."
    ),
    steps(l("Uçmadan önce: Visit Japan Web", "Before you fly: Visit Japan Web"), [
      step(
        l("Hesap aç ve pasaportunu kaydet", "Create an account and register your passport"),
        l(
          "Visit Japan Web resmi bir çevrimiçi hizmet. Hesap açıp pasaport bilgilerini, uçuşunu ve ilk kalacağın oteli gir.",
          "Visit Japan Web is an official online service. Create an account and enter your passport details, flight and first hotel."
        )
      ),
      step(
        l("Giriş ve gümrük formlarını doldur", "Fill in the entry and customs forms"),
        l(
          "Hem pasaport kontrolü hem gümrük beyanı bölümünü doldur. Sonunda QR kod alırsın (sisteme göre tek birleşik kod ya da iki ayrı kod olabilir).",
          "Complete both the immigration and the customs declaration sections. You get a QR code at the end (depending on the current system, one combined code or two separate ones)."
        )
      ),
      step(
        l("QR kodların ekran görüntüsünü al", "Screenshot the QR codes"),
        l(
          "Havalimanında internetin olmayabilir. QR kodları telefonuna kaydet; görevli ya da makine bunları okutacak.",
          "You may have no internet at the airport. Save the QR codes on your phone; officers or machines will scan them."
        ),
        "QRコード",
        "kyuuaaru koodo"
      ),
    ]),
    signs(l("İnince göreceğin tabelalar", "Signs after landing"), [
      sign("info", "到着", "varış", "arrivals", "Arrivals"),
      sign("info", "入国審査", "pasaport kontrolü", "immigration", "Immigration", "up"),
      sign("info", "外国人", "yabancılar (bu sırada bekle)", "foreign nationals (your queue)", "Foreign Passports"),
      sign("info", "手荷物受取所", "bagaj alma yeri", "baggage claim", "Baggage Claim", "right"),
      sign("info", "税関", "gümrük", "customs", "Customs"),
      sign("exit", "出口", "çıkış", "exit", "Exit", "up"),
      sign("info", "乗り継ぎ", "transfer uçuşlar", "connecting flights", "Transfer", "left"),
    ]),
    heading("Pasaport kontrolü", "Immigration"),
    steps(l("Uçaktan pasaport kontrolüne", "From the plane to immigration"), [
      step(
        l("Doğru sıraya gir", "Join the right queue"),
        l(
          "**外国人[がいこくじん]** (Foreign Passports) yazan sıraya gir. **日本人[にほんじん]** yazan sıra Japon vatandaşları içindir.",
          "Queue at **外国人[がいこくじん]** (Foreign Passports). The **日本人[にほんじん]** line is for Japanese citizens."
        )
      ),
      step(
        l("Parmak izi ve fotoğraf", "Fingerprints and photo"),
        l(
          "Makinede ya da görevlinin masasında iki işaret parmağını okuyucuya koyarsın ve kameraya bakarsın.",
          "At a machine or the officer's desk you place both index fingers on the reader and look at the camera."
        ),
        "指[ゆび]を置[お]いてください",
        "yubi o oite kudasai"
      ),
      step(
        l("Giriş iznini kontrol et", "Check your landing permission"),
        l(
          "Pasaportuna **上陸許可[じょうりくきょか]** etiketi ya da damgası yapıştırılır. Tax-free alışverişte bazen sorulur; kaybetme.",
          "A **上陸許可[じょうりくきょか]** (landing permission) sticker or stamp goes into your passport. Tax-free shops sometimes ask about it; do not lose it."
        )
      ),
    ]),
    dialogue(l("Pasaport kontrolünde", "At immigration"), [
      S("パスポートをお願[ねが]いします。", "pasupooto o onegai shimasu.", "Pasaportunuz lütfen.", "Your passport, please."),
      Y("はい、どうぞ。", "hai, douzo.", "Buyurun.", "Here you are."),
      S("滞在[たいざい]の目的[もくてき]は何[なん]ですか。", "taizai no mokuteki wa nan desu ka.", "Ziyaretinizin amacı nedir?", "What is the purpose of your stay?"),
      Y("観光[かんこう]です。", "kankou desu.", "Turizm.", "Sightseeing."),
      S("何日間[なんにちかん]滞在[たいざい]しますか。", "nannichikan taizai shimasu ka.", "Kaç gün kalacaksınız?", "How many days will you stay?"),
      Y("三週間[さんしゅうかん]です。十一月[じゅういちがつ]二十九日[にじゅうくにち]に帰[かえ]ります。", "sanshuukan desu. juuichigatsu nijuukunichi ni kaerimasu.", "Üç hafta. 29 Kasım'da dönüyorum.", "Three weeks. I go home on November 29th."),
      S("どこに泊[と]まりますか。", "doko ni tomarimasu ka.", "Nerede kalacaksınız?", "Where will you stay?"),
      Y("東京[とうきょう]と京都[きょうと]と大阪[おおさか]のホテルです。", "Toukyou to Kyouto to Oosaka no hoteru desu.", "Tokyo, Kyoto ve Osaka'daki otellerde.", "At hotels in Tokyo, Kyoto and Osaka."),
      S("両手[りょうて]の人差[ひとさ]し指[ゆび]を置[お]いてください。", "ryoute no hitosashiyubi o oite kudasai.", "İki işaret parmağınızı koyun.", "Place both index fingers here."),
      S("カメラを見[み]てください。…はい、結構[けっこう]です。", "kamera o mite kudasai. … hai, kekkou desu.", "Kameraya bakın. …Tamam, bu kadar.", "Please look at the camera. …That's fine."),
      Y("ありがとうございます。", "arigatou gozaimasu.", "Teşekkür ederim.", "Thank you."),
    ]),
    heading("Bagaj ve gümrük", "Baggage and customs"),
    dialogue(l("Gümrükte", "At customs"), [
      S("パスポートをお願[ねが]いします。", "pasupooto o onegai shimasu.", "Pasaportunuz lütfen.", "Your passport, please."),
      Y("はい。QRコードもあります。", "hai. kyuuaaru koodo mo arimasu.", "Buyurun. QR kodum da var.", "Here. I have the QR code too."),
      S("申告[しんこく]するものはありますか。", "shinkoku suru mono wa arimasu ka.", "Beyan edeceğiniz bir şey var mı?", "Anything to declare?"),
      Y("いいえ、ありません。", "iie, arimasen.", "Hayır, yok.", "No, nothing."),
      S("お酒[さけ]やたばこはお持[も]ちですか。", "osake ya tabako wa omochi desu ka.", "Yanınızda alkol ya da sigara var mı?", "Do you have alcohol or tobacco?"),
      Y("いいえ、持[も]っていません。", "iie, motte imasen.", "Hayır, yok.", "No, I don't."),
      S("日本[にほん]は初[はじ]めてですか。", "Nihon wa hajimete desu ka.", "Japonya'ya ilk gelişiniz mi?", "Is this your first time in Japan?"),
      Y("はい、初[はじ]めてです。", "hai, hajimete desu.", "Evet, ilk kez geliyorum.", "Yes, it's my first time."),
      S("スーツケースを開[あ]けてもいいですか。", "suutsukeesu o akete mo ii desu ka.", "Bavulunuzu açabilir miyim?", "May I open your suitcase?"),
      Y("はい、どうぞ。", "hai, douzo.", "Tabii, buyurun.", "Sure, go ahead."),
      S("ありがとうございました。どうぞ。", "arigatou gozaimashita. douzo.", "Teşekkürler. Geçebilirsiniz.", "Thank you. You may go."),
    ]),
    tip(
      "Visit Japan Web QR koduyla çoğu havalimanında elektronik gümrük kapısından (**電子申告[でんししんこく]ゲート**) geçebilirsin: önce kiosk'ta QR'ı ve pasaportu okutursun, sonra kapı yüzünü tanır. Sucuk, pastırma gibi et ürünleri ve taze meyve Japonya'ya sokulamaz; yanında getirme.",
      "With the Visit Japan Web QR code you can use the electronic customs gates (**電子申告[でんししんこく]ゲート**) at most airports: scan the QR and passport at a kiosk, then the gate checks your face. Meat products such as sucuk or pastırma and fresh fruit cannot be brought into Japan; leave them at home."
    ),
    heading("SIM, wifi ve IC kart", "SIM, wifi and IC card"),
    text(
      "Varış salonunda SIM kart, eSIM ve cep wifi (**ポケットWi-Fi**) kiralama tezgahları ile IC kart satan JR veya özel demiryolu bilet ofisleri bulunur. Önceden internetten ayırttığın cep wifi'yi genellikle havalimanındaki tezgahtan ya da postane tezgahından alırsın. IC kartı hemen al ve biraz para yükle: şehre giden trende ve otobüste işine yarar.",
      "The arrivals hall has counters for SIM cards, eSIMs and pocket wifi rental (**ポケットWi-Fi**), plus JR or private railway ticket offices that sell IC cards. Pocket wifi booked online is usually picked up at an airport counter or the post office counter. Get an IC card right away and load some money: it helps on the train or bus into the city."
    ),
    phrases(l("Varış salonunda", "In the arrivals hall"), [
      ph("予約[よやく]したWi-Fiを受[う]け取[と]りたいです。", "yoyaku shita waifai o uketoritai desu.", "Ayırttığım wifi'yi almak istiyorum.", "I'd like to pick up the wifi I reserved.", {
        reply: ["予約番号[よやくばんごう]はありますか。", "yoyaku bangou wa arimasu ka.", "Rezervasyon numaranız var mı?", "Do you have a reservation number?"],
      }),
      ph("SIMカードはどこで買[か]えますか。", "shimu kaado wa doko de kaemasu ka.", "SIM kartı nereden alabilirim?", "Where can I buy a SIM card?"),
      ph("Suicaを買[か]いたいです。", "suika o kaitai desu.", "Suica almak istiyorum.", "I'd like to buy a Suica."),
      ph("三千円[さんぜんえん]チャージしてください。", "sanzen en chaaji shite kudasai.", "Üç bin yen yükleyin lütfen.", "Please load three thousand yen."),
      ph("両替所[りょうがえじょ]はどこですか。", "ryougaejo wa doko desu ka.", "Döviz bürosu nerede?", "Where is the currency exchange?"),
      ph("ATMはどこですか。", "eetiiemu wa doko desu ka.", "ATM nerede?", "Where is the ATM?", {
        reply: ["あちらのセブン銀行[ぎんこう]のATMをご利用[りよう]ください。", "achira no Sebun Ginkou no eetiiemu o goriyou kudasai.", "Şuradaki Seven Bank ATM'sini kullanabilirsiniz.", "Please use the Seven Bank ATM over there."],
      }),
      ph("東京駅[とうきょうえき]までどうやって行[い]けばいいですか。", "Toukyou-eki made dou yatte ikeba ii desu ka.", "Tokyo İstasyonu'na nasıl gidebilirim?", "How do I get to Tokyo Station?"),
      ph("次[つぎ]のバスは何時[なんじ]ですか。", "tsugi no basu wa nanji desu ka.", "Bir sonraki otobüs saat kaçta?", "What time is the next bus?"),
    ]),
    heading("Havalimanından şehre", "From the airport to the city"),
    table(
      l("Başlıca ulaşım seçenekleri", "Main transport options"),
      [l("Havalimanı", "Airport"), l("Ulaşım", "Transport"), l("Nereye", "Where to"), l("Not", "Note")],
      [
        ["成田[なりた]", "成田[なりた]エクスプレス", l("Tokyo, Shinagawa, Shinjuku, Shibuya", "Tokyo, Shinagawa, Shinjuku, Shibuya"), l("JR; tüm koltuklar rezerveli.", "JR; all seats reserved.")],
        ["成田[なりた]", "スカイライナー", l("Nippori, Ueno", "Nippori, Ueno"), l("Keisei; Ueno'ya en hızlı yol.", "Keisei; fastest to Ueno.")],
        ["成田[なりた]", "アクセス特急[とっきゅう]", l("Asakusa ve Nihonbashi yönü", "Towards Asakusa and Nihonbashi"), l("Daha ucuz, rezervasyon yok.", "Cheaper, no reservation.")],
        ["成田[なりた]・羽田[はねだ]", "リムジンバス", l("Büyük oteller ve istasyonlar", "Major hotels and stations"), l("Bavul bagaja konur; trafiğe bağlı.", "Luggage goes underneath; depends on traffic.")],
        ["羽田[はねだ]", "東京[とうきょう]モノレール", l("Hamamatsucho (Yamanote aktarması)", "Hamamatsucho (Yamanote transfer)"), l("Kısa ve basit.", "Short and simple.")],
        ["羽田[はねだ]", "京急線[けいきゅうせん]", l("Shinagawa, Yokohama, Asakusa yönü", "Shinagawa, Yokohama, towards Asakusa"), l("IC kartla binilir.", "Ride with an IC card.")],
        ["関西空港[かんさいくうこう]", "特急[とっきゅう]はるか", l("Tennoji, Shin-Osaka, Kyoto", "Tennoji, Shin-Osaka, Kyoto"), l("JR; Kyoto'ya aktarmasız.", "JR; direct to Kyoto.")],
        ["関西空港[かんさいくうこう]", "ラピート", l("Namba (Osaka)", "Namba (Osaka)"), l("Nankai; rezerveli koltuk.", "Nankai; reserved seats.")],
      ]
    ),
    tip(
      "Ücretler ve sefer saatleri değişebildiği için tezgahta ya da resmi sitede kontrol et. İlk gün yorgunsan ve büyük bavulun varsa limuzin otobüs en zahmetsizi: merdiven ve aktarma yok, birçok büyük otelin önünde durur.",
      "Fares and timetables change, so check at the counter or on the official site. If you are tired on day one and have a big suitcase, the limousine bus is the least hassle: no stairs, no transfers, and it stops in front of many large hotels."
    ),
    heading("Dönüş günü", "Departure day"),
    steps(l("Havalimanında dönüş sırası", "Departure sequence at the airport"), [
      step(
        l("Erken git", "Arrive early"),
        l(
          "Uluslararası uçuş için en az üç saat önce havalimanında ol. Kasım 2026'dan itibaren vergi iadesi için çıkışta gümrük onayı gerektiğinden ekstra zaman ayır.",
          "Be at the airport at least three hours before an international flight. From November 2026 tax refunds need a customs check on departure, so allow extra time."
        )
      ),
      step(
        l("Check-in ve bagaj teslimi", "Check-in and bag drop"),
        l(
          "**出発[しゅっぱつ]** katında havayolunun **チェックインカウンター**'sını panodan bul.",
          "On the **出発[しゅっぱつ]** (departures) floor, find your airline's **チェックインカウンター** on the board."
        ),
        "出発[しゅっぱつ]ロビー",
        "shuppatsu robii"
      ),
      step(
        l("Güvenlik kontrolü", "Security check"),
        l(
          "**保安検査[ほあんけんさ]**: sıvılar 100 ml kurallarına uygun, powerbank'ler el bagajında olmalı.",
          "**保安検査[ほあんけんさ]**: liquids follow the 100 ml rule and power banks must be in your hand luggage."
        )
      ),
      step(
        l("Çıkış pasaport kontrolü", "Departure immigration"),
        l(
          "**出国審査[しゅっこくしんさ]**: çoğu zaman yüz tanıma kapısından geçersin.",
          "**出国審査[しゅっこくしんさ]**: usually a face-recognition gate."
        )
      ),
      step(
        l("Kapıya git", "Go to your gate"),
        l(
          "**搭乗口[とうじょうぐち]** numarasını biniş kartından ve panodan kontrol et; kapı değişebilir.",
          "Check the **搭乗口[とうじょうぐち]** (gate) number on your boarding pass and the board; gates can change."
        ),
        "搭乗口[とうじょうぐち]",
        "toujouguchi"
      ),
    ]),
    table(
      l("Kalkış panosu ve havalimanı kelimeleri", "Departure board and airport words"),
      [l("Japonca", "Japanese"), l("Okunuş", "Reading"), l("Anlamı", "Meaning")],
      [
        ["出発[しゅっぱつ]", "shuppatsu", l("kalkış / dış hatlar gidiş", "departures")],
        ["到着[とうちゃく]", "touchaku", l("varış", "arrivals")],
        ["便名[びんめい]", "binmei", l("uçuş numarası", "flight number")],
        ["行[ゆ]き先[さき]", "yukisaki", l("varış yeri", "destination")],
        ["定刻[ていこく]", "teikoku", l("zamanında", "on time")],
        ["遅延[ちえん]", "chien", l("gecikme", "delayed")],
        ["欠航[けっこう]", "kekkou", l("iptal edildi", "cancelled")],
        ["搭乗中[とうじょうちゅう]", "toujouchuu", l("biniş başladı", "now boarding")],
        ["搭乗券[とうじょうけん]", "toujouken", l("biniş kartı", "boarding pass")],
        ["搭乗口[とうじょうぐち]", "toujouguchi", l("kapı", "gate")],
        ["手荷物[てにもつ]", "tenimotsu", l("el bagajı / bagaj", "hand luggage / baggage")],
        ["預[あず]け荷物[にもつ]", "azuke nimotsu", l("teslim edilen bagaj", "checked baggage")],
      ]
    ),
    dialogue(l("Check-in tezgahında", "At the check-in counter"), [
      S("パスポートをお願[ねが]いします。お預[あず]けの荷物[にもつ]はございますか。", "pasupooto o onegai shimasu. oazuke no nimotsu wa gozaimasu ka.", "Pasaportunuz lütfen. Teslim edeceğiniz bagaj var mı?", "Your passport, please. Do you have bags to check?"),
      Y("はい、スーツケースが一[ひと]つです。", "hai, suutsukeesu ga hitotsu desu.", "Evet, bir bavul.", "Yes, one suitcase."),
      S("こちらに載[の]せてください。中[なか]にバッテリーは入[はい]っていませんか。", "kochira ni nosete kudasai. naka ni batterii wa haitte imasen ka.", "Buraya koyun lütfen. İçinde pil ya da powerbank yok, değil mi?", "Please put it here. There are no batteries inside, are there?"),
      Y("モバイルバッテリーは手荷物[てにもつ]に入[い]れました。", "mobairu batterii wa tenimotsu ni iremashita.", "Powerbank'i el bagajıma koydum.", "I put the power bank in my hand luggage."),
      S("ありがとうございます。窓側[まどがわ]と通路側[つうろがわ]、どちらがよろしいですか。", "arigatou gozaimasu. madogawa to tsuurogawa, dochira ga yoroshii desu ka.", "Teşekkürler. Cam kenarı mı, koridor mu tercih edersiniz?", "Thank you. Would you prefer window or aisle?"),
      Y("通路側[つうろがわ]をお願[ねが]いします。", "tsuurogawa o onegai shimasu.", "Koridor lütfen.", "Aisle, please."),
      S("搭乗口[とうじょうぐち]は三十二番[さんじゅうにばん]、搭乗開始[とうじょうかいし]は十時[じゅうじ]二十分[にじゅっぷん]です。", "toujouguchi wa sanjuuniban, toujou kaishi wa juuji nijuppun desu.", "Kapı otuz iki, biniş saat on yirmide başlıyor.", "Gate thirty-two; boarding starts at ten twenty."),
      Y("わかりました。ありがとうございます。", "wakarimashita. arigatou gozaimasu.", "Anladım. Teşekkürler.", "Got it. Thank you."),
    ]),
    phrases(l("Dönüşte duyacakların ve diyeceklerin", "What you will hear and say on departure"), [
      ph("〇〇航空[こうくう]のカウンターはどこですか。", "〇〇 koukuu no kauntaa wa doko desu ka.", "〇〇 Havayolları'nın tezgahı nerede?", "Where is the 〇〇 Airlines counter?"),
      ph("搭乗口[とうじょうぐち]は何番[なんばん]ですか。", "toujouguchi wa nanban desu ka.", "Kapı numarası kaç?", "What is the gate number?"),
      ph("飛行機[ひこうき]が遅[おく]れていますか。", "hikouki ga okurete imasu ka.", "Uçak gecikiyor mu?", "Is the flight delayed?", {
        reply: ["はい、一時間[いちじかん]ほど遅[おく]れております。", "hai, ichijikan hodo okurete orimasu.", "Evet, yaklaşık bir saat gecikmeli.", "Yes, it's about an hour late."],
      }),
      ph("この便[びん]は欠航[けっこう]になりました。", "kono bin wa kekkou ni narimashita.", "Bu uçuş iptal edildi.", "This flight has been cancelled.", { hear: true }),
      ph("ただいまより搭乗[とうじょう]を開始[かいし]いたします。", "tadaima yori toujou o kaishi itashimasu.", "Biniş şimdi başlıyor.", "We will now begin boarding.", { hear: true }),
      ph("搭乗口[とうじょうぐち]が変更[へんこう]になりました。", "toujouguchi ga henkou ni narimashita.", "Kapı değişti.", "The gate has changed.", { hear: true }),
      ph("振替便[ふりかえびん]はありますか。", "furikaebin wa arimasu ka.", "Alternatif bir uçuş var mı?", "Is there an alternative flight?"),
    ]),
    heading("Vergi iadesi (Kasım 2026'dan itibaren)", "Tax refund (from November 2026)"),
    text(
      "1 Kasım 2026'dan itibaren Japonya turistlere vergisiz satışta **iade sistemine** geçiyor. Yani mağazada vergi dahil fiyatı ödüyorsun, pasaportunu gösteriyorsun; ürünleri ülkeden çıkarken gümrük onaylayınca vergi sana iade ediliyor. Fişleri sakla, mağazanın verdiği talimatı (örneğin bir QR kodla kayıt) izle. Ayrıntılar yeni olduğu için mağazaya göre farklılık gösterebilir; şüphede kalırsan kasada sor.",
      "From 1 November 2026 Japan switches tourist tax-free shopping to a **refund system**. You pay the tax-inclusive price in the shop and show your passport; the tax is refunded once customs confirms the goods as you leave the country. Keep your receipts and follow the shop's instructions (for example, registration via a QR code). Because the system is new, details may differ by shop; when in doubt, ask at the till."
    ),
    tip(
      "Vergisiz aldığın ürünleri dönüşte gümrük görevlisine gösterebilmen gerekebilir; ürünleri bavula koyacaksan gümrük kontrolünü bagaj tesliminden **önce** yaptır, emin değilsen havalimanında sor. Ürünleri bavulun en üstüne ya da el bagajına koy, fişleri tek bir zarfta tut.",
      "You may need to show your tax-free goods to customs on departure; if they go in your checked suitcase, get the customs check done **before** you check your bags, and ask at the airport if unsure. Put the goods at the top of your suitcase or in your hand luggage and keep the receipts together in one envelope."
    ),
  ],
};

// ---------------------------------------------------------------------------
// 3. Money and paying
// ---------------------------------------------------------------------------

const MONEY: Guide = {
  key: "money",
  icon: "💴",
  title: l("Para ve ödeme", "Money and paying"),
  summary: l(
    "Nakit neden hâlâ önemli, ATM'ler, bozuk paralar, kasada para tepsisi, kart/IC/QR ile ödeme, fiyat etiketleri, vergisiz alışveriş, hesabı bölmek ve fişler.",
    "Why cash still matters, ATMs, coins, the money tray, paying by card/IC/QR, price tags, tax-free shopping, splitting the bill and receipts."
  ),
  blocks: [
    text(
      "Japonya'da kart ve IC kart artık çoğu yerde geçiyor ama **nakit hâlâ önemli**: küçük restoranlar, tapınak girişleri, bazı otobüsler, pazar tezgahları ve kırsal bölgeler sadece nakit isteyebilir. Yanında her zaman birkaç bin yen ve bozuk para taşı. Japonya güvenli bir ülke; nakit taşımak burada olağan.",
      "Cards and IC cards now work in most places in Japan, but **cash still matters**: small restaurants, temple entrances, some buses, market stalls and rural areas may take cash only. Always carry a few thousand yen and some coins. Japan is safe; carrying cash is normal here."
    ),
    heading("ATM'den para çekmek", "Getting cash from an ATM"),
    text(
      "Yabancı kartları en güvenilir şekilde **7-Eleven** marketlerindeki Seven Bank ATM'leri ve **Japan Post** (ゆうちょ銀行[ぎんこう]) ATM'leri kabul eder; çoğu 7-Eleven gece gündüz açıktır. Diğer marketlerin ve bankaların ATM'leri yabancı kartı reddedebilir. Ekranda İngilizce seçeneği vardır ama düğmeleri tanımak işini hızlandırır.",
      "Foreign cards are most reliably accepted by Seven Bank ATMs in **7-Eleven** stores and **Japan Post** (ゆうちょ銀行[ぎんこう]) ATMs; most 7-Elevens are open around the clock. Other convenience store and bank ATMs may reject foreign cards. The screen has an English option, but knowing the buttons speeds things up."
    ),
    steps(l("ATM adımları", "ATM steps"), [
      step(
        l("Dili seç ve kartı sok", "Pick a language and insert the card"),
        l(
          "Ekranda **English** ya da başka bir dil seç, sonra kartını yuvaya sok.",
          "Choose **English** or another language on the screen, then insert your card."
        )
      ),
      step(
        l("Para çekmeyi seç", "Choose withdrawal"),
        l(
          "**お引[ひ]き出[だ]し** düğmesi para çekmek demek.",
          "The **お引[ひ]き出[だ]し** button means withdrawal."
        ),
        "お引[ひ]き出[だ]し",
        "ohikidashi"
      ),
      step(
        l("Şifreni gir", "Enter your PIN"),
        l(
          "**暗証番号[あんしょうばんごう]** kart şifren. Girdikten sonra **確認[かくにん]** (onayla) düğmesine bas.",
          "**暗証番号[あんしょうばんごう]** is your PIN. Then press **確認[かくにん]** (confirm)."
        ),
        "暗証番号[あんしょうばんごう]",
        "anshou bangou"
      ),
      step(
        l("Tutarı gir", "Enter the amount"),
        l(
          "**金額[きんがく]** ekranında tutarı yaz; ATM'ler genelde 10.000 yenlik banknot verir. Kendi bankanın ücretini ve kur dönüşümünü ekranda kontrol et; dönüşümü kendi bankana bırakmak çoğu zaman daha ucuzdur.",
          "Type the amount on the **金額[きんがく]** screen; ATMs usually dispense 10,000-yen notes. Check your own bank's fee and the conversion offer on screen; letting your home bank convert is often cheaper."
        )
      ),
      step(
        l("Kartı, parayı ve fişi al", "Take card, cash and slip"),
        l(
          "Önce kart, sonra para çıkar. **明細[めいさい]** işlem fişidir; istemezsen alma.",
          "The card comes out first, then the cash. **明細[めいさい]** is the transaction slip; skip it if you do not need it."
        )
      ),
    ]),
    table(
      l("ATM düğmeleri", "ATM buttons"),
      [l("Japonca", "Japanese"), l("Okunuş", "Reading"), l("Anlamı", "Meaning")],
      [
        ["お引[ひ]き出[だ]し", "ohikidashi", l("para çekme", "withdrawal")],
        ["お預[あず]け入[い]れ", "oazukeire", l("para yatırma", "deposit")],
        ["残高照会[ざんだかしょうかい]", "zandaka shoukai", l("bakiye sorgulama", "balance inquiry")],
        ["暗証番号[あんしょうばんごう]", "anshou bangou", l("şifre (PIN)", "PIN")],
        ["金額[きんがく]", "kingaku", l("tutar", "amount")],
        ["確認[かくにん]", "kakunin", l("onayla", "confirm")],
        ["取消[とりけし]", "torikeshi", l("iptal", "cancel")],
        ["訂正[ていせい]", "teisei", l("düzelt (sil)", "correct (clear)")],
        ["明細[めいさい]", "meisai", l("işlem fişi", "transaction slip")],
        ["手数料[てすうりょう]", "tesuuryou", l("işlem ücreti", "fee")],
      ]
    ),
    heading("Bozuk paralar ve banknotlar", "Coins and notes"),
    table(
      l("Japon yeni", "Japanese yen"),
      [l("Değer", "Value"), l("Okunuş", "Reading"), l("Not", "Note")],
      [
        ["一円[いちえん]", "ichi en", l("Hafif alüminyum; çok küçük değer.", "Light aluminium; tiny value.")],
        ["五円[ごえん]", "go en", l("Ortası delik, sarı renkli.", "Yellowish with a hole.")],
        ["十円[じゅうえん]", "juu en", l("Bakır renkli.", "Copper coloured.")],
        ["五十円[ごじゅうえん]", "gojuu en", l("Gümüş renkli, ortası delik.", "Silver with a hole.")],
        ["百円[ひゃくえん]", "hyaku en", l("Makinelerde en çok kullanılan.", "The most used in machines.")],
        ["五百円[ごひゃくえん]", "gohyaku en", l("En büyük bozuk para; değerli, harcamayı unutma.", "The biggest coin; worth a lot, do not forget to spend it.")],
        ["千円札[せんえんさつ]", "sen en satsu", l("En sık kullanılan banknot.", "The most common note.")],
        ["五千円札[ごせんえんさつ]", "gosen en satsu", l("Orta banknot.", "Middle note.")],
        ["一万円札[いちまんえんさつ]", "ichiman en satsu", l("ATM'den çıkan banknot.", "The note ATMs give.")],
      ]
    ),
    tip(
      "Bozuk paralar hızla birikir. Bozuk para kesesi taşı ve kasada önce bozukları kullan; otomat, bozuk paralı dolap ve otobüslerde işine yarar. 2024'te yeni tasarım banknotlar çıktı; eskiler de geçerli, ikisini de göreceksin.",
      "Coins pile up fast. Carry a coin purse and spend coins first at the till; they are handy for vending machines, coin lockers and buses. New banknote designs came out in 2024; the old ones are still valid, so you will see both."
    ),
    tip(
      "Büyük alışverişten önce kartının yurtdışı kullanıma açık olduğundan emin ol ve bir yedek kart taşı. Bazı yerler sadece belirli kart markalarını kabul eder; kasanın yanındaki logolara bak. Para çekerken bir seferde daha büyük tutar çekmek, ücret ödeyeceğin işlem sayısını azaltır.",
      "Before big purchases, make sure your card is enabled for use abroad and carry a backup card. Some places accept only certain card brands; check the logos by the till. Withdrawing a larger amount at once means fewer transactions to pay fees on."
    ),
    heading("Kasada ödeme", "Paying at the counter"),
    text(
      "Kasada parayı görevlinin eline değil, tezgahtaki küçük **トレー** (para tepsisi) içine koyarsın; para üstü de çoğu zaman tepsiyle ya da eline sayılarak verilir. Birçok markette ve süpermarkette ise ödemeyi kasiyerin yanındaki **自動精算機[じどうせいさんき]** (otomatik ödeme makinesi) alır: kasiyer ürünleri okutur, sen makineye parayı ya da kartı verirsin.",
      "At the till you put money into the small **トレー** (money tray) on the counter, not into the cashier's hand; change usually comes back on the tray or counted into your hand. Many convenience stores and supermarkets have a **自動精算機[じどうせいさんき]** (automatic payment machine) next to the cashier: the cashier scans the items and you feed the machine cash or a card."
    ),
    dialogue(l("Markette kasada", "At a convenience store till"), [
      S("いらっしゃいませ。袋[ふくろ]はご利用[りよう]ですか。", "irasshaimase. fukuro wa goriyou desu ka.", "Hoş geldiniz. Poşet ister misiniz?", "Welcome. Would you like a bag?"),
      Y("いいえ、大丈夫[だいじょうぶ]です。", "iie, daijoubu desu.", "Hayır, gerek yok.", "No, I'm fine."),
      S("こちら、温[あたた]めますか。", "kochira, atatamemasu ka.", "Bunu ısıtayım mı?", "Shall I heat this up?"),
      Y("はい、お願[ねが]いします。", "hai, onegai shimasu.", "Evet, lütfen.", "Yes, please."),
      S("お会計[かいけい]、八百六十円[はっぴゃくろくじゅうえん]です。お支[し]払[はら]いは?", "okaikei, happyaku rokujuu en desu. oshiharai wa?", "Toplam sekiz yüz altmış yen. Nasıl ödersiniz?", "That's 860 yen. How will you pay?"),
      Y("Suicaでお願[ねが]いします。", "suika de onegai shimasu.", "Suica ile lütfen.", "Suica, please."),
      S("こちらにタッチしてください。", "kochira ni tacchi shite kudasai.", "Buraya dokundurun.", "Please tap here."),
      S("レシートはご利用[りよう]ですか。", "reshiito wa goriyou desu ka.", "Fiş ister misiniz?", "Would you like the receipt?"),
      Y("いいえ、結構[けっこう]です。", "iie, kekkou desu.", "Hayır, gerek yok.", "No, thank you."),
      S("ありがとうございました。", "arigatou gozaimashita.", "Teşekkür ederiz.", "Thank you very much."),
    ]),
    phrases(l("Ödeme yöntemi sormak", "Asking about payment"), [
      ph("カードで払[はら]えますか。", "kaado de haraemasu ka.", "Kartla ödeyebilir miyim?", "Can I pay by card?", {
        reply: ["すみません、現金[げんきん]のみです。", "sumimasen, genkin nomi desu.", "Üzgünüm, sadece nakit.", "Sorry, cash only."],
      }),
      ph("カードでお願[ねが]いします。", "kaado de onegai shimasu.", "Kartla lütfen.", "Card, please.", {
        reply: ["お支[し]払[はら]い回数[かいすう]は?", "oshiharai kaisuu wa?", "Kaç taksit?", "How many installments?"],
        note: l("Taksit sorusunu duyarsan 一括[いっかつ]で (tek çekim) de.", "If you hear the installment question, say 一括[いっかつ]で (in one payment)."),
      }),
      ph("一括[いっかつ]で。", "ikkatsu de.", "Tek çekim.", "In one payment."),
      ph("交通系[こうつうけい]ICは使[つか]えますか。", "koutsuukei aishii wa tsukaemasu ka.", "Suica gibi ulaşım kartı geçiyor mu?", "Can I use a transit IC card?"),
      ph("QRコード決済[けっさい]はできますか。", "kyuuaaru koodo kessai wa dekimasu ka.", "QR kodla ödeme yapılabiliyor mu?", "Can I pay by QR code?"),
      ph("現金[げんきん]で払[はら]います。", "genkin de haraimasu.", "Nakit ödeyeceğim.", "I'll pay in cash."),
      ph("暗証番号[あんしょうばんごう]をお願[ねが]いします。", "anshou bangou o onegai shimasu.", "Şifrenizi girin lütfen.", "Please enter your PIN.", { hear: true }),
      ph("ポイントカードはお持[も]ちですか。", "pointo kaado wa omochi desu ka.", "Puan kartınız var mı?", "Do you have a point card?", {
        hear: true,
        reply: ["いいえ、ありません。", "iie, arimasen.", "Hayır, yok.", "No, I don't."],
      }),
      ph("一万円[いちまんえん]でもいいですか。", "ichiman en demo ii desu ka.", "On bin yenlik banknotla olur mu?", "Is a 10,000-yen note OK?", {
        note: l("Küçük alışverişte büyük banknot verirken kibarca sormak iyi karşılanır.", "Asking politely before paying a small bill with a big note is appreciated."),
      }),
      ph("おつりが違[ちが]うと思[おも]います。", "otsuri ga chigau to omoimasu.", "Sanırım para üstü yanlış.", "I think the change is wrong."),
    ]),
    heading("Fiyat etiketleri ve vergi", "Price tags and tax"),
    text(
      "Japonya'da tüketim vergisi genelde yüzde 10, yiyecek-içecek paket alımlarında yüzde 8'dir. Etiketlerde iki fiyat görebilirsin: **税込[ぜいこみ]** vergi dahil, **税抜[ぜいぬき]** vergi hariç. Büyük yazan rakam bazen vergisiz fiyattır; kasada ödeyeceğin tutar **税込[ぜいこみ]** olandır. Restoranlarda **お通[とお]し** (masaya getirilen küçük meze ve oturma ücreti) izakaya'larda yaygındır ve hesaba eklenir.",
      "Consumption tax in Japan is generally 10 percent, and 8 percent for takeaway food and drink. Price tags can show two prices: **税込[ぜいこみ]** includes tax, **税抜[ぜいぬき]** excludes it. The big number is sometimes the pre-tax price; what you pay at the till is the **税込[ぜいこみ]** one. In izakaya, **お通[とお]し** (a small starter served automatically, effectively a seating charge) is common and added to the bill."
    ),
    signs(l("Fiyat ve ödeme tabelaları", "Price and payment signs"), [
      sign("ticket", "1,280円（税込）", "1.280 yen, vergi dahil", "1,280 yen including tax"),
      sign("ticket", "980円（税抜）", "980 yen, vergi hariç", "980 yen excluding tax"),
      sign("shop", "現金のみ", "sadece nakit", "cash only", "Cash Only"),
      sign("shop", "免税", "vergisiz satış yapılır", "tax-free shopping available", "Tax-Free"),
      sign("info", "各種カード使えます", "her türlü kart geçer", "all major cards accepted", "Cards Accepted"),
      sign("shop", "お会計はレジにて", "ödeme kasada", "please pay at the register", "Pay at Register"),
    ]),
    heading("Vergisiz (免税[めんぜい]) alışveriş", "Tax-free shopping"),
    text(
      "**免税[めんぜい]** yazan mağazalarda turist olarak vergiyi geri alabilirsin. Genellikle aynı mağazada aynı gün belirli bir tutarın (çoğu zaman vergi hariç 5.000 yen) üzerinde alışveriş gerekir ve **pasaportun yanında olmalı**; fotokopi geçmez. 1 Kasım 2026'dan itibaren sistem iade usulüne geçiyor: kasada tam fiyatı ödüyorsun, vergi çıkışta gümrük onayından sonra iade ediliyor. Fişleri sakla.",
      "In shops showing **免税[めんぜい]** you can get the tax back as a tourist. You usually need to spend over a set amount (often 5,000 yen before tax) at the same shop on the same day, and **you must have your passport with you**; a photocopy will not do. From 1 November 2026 the system becomes a refund scheme: you pay the full price at the till and the tax is refunded after customs confirms on departure. Keep your receipts."
    ),
    dialogue(l("Vergisiz kasada", "At the tax-free counter"), [
      Y("免税[めんぜい]できますか。", "menzei dekimasu ka.", "Vergisiz alabilir miyim?", "Can I get tax-free?"),
      S("はい、パスポートをお願[ねが]いします。", "hai, pasupooto o onegai shimasu.", "Evet, pasaportunuz lütfen.", "Yes, your passport, please."),
      Y("はい、どうぞ。", "hai, douzo.", "Buyurun.", "Here you are."),
      S("一度[いちど]税込[ぜいこみ]の金額[きんがく]でお支[し]払[はら]いいただき、出国時[しゅっこくじ]に返金[へんきん]されます。", "ichido zeikomi no kingaku de oshiharai itadaki, shukkokuji ni henkin saremasu.", "Önce vergi dahil tutarı ödüyorsunuz, ülkeden çıkarken iade ediliyor.", "You pay the tax-inclusive amount first and get refunded when you leave Japan."),
      Y("わかりました。レシートは必要[ひつよう]ですか。", "wakarimashita. reshiito wa hitsuyou desu ka.", "Anladım. Fiş gerekli mi?", "I see. Do I need the receipt?"),
      S("はい、大切[たいせつ]に保管[ほかん]してください。こちらのQRコードもご確認[かくにん]ください。", "hai, taisetsu ni hokan shite kudasai. kochira no kyuuaaru koodo mo gokakunin kudasai.", "Evet, lütfen iyi saklayın. Şu QR koda da bakın.", "Yes, please keep it safe. Please also check this QR code."),
      Y("ありがとうございます。", "arigatou gozaimasu.", "Teşekkür ederim.", "Thank you."),
    ]),
    heading("Hesabı bölmek, fiş ve bahşiş", "Splitting the bill, receipts and tipping"),
    phrases(l("Restoranda hesap", "The bill at a restaurant"), [
      ph("お会計[かいけい]お願[ねが]いします。", "okaikei onegai shimasu.", "Hesap lütfen.", "The bill, please.", {
        note: l("Çoğu restoranda hesabı masada değil, çıkışta kasada ödersin.", "At most restaurants you pay at the register by the exit, not at the table."),
      }),
      ph("別々[べつべつ]でお願[ねが]いします。", "betsubetsu de onegai shimasu.", "Ayrı ayrı ödeyelim lütfen.", "Separate bills, please.", {
        reply: ["すみません、お会計[かいけい]はご一緒[いっしょ]でお願[ねが]いしております。", "sumimasen, okaikei wa goissho de onegai shite orimasu.", "Üzgünüz, hesabı tek seferde alıyoruz.", "Sorry, we only take one payment per table."],
      }),
      ph("一緒[いっしょ]でお願[ねが]いします。", "issho de onegai shimasu.", "Hepsi birlikte lütfen.", "All together, please."),
      ph("領収書[りょうしゅうしょ]をください。", "ryoushuusho o kudasai.", "Resmi makbuz verir misiniz?", "May I have an official receipt?", {
        reply: ["お宛名[あてな]はどうなさいますか。", "oatena wa dou nasaimasu ka.", "Kimin adına yazalım?", "Whose name should it be made out to?"],
      }),
      ph("レシートをください。", "reshiito o kudasai.", "Fiş verir misiniz?", "May I have the receipt?"),
      ph("ごちそうさまでした。", "gochisousama deshita.", "Elinize sağlık, çok güzeldi.", "Thank you for the meal.", {
        note: l("Çıkarken söylenir; bahşişin yerini bu cümle tutar.", "Said as you leave; it takes the place of a tip."),
      }),
    ]),
    tip(
      "**Japonya'da bahşiş verilmez.** Masada para bırakırsan garson büyük ihtimalle unuttuğunu düşünüp peşinden koşar. Teşekkürünü **ごちそうさまでした** ile göster. **レシート** basit kasa fişi, **領収書[りょうしゅうしょ]** ise isim yazılabilen resmi makbuzdur; masraf belgesi gerekmiyorsa レシート yeter.",
      "**There is no tipping in Japan.** If you leave money on the table, the server will likely chase after you thinking you forgot it. Show thanks with **ごちそうさまでした**. **レシート** is a simple till receipt; **領収書[りょうしゅうしょ]** is a formal receipt that can carry a name; unless you need an expense document, a レシート is enough."
    ),
  ],
};

// ---------------------------------------------------------------------------
// 4. Numbers, prices, counters, time and dates
// ---------------------------------------------------------------------------

const NUMBERS: Guide = {
  key: "numbers",
  icon: "🔢",
  title: l("Sayılar, fiyatlar, saat ve tarih", "Numbers, prices, time and dates"),
  summary: l(
    "1'den 10.000'e sayılar, ses değişimleri, fiyat okumak, gerçekten lazım olan sayma ekleri, saat, günler ve Kasım tarihleri.",
    "Numbers from 1 to 10,000, sound changes, reading prices, the counters you really need, telling time, weekdays and November dates."
  ),
  blocks: [
    text(
      "Seyahatte sayıları en çok üç yerde duyarsın: kasada fiyat, restoranda kişi sayısı ve istasyonda saat. Japonca sayılar düzenlidir ama bazı birleşimlerde ses değişir (さんびゃく, はっぴゃく gibi). Bu rehberdeki tabloları ezberlemek zorunda değilsin; kasada duyduğun fiyatı tanıyabilmen yeter, kendin söylerken parmakla göstermek de her zaman işe yarar.",
      "On a trip you hear numbers in three places most: prices at the till, party size at restaurants and times at the station. Japanese numbers are regular, but some combinations change sound (like さんびゃく, はっぴゃく). You do not have to memorise these tables; recognising a price you hear is enough, and pointing with your fingers always works when you speak."
    ),
    table(
      l("Temel sayılar", "Basic numbers"),
      [l("Sayı", "Number"), l("Japonca", "Japanese"), l("Okunuş", "Reading"), l("Not", "Note")],
      [
        [l("1", "1"), "一[いち]", "ichi", l("düzenli", "regular")],
        [l("2", "2"), "二[に]", "ni", l("düzenli", "regular")],
        [l("3", "3"), "三[さん]", "san", l("düzenli", "regular")],
        [l("4", "4"), "四[よん]", "yon", l("し de olur ama よん daha yaygın.", "し also exists, but よん is more common.")],
        [l("5", "5"), "五[ご]", "go", l("düzenli", "regular")],
        [l("6", "6"), "六[ろく]", "roku", l("düzenli", "regular")],
        [l("7", "7"), "七[なな]", "nana", l("しち de olur.", "しち also exists.")],
        [l("8", "8"), "八[はち]", "hachi", l("düzenli", "regular")],
        [l("9", "9"), "九[きゅう]", "kyuu", l("Saatte く olur: 九時[くじ].", "In times it becomes く: 九時[くじ].")],
        [l("10", "10"), "十[じゅう]", "juu", l("düzenli", "regular")],
        [l("11", "11"), "十一[じゅういち]", "juuichi", l("10 + 1", "10 + 1")],
        [l("20", "20"), "二十[にじゅう]", "nijuu", l("2 × 10", "2 × 10")],
        [l("45", "45"), "四十五[よんじゅうご]", "yonjuugo", l("4 × 10 + 5", "4 × 10 + 5")],
        [l("99", "99"), "九十九[きゅうじゅうきゅう]", "kyuujuukyuu", l("düzenli", "regular")],
      ]
    ),
    heading("Yüzler, binler ve 万[まん]", "Hundreds, thousands and 万[まん]"),
    text(
      "Japonca dört basamakta gruplar: **百[ひゃく]** 100, **千[せん]** 1.000, **万[まん]** 10.000. Yani 10.000 'on bin' değil **一万[いちまん]**, 30.000 de **三万[さんまん]** olur. 100 ve 1.000 başına 一[いち] almaz: sadece ひゃく ve せん. Aşağıdaki tablolarda kalın yazılanlar ses değişimi olanlar; asıl dikkat etmen gerekenler onlar.",
      "Japanese groups digits by four: **百[ひゃく]** 100, **千[せん]** 1,000, **万[まん]** 10,000. So 10,000 is not 'ten thousand' but **一万[いちまん]**, and 30,000 is **三万[さんまん]**. 100 and 1,000 take no 一[いち] in front: just ひゃく and せん. The ones marked in the tables below change sound; those are the ones to watch."
    ),
    table(
      l("Yüzler (ses değişimleri)", "Hundreds (sound changes)"),
      [l("Sayı", "Number"), l("Japonca", "Japanese"), l("Okunuş", "Reading"), l("Not", "Note")],
      [
        [l("100", "100"), "百[ひゃく]", "hyaku", l("düzenli", "regular")],
        [l("200", "200"), "二百[にひゃく]", "nihyaku", l("düzenli", "regular")],
        [l("300", "300"), "三百[さんびゃく]", "sanbyaku", l("**ひゃく → びゃく**", "**hyaku → byaku**")],
        [l("400", "400"), "四百[よんひゃく]", "yonhyaku", l("düzenli", "regular")],
        [l("500", "500"), "五百[ごひゃく]", "gohyaku", l("düzenli", "regular")],
        [l("600", "600"), "六百[ろっぴゃく]", "roppyaku", l("**ろっぴゃく**", "**roppyaku**")],
        [l("700", "700"), "七百[ななひゃく]", "nanahyaku", l("düzenli", "regular")],
        [l("800", "800"), "八百[はっぴゃく]", "happyaku", l("**はっぴゃく**", "**happyaku**")],
        [l("900", "900"), "九百[きゅうひゃく]", "kyuuhyaku", l("düzenli", "regular")],
      ]
    ),
    table(
      l("Binler ve on binler", "Thousands and ten-thousands"),
      [l("Sayı", "Number"), l("Japonca", "Japanese"), l("Okunuş", "Reading"), l("Not", "Note")],
      [
        [l("1.000", "1,000"), "千[せん]", "sen", l("düzenli", "regular")],
        [l("2.000", "2,000"), "二千[にせん]", "nisen", l("düzenli", "regular")],
        [l("3.000", "3,000"), "三千[さんぜん]", "sanzen", l("**せん → ぜん**", "**sen → zen**")],
        [l("4.000", "4,000"), "四千[よんせん]", "yonsen", l("düzenli", "regular")],
        [l("5.000", "5,000"), "五千[ごせん]", "gosen", l("düzenli", "regular")],
        [l("6.000", "6,000"), "六千[ろくせん]", "rokusen", l("düzenli", "regular")],
        [l("8.000", "8,000"), "八千[はっせん]", "hassen", l("**はっせん**", "**hassen**")],
        [l("10.000", "10,000"), "一万[いちまん]", "ichiman", l("Burada 一[いち] söylenir.", "Here the 一[いち] is said.")],
        [l("15.000", "15,000"), "一万五千[いちまんごせん]", "ichiman gosen", l("1 万[まん] + 5 千[せん]", "1 man + 5 sen")],
        [l("100.000", "100,000"), "十万[じゅうまん]", "juuman", l("10 × 万[まん]", "10 × man")],
      ]
    ),
    tip(
      "Fiyatı büyükten küçüğe parça parça okursun ve sonuna **円[えん]** eklersin. Kasiyerin hızlı söylediği fiyatı yakalayamazsan kasadaki ekrana bak ya da **もう一度[いちど]お願[ねが]いします** de. Telefondaki hesap makinesini uzatmak da tamamen normal.",
      "You read a price piece by piece from largest to smallest and add **円[えん]** at the end. If you miss a price the cashier says quickly, look at the till display or say **もう一度[いちど]お願[ねが]いします**. Holding out your phone's calculator is completely normal too."
    ),
    table(
      l("Fiyat örnekleri", "Price examples"),
      [l("Fiyat", "Price"), l("Japonca", "Japanese"), l("Okunuş", "Reading")],
      [
        [l("150 yen", "150 yen"), "百五十円[ひゃくごじゅうえん]", "hyaku gojuu en"],
        [l("380 yen", "380 yen"), "三百八十円[さんびゃくはちじゅうえん]", "sanbyaku hachijuu en"],
        [l("680 yen", "680 yen"), "六百八十円[ろっぴゃくはちじゅうえん]", "roppyaku hachijuu en"],
        [l("850 yen", "850 yen"), "八百五十円[はっぴゃくごじゅうえん]", "happyaku gojuu en"],
        [l("1.280 yen", "1,280 yen"), "千二百八十円[せんにひゃくはちじゅうえん]", "sen nihyaku hachijuu en"],
        [l("3.500 yen", "3,500 yen"), "三千五百円[さんぜんごひゃくえん]", "sanzen gohyaku en"],
        [l("8.800 yen", "8,800 yen"), "八千八百円[はっせんはっぴゃくえん]", "hassen happyaku en"],
        [l("12.000 yen", "12,000 yen"), "一万二千円[いちまんにせんえん]", "ichiman nisen en"],
      ]
    ),
    text(
      "Japonca nesneleri sayarken sayının arkasına nesnenin şekline göre bir ek gelir. Seyahatte hepsini bilmen gerekmez: **〜つ** (ひとつ, ふたつ...) neredeyse her şey için işe yarayan genel sayma şeklidir, on'a kadar. Kişi sayısı için **〜人[にん]** şart; restoranda ilk soru bu olur.",
      "When counting things, Japanese adds a counter after the number based on the object's shape. You do not need them all on a trip: **〜つ** (ひとつ, ふたつ...) is the general form that works for almost anything up to ten. For people, **〜人[にん]** is a must; it is the first question at a restaurant."
    ),
    table(
      l("Sayma ekleri: 1'den 5'e", "Counters: 1 to 5"),
      [l("Ek", "Counter"), l("Ne için", "Used for"), l("1", "1"), l("2", "2"), l("3", "3"), l("4", "4"), l("5", "5")],
      [
        ["〜つ", l("genel (on'a kadar)", "general (up to ten)"), "一[ひと]つ", "二[ふた]つ", "三[みっ]つ", "四[よっ]つ", "五[いつ]つ"],
        ["〜人[にん]", l("kişi", "people"), "一人[ひとり]", "二人[ふたり]", "三人[さんにん]", "四人[よにん]", "五人[ごにん]"],
        ["〜枚[まい]", l("ince düz şeyler: bilet, kağıt", "flat things: tickets, paper"), "一枚[いちまい]", "二枚[にまい]", "三枚[さんまい]", "四枚[よんまい]", "五枚[ごまい]"],
        ["〜本[ほん]", l("uzun şeyler: şişe, şemsiye", "long things: bottles, umbrellas"), "一本[いっぽん]", "二本[にほん]", "三本[さんぼん]", "四本[よんほん]", "五本[ごほん]"],
        ["〜個[こ]", l("küçük nesneler: onigiri, meyve", "small items: onigiri, fruit"), "一個[いっこ]", "二個[にこ]", "三個[さんこ]", "四個[よんこ]", "五個[ごこ]"],
        ["〜杯[はい]", l("bardak, kase: bira, ramen", "cups, bowls: beer, ramen"), "一杯[いっぱい]", "二杯[にはい]", "三杯[さんばい]", "四杯[よんはい]", "五杯[ごはい]"],
      ]
    ),
    tip(
      "Restoranda görevli kişi sayısını **何名様[なんめいさま]ですか** diye sorar. 名様[めいさま] sadece görevlinin kibar dilidir; sen **二人[ふたり]です** (ya da 二名[にめい]です) diye cevap verirsin, kendin için 様[さま] kullanmazsın. Parmaklarınla göstermek de yeter.",
      "At a restaurant staff ask the party size with **何名様[なんめいさま]ですか**. 名様[めいさま] is staff's polite form only; you answer **二人[ふたり]です** (or 二名[にめい]です) and never use 様[さま] about yourself. Holding up fingers works too."
    ),
    phrases(l("Sayma ekleriyle sipariş ve alışveriş", "Ordering and shopping with counters"), [
      ph("これを一[ひと]つください。", "kore o hitotsu kudasai.", "Bundan bir tane lütfen.", "One of these, please.", {
        reply: ["お一[ひと]つですね。", "ohitotsu desu ne.", "Bir tane, değil mi?", "One, right?"],
      }),
      ph("おにぎりを二個[にこ]ください。", "onigiri o niko kudasai.", "İki onigiri lütfen.", "Two onigiri, please."),
      ph("水[みず]を二本[にほん]ください。", "mizu o nihon kudasai.", "İki şişe su lütfen.", "Two bottles of water, please."),
      ph("大人[おとな]二枚[にまい]お願[ねが]いします。", "otona nimai onegai shimasu.", "İki yetişkin bileti lütfen.", "Two adult tickets, please.", {
        note: l("Müze ve tapınak gişelerinde bilet sayısı 枚[まい] ile söylenir.", "At museum and temple ticket windows, tickets are counted with 枚[まい]."),
      }),
      ph("ビールをもう一杯[いっぱい]お願[ねが]いします。", "biiru o mou ippai onegai shimasu.", "Bir bira daha lütfen.", "One more beer, please."),
      ph("三人[さんにん]です。", "sannin desu.", "Üç kişiyiz.", "There are three of us.", {
        reply: ["三名様[さんめいさま]ですね。", "sanmeisama desu ne.", "Üç kişi, değil mi?", "Three people, then."],
      }),
      ph("全部[ぜんぶ]でいくらですか。", "zenbu de ikura desu ka.", "Hepsi ne kadar?", "How much for everything?"),
    ]),
    dialogue(l("Restoranda kişi sayısı ve sipariş", "Party size and ordering at a restaurant"), [
      S("いらっしゃいませ。何名様[なんめいさま]ですか。", "irasshaimase. nanmeisama desu ka.", "Hoş geldiniz. Kaç kişisiniz?", "Welcome. How many people?"),
      Y("二人[ふたり]です。", "futari desu.", "İki kişiyiz.", "Two."),
      S("二名様[にめいさま]ですね。こちらへどうぞ。", "nimeisama desu ne. kochira e douzo.", "İki kişi. Bu taraftan buyurun.", "Two, then. This way, please."),
      Y("ビールを二杯[にはい]と、ギョーザを一[ひと]つお願[ねが]いします。", "biiru o nihai to, gyouza o hitotsu onegai shimasu.", "İki bira ve bir porsiyon gyoza lütfen.", "Two beers and one gyoza, please."),
      S("ビール二[ふた]つ、ギョーザ一[ひと]つですね。", "biiru futatsu, gyouza hitotsu desu ne.", "İki bira, bir gyoza, değil mi?", "Two beers and one gyoza, right?"),
      Y("はい。それから、お水[みず]を二[ふた]つください。", "hai. sorekara, omizu o futatsu kudasai.", "Evet. Bir de iki su lütfen.", "Yes. And two waters, please."),
      S("かしこまりました。", "kashikomarimashita.", "Hemen getiriyorum.", "Certainly."),
    ]),
    heading("Saat", "Telling time"),
    text(
      "Saat **〜時[じ]**, dakika **〜分[ふん]** (bazen **ぷん**) ile söylenir. Yarım için **半[はん]** kullanılır: 三時半[さんじはん] 3:30. Öğleden önce **午前[ごぜん]**, öğleden sonra **午後[ごご]**; tren ve otel saatlerinde 24 saat düzeni de yaygındır (十八時[じゅうはちじ] = 18:00).",
      "Hours use **〜時[じ]**, minutes **〜分[ふん]** (sometimes **ぷん**). Half past uses **半[はん]**: 三時半[さんじはん] is 3:30. Morning is **午前[ごぜん]**, afternoon **午後[ごご]**; trains and hotels also use the 24-hour clock (十八時[じゅうはちじ] = 18:00)."
    ),
    table(
      l("Saatler ve düzensizler", "Hours and irregulars"),
      [l("Saat", "Time"), l("Japonca", "Japanese"), l("Okunuş", "Reading"), l("Not", "Note")],
      [
        [l("1:00", "1:00"), "一時[いちじ]", "ichiji", l("düzenli", "regular")],
        [l("4:00", "4:00"), "四時[よじ]", "yoji", l("**よんじ değil, よじ**", "**yoji, not yonji**")],
        [l("7:00", "7:00"), "七時[しちじ]", "shichiji", l("**ななじ değil, しちじ**", "**shichiji, not nanaji**")],
        [l("9:00", "9:00"), "九時[くじ]", "kuji", l("**きゅうじ değil, くじ**", "**kuji, not kyuuji**")],
        [l("12:00", "12:00"), "十二時[じゅうにじ]", "juuniji", l("düzenli", "regular")],
        [l("8:30", "8:30"), "八時半[はちじはん]", "hachiji han", l("半[はん] = yarım", "半[はん] = half past")],
        [l("10:15", "10:15"), "十時十五分[じゅうじじゅうごふん]", "juuji juugofun", l("düzenli", "regular")],
        [l("öğleden sonra 2", "2 pm"), "午後二時[ごごにじ]", "gogo niji", l("düzenli", "regular")],
        [l("sabah 6", "6 am"), "午前六時[ごぜんろくじ]", "gozen rokuji", l("düzenli", "regular")],
      ]
    ),
    table(
      l("Dakikalar (ふん / ぷん)", "Minutes (fun / pun)"),
      [l("Dakika", "Minutes"), l("Japonca", "Japanese"), l("Okunuş", "Reading")],
      [
        [l("1", "1"), "一[いっ]分[ぷん]", "ippun"],
        [l("2", "2"), "二[に]分[ふん]", "nifun"],
        [l("3", "3"), "三分[さんぷん]", "sanpun"],
        [l("4", "4"), "四分[よんぷん]", "yonpun"],
        [l("5", "5"), "五[ご]分[ふん]", "gofun"],
        [l("6", "6"), "六分[ろっぷん]", "roppun"],
        [l("8", "8"), "八分[はっぷん]", "happun"],
        [l("10", "10"), "十[じゅっ]分[ぷん]", "juppun"],
        [l("20", "20"), "二十分[にじゅっぷん]", "nijuppun"],
        [l("30", "30"), "三十分[さんじゅっぷん]", "sanjuppun"],
        [l("45", "45"), "四十五分[よんじゅうごふん]", "yonjuugofun"],
      ]
    ),
    heading("Günler ve Kasım tarihleri", "Weekdays and November dates"),
    table(
      l("Haftanın günleri", "Days of the week"),
      [l("Gün", "Day"), l("Japonca", "Japanese"), l("Okunuş", "Reading")],
      [
        [l("Pazartesi", "Monday"), "月曜日[げつようび]", "getsuyoubi"],
        [l("Salı", "Tuesday"), "火曜日[かようび]", "kayoubi"],
        [l("Çarşamba", "Wednesday"), "水曜日[すいようび]", "suiyoubi"],
        [l("Perşembe", "Thursday"), "木曜日[もくようび]", "mokuyoubi"],
        [l("Cuma", "Friday"), "金曜日[きんようび]", "kin'youbi"],
        [l("Cumartesi", "Saturday"), "土曜日[どようび]", "doyoubi"],
        [l("Pazar", "Sunday"), "日曜日[にちようび]", "nichiyoubi"],
        [l("hafta sonu", "weekend"), "週末[しゅうまつ]", "shuumatsu"],
        [l("tatil günü", "public holiday"), "祝日[しゅくじつ]", "shukujitsu"],
      ]
    ),
    text(
      "Ay adları sayıyla kurulur: Kasım **十一月[じゅういちがつ]** (11. ay). Ayın günleri ise 1-10, 14, 20 ve 24'te düzensizdir; aşağıdaki tablo Kasım 2026'yı haftanın günüyle birlikte veriyor. Seyahatin **7 Kasım Cumartesi** başlıyor, **29 Kasım Pazar** bitiyor.",
      "Month names are built from numbers: November is **十一月[じゅういちがつ]** (month 11). Days of the month are irregular for 1-10, 14, 20 and 24; the table below gives November 2026 with the weekday. Your trip starts **Saturday 7 November** and ends **Sunday 29 November**."
    ),
    table(
      l("Kasım 2026: düzensiz ve önemli günler", "November 2026: irregular and key dates"),
      [l("Tarih", "Date"), l("Japonca", "Japanese"), l("Okunuş", "Reading"), l("Not", "Note")],
      [
        [l("1 Kasım (Pz)", "1 Nov (Sun)"), "一日[ついたち]", "tsuitachi", l("**düzensiz**", "**irregular**")],
        [l("2 Kasım (Pzt)", "2 Nov (Mon)"), "二日[ふつか]", "futsuka", l("**düzensiz**", "**irregular**")],
        [l("3 Kasım (Sa)", "3 Nov (Tue)"), "三日[みっか]", "mikka", l("**düzensiz**; 文化[ぶんか]の日[ひ], resmi tatil", "**irregular**; Culture Day, public holiday")],
        [l("4 Kasım (Ça)", "4 Nov (Wed)"), "四日[よっか]", "yokka", l("**düzensiz**", "**irregular**")],
        [l("5 Kasım (Pe)", "5 Nov (Thu)"), "五日[いつか]", "itsuka", l("**düzensiz**", "**irregular**")],
        [l("6 Kasım (Cu)", "6 Nov (Fri)"), "六日[むいか]", "muika", l("**düzensiz**", "**irregular**")],
        [l("7 Kasım (Ct)", "7 Nov (Sat)"), "七日[なのか]", "nanoka", l("**düzensiz**; varış günü", "**irregular**; arrival day")],
        [l("8 Kasım (Pz)", "8 Nov (Sun)"), "八日[ようか]", "youka", l("**düzensiz**", "**irregular**")],
        [l("9 Kasım (Pzt)", "9 Nov (Mon)"), "九日[ここのか]", "kokonoka", l("**düzensiz**", "**irregular**")],
        [l("10 Kasım (Sa)", "10 Nov (Tue)"), "十日[とおか]", "tooka", l("**düzensiz**", "**irregular**")],
        [l("11 Kasım (Ça)", "11 Nov (Wed)"), "十一日[じゅういちにち]", "juuichinichi", l("Buradan sonrası çoğunlukla düzenli: sayı + にち (14, 20, 24 hariç).", "Mostly regular from here: number + nichi (except 14, 20, 24).")],
        [l("14 Kasım (Ct)", "14 Nov (Sat)"), "十四日[じゅうよっか]", "juuyokka", l("**düzensiz**", "**irregular**")],
        [l("20 Kasım (Cu)", "20 Nov (Fri)"), "二十日[はつか]", "hatsuka", l("**düzensiz**", "**irregular**")],
        [l("23 Kasım (Pzt)", "23 Nov (Mon)"), "二十三日[にじゅうさんにち]", "nijuusannichi", l("勤労感謝[きんろうかんしゃ]の日[ひ], resmi tatil", "Labour Thanksgiving Day, public holiday")],
        [l("24 Kasım (Sa)", "24 Nov (Tue)"), "二十四日[にじゅうよっか]", "nijuuyokka", l("**düzensiz**", "**irregular**")],
      ]
    ),
    tip(
      "21-23 Kasım Cumartesi-Pazartesi üç günlük tatil; üstelik Kyoto'da sonbahar yapraklarının en güzel zamanına denk geliyor. Bu günlerde Shinkansen ve otelleri önceden ayırt, tapınaklara sabah erken git.",
      "Saturday 21 to Monday 23 November is a three-day weekend, and it falls in the peak of Kyoto's autumn leaves. Book Shinkansen seats and hotels ahead for those days and visit temples early in the morning."
    ),
    phrases(l("Saat, süre ve sayı soruları", "Questions about time, duration and amount"), [
      ph("今[いま]、何時[なんじ]ですか。", "ima, nanji desu ka.", "Saat kaç?", "What time is it now?", {
        reply: ["三時半[さんじはん]です。", "sanji han desu.", "Üç buçuk.", "It's half past three."],
      }),
      ph("何時[なんじ]に開[あ]きますか。", "nanji ni akimasu ka.", "Saat kaçta açılıyor?", "What time does it open?", {
        reply: ["十時[じゅうじ]からです。", "juuji kara desu.", "Saat ondan itibaren.", "From ten o'clock."],
      }),
      ph("何時[なんじ]までですか。", "nanji made desu ka.", "Saat kaça kadar açık?", "Until what time?", {
        reply: ["午後五時[ごごごじ]までです。", "gogo goji made desu.", "Öğleden sonra beşe kadar.", "Until 5 pm."],
      }),
      ph("何分[なんぷん]かかりますか。", "nanpun kakarimasu ka.", "Kaç dakika sürer?", "How many minutes does it take?", {
        reply: ["歩[ある]いて十[じゅっ]分[ぷん]ぐらいです。", "aruite juppun gurai desu.", "Yürüyerek on dakika kadar.", "About ten minutes on foot."],
      }),
      ph("何時間[なんじかん]かかりますか。", "nanjikan kakarimasu ka.", "Kaç saat sürer?", "How many hours does it take?", {
        reply: ["二時間[にじかん]ちょっとです。", "nijikan chotto desu.", "İki saatten biraz fazla.", "A little over two hours."],
      }),
      ph("いくらですか。", "ikura desu ka.", "Ne kadar?", "How much is it?", {
        reply: ["千五百円[せんごひゃくえん]です。", "sen gohyaku en desu.", "Bin beş yüz yen.", "1,500 yen."],
      }),
      ph("いくつですか。", "ikutsu desu ka.", "Kaç tane?", "How many?"),
      ph("何日[なんにち]ですか。", "nannichi desu ka.", "Ayın kaçı?", "What date is it?", {
        reply: ["十一月[じゅういちがつ]八日[ようか]です。", "juuichigatsu youka desu.", "8 Kasım.", "November 8th."],
      }),
      ph("何曜日[なんようび]ですか。", "nan'youbi desu ka.", "Hangi gün?", "What day of the week?"),
      ph("もう一度[いちど]お願[ねが]いします。", "mou ichido onegai shimasu.", "Bir daha söyler misiniz?", "Once more, please."),
      ph("書[か]いてもらえますか。", "kaite moraemasu ka.", "Yazabilir misiniz?", "Could you write it down?"),
    ]),
    dialogue(l("Otelde saat sormak", "Asking about times at a hotel"), [
      Y("すみません、朝[あさ]ごはんは何時[なんじ]からですか。", "sumimasen, asagohan wa nanji kara desu ka.", "Affedersiniz, kahvaltı saat kaçta başlıyor?", "Excuse me, what time does breakfast start?"),
      S("七時[しちじ]から十時[じゅうじ]までです。", "shichiji kara juuji made desu.", "Yediden ona kadar.", "From seven to ten."),
      Y("チェックアウトは何時[なんじ]ですか。", "chekkuauto wa nanji desu ka.", "Çıkış saat kaçta?", "What time is check-out?"),
      S("十一時[じゅういちじ]でございます。", "juuichiji de gozaimasu.", "Saat on bir.", "It is eleven o'clock."),
      Y("駅[えき]まで歩[ある]いて何分[なんぷん]ぐらいですか。", "eki made aruite nanpun gurai desu ka.", "İstasyona yürüyerek kaç dakika?", "About how many minutes on foot to the station?"),
      S("八分[はっぷん]ぐらいです。", "happun gurai desu.", "Yaklaşık sekiz dakika.", "About eight minutes."),
      Y("わかりました。ありがとうございます。", "wakarimashita. arigatou gozaimasu.", "Anladım. Teşekkürler.", "Got it. Thank you."),
    ]),
    signs(l("Saat ve tarih tabelaları", "Time and date signs"), [
      sign("shop", "営業時間 11:00～22:00", "çalışma saatleri 11:00-22:00", "opening hours 11:00-22:00", "Open 11:00-22:00"),
      sign("shop", "定休日 水曜日", "kapalı gün: Çarşamba", "closed on Wednesdays", "Closed Wednesdays"),
      sign("shop", "本日休業", "bugün kapalı", "closed today", "Closed Today"),
      sign("shop", "ラストオーダー 21:30", "son sipariş 21:30", "last order 21:30", "L.O. 21:30"),
      sign("info", "受付 9:00～16:30", "kabul (giriş) 9:00-16:30", "admission 9:00-16:30", "Admission"),
    ]),
  ],
};

// ---------------------------------------------------------------------------
// 5. Taxis and buses
// ---------------------------------------------------------------------------

const TAXI_BUS: Guide = {
  key: "taxi-bus",
  icon: "🚕",
  title: l("Taksi ve otobüs", "Taxis and buses"),
  summary: l(
    "Otomatik taksi kapıları, adres göstermek, taksi cümleleri; şehir otobüslerinde binme ve inme kuralları, numaralı bilet, ücret ekranı, bozuk para makinesi ve Kyoto otobüsleri.",
    "Automatic taxi doors, showing the address, taxi phrases; boarding and leaving city buses, number tickets, fare display, change machine and Kyoto buses."
  ),
  blocks: [
    text(
      "Japonya'da taksiler temiz, güvenli ve dürüsttür; taksimetre her zaman çalışır ve pazarlık yoktur. Pahalı oldukları için genelde kısa mesafe, gece geç saat ya da bavullu transfer için mantıklıdır. Otobüsler ise özellikle Kyoto'da tapınaklara ulaşmanın ana yoludur ama binme ve ödeme kuralları şehirden şehre değişir.",
      "Taxis in Japan are clean, safe and honest; the meter always runs and there is no haggling. They are expensive, so they make sense for short hops, late nights or transfers with luggage. Buses, especially in Kyoto, are the main way to reach temples, but boarding and payment rules differ from city to city."
    ),
    heading("Taksi", "Taxis"),
    steps(l("Taksiye binmek", "Taking a taxi"), [
      step(
        l("Boş taksiyi tanı", "Spot a free taxi"),
        l(
          "Ön camdaki ışıklı tabelada **空車[くうしゃ]** yazıyorsa taksi boştur. **賃走[ちんそう]** müşteri var, **迎車[げいしゃ]** birini almaya gidiyor demek. İstasyonlarda **タクシー乗[の]り場[ば]** (taksi durağı) sırasına gir.",
          "If the lit sign in the windscreen says **空車[くうしゃ]**, the taxi is free. **賃走[ちんそう]** means occupied, **迎車[げいしゃ]** means on the way to a pickup. At stations, queue at the **タクシー乗[の]り場[ば]** (taxi stand)."
        )
      ),
      step(
        l("Kapıya dokunma", "Do not touch the door"),
        l(
          "Arka sol kapıyı şoför içeriden otomatik açar ve kapatır. Kendin açıp kapatmaya çalışma; inerken de kapıyı bırak.",
          "The driver opens and closes the rear left door automatically from inside. Do not try to open or shut it yourself; leave it when you get out too."
        )
      ),
      step(
        l("Adresi göster", "Show the address"),
        l(
          "Şoförler İngilizce adresle zorlanabilir. Otelin Japonca adını ya da haritadaki konumu telefonda göster ve **ここまでお願[ねが]いします** de.",
          "Drivers may struggle with English addresses. Show the hotel's Japanese name or the map pin on your phone and say **ここまでお願[ねが]いします**."
        ),
        "ここまでお願[ねが]いします。",
        "koko made onegai shimasu."
      ),
      step(
        l("Kemerini tak", "Fasten your seatbelt"),
        l(
          "Arka koltukta da emniyet kemeri zorunludur.",
          "Seatbelts are required in the back seat too."
        )
      ),
      step(
        l("Öde ve in", "Pay and get out"),
        l(
          "Ücret taksimetrede görünür. Çoğu taksi kart ve IC kart alır ama binerken sormak en garantisi. Bahşiş yok.",
          "The fare shows on the meter. Most taxis take cards and IC cards, but asking when you get in is safest. No tipping."
        )
      ),
    ]),
    signs(l("Taksi ve otobüs tabelaları", "Taxi and bus signs"), [
      sign("ticket", "空車", "boş taksi", "taxi available", "Vacant"),
      sign("ticket", "賃走", "müşteri var", "occupied", "Occupied"),
      sign("info", "タクシー乗り場", "taksi durağı", "taxi stand", "Taxi", "right"),
      sign("info", "バスのりば", "otobüs durağı", "bus stop", "Bus Stop", "left"),
      sign("info", "入口", "giriş kapısı (buradan bin)", "entrance (board here)", "Entrance"),
      sign("info", "出口", "çıkış kapısı (buradan in)", "exit door (get off here)", "Exit"),
      sign("ticket", "整理券", "numaralı bilet", "numbered boarding ticket", "Numbered Ticket"),
      sign("warning", "バスが止まってから席をお立ちください", "otobüs durmadan ayağa kalkmayın", "please stay seated until the bus stops"),
    ]),
    dialogue(l("Taksiyle otele", "By taxi to the hotel"), [
      S("どちらまでですか。", "dochira made desu ka.", "Nereye gidiyoruz?", "Where to?"),
      Y("このホテルまでお願[ねが]いします。", "kono hoteru made onegai shimasu.", "Bu otele lütfen.", "To this hotel, please."),
      S("はい、かしこまりました。〇〇ホテルですね。", "hai, kashikomarimashita. 〇〇 hoteru desu ne.", "Tamam efendim. 〇〇 Oteli, değil mi?", "Certainly. The 〇〇 Hotel, right?"),
      Y("はい。カードで払[はら]えますか。", "hai. kaado de haraemasu ka.", "Evet. Kartla ödeyebilir miyim?", "Yes. Can I pay by card?"),
      S("はい、使[つか]えますよ。", "hai, tsukaemasu yo.", "Evet, geçiyor.", "Yes, you can."),
      Y("どのぐらいかかりますか。", "dono gurai kakarimasu ka.", "Ne kadar sürer?", "How long will it take?"),
      S("道[みち]が空[す]いていれば、十五分[じゅうごふん]ぐらいです。", "michi ga suite ireba, juugofun gurai desu.", "Yol açıksa on beş dakika kadar.", "About fifteen minutes if the roads are clear."),
      S("お客様[きゃくさま]、着[つ]きました。", "okyakusama, tsukimashita.", "Geldik efendim.", "We've arrived, sir/madam."),
      Y("領収書[りょうしゅうしょ]をください。", "ryoushuusho o kudasai.", "Makbuz alabilir miyim?", "May I have a receipt?"),
      S("はい、どうぞ。お忘[わす]れ物[もの]のないように。", "hai, douzo. owasuremono no nai you ni.", "Buyurun. Bir şey unutmayın.", "Here you are. Don't forget anything."),
    ]),
    phrases(l("Taksi cümleleri", "Taxi phrases"), [
      ph("〇〇までお願[ねが]いします。", "〇〇 made onegai shimasu.", "〇〇'ya lütfen.", "To 〇〇, please."),
      ph("この住所[じゅうしょ]までお願[ねが]いします。", "kono juusho made onegai shimasu.", "Bu adrese lütfen.", "To this address, please.", {
        note: l("Adresi telefonda göstererek söyle.", "Say it while showing the address on your phone."),
      }),
      ph("ここで止[と]めてください。", "koko de tomete kudasai.", "Burada durun lütfen.", "Please stop here."),
      ph("ここでいいです。", "koko de ii desu.", "Burası yeterli, burada inerim.", "Here is fine."),
      ph("あの信号[しんごう]の先[さき]で止[と]めてください。", "ano shingou no saki de tomete kudasai.", "Şu trafik ışığını geçince durun.", "Please stop just past that traffic light."),
      ph("カードで払[はら]えますか。", "kaado de haraemasu ka.", "Kartla ödeyebilir miyim?", "Can I pay by card?", {
        reply: ["はい、どうぞ。こちらにタッチしてください。", "hai, douzo. kochira ni tacchi shite kudasai.", "Evet, buyurun. Buraya dokundurun.", "Yes, go ahead. Tap here."],
      }),
      ph("領収書[りょうしゅうしょ]ください。", "ryoushuusho kudasai.", "Makbuz lütfen.", "Receipt, please."),
      ph("トランクを開[あ]けてもらえますか。", "toranku o akete moraemasu ka.", "Bagajı açabilir misiniz?", "Could you open the trunk?"),
      ph("急[いそ]いでいます。", "isoide imasu.", "Acelem var.", "I'm in a hurry."),
      ph("どちらまでですか。", "dochira made desu ka.", "Nereye gidiyorsunuz?", "Where would you like to go?", { hear: true }),
      ph("この辺[へん]でよろしいですか。", "kono hen de yoroshii desu ka.", "Buralar uygun mu?", "Is around here all right?", {
        hear: true,
        reply: ["はい、ここでいいです。", "hai, koko de ii desu.", "Evet, burası iyi.", "Yes, here is fine."],
      }),
    ]),
    tip(
      "Taksi uygulamaları (ör. GO, Uber) büyük şehirlerde çalışır; adresi uygulamaya yazdığın için şoförle konuşma ihtiyacı azalır. Yoğun saatlerde ve yağmurlu akşamlarda istasyon önündeki taksi sırası uzun olabilir.",
      "Taxi apps (e.g. GO, Uber) work in the big cities; you type the address into the app, so you need to talk less with the driver. At rush hour and on rainy evenings, taxi queues at stations can be long."
    ),
    heading("Şehir otobüsleri", "City buses"),
    text(
      "Otobüslerde iki temel sistem vardır. **Sabit ücretli** otobüslerde (Tokyo'nun çoğu şehir otobüsü) genelde **前乗[まえの]り** yaparsın: öndeki kapıdan biner, binerken ödersin, arkadan inersin. **Mesafeye göre ücretli** otobüslerde ise çoğu zaman **後[うし]ろ乗[の]り** vardır: arka ya da orta kapıdan biner, numaralı bileti (**整理券[せいりけん]**) alırsın ya da IC kartını okutursun, inerken önde ödersin. Kapının yanındaki **入口[いりぐち]** ve **出口[でぐち]** yazılarına bak; kural hatta göre değişebilir.",
      "Buses use two basic systems. On **flat-fare** buses (most Tokyo city buses) you usually board at the **前乗[まえの]り** front door, pay as you get on and leave by the rear door. On **distance-based** buses you often board at the **後[うし]ろ乗[の]り** rear or middle door, take a numbered ticket (**整理券[せいりけん]**) or tap your IC card, and pay at the front when you get off. Look for **入口[いりぐち]** (entrance) and **出口[でぐち]** (exit) by the doors; rules can vary by route."
    ),
    steps(l("Mesafeye göre ücretli otobüs", "A distance-based bus"), [
      step(
        l("Arka kapıdan bin", "Board at the rear"),
        l(
          "**入口[いりぐち]** yazan kapıdan bin. IC kartın varsa kapıdaki okuyucuya dokundur; yoksa makineden **整理券[せいりけん]** al.",
          "Board through the door marked **入口[いりぐち]**. Tap your IC card on the reader by the door; if you do not have one, take a **整理券[せいりけん]** from the machine."
        ),
        "整理券[せいりけん]を取[と]る",
        "seiriken o toru"
      ),
      step(
        l("Ücret ekranını izle", "Watch the fare display"),
        l(
          "Ön taraftaki ekranda numaralar ve yanlarında ücretler yazar. Bilet numaranın yanındaki ücret, o an inersen ödeyeceğin tutardır; her durakta artabilir.",
          "The display at the front shows numbers with fares next to them. The fare next to your ticket number is what you pay if you get off now; it may rise at each stop."
        )
      ),
      step(
        l("Durak düğmesine bas", "Press the stop button"),
        l(
          "İneceğin durak anons edilince duvardaki düğmeye bas. Otobüs **次[つぎ]、止[と]まります** diye anons eder ve düğmeler yanar.",
          "When your stop is announced, press a button on the wall. The bus announces **次[つぎ]、止[と]まります** and the buttons light up."
        ),
        "次[つぎ]、止[と]まります。",
        "tsugi, tomarimasu."
      ),
      step(
        l("Durunca kalk ve ödemeyi yap", "Stand when it stops, then pay"),
        l(
          "Otobüs tamamen durmadan ayağa kalkma. Öndeki ücret kutusuna önce numaralı bileti, sonra tam parayı at ya da IC kartını okut. Kutu para üstü vermez.",
          "Do not stand until the bus has fully stopped. Drop the numbered ticket and then the exact fare into the fare box at the front, or tap your IC card. The box gives no change."
        )
      ),
      step(
        l("Bozuk paran yoksa", "If you have no coins"),
        l(
          "Ücret kutusunun yanında **両替機[りょうがえき]** (bozuk para makinesi) vardır: genellikle 1.000 yenlik banknotu ve büyük bozuk paraları bozar. Bunu otobüs durmuşken yap; büyük banknotları genelde almaz.",
          "Next to the fare box there is a **両替機[りょうがえき]** (change machine): it usually breaks 1,000-yen notes and larger coins. Do it while the bus is stopped; it usually does not take large notes."
        ),
        "両替機[りょうがえき]",
        "ryougaeki"
      ),
    ]),
    table(
      l("Otobüs kelimeleri", "Bus vocabulary"),
      [l("Japonca", "Japanese"), l("Okunuş", "Reading"), l("Anlamı", "Meaning")],
      [
        ["バス停[てい]", "basutei", l("otobüs durağı", "bus stop")],
        ["乗[の]り場[ば]", "noriba", l("biniş yeri (peron)", "boarding point")],
        ["系統[けいとう]", "keitou", l("hat numarası", "route number")],
        ["〇〇行[ゆ]き", "〇〇 yuki", l("〇〇'ya giden", "bound for 〇〇")],
        ["前乗[まえの]り", "maenori", l("önden binilir", "board at the front")],
        ["後[うし]ろ乗[の]り", "ushironori", l("arkadan binilir", "board at the rear")],
        ["整理券[せいりけん]", "seiriken", l("numaralı biniş bileti", "numbered boarding ticket")],
        ["運賃表[うんちんひょう]", "unchinhyou", l("ücret ekranı", "fare display")],
        ["運賃箱[うんちんばこ]", "unchinbako", l("ücret kutusu", "fare box")],
        ["両替機[りょうがえき]", "ryougaeki", l("bozuk para makinesi", "change machine")],
        ["降車[こうしゃ]ボタン", "kousha botan", l("durak düğmesi", "stop button")],
        ["均一運賃[きんいつうんちん]", "kin'itsu unchin", l("sabit ücret", "flat fare")],
        ["時刻表[じこくひょう]", "jikokuhyou", l("sefer saatleri", "timetable")],
      ]
    ),
    phrases(l("Otobüste duyacakların", "What you will hear on the bus"), [
      ph("次[つぎ]は、清水道[きよみずみち]です。", "tsugi wa, Kiyomizu-michi desu.", "Sonraki durak Kiyomizu-michi.", "The next stop is Kiyomizu-michi.", { hear: true }),
      ph("次[つぎ]、止[と]まります。", "tsugi, tomarimasu.", "Sonraki durakta duracak.", "Stopping at the next stop.", { hear: true }),
      ph("バスが止[と]まってから、席[せき]をお立[た]ちください。", "basu ga tomatte kara, seki o otachi kudasai.", "Lütfen otobüs durduktan sonra ayağa kalkın.", "Please stay seated until the bus stops.", { hear: true }),
      ph("発車[はっしゃ]します。ご注意[ちゅうい]ください。", "hassha shimasu. go-chuui kudasai.", "Otobüs kalkıyor. Dikkat edin.", "The bus is departing. Please be careful.", { hear: true }),
      ph("整理券[せいりけん]をお取[と]りください。", "seiriken o otori kudasai.", "Lütfen numaralı bilet alın.", "Please take a numbered ticket.", { hear: true }),
      ph("降[お]りる方[かた]はボタンでお知[し]らせください。", "oriru kata wa botan de oshirase kudasai.", "İnecek yolcular düğmeye bassın.", "If you're getting off, please press the button.", { hear: true }),
      ph("両替[りょうがえ]は停車中[ていしゃちゅう]にお願[ねが]いします。", "ryougae wa teishachuu ni onegai shimasu.", "Para bozdurmayı otobüs dururken yapın.", "Please change money while the bus is stopped.", { hear: true }),
    ]),
    dialogue(l("Kyoto'da otobüs şoförüne sormak", "Asking a bus driver in Kyoto"), [
      Y("すみません、このバスは銀閣寺[ぎんかくじ]に行[い]きますか。", "sumimasen, kono basu wa Ginkakuji ni ikimasu ka.", "Affedersiniz, bu otobüs Ginkakuji'ye gidiyor mu?", "Excuse me, does this bus go to Ginkakuji?"),
      S("いいえ、反対[はんたい]側[がわ]のバス停[てい]から乗[の]ってください。", "iie, hantaigawa no basutei kara notte kudasai.", "Hayır, karşı taraftaki duraktan binin.", "No, please take it from the stop on the other side."),
      Y("何番[なんばん]のバスですか。", "nanban no basu desu ka.", "Kaç numaralı otobüs?", "Which number bus?"),
      S("バス停[てい]の表示[ひょうじ]で、銀閣寺[ぎんかくじ]行[ゆ]きの番号[ばんごう]を確認[かくにん]してください。", "basutei no hyouji de, Ginkakuji yuki no bangou o kakunin shite kudasai.", "Duraktaki ekranda Ginkakuji'ye giden hat numarasına bakın.", "Please check the route number for Ginkakuji on the stop's display."),
      Y("ICカードは使[つか]えますか。", "aishii kaado wa tsukaemasu ka.", "IC kart geçiyor mu?", "Can I use an IC card?"),
      S("はい、使[つか]えます。降[お]りる時[とき]にタッチしてください。", "hai, tsukaemasu. oriru toki ni tacchi shite kudasai.", "Evet, geçiyor. İnerken dokundurun.", "Yes. Tap it when you get off."),
      Y("わかりました。ありがとうございます。", "wakarimashita. arigatou gozaimasu.", "Anladım. Teşekkürler.", "Got it. Thank you."),
    ]),
    dialogue(l("İnerken bozuk para sorunu", "No change when getting off"), [
      Y("すみません、千円札[せんえんさつ]しかありません。", "sumimasen, sen en satsu shika arimasen.", "Affedersiniz, sadece bin yenlik banknotum var.", "Excuse me, I only have a 1,000-yen note."),
      S("こちらの両替機[りょうがえき]で両替[りょうがえ]してください。", "kochira no ryougaeki de ryougae shite kudasai.", "Şuradaki bozuk para makinesinde bozdurun.", "Please change it in this machine here."),
      Y("ここに入[い]れればいいですか。", "koko ni irereba ii desu ka.", "Buraya mı koyayım?", "Do I put it in here?"),
      S("はい。それから、整理券[せいりけん]と運賃[うんちん]を一緒[いっしょ]に入[い]れてください。", "hai. sorekara, seiriken to unchin o issho ni irete kudasai.", "Evet. Sonra numaralı bileti ve ücreti birlikte atın.", "Yes. Then put the numbered ticket and the fare in together."),
      Y("はい。ありがとうございました。", "hai. arigatou gozaimashita.", "Tamam. Teşekkür ederim.", "OK. Thank you very much."),
      S("ありがとうございました。足元[あしもと]にお気[き]をつけて。", "arigatou gozaimashita. ashimoto ni oki o tsukete.", "Teşekkürler. Adımınıza dikkat edin.", "Thank you. Watch your step."),
    ]),
    phrases(l("Otobüste soracakların", "Things to ask on the bus"), [
      ph("このバスは〇〇に行[い]きますか。", "kono basu wa 〇〇 ni ikimasu ka.", "Bu otobüs 〇〇'ya gidiyor mu?", "Does this bus go to 〇〇?", {
        reply: ["はい、行[い]きますよ。", "hai, ikimasu yo.", "Evet, gidiyor.", "Yes, it does."],
      }),
      ph("〇〇はいくつ目[め]ですか。", "〇〇 wa ikutsume desu ka.", "〇〇 kaçıncı durak?", "How many stops to 〇〇?", {
        reply: ["四[よっ]つ目[め]です。", "yottsume desu.", "Dördüncü durak.", "The fourth stop."],
      }),
      ph("〇〇に着[つ]いたら教[おし]えてください。", "〇〇 ni tsuitara oshiete kudasai.", "〇〇'ya varınca bana söyler misiniz?", "Please tell me when we reach 〇〇."),
      ph("運賃[うんちん]はいくらですか。", "unchin wa ikura desu ka.", "Ücret ne kadar?", "How much is the fare?"),
      ph("前[まえ]から乗[の]りますか。", "mae kara norimasu ka.", "Önden mi biniliyor?", "Do I board at the front?", {
        reply: ["いいえ、後[うし]ろからです。", "iie, ushiro kara desu.", "Hayır, arkadan.", "No, from the back."],
      }),
      ph("降[お]ります!", "orimasu!", "İneceğim!", "I'm getting off!", {
        note: l("Kalabalık otobüste kapıya doğru ilerlerken ya da şoför kapıyı kapatmak üzereyken söyle.", "Say it when squeezing towards the door in a crowded bus or when the driver is about to close the door."),
      }),
      ph("すみません、通[とお]ります。", "sumimasen, toorimasu.", "Pardon, geçiyorum.", "Excuse me, coming through."),
    ]),
    heading("Kyoto otobüsleri için ipuçları", "Kyoto bus tips"),
    text(
      "Kyoto'da şehir otobüsleri tapınaklara ulaşmanın en yaygın yolu ama Kasım'da sonbahar yaprakları yüzünden çok kalabalık olur; dolu otobüsler durağı geçebilir. Uzun mesafede metro ya da trenle yaklaşıp son kısmı yürümek ya da kısa bir otobüse binmek çoğu zaman daha hızlıdır. Durak ekranları ve tabelalar İngilizce de gösterir; hat numarasını ve yönü (〇〇行[ゆ]き) kontrol et.",
      "In Kyoto, city buses are the most common way to reach temples, but in November the autumn leaves make them very crowded; full buses may skip stops. For longer distances it is often faster to get close by subway or train and then walk or take a short bus. Stop displays and signs also show English; check the route number and direction (〇〇行[ゆ]き)."
    ),
    tip(
      "Kyoto'da hangi kapıdan binileceği ve ödemenin ne zaman yapılacağı hatta ve otobüse göre değişebiliyor; son yıllarda bazı hatlarda düzen değişti. Binmeden önce kapının üstündeki **入口[いりぐち]** yazısına ve önündekilerin ne yaptığına bak. Bavulla binmekten kaçın: otobüsler dar, büyük bavul için Kyoto'da bagaj gönderme hizmetleri (**手[て]ぶら観光[かんこう]**) var.",
      "In Kyoto, which door you board by and when you pay can differ by route and bus; on some routes the pattern has changed in recent years. Before boarding, look for **入口[いりぐち]** above the door and watch what people ahead of you do. Avoid boarding with a suitcase: buses are narrow, and Kyoto has luggage-forwarding services (**手[て]ぶら観光[かんこう]**) for big bags."
    ),
    tip(
      "IC kart otobüste de en kolay yol: mesafeye göre ücretli otobüste hem binerken hem inerken, sabit ücretli otobüste sadece bir kez okutursun. Bakiye yetmezse bazı otobüslerde şoförden yükleme yapılabilir ama bu sırayı yavaşlatır; binmeden önce bakiyeni kontrol et.",
      "An IC card is the easiest option on buses too: on distance-based buses you tap when getting on and off, on flat-fare buses just once. If your balance is short, some buses let you top up with the driver, but it slows the line; check your balance before boarding."
    ),
  ],
};

export const GUIDES_A_JA: Guide[] = [TRAIN, ARRIVAL, MONEY, NUMBERS, TAXI_BUS];

