// T-100: "the kanji you will see over and over on the trip". Authored,
// static, zero LLM; one kanji belongs to exactly one group. Compounds are
// real words as printed on signs, menus and tickets.

import type { KanjiCompound, KanjiGroup, SignKanji, SignMock } from "./types";

const c = (
  word: string,
  reading: string,
  romaji: string,
  tr: string,
  en: string,
): KanjiCompound => ({ word, reading, romaji, meaning: { tr, en } });

const k = (
  kanji: string,
  meaning: [string, string],
  whereSeen: [string, string],
  compounds: KanjiCompound[],
): SignKanji => ({
  kanji,
  meaning: { tr: meaning[0], en: meaning[1] },
  whereSeen: { tr: whereSeen[0], en: whereSeen[1] },
  compounds,
});

const s = (
  style: SignMock["style"],
  jp: string,
  tr: string,
  en: string,
  sub?: string,
  arrow?: SignMock["arrow"],
): SignMock => ({
  style,
  jp,
  meaning: { tr, en },
  ...(sub ? { sub } : {}),
  ...(arrow ? { arrow } : {}),
});

export const KANJI_GROUPS_JA: KanjiGroup[] = [
  {
    key: "station",
    icon: "🚉",
    title: { tr: "İstasyon", en: "Station" },
    intro: {
      tr: "Japonya'da günün büyük kısmı istasyonlarda geçer. Bu kanjiler peron numaralarını, bilet kapılarını ve trenin nereye gittiğini gösterir. Panolarda en çok bunları okuyacaksın.",
      en: "A big part of every day in Japan happens in stations. These kanji mark platform numbers, ticket gates and where a train is going. They are what you will read most on departure boards.",
    },
    kanji: [
      k(
        "駅",
        ["istasyon", "station"],
        [
          "Her istasyonun adının sonunda ve şehir haritalarında görürsün.",
          "At the end of every station name and all over city maps.",
        ],
        [
          c("駅員", "えきいん", "ekiin", "istasyon görevlisi", "station staff"),
          c("駅前", "えきまえ", "ekimae", "istasyon önü", "in front of the station"),
          c("駅弁", "えきべん", "ekiben", "istasyonda satılan bento", "station bento box"),
          c("東京駅", "とうきょうえき", "toukyoueki", "Tokyo İstasyonu", "Tokyo Station"),
        ],
      ),
      k(
        "線",
        ["hat", "line"],
        [
          "Tren hatlarının adlarında ve peron tabelalarında görürsün.",
          "In train line names and on platform signs.",
        ],
        [
          c("新幹線", "しんかんせん", "shinkansen", "hızlı tren", "bullet train"),
          c("山手線", "やまのてせん", "yamanotesen", "Yamanote Hattı (Tokyo)", "Yamanote Line (Tokyo)"),
          c("番線", "ばんせん", "bansen", "peron numarası", "platform number"),
          c("路線図", "ろせんず", "rosenzu", "hat haritası", "route map"),
        ],
      ),
      k(
        "番",
        ["numara, sıra", "number, turn"],
        [
          "Peron tabelalarında: 3番線 gibi.",
          "On platform signs, as in 3番線.",
        ],
        [
          c("一番線", "いちばんせん", "ichibansen", "1 numaralı peron", "platform 1"),
          c("番号", "ばんごう", "bangou", "numara", "number"),
          c("交番", "こうばん", "kouban", "polis kulübesi", "police box"),
          c("一番", "いちばん", "ichiban", "bir numara, en", "number one, the most"),
        ],
      ),
      k(
        "乗",
        ["binmek", "to ride, to board"],
        [
          "Aktarma tabelalarında ve taksi ya da otobüs duraklarında görürsün.",
          "On transfer signs and at taxi and bus stands.",
        ],
        [
          c("乗り換え", "のりかえ", "norikae", "aktarma", "transfer"),
          c("乗り場", "のりば", "noriba", "binme yeri, durak", "boarding area, stand"),
          c("乗車券", "じょうしゃけん", "joushaken", "yolcu bileti", "passenger ticket"),
          c("乗車", "じょうしゃ", "jousha", "trene binme", "boarding"),
        ],
      ),
      k(
        "改",
        ["yenilemek, kontrol etmek", "to renew, to inspect"],
        [
          "Bilet kapılarının üstündeki 改札 tabelasında görürsün.",
          "On the 改札 sign above every ticket gate.",
        ],
        [
          c("改札", "かいさつ", "kaisatsu", "bilet kapısı", "ticket gate"),
          c("改札口", "かいさつぐち", "kaisatsuguchi", "bilet kapısı girişi", "ticket gate entrance"),
          c("改装中", "かいそうちゅう", "kaisouchuu", "tadilatta", "under renovation"),
        ],
      ),
      k(
        "札",
        ["etiket, banknot", "tag, banknote"],
        [
          "Bilet kapılarında ve bilet makinelerinin para girişinde görürsün.",
          "At ticket gates and on the note slot of ticket machines.",
        ],
        [
          c("改札", "かいさつ", "kaisatsu", "bilet kapısı", "ticket gate"),
          c("千円札", "せんえんさつ", "sen'ensatsu", "1000 yenlik banknot", "1000-yen note"),
          c("名札", "なふだ", "nafuda", "isim kartı", "name tag"),
        ],
      ),
      k(
        "発",
        ["kalkış", "departure"],
        [
          "Kalkış panolarında saat ve hattın yanında görürsün.",
          "On departure boards next to times and lines.",
        ],
        [
          c("発車", "はっしゃ", "hassha", "trenin kalkışı", "train departure"),
          c("出発", "しゅっぱつ", "shuppatsu", "kalkış, yola çıkış", "departure"),
          c("始発", "しはつ", "shihatsu", "ilk tren", "first train"),
          c("発売", "はつばい", "hatsubai", "satışa çıkma", "going on sale"),
        ],
      ),
      k(
        "着",
        ["varış", "arrival"],
        [
          "Varış saatlerinde ve havalimanı panolarında görürsün.",
          "On arrival times and airport boards.",
        ],
        [
          c("到着", "とうちゃく", "touchaku", "varış", "arrival"),
          c("終着駅", "しゅうちゃくえき", "shuuchakueki", "son durak", "terminal station"),
          c("先着", "せんちゃく", "senchaku", "ilk gelen", "first come"),
        ],
      ),
      k(
        "行",
        ["gitmek; yön", "to go; bound for"],
        [
          "Trenin önünde ve panolarda varış yeriyle: 新宿行 gibi.",
          "On train fronts and boards with the destination, as in 新宿行.",
        ],
        [
          c("行き先", "いきさき", "ikisaki", "gidilecek yer", "destination"),
          c("急行", "きゅうこう", "kyuukou", "ekspres tren", "express train"),
          c("銀行", "ぎんこう", "ginkou", "banka", "bank"),
          c("旅行", "りょこう", "ryokou", "seyahat", "travel"),
        ],
      ),
    ],
    signs: [
      s("station", "京都", "Kyoto istasyon tabelası", "Kyoto station board", "きょうと / Kyōto"),
      s("info", "改札口", "Bilet kapısı", "Ticket gate", "Ticket Gate", "up"),
      s("info", "乗り換え", "Aktarma", "Transfer", "Transfer", "right"),
      s("info", "3番線", "3 numaralı peron", "Platform 3", "Track 3", "left"),
      s("ticket", "新宿行", "Shinjuku yönüne", "Bound for Shinjuku"),
      s("ticket", "乗車券", "Yolcu bileti", "Passenger ticket"),
    ],
  },
  {
    key: "trains-seats",
    icon: "🚄",
    title: { tr: "Tren türleri ve koltuklar", en: "Train types and seats" },
    intro: {
      tr: "Aynı perondan kalkan trenler her istasyonda durmayabilir. Tren türünü (各停, 快速, 急行, 特急) okumak yanlış trene binmeni önler. Shinkansen'de 指定席 ve 自由席 ayrımı biletinin geçerli olduğu vagonu belirler.",
      en: "Trains from the same platform may not stop at every station. Reading the train type (各停, 快速, 急行, 特急) keeps you off the wrong train. On the shinkansen, 指定席 versus 自由席 decides which car your ticket is valid in.",
    },
    kanji: [
      k(
        "急",
        ["acele, hızlı", "hurry, express"],
        [
          "Panolarda ve trenin önündeki tür etiketinde: 急行, 特急.",
          "On boards and the type label on the train front: 急行, 特急.",
        ],
        [
          c("急行", "きゅうこう", "kyuukou", "ekspres", "express"),
          c("特急", "とっきゅう", "tokkyuu", "limited ekspres", "limited express"),
          c("特急券", "とっきゅうけん", "tokkyuuken", "ekspres ek bileti", "limited express ticket"),
        ],
      ),
      k(
        "快",
        ["hoş, hızlı", "pleasant, rapid"],
        [
          "JR panolarında tren türü olarak: 快速.",
          "On JR boards as a train type: 快速.",
        ],
        [
          c("快速", "かいそく", "kaisoku", "hızlı tren (az durak)", "rapid train"),
          c("新快速", "しんかいそく", "shinkaisoku", "özel hızlı tren (Kansai)", "special rapid (Kansai)"),
          c("快適", "かいてき", "kaiteki", "konforlu", "comfortable"),
        ],
      ),
      k(
        "各",
        ["her bir", "each"],
        [
          "Her istasyonda duran trenlerin etiketinde: 各停.",
          "On the label of trains that stop at every station: 各停.",
        ],
        [
          c("各駅停車", "かくえきていしゃ", "kakuekiteisha", "her istasyonda duran tren", "local train"),
          c("各駅", "かくえき", "kakueki", "her istasyon", "every station"),
          c("各地", "かくち", "kakuchi", "her yer, çeşitli yerler", "various places"),
        ],
      ),
      k(
        "停",
        ["durmak", "to stop"],
        [
          "Tren türlerinde ve otobüs duraklarında görürsün.",
          "In train types and at bus stops.",
        ],
        [
          c("停車", "ていしゃ", "teisha", "durma (araç)", "stopping (vehicle)"),
          c("停留所", "ていりゅうじょ", "teiryuujo", "otobüs durağı", "bus stop"),
          c("停止", "ていし", "teishi", "durma, durdurma", "stop, halt"),
        ],
      ),
      k(
        "車",
        ["araç, vagon", "vehicle, car"],
        [
          "Peronda vagon numaralarında: 5号車 gibi.",
          "On the platform with car numbers, as in 5号車.",
        ],
        [
          c("電車", "でんしゃ", "densha", "elektrikli tren", "train"),
          c("号車", "ごうしゃ", "gousha", "vagon numarası", "car number"),
          c("車内", "しゃない", "shanai", "araç içi", "inside the train"),
          c("駐車場", "ちゅうしゃじょう", "chuushajou", "otopark", "car park"),
        ],
      ),
      k(
        "席",
        ["koltuk", "seat"],
        [
          "Biletinde ve vagonların kapısındaki tabelada görürsün.",
          "On your ticket and on the sign by each car door.",
        ],
        [
          c("座席", "ざせき", "zaseki", "koltuk", "seat"),
          c("優先席", "ゆうせんせき", "yuusenseki", "öncelikli koltuk", "priority seat"),
          c("満席", "まんせき", "manseki", "tüm koltuklar dolu", "fully booked"),
          c("指定席", "していせき", "shiteiseki", "rezerve koltuk", "reserved seat"),
        ],
      ),
      k(
        "指",
        ["parmak; belirtmek", "finger; to designate"],
        [
          "Rezerve koltuklu vagon tabelasında: 指定席.",
          "On the reserved-seat car sign: 指定席.",
        ],
        [
          c("指定席", "していせき", "shiteiseki", "rezerve koltuk", "reserved seat"),
          c("指定", "してい", "shitei", "belirlenmiş, rezerve", "designated, reserved"),
          c("指定券", "していけん", "shiteiken", "koltuk rezervasyon bileti", "seat reservation ticket"),
        ],
      ),
      k(
        "定",
        ["sabit, belirli", "fixed, set"],
        [
          "Koltuk biletlerinde, restoran menülerinde (定食) ve dükkan kapılarında (定休日).",
          "On seat tickets, on restaurant menus (定食) and on shop doors (定休日).",
        ],
        [
          c("定食", "ていしょく", "teishoku", "set menü", "set meal"),
          c("定休日", "ていきゅうび", "teikyuubi", "haftalık kapalı gün", "regular closing day"),
          c("定員", "ていいん", "teiin", "kapasite", "capacity"),
          c("予定", "よてい", "yotei", "plan, program", "plan, schedule"),
        ],
      ),
      k(
        "自",
        ["kendi", "self"],
        [
          "Rezervasyonsuz vagon tabelasında (自由席) ve otomatik makinelerde.",
          "On the unreserved car sign (自由席) and on automatic machines.",
        ],
        [
          c("自由席", "じゆうせき", "jiyuuseki", "rezervasyonsuz koltuk", "unreserved seat"),
          c("自動", "じどう", "jidou", "otomatik", "automatic"),
          c("自動販売機", "じどうはんばいき", "jidouhanbaiki", "otomat", "vending machine"),
          c("自転車", "じてんしゃ", "jitensha", "bisiklet", "bicycle"),
        ],
      ),
    ],
    signs: [
      s("ticket", "指定席", "Rezerve koltuk", "Reserved seat", "Reserved"),
      s("info", "自由席 1-3号車", "Rezervasyonsuz: 1-3. vagonlar", "Unreserved: cars 1-3", "Non-reserved Cars 1-3"),
      s("info", "各駅停車", "Her istasyonda duran tren", "Local train", "Local"),
      s("info", "快速", "Hızlı tren", "Rapid train", "Rapid"),
      s("info", "特急", "Limited ekspres", "Limited express", "Limited Express"),
      s("info", "優先席", "Öncelikli koltuk", "Priority seat", "Priority Seat"),
    ],
  },
  {
    key: "directions",
    icon: "🧭",
    title: { tr: "Yönler ve çıkışlar", en: "Directions and exits" },
    intro: {
      tr: "Büyük istasyonların onlarca çıkışı var ve yanlış çıkış seni birkaç sokak uzağa bırakır. Haritada hangi çıkışın (東口, 西口...) gerektiğine bak, sonra sarı tabelaları takip et. 上り ve 下り hat yönünü de söyler.",
      en: "Big stations have dozens of exits and the wrong one can leave you blocks away. Check which exit (東口, 西口...) you need on the map, then follow the yellow signs. 上り and 下り also tell you the line direction.",
    },
    kanji: [
      k(
        "出",
        ["çıkmak", "to exit"],
        [
          "İstasyonlardaki sarı çıkış tabelalarında: 出口.",
          "On the yellow exit signs in stations: 出口.",
        ],
        [
          c("出口", "でぐち", "deguchi", "çıkış", "exit"),
          c("出入口", "でいりぐち", "deiriguchi", "giriş-çıkış", "entrance and exit"),
          c("出発", "しゅっぱつ", "shuppatsu", "kalkış", "departure"),
        ],
      ),
      k(
        "入",
        ["girmek", "to enter"],
        [
          "Kapılarda, müze ve tapınak girişlerinde görürsün.",
          "On doors and at museum and temple entrances.",
        ],
        [
          c("入口", "いりぐち", "iriguchi", "giriş", "entrance"),
          c("入場", "にゅうじょう", "nyuujou", "giriş (mekana)", "admission"),
          c("入場券", "にゅうじょうけん", "nyuujouken", "giriş bileti", "admission ticket"),
          c("立入禁止", "たちいりきんし", "tachiirikinshi", "girmek yasaktır", "no entry"),
        ],
      ),
      k(
        "口",
        ["ağız; kapı, çıkış", "mouth; opening, exit"],
        [
          "Çıkış adlarının sonunda: 東口, 中央口.",
          "At the end of exit names: 東口, 中央口.",
        ],
        [
          c("出口", "でぐち", "deguchi", "çıkış", "exit"),
          c("入口", "いりぐち", "iriguchi", "giriş", "entrance"),
          c("非常口", "ひじょうぐち", "hijouguchi", "acil çıkış", "emergency exit"),
          c("改札口", "かいさつぐち", "kaisatsuguchi", "bilet kapısı girişi", "ticket gate entrance"),
        ],
      ),
      k(
        "東",
        ["doğu", "east"],
        [
          "Çıkış tabelalarında (東口) ve Tokyo'nun adında.",
          "On exit signs (東口) and in Tokyo's own name.",
        ],
        [
          c("東口", "ひがしぐち", "higashiguchi", "doğu çıkışı", "east exit"),
          c("東京", "とうきょう", "toukyou", "Tokyo", "Tokyo"),
          c("関東", "かんとう", "kantou", "Kanto bölgesi", "Kanto region"),
        ],
      ),
      k(
        "西",
        ["batı", "west"],
        [
          "Çıkış tabelalarında (西口) ve Kansai bölgesinin adında.",
          "On exit signs (西口) and in the name of the Kansai region.",
        ],
        [
          c("西口", "にしぐち", "nishiguchi", "batı çıkışı", "west exit"),
          c("関西", "かんさい", "kansai", "Kansai bölgesi", "Kansai region"),
          c("東西", "とうざい", "touzai", "doğu ve batı", "east and west"),
        ],
      ),
      k(
        "南",
        ["güney", "south"],
        [
          "Çıkış tabelalarında: 南口.",
          "On exit signs: 南口.",
        ],
        [
          c("南口", "みなみぐち", "minamiguchi", "güney çıkışı", "south exit"),
          c("南北", "なんぼく", "nanboku", "kuzey ve güney", "north and south"),
          c("南側", "みなみがわ", "minamigawa", "güney tarafı", "south side"),
        ],
      ),
      k(
        "北",
        ["kuzey", "north"],
        [
          "Çıkış tabelalarında (北口) ve Hokkaido'nun adında.",
          "On exit signs (北口) and in Hokkaido's name.",
        ],
        [
          c("北口", "きたぐち", "kitaguchi", "kuzey çıkışı", "north exit"),
          c("北海道", "ほっかいどう", "hokkaidou", "Hokkaido", "Hokkaido"),
          c("東北", "とうほく", "touhoku", "Tohoku bölgesi", "Tohoku region"),
        ],
      ),
      k(
        "中",
        ["orta, içinde", "middle, inside; in progress"],
        [
          "Dükkan kapılarında (営業中: açık) ve tuvalet kapılarında (使用中: dolu).",
          "On shop doors (営業中: open) and toilet doors (使用中: occupied).",
        ],
        [
          c("営業中", "えいぎょうちゅう", "eigyouchuu", "açık (dükkan)", "open (shop)"),
          c("準備中", "じゅんびちゅう", "junbichuu", "hazırlık var, kapalı", "preparing, closed"),
          c("使用中", "しようちゅう", "shiyouchuu", "kullanımda, dolu", "in use, occupied"),
          c("中央", "ちゅうおう", "chuuou", "merkez", "center"),
        ],
      ),
      k(
        "央",
        ["merkez", "center"],
        [
          "Merkez çıkış tabelasında: 中央口.",
          "On the central exit sign: 中央口.",
        ],
        [
          c("中央", "ちゅうおう", "chuuou", "merkez", "center"),
          c("中央口", "ちゅうおうぐち", "chuuouguchi", "merkez çıkış", "central exit"),
          c("中央線", "ちゅうおうせん", "chuuousen", "Chuo Hattı", "Chuo Line"),
        ],
      ),
      k(
        "階",
        ["kat", "floor"],
        [
          "Asansörlerde, mağaza kat planlarında ve merdivenlerde.",
          "In lifts, on department store floor guides and at stairs.",
        ],
        [
          c("階段", "かいだん", "kaidan", "merdiven", "stairs"),
          c("一階", "いっかい", "ikkai", "zemin kat (1. kat)", "ground floor (1F)"),
          c("二階", "にかい", "nikai", "birinci kat (2. kat)", "first floor up (2F)"),
          c("地下一階", "ちかいっかい", "chikaikkai", "bodrum 1. kat", "basement 1 (B1)"),
        ],
      ),
      k(
        "上",
        ["yukarı", "up, above"],
        [
          "Peronlarda büyük şehre giden trenlerin yönünde: 上り.",
          "On platforms for trains heading toward the big city: 上り.",
        ],
        [
          c("上り", "のぼり", "nobori", "şehir merkezine giden (tren)", "inbound (train)"),
          c("屋上", "おくじょう", "okujou", "çatı katı", "rooftop"),
          c("以上", "いじょう", "ijou", "ve üstü", "or more"),
        ],
      ),
      k(
        "下",
        ["aşağı", "down, below"],
        [
          "Peronlarda (下り), metro tabelalarında (地下鉄) ve bodrum katlarda.",
          "On platforms (下り), subway signs (地下鉄) and basement floors.",
        ],
        [
          c("下り", "くだり", "kudari", "merkezden uzaklaşan (tren)", "outbound (train)"),
          c("地下", "ちか", "chika", "yeraltı, bodrum", "underground, basement"),
          c("地下鉄", "ちかてつ", "chikatetsu", "metro", "subway"),
          c("途中下車", "とちゅうげしゃ", "tochuugesha", "yolda inip mola verme", "stopover"),
        ],
      ),
    ],
    signs: [
      s("exit", "東口", "Doğu çıkışı", "East exit", "East Exit", "right"),
      s("exit", "中央口", "Merkez çıkış", "Central exit", "Central Exit", "up"),
      s("exit", "北口", "Kuzey çıkışı", "North exit", "North Exit", "left"),
      s("exit", "出口", "Çıkış", "Exit", "Exit", "up"),
      s("info", "地下鉄", "Metro", "Subway", "Subway", "down"),
      s("info", "上り 東京方面", "Tokyo yönü", "Toward Tokyo", "For Tokyo"),
      s("info", "階段", "Merdiven", "Stairs", "Stairs", "down"),
    ],
  },
  {
    key: "sights",
    icon: "⛩️",
    title: { tr: "Şehir ve gezilecek yerler", en: "City and sights" },
    intro: {
      tr: "Tapınak adları 寺 ile, Şinto tapınakları 神社 ya da 神宮 ile biter. Müzeler 館 ile biter. Bu kanjiler Google Maps'te ve yol tabelalarında yerin türünü hemen anlamanı sağlar.",
      en: "Buddhist temple names end in 寺, Shinto shrines in 神社 or 神宮. Museums end in 館. These kanji tell you what kind of place it is at a glance, on Google Maps and on street signs.",
    },
    kanji: [
      k(
        "寺",
        ["Budist tapınağı", "Buddhist temple"],
        [
          "Kyoto ve Nara'daki tapınak adlarının sonunda: 清水寺 gibi.",
          "At the end of temple names in Kyoto and Nara, as in 清水寺.",
        ],
        [
          c("お寺", "おてら", "otera", "tapınak", "temple"),
          c("寺院", "じいん", "jiin", "tapınak", "temple"),
          c("清水寺", "きよみずでら", "kiyomizudera", "Kiyomizu Tapınağı", "Kiyomizu-dera"),
          c("金閣寺", "きんかくじ", "kinkakuji", "Altın Köşk Tapınağı", "Golden Pavilion"),
        ],
      ),
      k(
        "神",
        ["tanrı, kami", "god, kami"],
        [
          "Şinto tapınaklarının adında ve torii kapılarının yanında.",
          "In Shinto shrine names and next to torii gates.",
        ],
        [
          c("神社", "じんじゃ", "jinja", "Şinto tapınağı", "Shinto shrine"),
          c("神宮", "じんぐう", "jinguu", "büyük Şinto tapınağı", "grand shrine"),
          c("神様", "かみさま", "kamisama", "tanrı", "god"),
          c("神戸", "こうべ", "koube", "Kobe", "Kobe"),
        ],
      ),
      k(
        "社",
        ["tapınak; şirket", "shrine; company"],
        [
          "Şinto tapınağı adlarında ve muska satılan ofiste: 社務所.",
          "In shrine names and at the shrine office selling charms: 社務所.",
        ],
        [
          c("神社", "じんじゃ", "jinja", "Şinto tapınağı", "Shinto shrine"),
          c("社務所", "しゃむしょ", "shamusho", "tapınak ofisi", "shrine office"),
          c("会社", "かいしゃ", "kaisha", "şirket", "company"),
        ],
      ),
      k(
        "城",
        ["kale, şato", "castle"],
        [
          "Osaka ve Himeji gibi kale adlarında, tabelalarda.",
          "In castle names such as Osaka and Himeji, on signposts.",
        ],
        [
          c("城", "しろ", "shiro", "kale", "castle"),
          c("大阪城", "おおさかじょう", "oosakajou", "Osaka Kalesi", "Osaka Castle"),
          c("姫路城", "ひめじじょう", "himejijou", "Himeji Kalesi", "Himeji Castle"),
          c("城下町", "じょうかまち", "joukamachi", "kale kasabası", "castle town"),
        ],
      ),
      k(
        "公",
        ["kamu", "public"],
        [
          "Park adlarında ve kamuya açık alan tabelalarında.",
          "In park names and on public facility signs.",
        ],
        [
          c("公園", "こうえん", "kouen", "park", "park"),
          c("公衆電話", "こうしゅうでんわ", "koushuudenwa", "ankesörlü telefon", "public phone"),
          c("公開", "こうかい", "koukai", "ziyarete açık", "open to the public"),
          c("非公開", "ひこうかい", "hikoukai", "ziyarete kapalı", "not open to the public"),
        ],
      ),
      k(
        "園",
        ["bahçe, park", "garden, park"],
        [
          "Park ve bahçe adlarında, giriş ücreti tabelalarında.",
          "In park and garden names and on admission fee boards.",
        ],
        [
          c("庭園", "ていえん", "teien", "bahçe (peyzaj)", "landscaped garden"),
          c("動物園", "どうぶつえん", "doubutsuen", "hayvanat bahçesi", "zoo"),
          c("入園料", "にゅうえんりょう", "nyuuenryou", "park giriş ücreti", "garden admission fee"),
          c("公園", "こうえん", "kouen", "park", "park"),
        ],
      ),
      k(
        "通",
        ["geçmek; cadde", "to pass; street"],
        [
          "Cadde adlarında ve yol çalışması tabelalarında.",
          "In street names and on roadwork signs.",
        ],
        [
          c("通り", "とおり", "toori", "cadde", "street"),
          c("通路", "つうろ", "tsuuro", "geçit, koridor", "passage, aisle"),
          c("通行止め", "つうこうどめ", "tsuukoudome", "yol kapalı", "road closed"),
          c("通過", "つうか", "tsuuka", "durmadan geçme", "passing through"),
        ],
      ),
      k(
        "道",
        ["yol", "road, way"],
        [
          "Tapınağa çıkan yollarda (参道) ve yaya tabelalarında.",
          "On the approach paths to shrines (参道) and pedestrian signs.",
        ],
        [
          c("道", "みち", "michi", "yol", "road, way"),
          c("参道", "さんどう", "sandou", "tapınağa giden yol", "approach to a shrine"),
          c("歩道", "ほどう", "hodou", "kaldırım", "sidewalk"),
          c("歩道橋", "ほどうきょう", "hodoukyou", "yaya üst geçidi", "pedestrian bridge"),
        ],
      ),
      k(
        "館",
        ["bina, salon", "building, hall"],
        [
          "Müze ve ryokan adlarının sonunda.",
          "At the end of museum and ryokan names.",
        ],
        [
          c("美術館", "びじゅつかん", "bijutsukan", "sanat müzesi", "art museum"),
          c("博物館", "はくぶつかん", "hakubutsukan", "müze", "museum"),
          c("旅館", "りょかん", "ryokan", "geleneksel Japon oteli", "Japanese inn"),
          c("本館", "ほんかん", "honkan", "ana bina", "main building"),
        ],
      ),
    ],
    signs: [
      s("info", "清水寺", "Kiyomizu Tapınağı", "Kiyomizu-dera", "Kiyomizu-dera Temple", "right"),
      s("info", "明治神宮", "Meiji Tapınağı", "Meiji Shrine", "Meiji Jingu", "left"),
      s("info", "大阪城公園", "Osaka Kalesi Parkı", "Osaka Castle Park", "Osaka-jo Park", "up"),
      s("info", "美術館", "Sanat müzesi", "Art museum", "Art Museum", "right"),
      s("shop", "社務所", "Tapınak ofisi (muska satışı)", "Shrine office (charms sold here)"),
      s("warning", "非公開", "Ziyarete kapalı", "Not open to the public", "Closed to the Public"),
    ],
  },
  {
    key: "shops-money",
    icon: "🛍️",
    title: { tr: "Dükkanlar ve para", en: "Shops and money" },
    intro: {
      tr: "Fiyat etiketlerinde 税込 (vergi dahil) ve 税抜 (vergi hariç) ayrımı önemli; fark genelde yüzde 10 (paket yiyecek-içecekte yüzde 8). Kapıdaki 営業中 açık, 準備中 kapalı demek. Bazı küçük restoranlar sadece nakit kabul eder: 現金のみ.",
      en: "On price tags, 税込 (tax included) versus 税抜 (tax excluded) matters; the gap is usually 10 percent (8 percent for takeaway food and drink). 営業中 on the door means open, 準備中 means closed. Some small restaurants take cash only: 現金のみ.",
    },
    kanji: [
      k(
        "店",
        ["dükkan", "shop"],
        [
          "Dükkan adlarının sonunda ve kapanış saatlerinde.",
          "At the end of shop names and on closing notices.",
        ],
        [
          c("店員", "てんいん", "ten'in", "tezgahtar", "shop clerk"),
          c("売店", "ばいてん", "baiten", "büfe, kiosk", "kiosk, stand"),
          c("本店", "ほんてん", "honten", "ana mağaza", "main store"),
          c("閉店", "へいてん", "heiten", "kapanış", "closing (shop)"),
        ],
      ),
      k(
        "円",
        ["yen", "yen"],
        [
          "Her fiyat etiketinde ve bilet makinelerinde.",
          "On every price tag and ticket machine.",
        ],
        [
          c("百円", "ひゃくえん", "hyakuen", "100 yen", "100 yen"),
          c("千円", "せんえん", "sen'en", "1000 yen", "1000 yen"),
          c("一万円", "いちまんえん", "ichiman'en", "10.000 yen", "10,000 yen"),
        ],
      ),
      k(
        "税",
        ["vergi", "tax"],
        [
          "Fiyat etiketlerinde ve vergisiz alışveriş tabelalarında.",
          "On price tags and tax-free shopping signs.",
        ],
        [
          c("税込", "ぜいこみ", "zeikomi", "vergi dahil", "tax included"),
          c("税抜", "ぜいぬき", "zeinuki", "vergi hariç", "tax excluded"),
          c("消費税", "しょうひぜい", "shouhizei", "tüketim vergisi", "consumption tax"),
          c("免税", "めんぜい", "menzei", "vergisiz", "tax-free"),
        ],
      ),
      k(
        "割",
        ["bölmek; indirim", "to divide; discount"],
        [
          "İndirim etiketlerinde: 2割引 (yüzde 20 indirim) gibi.",
          "On discount tags, as in 2割引 (20 percent off).",
        ],
        [
          c("割引", "わりびき", "waribiki", "indirim", "discount"),
          c("学割", "がくわり", "gakuwari", "öğrenci indirimi", "student discount"),
          c("割り箸", "わりばし", "waribashi", "tek kullanımlık çubuk", "disposable chopsticks"),
          c("割り勘", "わりかん", "warikan", "hesabı bölüşmek", "splitting the bill"),
        ],
      ),
      k(
        "引",
        ["çekmek", "to pull"],
        [
          "Kapılarda tek başına (çekiniz) ve indirim etiketlerinde.",
          "Alone on doors (pull) and on discount tags.",
        ],
        [
          c("引く", "ひく", "hiku", "çekmek", "to pull"),
          c("割引", "わりびき", "waribiki", "indirim", "discount"),
          c("値引き", "ねびき", "nebiki", "fiyat indirimi", "price reduction"),
        ],
      ),
      k(
        "現",
        ["şimdiki, gerçek", "present, actual"],
        [
          "Sadece nakit tabelalarında ve haritalarda (現在地: buradasınız).",
          "On cash-only notices and on maps (現在地: you are here).",
        ],
        [
          c("現金", "げんきん", "genkin", "nakit", "cash"),
          c("現在地", "げんざいち", "genzaichi", "bulunduğunuz yer", "you are here"),
          c("現在", "げんざい", "genzai", "şu an", "now, current"),
        ],
      ),
      k(
        "金",
        ["para; altın; Cuma", "money; gold; Friday"],
        [
          "Ücret tablolarında, nakit tabelalarında ve açılış saatlerinde (金曜日).",
          "On fare tables, cash notices and opening hours (金曜日).",
        ],
        [
          c("お金", "おかね", "okane", "para", "money"),
          c("料金", "りょうきん", "ryoukin", "ücret", "fee, fare"),
          c("現金", "げんきん", "genkin", "nakit", "cash"),
          c("金曜日", "きんようび", "kin'youbi", "cuma", "Friday"),
        ],
      ),
      k(
        "営",
        ["işletmek", "to operate"],
        [
          "Kapıdaki açık tabelasında (営業中) ve çalışma saatlerinde.",
          "On the open sign on doors (営業中) and with opening hours.",
        ],
        [
          c("営業", "えいぎょう", "eigyou", "faaliyet, açık olma", "business, being open"),
          c("営業中", "えいぎょうちゅう", "eigyouchuu", "açık", "open"),
          c("営業時間", "えいぎょうじかん", "eigyoujikan", "çalışma saatleri", "business hours"),
        ],
      ),
      k(
        "業",
        ["iş", "business"],
        [
          "Açık/kapalı tabelalarında: 営業中, 本日休業.",
          "On open and closed signs: 営業中, 本日休業.",
        ],
        [
          c("営業", "えいぎょう", "eigyou", "faaliyet", "business"),
          c("休業", "きゅうぎょう", "kyuugyou", "kapalı (iş yeri)", "closed (business)"),
          c("営業時間", "えいぎょうじかん", "eigyoujikan", "çalışma saatleri", "business hours"),
        ],
      ),
      k(
        "休",
        ["dinlenmek", "to rest"],
        [
          "Kapalı gün tabelalarında: 定休日, 本日休業.",
          "On closing-day notices: 定休日, 本日休業.",
        ],
        [
          c("休み", "やすみ", "yasumi", "tatil, kapalı", "holiday, closed"),
          c("定休日", "ていきゅうび", "teikyuubi", "haftalık kapalı gün", "regular closing day"),
          c("休憩", "きゅうけい", "kyuukei", "mola", "break, rest"),
          c("休日", "きゅうじつ", "kyuujitsu", "tatil günü", "day off, holiday"),
        ],
      ),
      k(
        "売",
        ["satmak", "to sell"],
        [
          "Bilet satış yerlerinde ve tükendi etiketlerinde.",
          "At ticket counters and on sold-out labels.",
        ],
        [
          c("売り場", "うりば", "uriba", "satış yeri, reyon", "sales counter, section"),
          c("切符売り場", "きっぷうりば", "kippuuriba", "bilet gişesi", "ticket office"),
          c("売り切れ", "うりきれ", "urikire", "tükendi", "sold out"),
          c("売店", "ばいてん", "baiten", "büfe", "kiosk"),
        ],
      ),
    ],
    signs: [
      s("shop", "営業中", "Açık", "Open", "OPEN"),
      s("shop", "準備中", "Hazırlık var (kapalı)", "Preparing (closed)", "CLOSED"),
      s("shop", "本日休業", "Bugün kapalı", "Closed today"),
      s("shop", "定休日 水曜日", "Çarşamba günleri kapalı", "Closed on Wednesdays"),
      s("ticket", "税込 1,100円", "Vergi dahil 1.100 yen", "1,100 yen including tax"),
      s("shop", "現金のみ", "Sadece nakit", "Cash only", "Cash Only"),
      s("shop", "免税", "Vergisiz alışveriş", "Tax-free shopping", "Tax Free"),
      s("ticket", "売り切れ", "Tükendi", "Sold out"),
    ],
  },
  {
    key: "food",
    icon: "🍜",
    title: { tr: "Restoran ve yemek", en: "Restaurant and food" },
    intro: {
      tr: "Ramen ve gyudon dükkanlarında önce kapıdaki makineden 食券 (yemek bileti) alırsın. Menü düğmelerinde et türünü okumak yeterli: 牛 dana, 豚 domuz, 鶏 tavuk. Su ve çay genelde ücretsizdir.",
      en: "At ramen and gyudon shops you first buy a 食券 (meal ticket) from the machine by the door. On menu buttons, reading the meat is enough: 牛 beef, 豚 pork, 鶏 chicken. Water and tea are usually free.",
    },
    kanji: [
      k(
        "食",
        ["yemek", "to eat, food"],
        [
          "Yemek bileti makinelerinde ve restoran tabelalarında.",
          "On meal ticket machines and restaurant signs.",
        ],
        [
          c("食券", "しょっけん", "shokken", "yemek bileti", "meal ticket"),
          c("食堂", "しょくどう", "shokudou", "lokanta, yemekhane", "diner, cafeteria"),
          c("和食", "わしょく", "washoku", "Japon yemeği", "Japanese food"),
          c("食べ放題", "たべほうだい", "tabehoudai", "açık büfe", "all you can eat"),
        ],
      ),
      k(
        "券",
        ["bilet", "ticket"],
        [
          "Restoran bilet makinelerinde ve tren biletlerinde.",
          "On restaurant ticket machines and train tickets.",
        ],
        [
          c("食券", "しょっけん", "shokken", "yemek bileti", "meal ticket"),
          c("券売機", "けんばいき", "kenbaiki", "bilet makinesi", "ticket machine"),
          c("乗車券", "じょうしゃけん", "joushaken", "yolcu bileti", "passenger ticket"),
          c("入場券", "にゅうじょうけん", "nyuujouken", "giriş bileti", "admission ticket"),
        ],
      ),
      k(
        "肉",
        ["et", "meat"],
        [
          "Menülerde ve yakiniku dükkanlarının tabelalarında.",
          "On menus and yakiniku restaurant signs.",
        ],
        [
          c("牛肉", "ぎゅうにく", "gyuuniku", "dana eti", "beef"),
          c("豚肉", "ぶたにく", "butaniku", "domuz eti", "pork"),
          c("鶏肉", "とりにく", "toriniku", "tavuk eti", "chicken"),
          c("焼肉", "やきにく", "yakiniku", "ızgara et", "grilled meat"),
        ],
      ),
      k(
        "魚",
        ["balık", "fish"],
        [
          "Set menülerde ve pazarlarda.",
          "On set menus and at markets.",
        ],
        [
          c("魚", "さかな", "sakana", "balık", "fish"),
          c("焼き魚", "やきざかな", "yakizakana", "ızgara balık", "grilled fish"),
          c("魚介類", "ぎょかいるい", "gyokairui", "deniz ürünleri", "seafood"),
        ],
      ),
      k(
        "豚",
        ["domuz", "pig, pork"],
        [
          "Ramen menülerinde (豚骨) ve bilet makinesi düğmelerinde.",
          "On ramen menus (豚骨) and ticket machine buttons.",
        ],
        [
          c("豚肉", "ぶたにく", "butaniku", "domuz eti", "pork"),
          c("豚骨", "とんこつ", "tonkotsu", "domuz kemiği (ramen suyu)", "pork bone (ramen broth)"),
          c("豚丼", "ぶたどん", "butadon", "domuz etli pilav kasesi", "pork rice bowl"),
        ],
      ),
      k(
        "牛",
        ["inek, sığır", "cow, beef"],
        [
          "Gyudon dükkanlarında ve konbini süt rafında.",
          "At gyudon shops and on the konbini milk shelf.",
        ],
        [
          c("牛肉", "ぎゅうにく", "gyuuniku", "dana eti", "beef"),
          c("牛丼", "ぎゅうどん", "gyuudon", "dana etli pilav kasesi", "beef rice bowl"),
          c("牛乳", "ぎゅうにゅう", "gyuunyuu", "süt", "milk"),
          c("和牛", "わぎゅう", "wagyuu", "Japon sığırı", "Japanese beef"),
        ],
      ),
      k(
        "飯",
        ["pilav, yemek", "cooked rice, meal"],
        [
          "Menülerde (ご飯 大盛: büyük porsiyon pilav) ve set yemeklerde.",
          "On menus (ご飯 大盛: large rice) and with set meals.",
        ],
        [
          c("ご飯", "ごはん", "gohan", "pilav; yemek", "rice; meal"),
          c("朝ご飯", "あさごはん", "asagohan", "kahvaltı", "breakfast"),
          c("釜飯", "かまめし", "kamameshi", "güveçte pilav", "rice pot dish"),
        ],
      ),
      k(
        "麺",
        ["erişte", "noodles"],
        [
          "Ramen, udon ve soba dükkanlarının menülerinde.",
          "On ramen, udon and soba shop menus.",
        ],
        [
          c("麺類", "めんるい", "menrui", "erişte yemekleri", "noodle dishes"),
          c("つけ麺", "つけめん", "tsukemen", "sosa batırılan erişte", "dipping noodles"),
          c("冷麺", "れいめん", "reimen", "soğuk erişte", "cold noodles"),
        ],
      ),
      k(
        "酒",
        ["alkollü içki, sake", "alcohol, sake"],
        [
          "İzakaya tabelalarında ve içecek menülerinde.",
          "On izakaya signs and drink menus.",
        ],
        [
          c("お酒", "おさけ", "osake", "alkollü içki", "alcohol"),
          c("日本酒", "にほんしゅ", "nihonshu", "sake", "sake"),
          c("居酒屋", "いざかや", "izakaya", "Japon meyhanesi", "Japanese pub"),
          c("酒屋", "さかや", "sakaya", "içki dükkanı", "liquor store"),
        ],
      ),
      k(
        "茶",
        ["çay", "tea"],
        [
          "İçecek menülerinde, otomatlarda ve tatlıcılarda.",
          "On drink menus, vending machines and sweet shops.",
        ],
        [
          c("お茶", "おちゃ", "ocha", "çay", "tea"),
          c("緑茶", "りょくちゃ", "ryokucha", "yeşil çay", "green tea"),
          c("抹茶", "まっちゃ", "matcha", "matcha", "matcha"),
          c("喫茶店", "きっさてん", "kissaten", "kahvehane", "coffee shop"),
        ],
      ),
      k(
        "水",
        ["su; Çarşamba", "water; Wednesday"],
        [
          "Restoranlardaki su sebillerinde ve açılış saatlerinde (水曜日).",
          "On restaurant water dispensers and opening hours (水曜日).",
        ],
        [
          c("水", "みず", "mizu", "su", "water"),
          c("お水", "おみず", "omizu", "su (kibar)", "water (polite)"),
          c("水曜日", "すいようび", "suiyoubi", "çarşamba", "Wednesday"),
          c("水道", "すいどう", "suidou", "musluk suyu, şebeke", "tap water supply"),
        ],
      ),
    ],
    signs: [
      s("ticket", "食券", "Yemek bileti", "Meal ticket", "Meal Ticket"),
      s("ticket", "豚骨ラーメン", "Tonkotsu ramen", "Tonkotsu ramen"),
      s("ticket", "牛丼 並", "Gyudon, normal boy", "Gyudon, regular"),
      s("noren", "食堂", "Lokanta", "Diner"),
      s("noren", "居酒屋", "İzakaya", "Izakaya"),
      s("shop", "食べ放題", "Açık büfe", "All you can eat"),
      s("ticket", "お茶", "Çay", "Tea"),
    ],
  },
  {
    key: "hotel-onsen",
    icon: "♨️",
    title: { tr: "Otel, onsen ve tuvalet", en: "Hotel, onsen and toilets" },
    intro: {
      tr: "Onsende kadın ve erkek bölümleri 女 ve 男 ile ayrılır; perdelerin renkleri yerden yere değişir ve bazı yerlerde gün içinde yer değiştirir, o yüzden her seferinde kanjiyi oku. Tuvalet tabelası genelde お手洗い ya da トイレ yazar.",
      en: "At an onsen, the women's and men's baths are marked 女 and 男; curtain colours vary and some places swap sides during the day, so read the kanji every time. Toilet signs usually say お手洗い or トイレ.",
    },
    kanji: [
      k(
        "男",
        ["erkek", "man"],
        [
          "Onsen perdelerinde ve tuvalet kapılarında.",
          "On onsen curtains and toilet doors.",
        ],
        [
          c("男", "おとこ", "otoko", "erkek", "man"),
          c("男湯", "おとこゆ", "otokoyu", "erkekler hamamı", "men's bath"),
          c("男性", "だんせい", "dansei", "erkek", "male"),
          c("男子", "だんし", "danshi", "erkek (tuvalet)", "men (toilets)"),
        ],
      ),
      k(
        "女",
        ["kadın", "woman"],
        [
          "Onsen perdelerinde, tuvaletlerde ve kadınlara özel vagonlarda.",
          "On onsen curtains, toilets and women-only train cars.",
        ],
        [
          c("女", "おんな", "onna", "kadın", "woman"),
          c("女湯", "おんなゆ", "onnayu", "kadınlar hamamı", "women's bath"),
          c("女性", "じょせい", "josei", "kadın", "female"),
          c("女性専用車", "じょせいせんようしゃ", "joseisen'yousha", "kadınlara özel vagon", "women-only car"),
        ],
      ),
      k(
        "湯",
        ["sıcak su", "hot water"],
        [
          "Onsen ve sento girişlerindeki perdelerde.",
          "On the curtains at onsen and sento entrances.",
        ],
        [
          c("お湯", "おゆ", "oyu", "sıcak su", "hot water"),
          c("銭湯", "せんとう", "sentou", "mahalle hamamı", "public bathhouse"),
          c("湯船", "ゆぶね", "yubune", "küvet, havuz", "bathtub"),
          c("女湯", "おんなゆ", "onnayu", "kadınlar hamamı", "women's bath"),
        ],
      ),
      k(
        "手",
        ["el", "hand"],
        [
          "Tuvalet tabelalarında: お手洗い.",
          "On toilet signs: お手洗い.",
        ],
        [
          c("お手洗い", "おてあらい", "otearai", "tuvalet", "restroom"),
          c("手洗い", "てあらい", "tearai", "el yıkama; tuvalet", "hand washing; toilet"),
          c("手荷物", "てにもつ", "tenimotsu", "el bagajı", "hand luggage"),
        ],
      ),
      k(
        "洗",
        ["yıkamak", "to wash"],
        [
          "Tuvalet düğmelerinde (洗浄) ve lavabo tabelalarında.",
          "On toilet buttons (洗浄) and washroom signs.",
        ],
        [
          c("洗面所", "せんめんじょ", "senmenjo", "lavabo", "washroom"),
          c("洗浄", "せんじょう", "senjou", "yıkama (tuvalet düğmesi)", "wash (toilet button)"),
          c("洗い場", "あらいば", "araiba", "yıkanma yeri (onsen)", "washing area (onsen)"),
          c("洗濯機", "せんたくき", "sentakuki", "çamaşır makinesi", "washing machine"),
        ],
      ),
      k(
        "浴",
        ["banyo yapmak", "to bathe"],
        [
          "Otel asansörlerinde büyük hamamın katını gösterirken: 大浴場.",
          "In hotel lifts showing the floor of the large bath: 大浴場.",
        ],
        [
          c("大浴場", "だいよくじょう", "daiyokujou", "büyük ortak hamam", "large public bath"),
          c("浴衣", "ゆかた", "yukata", "yukata (hafif kimono)", "yukata (light kimono)"),
          c("入浴", "にゅうよく", "nyuuyoku", "banyo yapma", "bathing"),
          c("浴室", "よくしつ", "yokushitsu", "banyo", "bathroom"),
        ],
      ),
      k(
        "室",
        ["oda", "room"],
        [
          "Otel koridorlarında ve bekleme salonlarında.",
          "In hotel corridors and waiting rooms.",
        ],
        [
          c("和室", "わしつ", "washitsu", "Japon tarzı oda", "Japanese-style room"),
          c("待合室", "まちあいしつ", "machiaishitsu", "bekleme salonu", "waiting room"),
          c("室内", "しつない", "shitsunai", "iç mekan", "indoors"),
          c("喫煙室", "きつえんしつ", "kitsuenshitsu", "sigara odası", "smoking room"),
        ],
      ),
      k(
        "屋",
        ["ev, dükkan; çatı", "house, shop; roof"],
        [
          "Otelde oda numarasında ve dükkan adlarının sonunda.",
          "With hotel room numbers and at the end of shop names.",
        ],
        [
          c("部屋", "へや", "heya", "oda", "room"),
          c("居酒屋", "いざかや", "izakaya", "Japon meyhanesi", "Japanese pub"),
          c("本屋", "ほんや", "hon'ya", "kitapçı", "bookshop"),
          c("屋台", "やたい", "yatai", "seyyar yemek tezgahı", "food stall"),
        ],
      ),
      k(
        "使",
        ["kullanmak", "to use"],
        [
          "Tuvalet kapılarındaki dolu göstergesinde: 使用中.",
          "On the occupied indicator of toilet doors: 使用中.",
        ],
        [
          c("使用中", "しようちゅう", "shiyouchuu", "kullanımda, dolu", "in use, occupied"),
          c("使用禁止", "しようきんし", "shiyoukinshi", "kullanmak yasak", "do not use"),
          c("使い方", "つかいかた", "tsukaikata", "kullanım şekli", "how to use"),
        ],
      ),
    ],
    signs: [
      s("noren", "ゆ", "Hamam (yu: sıcak su)", "Bath (yu: hot water)"),
      s("noren", "男湯", "Erkekler hamamı", "Men's bath"),
      s("noren", "女湯", "Kadınlar hamamı", "Women's bath"),
      s("info", "お手洗い", "Tuvalet", "Restroom", "Restroom", "left"),
      s("info", "大浴場 5階", "Büyük hamam: 5. kat", "Large bath: 5F", "Large Bath 5F"),
      s("info", "使用中", "Dolu", "Occupied", "Occupied"),
      s("ticket", "洗浄", "Yıkama düğmesi", "Wash button"),
    ],
  },
  {
    key: "safety",
    icon: "⚠️",
    title: { tr: "Güvenlik ve kurallar", en: "Safety and rules" },
    intro: {
      tr: "Tapınaklarda, müzelerde ve özel bahçelerde fotoğraf yasağı sık görülür; 禁止 gördüğün her yerde dur ve tabelayı oku. Japonya'da sokakta sigara içmek çoğu yerde yasak; sadece 喫煙所 alanlarında serbest. Deprem için 避難 tabelaları toplanma yerini gösterir.",
      en: "No-photo rules are common in temples, museums and private gardens; whenever you see 禁止, stop and read the sign. Smoking on the street is banned in most places in Japan; it is allowed only in 喫煙所 areas. For earthquakes, 避難 signs show the evacuation point.",
    },
    kanji: [
      k(
        "禁",
        ["yasak", "prohibition"],
        [
          "Kırmızı yasak tabelalarında: 禁煙, 撮影禁止.",
          "On red prohibition signs: 禁煙, 撮影禁止.",
        ],
        [
          c("禁止", "きんし", "kinshi", "yasak", "prohibited"),
          c("禁煙", "きんえん", "kin'en", "sigara içilmez", "no smoking"),
          c("撮影禁止", "さつえいきんし", "satsueikinshi", "fotoğraf çekmek yasak", "no photography"),
          c("立入禁止", "たちいりきんし", "tachiirikinshi", "girmek yasak", "no entry"),
        ],
      ),
      k(
        "止",
        ["durmak, durdurmak", "to stop"],
        [
          "Yasak tabelalarının sonunda (禁止) ve yol işaretlerinde (止まれ).",
          "At the end of prohibition signs (禁止) and on road signs (止まれ).",
        ],
        [
          c("止まれ", "とまれ", "tomare", "dur!", "stop!"),
          c("中止", "ちゅうし", "chuushi", "iptal", "cancelled"),
          c("通行止め", "つうこうどめ", "tsuukoudome", "yol kapalı", "road closed"),
          c("禁止", "きんし", "kinshi", "yasak", "prohibited"),
        ],
      ),
      k(
        "煙",
        ["duman", "smoke"],
        [
          "Sigara yasağı ve sigara alanı tabelalarında.",
          "On no-smoking and smoking area signs.",
        ],
        [
          c("禁煙", "きんえん", "kin'en", "sigara içilmez", "no smoking"),
          c("喫煙所", "きつえんじょ", "kitsuenjo", "sigara içme alanı", "smoking area"),
          c("喫煙", "きつえん", "kitsuen", "sigara içme", "smoking"),
          c("煙", "けむり", "kemuri", "duman", "smoke"),
        ],
      ),
      k(
        "危",
        ["tehlike", "danger"],
        [
          "İnşaat alanlarında, uçurumlarda ve peron kenarında.",
          "At construction sites, cliffs and platform edges.",
        ],
        [
          c("危険", "きけん", "kiken", "tehlike", "danger"),
          c("危ない", "あぶない", "abunai", "tehlikeli", "dangerous"),
        ],
      ),
      k(
        "険",
        ["sarp, tehlikeli", "steep, risky"],
        [
          "Tehlike tabelalarında 危 ile birlikte: 危険.",
          "With 危 on danger signs: 危険.",
        ],
        [
          c("危険", "きけん", "kiken", "tehlike", "danger"),
          c("保険", "ほけん", "hoken", "sigorta", "insurance"),
          c("保険証", "ほけんしょう", "hokenshou", "sigorta kartı", "insurance card"),
        ],
      ),
      k(
        "注",
        ["dikkat; dökmek", "attention; to pour"],
        [
          "Sarı uyarı tabelalarında (注意) ve restoranda sipariş verirken (注文).",
          "On yellow caution signs (注意) and when ordering in restaurants (注文).",
        ],
        [
          c("注意", "ちゅうい", "chuui", "dikkat", "caution"),
          c("注文", "ちゅうもん", "chuumon", "sipariş", "order"),
          c("注意書き", "ちゅういがき", "chuuigaki", "uyarı notu", "warning notice"),
        ],
      ),
      k(
        "非",
        ["olmayan; acil", "non-; emergency"],
        [
          "Acil çıkış tabelalarında ve trenlerdeki acil durum düğmelerinde.",
          "On emergency exit signs and emergency buttons on trains.",
        ],
        [
          c("非常口", "ひじょうぐち", "hijouguchi", "acil çıkış", "emergency exit"),
          c("非常", "ひじょう", "hijou", "acil durum", "emergency"),
          c("非常階段", "ひじょうかいだん", "hijoukaidan", "yangın merdiveni", "emergency stairs"),
          c("非売品", "ひばいひん", "hibaihin", "satılık değil", "not for sale"),
        ],
      ),
      k(
        "避",
        ["kaçınmak, sığınmak", "to avoid, to take refuge"],
        [
          "Otel odalarındaki tahliye planlarında ve sokaktaki toplanma alanı tabelalarında.",
          "On evacuation maps in hotel rooms and assembly point signs on the street.",
        ],
        [
          c("避難", "ひなん", "hinan", "tahliye, sığınma", "evacuation"),
          c("避難所", "ひなんじょ", "hinanjo", "sığınak", "evacuation shelter"),
          c("避難場所", "ひなんばしょ", "hinanbasho", "toplanma alanı", "evacuation area"),
          c("避難経路", "ひなんけいろ", "hinankeiro", "tahliye yolu", "evacuation route"),
        ],
      ),
      k(
        "撮",
        ["çekmek (fotoğraf)", "to photograph"],
        [
          "Tapınak salonlarında ve müzelerde fotoğraf yasağı tabelalarında.",
          "On no-photography signs in temple halls and museums.",
        ],
        [
          c("撮影", "さつえい", "satsuei", "fotoğraf/video çekimi", "photography, filming"),
          c("撮影禁止", "さつえいきんし", "satsueikinshi", "fotoğraf çekmek yasak", "no photography"),
          c("撮る", "とる", "toru", "(fotoğraf) çekmek", "to take (a photo)"),
        ],
      ),
    ],
    signs: [
      s("warning", "撮影禁止", "Fotoğraf çekmek yasak", "No photography", "No Photography"),
      s("warning", "禁煙", "Sigara içilmez", "No smoking", "No Smoking"),
      s("warning", "立入禁止", "Girmek yasak", "No entry", "Keep Out"),
      s("warning", "危険", "Tehlike", "Danger", "Danger"),
      s("warning", "足元注意", "Adımınıza dikkat", "Watch your step", "Watch Your Step"),
      s("exit", "非常口", "Acil çıkış", "Emergency exit", "Emergency Exit", "left"),
      s("info", "避難場所", "Tahliye toplanma alanı", "Evacuation area", "Evacuation Area"),
      s("info", "喫煙所", "Sigara içme alanı", "Smoking area", "Smoking Area", "right"),
    ],
  },
  {
    key: "time",
    icon: "🕐",
    title: { tr: "Saat ve günler", en: "Time and days" },
    intro: {
      tr: "Çalışma saatleri, kapalı günler ve tren saatleri hep bu kanjilerle yazılır. Haftanın günleri 曜日 ile biter: 月 pazartesi, 火 salı, 水 çarşamba, 木 perşembe, 金 cuma, 土 cumartesi, 日 pazar. 水 ve 金 başka gruplarda; burada diğer günler var.",
      en: "Opening hours, closing days and train times are all written with these kanji. Weekdays end in 曜日: 月 Mon, 火 Tue, 水 Wed, 木 Thu, 金 Fri, 土 Sat, 日 Sun. 水 and 金 live in other groups; the rest are here.",
    },
    kanji: [
      k(
        "月",
        ["ay; Pazartesi", "moon, month; Monday"],
        [
          "Tarihlerde (11月: kasım) ve açılış saatlerinde (月曜日).",
          "In dates (11月: November) and opening hours (月曜日).",
        ],
        [
          c("月曜日", "げつようび", "getsuyoubi", "pazartesi", "Monday"),
          c("十一月", "じゅういちがつ", "juuichigatsu", "kasım", "November"),
          c("今月", "こんげつ", "kongetsu", "bu ay", "this month"),
          c("月", "つき", "tsuki", "ay (gökyüzü)", "moon"),
        ],
      ),
      k(
        "火",
        ["ateş; Salı", "fire; Tuesday"],
        [
          "Açılış saatlerinde (火曜日) ve yangın uyarılarında (火気厳禁).",
          "In opening hours (火曜日) and fire warnings (火気厳禁).",
        ],
        [
          c("火曜日", "かようび", "kayoubi", "salı", "Tuesday"),
          c("火気厳禁", "かきげんきん", "kakigenkin", "ateş yakmak kesinlikle yasak", "no open flames"),
          c("花火", "はなび", "hanabi", "havai fişek", "fireworks"),
          c("火事", "かじ", "kaji", "yangın", "fire (blaze)"),
        ],
      ),
      k(
        "木",
        ["ağaç; Perşembe", "tree; Thursday"],
        [
          "Açılış saatlerinde: 木曜日.",
          "In opening hours: 木曜日.",
        ],
        [
          c("木曜日", "もくようび", "mokuyoubi", "perşembe", "Thursday"),
          c("木", "き", "ki", "ağaç", "tree"),
          c("並木道", "なみきみち", "namikimichi", "ağaçlı yol", "tree-lined avenue"),
        ],
      ),
      k(
        "土",
        ["toprak; Cumartesi", "earth; Saturday"],
        [
          "Hafta sonu saatlerinde (土日) ve hediyelik eşya dükkanlarında (お土産).",
          "In weekend hours (土日) and souvenir shops (お土産).",
        ],
        [
          c("土曜日", "どようび", "doyoubi", "cumartesi", "Saturday"),
          c("土日", "どにち", "donichi", "hafta sonu", "weekend"),
          c("お土産", "おみやげ", "omiyage", "hediyelik", "souvenir"),
        ],
      ),
      k(
        "日",
        ["gün, güneş; Pazar", "day, sun; Sunday"],
        [
          "Tarihlerde, açılış saatlerinde ve Japonya'nın adında.",
          "In dates, opening hours and the name of Japan itself.",
        ],
        [
          c("日曜日", "にちようび", "nichiyoubi", "pazar", "Sunday"),
          c("本日", "ほんじつ", "honjitsu", "bugün (resmi)", "today (formal)"),
          c("祝日", "しゅくじつ", "shukujitsu", "resmi tatil", "public holiday"),
          c("平日", "へいじつ", "heijitsu", "hafta içi", "weekday"),
        ],
      ),
      k(
        "曜",
        ["haftanın günü", "day of the week"],
        [
          "Her gün adının içinde: 月曜日, 土曜日.",
          "Inside every weekday name: 月曜日, 土曜日.",
        ],
        [
          c("曜日", "ようび", "youbi", "haftanın günü", "day of the week"),
          c("日曜日", "にちようび", "nichiyoubi", "pazar", "Sunday"),
          c("何曜日", "なんようび", "nan'youbi", "hangi gün", "what day of the week"),
        ],
      ),
      k(
        "時",
        ["saat, zaman", "hour, time"],
        [
          "Çalışma saatlerinde ve tren tarifelerinde.",
          "In business hours and train timetables.",
        ],
        [
          c("時間", "じかん", "jikan", "zaman, süre", "time, hours"),
          c("時刻表", "じこくひょう", "jikokuhyou", "tarife", "timetable"),
          c("何時", "なんじ", "nanji", "saat kaç", "what time"),
          c("時計", "とけい", "tokei", "saat (alet)", "clock, watch"),
        ],
      ),
      k(
        "分",
        ["dakika; parça", "minute; part"],
        [
          "Tren saatlerinde ve yürüme mesafesi tabelalarında: 徒歩5分.",
          "In train times and walking-distance signs: 徒歩5分.",
        ],
        [
          c("半分", "はんぶん", "hanbun", "yarım", "half"),
          c("自分", "じぶん", "jibun", "kendi", "oneself"),
          c("何分", "なんぷん", "nanpun", "kaç dakika", "how many minutes"),
        ],
      ),
      k(
        "半",
        ["yarım", "half"],
        [
          "Saatlerde (10時半: on buçuk) ve indirim etiketlerinde (半額).",
          "In times (10時半: half past ten) and discount labels (半額).",
        ],
        [
          c("半額", "はんがく", "hangaku", "yarı fiyat", "half price"),
          c("半分", "はんぶん", "hanbun", "yarım", "half"),
          c("半日", "はんにち", "hannichi", "yarım gün", "half a day"),
        ],
      ),
      k(
        "午",
        ["öğle", "noon"],
        [
          "Çalışma saatlerinde: 午前 (öğleden önce), 午後 (öğleden sonra).",
          "In business hours: 午前 (a.m.), 午後 (p.m.).",
        ],
        [
          c("午前", "ごぜん", "gozen", "öğleden önce", "a.m., morning"),
          c("午後", "ごご", "gogo", "öğleden sonra", "p.m., afternoon"),
          c("正午", "しょうご", "shougo", "öğle vakti (12:00)", "noon"),
        ],
      ),
      k(
        "前",
        ["ön, önce", "front, before"],
        [
          "Saatlerde (午前), yer adlarında (駅前) ve formlarda (名前).",
          "In times (午前), place names (駅前) and on forms (名前).",
        ],
        [
          c("駅前", "えきまえ", "ekimae", "istasyon önü", "in front of the station"),
          c("名前", "なまえ", "namae", "isim", "name"),
          c("前売り券", "まえうりけん", "maeuriken", "ön satış bileti", "advance ticket"),
          c("午前", "ごぜん", "gozen", "öğleden önce", "a.m."),
        ],
      ),
      k(
        "後",
        ["arka, sonra", "behind, after"],
        [
          "Saatlerde (午後) ve kuyruk tabelalarında (最後尾: sıranın sonu).",
          "In times (午後) and queue signs (最後尾: end of the line).",
        ],
        [
          c("午後", "ごご", "gogo", "öğleden sonra", "p.m."),
          c("後ろ", "うしろ", "ushiro", "arka", "behind"),
          c("最後", "さいご", "saigo", "son", "last"),
          c("最後尾", "さいこうび", "saikoubi", "sıranın sonu", "end of the line"),
        ],
      ),
    ],
    signs: [
      s("shop", "営業時間 11:00-22:00", "Çalışma saatleri 11.00-22.00", "Business hours 11:00-22:00"),
      s("shop", "定休日 月曜日", "Pazartesi günleri kapalı", "Closed on Mondays"),
      s("shop", "土日祝 休み", "Hafta sonu ve tatillerde kapalı", "Closed weekends and holidays"),
      s("info", "時刻表", "Tarife", "Timetable", "Timetable"),
      s("info", "徒歩5分", "Yürüyerek 5 dakika", "5 minutes on foot", "5 min walk", "right"),
      s("info", "最後尾", "Sıranın sonu", "End of the line", "End of Line"),
      s("ticket", "午後3時", "Öğleden sonra saat 3", "3 p.m."),
    ],
  },
];
