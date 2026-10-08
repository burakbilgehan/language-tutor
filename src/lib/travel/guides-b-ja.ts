// Japan travel guides, set B (T-100): restaurant, konbini, stay, keigo,
// sightseeing, emergency. Authored, static, zero LLM; bundled with /travel so
// the service worker precaches it for offline use.
//
// Japanese strings use bracket furigana (漢字[かんじ]); SignMock `jp` is plain
// text exactly as printed. Romaji is Hepburn with ou/uu long vowels.

import type { DialogueLine, Guide, GuideBlock, L, Phrase, SignMock, SignStyle } from "./types";

const l = (tr: string, en: string): L => ({ tr, en });

const heading = (tr: string, en: string): GuideBlock => ({ type: "heading", text: l(tr, en) });
const text = (tr: string, en: string): GuideBlock => ({ type: "text", body: l(tr, en) });
const tip = (tr: string, en: string): GuideBlock => ({ type: "tip", body: l(tr, en) });

type Reply = NonNullable<Phrase["reply"]>;
const rp = (jp: string, romaji: string, tr: string, en: string): Reply => ({
  jp,
  romaji,
  meaning: l(tr, en),
});

const ph = (
  jp: string,
  romaji: string,
  tr: string,
  en: string,
  extra?: { note?: L; hear?: boolean; reply?: Reply }
): Phrase => ({ jp, romaji, meaning: l(tr, en), ...extra });

const staff = (jp: string, romaji: string, tr: string, en: string): DialogueLine => ({
  who: "staff",
  jp,
  romaji,
  meaning: l(tr, en),
});
const you = (jp: string, romaji: string, tr: string, en: string): DialogueLine => ({
  who: "you",
  jp,
  romaji,
  meaning: l(tr, en),
});

const sign = (
  style: SignStyle,
  jp: string,
  tr: string,
  en: string,
  extra?: { sub?: string; arrow?: SignMock["arrow"] }
): SignMock => ({ style, jp, meaning: l(tr, en), ...extra });

const step = (
  titleTr: string,
  titleEn: string,
  bodyTr: string,
  bodyEn: string,
  jp?: { jp: string; romaji: string }
) => ({ title: l(titleTr, titleEn), body: l(bodyTr, bodyEn), ...jp });

// ---------------------------------------------------------------------------
// 1. Restaurant
// ---------------------------------------------------------------------------

const restaurant: Guide = {
  key: "restaurant",
  icon: "🍜",
  title: l("Restoran: kapıdan hesaba", "Restaurants: from the door to the bill"),
  summary: l(
    "Sıra beklemekten bilet makinesine, menü okumaktan domuz etinden kaçınmaya ve hesabı ödemeye kadar Japonya'da yemek yemenin tüm adımları.",
    "Every step of eating out in Japan: queueing, ticket machines, reading menus, avoiding pork, and paying the bill."
  ),
  blocks: [
    text(
      "Popüler restoranların önünde düzenli bir sıra olur; sıranın sonuna geç ve bekle. Bazı yerlerde kapıda bir liste ya da tablet vardır: adını (Latin harfleriyle yazabilirsin) ve kişi sayısını yazarsın, seni çağırırlar. İçeri girdiğinde personel yüksek sesle **いらっしゃいませ** der; bu bir selamlamadır, cevap vermen gerekmez. Hemen ardından **何名様[なんめいさま]ですか** (kaç kişisiniz?) sorusu gelir. Cevap vermenin en kolay yolu parmakla göstermek ve sayıyı söylemek: 一人[ひとり] (1), 二人[ふたり] (2), 三人[さんにん] (3). Japonlar da çoğu zaman parmakla gösterir.",
      "Popular restaurants have an orderly queue outside; join the end and wait. Some places have a list or tablet at the door: write your name (Latin letters are fine) and party size, and they will call you. As you enter, staff call out **いらっしゃいませ**; it is a greeting, you do not need to answer. Right after comes **何名様[なんめいさま]ですか** (how many people?). The easiest answer is to hold up fingers and say the number: 一人[ひとり] (1), 二人[ふたり] (2), 三人[さんにん] (3). Japanese customers often show fingers too."
    ),
    {
      type: "dialogue",
      title: l("Kapıda karşılanma", "Being greeted at the door"),
      lines: [
        staff("いらっしゃいませ！何名様[なんめいさま]ですか。", "irasshaimase! nanmei sama desu ka.", "Hoş geldiniz! Kaç kişisiniz?", "Welcome! How many people?"),
        you("二人[ふたり]です。", "futari desu.", "İki kişiyiz.", "Two people."),
        staff("お煙草[たばこ]はお吸[す]いになりますか。", "otabako wa osui ni narimasu ka.", "Sigara içiyor musunuz?", "Do you smoke?"),
        you("いいえ、禁煙席[きんえんせき]でお願[ねが]いします。", "iie, kin'en seki de onegai shimasu.", "Hayır, sigara içilmeyen bölüm lütfen.", "No, non-smoking please."),
        staff("カウンター席[せき]でもよろしいですか。", "kauntaa seki demo yoroshii desu ka.", "Tezgâh (bar) önü olur mu?", "Is the counter okay?"),
        you("テーブル席[せき]はありますか。", "teeburu seki wa arimasu ka.", "Masa var mı?", "Do you have a table?"),
        staff("少々[しょうしょう]お待[ま]ちいただきますが、よろしいですか。", "shoushou omachi itadakimasu ga, yoroshii desu ka.", "Biraz beklemeniz gerekecek, olur mu?", "You will have to wait a little; is that okay?"),
        you("はい、大丈夫[だいじょうぶ]です。", "hai, daijoubu desu.", "Evet, sorun değil.", "Yes, that's fine."),
        staff("こちらへどうぞ。", "kochira e douzo.", "Buyurun, bu taraftan.", "This way, please."),
      ],
    },
    text(
      "**カウンター** (tezgâh önü) genellikle tek başına ya da iki kişi gelenler için hızlı ve samimidir; aşçıyı izlersin. **テーブル** masa demek; grupla daha rahat. **座敷[ざしき]** ya da **小上[こあ]がり** tatami üzerinde oturulan bölümdür; oraya çıkmadan ayakkabını çıkar. 2020'den beri iç mekânlarda sigara büyük ölçüde yasak, ama bazı küçük izakaya ve kafelerde hâlâ içilebiliyor; kapıdaki **喫煙可[きつえんか]** ya da **禁煙[きんえん]** etiketine bak.",
      "**カウンター** (counter) is usually quick and friendly for solo diners or pairs; you watch the cook. **テーブル** means table; easier for groups. **座敷[ざしき]** or **小上[こあ]がり** is a raised tatami area; take your shoes off before stepping up. Indoor smoking has been largely banned since 2020, but some small izakaya and cafés still allow it; check for a **喫煙可[きつえんか]** or **禁煙[きんえん]** sticker at the door."
    ),
    {
      type: "signs",
      title: l("Kapıda ve içeride göreceklerin", "What you will see at the door and inside"),
      items: [
        sign("shop", "営業中", "Açık", "Open"),
        sign("shop", "準備中", "Hazırlık; şu an kapalı", "Preparing; closed for now"),
        sign("noren", "らーめん", "Ramen dükkânı (kapı perdesi)", "Ramen shop (door curtain)"),
        sign("warning", "禁煙", "Sigara içilmez", "No smoking"),
        sign("info", "喫煙可", "Sigara içilebilir", "Smoking allowed"),
        sign("info", "食券をお買い求めください", "Lütfen önce bilet makinesinden bilet alın", "Please buy a meal ticket first"),
        sign("ticket", "お会計はレジにて", "Ödeme kasada", "Pay at the register"),
      ],
    },
    heading("Bilet makinesi (食券機[しょっけんき]) olan dükkânlar", "Shops with a ticket machine (食券機[しょっけんき])"),
    text(
      "Ramen, soba, gyuudon zincirleri ve ucuz yerlerin çoğunda sipariş girişteki **食券機[しょっけんき]** ile verilir. Makineden yemeğini seçip parayı ödersin, çıkan küçük bileti personele verirsin. Butonlarda genellikle fotoğraf olur; bazı makinelerde **English** düğmesi de vardır. Yeni makineler kart ve IC kart (Suica gibi) kabul eder, eskileri sadece nakit ve bazen 10.000 yen banknot almaz.",
      "Ramen, soba and gyudon chains and most cheap places take orders through a **食券機[しょっけんき]** at the entrance. You pick your dish on the machine, pay, and hand the small ticket to staff. Buttons usually have photos; some machines have an **English** button. Newer machines take cards and IC cards (like Suica); older ones are cash only and some reject 10,000 yen notes."
    ),
    {
      type: "steps",
      title: l("Bilet makinesi adım adım", "Ticket machine step by step"),
      steps: [
        step("Para ya da kart", "Money or card", "Önce parayı makineye at ya da ödeme yöntemini seç. Birçok makinede para atmadan butonlar yanmaz.", "Insert money first or choose the payment method. On many machines the buttons do not light up until you pay in.", { jp: "お金[かね]を入[い]れる", romaji: "okane o ireru" }),
        step("Ana yemeği seç", "Pick the main dish", "Büyük butonlar genellikle ana yemeklerdir; sol üstteki çoğu zaman dükkânın en meşhur yemeğidir.", "Big buttons are usually main dishes; the top-left one is often the house specialty."),
        step("Ekstraları ekle", "Add extras", "Yumurta (味玉[あじたま]), ekstra erişte (替[か]え玉[だま]), büyük porsiyon (大[おお]盛[も]り) gibi ekler ayrı butonlardır; her biri ayrı bilet çıkarır.", "Extras such as egg (味玉[あじたま]), extra noodles (替[か]え玉[だま]) or large size (大[おお]盛[も]り) are separate buttons; each prints its own ticket."),
        step("Para üstünü al", "Take your change", "Para üstü için **おつり** düğmesine bas. Unutmak çok yaygın.", "Press the **おつり** button for change. Forgetting it is very common.", { jp: "おつり", romaji: "otsuri" }),
        step("Bileti ver", "Hand over the ticket", "Oturduğunda bileti tezgâhın üstüne koy ya da personele ver. Personel erişte sertliğini sorabilir.", "When seated, put the tickets on the counter or give them to staff. They may ask how firm you want the noodles."),
      ],
    },
    {
      type: "dialogue",
      title: l("Ramen dükkânında bilet verince", "Handing over your ticket at a ramen shop"),
      lines: [
        staff("食券[しょっけん]お預[あず]かりします。", "shokken oazukari shimasu.", "Biletinizi alıyorum.", "I'll take your ticket."),
        staff("麺[めん]の硬[かた]さはどうしますか。", "men no katasa wa dou shimasu ka.", "Erişte sertliği nasıl olsun?", "How firm would you like the noodles?"),
        you("普通[ふつう]でお願[ねが]いします。", "futsuu de onegai shimasu.", "Normal olsun lütfen.", "Regular, please."),
        staff("ニンニク入[い]れますか。", "ninniku iremasu ka.", "Sarımsak koyalım mı?", "Shall I add garlic?"),
        you("少[すこ]しだけお願[ねが]いします。", "sukoshi dake onegai shimasu.", "Biraz lütfen.", "Just a little, please."),
        staff("お待[ま]たせしました。熱[あつ]いのでお気[き]をつけください。", "omatase shimashita. atsui node oki o tsuke kudasai.", "Buyurun. Sıcak, dikkat edin.", "Here you are. It's hot, so be careful."),
        you("いただきます。", "itadakimasu.", "İtadakimasu (yemeğe başlarken kendin söylersin).", "Itadakimasu (said before eating)."),
      ],
    },
    {
      type: "table",
      title: l("Menüde sık geçen kelimeler", "Common menu words"),
      columns: [l("Japonca", "Japanese"), l("Okunuş", "Romaji"), l("Anlamı", "Meaning")],
      rows: [
        ["定食[ていしょく]", "teishoku", l("Set menü: ana yemek + pilav + miso çorbası + turşu", "Set meal: main + rice + miso soup + pickles")],
        ["丼[どんぶり] / 〜丼[どん]", "donburi / -don", l("Kâse pilav, üstünde et/balık/yumurta", "Rice bowl with a topping")],
        ["単品[たんぴん]", "tanpin", l("Tek başına (set değil)", "À la carte (not a set)")],
        ["セット", "setto", l("Set (yanında içecek/garnitür)", "Set (with a side or drink)")],
        ["大[おお]盛[も]り / 並[なみ] / 小盛[こも]り", "oomori / nami / komori", l("Büyük / normal / küçük porsiyon", "Large / regular / small portion")],
        ["税込[ぜいこみ]", "zeikomi", l("Vergi dahil fiyat", "Price including tax")],
        ["税抜[ぜいぬき] / 税別[ぜいべつ]", "zeinuki / zeibetsu", l("Vergi hariç fiyat; kasada daha fazla ödersin", "Price excluding tax; you will pay more at the register")],
        ["おすすめ", "osusume", l("Önerilen, dükkânın tavsiyesi", "Recommended")],
        ["限定[げんてい]", "gentei", l("Sınırlı (sezonluk ya da günlük)", "Limited (seasonal or daily)")],
        ["日替[ひが]わり", "higawari", l("Günün yemeği", "Daily special")],
        ["お代[か]わり自由[じゆう]", "okawari jiyuu", l("Ücretsiz tekrar (genelde pilav)", "Free refills (usually rice)")],
        ["食[た]べ放題[ほうだい] / 飲[の]み放題[ほうだい]", "tabehoudai / nomihoudai", l("Açık büfe yemek / sınırsız içecek (süreli)", "All you can eat / all you can drink (timed)")],
        ["ランチ", "ranchi", l("Öğle menüsü; akşamdan ucuz", "Lunch menu; cheaper than dinner")],
      ],
    },
    heading("Sipariş vermek ve personeli çağırmak", "Ordering and calling staff"),
    text(
      "Masada sipariş için personel kendiliğinden gelmezse elini hafifçe kaldırıp **すみません** demen tamamen normal; kaba sayılmaz. Bazı masalarda bir çağırma düğmesi vardır; ona bas, gelirler. Giderek daha çok yerde sipariş masadaki **tablet** ya da **QR kod** ile verilir: QR'ı telefonla okutursun, menü açılır, dil seçebilirsin, sepete ekleyip gönderirsin.",
      "If staff do not come by on their own, raising your hand slightly and saying **すみません** is completely normal, not rude. Some tables have a call button; press it and someone will come. More and more places take orders through a **tablet** or a **QR code** on the table: scan it with your phone, the menu opens, you can switch language, add to cart and send."
    ),
    tip(
      "Oturunca gelen ıslak havlu **おしぼり** ellerini silmek içindir, yüzünü değil. Su ya da yeşil çay (お茶[ちゃ]) çoğu yerde ücretsizdir ve sınırsız dolar; bazı yerlerde sürahi ya da self-servis köşe vardır.",
      "The wet towel you get when seated, **おしぼり**, is for your hands, not your face. Water or green tea (お茶[ちゃ]) is free in most places and refilled freely; some places have a jug or a self-service corner."
    ),
    {
      type: "phrases",
      title: l("Sipariş kalıpları", "Ordering phrases"),
      items: [
        ph("すみません！", "sumimasen!", "Affedersiniz! (personeli çağırmak)", "Excuse me! (calling staff)", {
          reply: rp("はい、ただいま！", "hai, tadaima!", "Evet, hemen geliyorum!", "Yes, coming right away!"),
        }),
        ph("英語[えいご]のメニューはありますか。", "eigo no menyuu wa arimasu ka.", "İngilizce menü var mı?", "Do you have an English menu?", {
          reply: rp("はい、こちらです。", "hai, kochira desu.", "Evet, buyurun.", "Yes, here you are."),
        }),
        ph("これをください。", "kore o kudasai.", "Bunu istiyorum.", "This one, please.", {
          note: l("Menüdeki fotoğrafı parmağınla göster.", "Point at the photo on the menu."),
        }),
        ph("これを二[ふた]つください。", "kore o futatsu kudasai.", "Bundan iki tane lütfen.", "Two of these, please."),
        ph("おすすめは何[なん]ですか。", "osusume wa nan desu ka.", "Ne tavsiye edersiniz?", "What do you recommend?", {
          reply: rp("こちらの定食[ていしょく]が人気[にんき]です。", "kochira no teishoku ga ninki desu.", "Bu set menü çok seviliyor.", "This set meal is popular."),
        }),
        ph("大[おお]盛[も]りにできますか。", "oomori ni dekimasu ka.", "Büyük porsiyon yapabilir misiniz?", "Can I get a large portion?"),
        ph("以上[いじょう]です。", "ijou desu.", "Bu kadar (sipariş bitti).", "That's all."),
        ph("ご注文[ちゅうもん]はお決[き]まりですか。", "gochuumon wa okimari desu ka.", "Siparişinize karar verdiniz mi?", "Have you decided on your order?", {
          hear: true,
          reply: rp("もう少[すこ]し待[ま]ってください。", "mou sukoshi matte kudasai.", "Biraz daha bekleyin lütfen.", "Please give me a little more time."),
        }),
        ph("お水[みず]をください。", "omizu o kudasai.", "Su alabilir miyim?", "Water, please."),
        ph("取[と]り皿[ざら]をください。", "torizara o kudasai.", "Paylaşım tabağı alabilir miyim?", "Could I have small plates for sharing?"),
        ph("お箸[はし]をもう一[ひと]つください。", "ohashi o mou hitotsu kudasai.", "Bir çift yemek çubuğu daha lütfen.", "One more pair of chopsticks, please."),
        ph("フォークはありますか。", "fooku wa arimasu ka.", "Çatal var mı?", "Do you have a fork?"),
      ],
    },
    heading("Alerji ve kısıtlamalar: domuz eti, alkol, deniz ürünü", "Allergies and restrictions: pork, alcohol, seafood"),
    text(
      "Japon mutfağında domuz eti beklemediğin yerlerde çıkar: **豚骨[とんこつ]** ramen suyu domuz kemiğidir, **チャーシュー** domuz etidir, **餃子[ぎょうざ]** çoğunlukla domuz kıymalıdır, **ラード** domuz yağıdır. Birçok yemeğin suyunda balık özütü (**だし**) ve tatlandırıcı olarak **みりん** ya da **酒[さけ]** bulunur. Personel genelde yardımcı olur, ama karmaşık soruları anlamayabilir; kısa ve net söyle.",
      "Pork shows up where you might not expect it in Japanese food: **豚骨[とんこつ]** ramen broth is pork bone, **チャーシュー** is pork, **餃子[ぎょうざ]** are usually pork-filled, **ラード** is lard. Many dishes use fish stock (**だし**) and **みりん** or **酒[さけ]** (cooking alcohol) for flavour. Staff are usually helpful but may not follow complex questions; keep it short and clear."
    ),
    {
      type: "phrases",
      title: l("Kısıtlamanı anlatmak", "Explaining your restriction"),
      items: [
        ph("豚肉[ぶたにく]が食[た]べられません。", "butaniku ga taberaremasen.", "Domuz eti yiyemiyorum.", "I can't eat pork."),
        ph("これに豚肉[ぶたにく]は入[はい]っていますか。", "kore ni butaniku wa haitte imasu ka.", "Bunda domuz eti var mı?", "Does this contain pork?", {
          reply: rp("はい、入[はい]っています。", "hai, haitte imasu.", "Evet, var.", "Yes, it does."),
        }),
        ph("豚肉[ぶたにく]なしでできますか。", "butaniku nashi de dekimasu ka.", "Domuz etisiz yapabilir misiniz?", "Can you make it without pork?", {
          reply: rp("申[もう]し訳[わけ]ございません、できません。", "moushiwake gozaimasen, dekimasen.", "Çok üzgünüz, yapamıyoruz.", "We're very sorry, we can't."),
        }),
        ph("スープに豚[ぶた]は使[つか]っていますか。", "suupu ni buta wa tsukatte imasu ka.", "Çorbada (suda) domuz kullanılıyor mu?", "Is pork used in the broth?", {
          note: l("Ramen için en önemli soru: et koymasan bile su domuzdan olabilir.", "The key question for ramen: the broth can be pork even if you skip the meat."),
        }),
        ph("お酒[さけ]が飲[の]めません。", "osake ga nomemasen.", "Alkol içemiyorum.", "I can't drink alcohol."),
        ph("アルコールは入[はい]っていますか。", "arukooru wa haitte imasu ka.", "Alkol var mı?", "Does it contain alcohol?"),
        ph("魚介類[ぎょかいるい]のアレルギーがあります。", "gyokairui no arerugii ga arimasu.", "Deniz ürünü alerjim var.", "I'm allergic to seafood."),
        ph("えびとかにが食[た]べられません。", "ebi to kani ga taberaremasen.", "Karides ve yengeç yiyemiyorum.", "I can't eat shrimp or crab."),
        ph("アレルギー表[ひょう]はありますか。", "arerugii hyou wa arimasu ka.", "Alerjen tablosu var mı?", "Do you have an allergen chart?", {
          note: l("Zincir restoranlarda genelde vardır; 豚肉[ぶたにく] sütununa bak.", "Chain restaurants usually have one; check the 豚肉[ぶたにく] column."),
        }),
        ph("ハラールのメニューはありますか。", "haraaru no menyuu wa arimasu ka.", "Helal menü var mı?", "Do you have a halal menu?"),
        ph("ベジタリアンです。", "bejitarian desu.", "Vejetaryenim.", "I'm vegetarian."),
      ],
    },
    {
      type: "table",
      title: l("Domuz eti uyarı kelimeleri", "Pork warning words"),
      columns: [l("Japonca", "Japanese"), l("Okunuş", "Romaji"), l("Ne demek", "What it is")],
      rows: [
        ["豚[ぶた] / 豚肉[ぶたにく]", "buta / butaniku", l("Domuz / domuz eti", "Pig / pork")],
        ["ポーク", "pooku", l("Domuz eti (İngilizceden)", "Pork (loanword)")],
        ["豚骨[とんこつ]", "tonkotsu", l("Domuz kemiği suyu (ramen)", "Pork bone broth (ramen)")],
        ["チャーシュー", "chaashuu", l("Haşlanmış/kızartılmış domuz dilimi", "Braised pork slices")],
        ["とんかつ", "tonkatsu", l("Pane domuz pirzolası", "Breaded pork cutlet")],
        ["生姜焼[しょうがや]き", "shougayaki", l("Zencefilli domuz (genellikle)", "Ginger pork (usually)")],
        ["豚汁[とんじる]", "tonjiru", l("Domuz etli miso çorbası", "Miso soup with pork")],
        ["ベーコン / ハム", "beekon / hamu", l("Domuz pastırması / jambon", "Bacon / ham")],
        ["ラード", "raado", l("Domuz yağı", "Lard")],
        ["餃子[ぎょうざ]", "gyouza", l("Mantı; içi çoğunlukla domuz", "Dumplings; usually pork")],
        ["カツ丼[どん]", "katsudon", l("Pane domuzlu pilav kâsesi", "Pork cutlet rice bowl")],
      ],
    },
    tip(
      "Domuzdan kaçınmak için güvenli liman genellikle **牛丼[ぎゅうどん]** (dana), **親子丼[おやこどん]** (tavuk ve yumurta), **焼[や]き鳥[とり]** (tavuk şiş; sosu sor, karışık tabakta domuz şiş 豚[ぶた]バラ olabilir), **寿司[すし]**, **天[てん]ぷら** ve **うどん/そば** (su balık bazlıdır, domuz değil). Yine de emin olmak için sor.",
      "Safe havens for avoiding pork are usually **牛丼[ぎゅうどん]** (beef), **親子丼[おやこどん]** (chicken and egg), **焼[や]き鳥[とり]** (chicken skewers; ask about the sauce, and an assorted plate may include pork belly, 豚[ぶた]バラ), **寿司[すし]**, **天[てん]ぷら** and **うどん/そば** (broth is fish-based, not pork). Still ask to be sure."
    ),
    heading("İzakaya: Japon meyhanesi", "Izakaya: the Japanese pub"),
    text(
      "İzakaya'da oturur oturmaz sipariş etmediğin küçük bir meze gelir: **お通[とお]し**. Bu bir ikram değil, kişi başı bir masa ücretidir ve hesaba eklenir; reddetmek pek yapılmaz. İlk içecekler gelince herkes bardağını kaldırıp **乾杯[かんぱい]** der. Yemekler küçük tabaklarda gelir ve paylaşılır. Kapanışa doğru personel **ラストオーダー** der: son sipariş zamanı. Alkol içmiyorsan izakaya'da da rahatsın: **ウーロン茶[ちゃ]**, **ジンジャーエール**, **ノンアルコール** içecekler her yerde var. Tuzlu tavuk şiş (塩[しお]) sosluya göre daha güvenli; tare sosunda mirin olur.",
      "At an izakaya a small appetiser you did not order arrives as soon as you sit down: **お通[とお]し**. It is not a gift; it is a per-person table charge added to the bill, and refusing it is not really done. When the first drinks arrive, everyone raises their glass and says **乾杯[かんぱい]**. Dishes come on small plates and are shared. Near closing, staff announce **ラストオーダー**: last orders. Not drinking alcohol is fine at an izakaya too: **ウーロン茶[ちゃ]**, **ジンジャーエール** and **ノンアルコール** drinks are everywhere. Salt-seasoned yakitori (塩[しお]) is the safer choice; tare sauce contains mirin."
    ),
    {
      type: "dialogue",
      title: l("İzakaya'da", "At an izakaya"),
      lines: [
        staff("お飲[の]み物[もの]は何[なに]になさいますか。", "onomimono wa nani ni nasaimasu ka.", "İçecek olarak ne alırsınız?", "What would you like to drink?"),
        you("ウーロン茶[ちゃ]を二[ふた]つください。", "uuroncha o futatsu kudasai.", "İki oolong çayı lütfen.", "Two oolong teas, please."),
        staff("こちら、お通[とお]しです。", "kochira, otooshi desu.", "Bu da mezeniz (masa ücreti).", "Here is your otoshi (table appetiser)."),
        you("これは何[なん]ですか。", "kore wa nan desu ka.", "Bu ne?", "What is this?"),
        staff("きんぴらごぼうです。", "kinpira gobou desu.", "Soya soslu dulavratotu kökü.", "Braised burdock root."),
        you("焼[や]き鳥[とり]の盛[も]り合[あ]わせと枝豆[えだまめ]をください。", "yakitori no moriawase to edamame o kudasai.", "Karışık tavuk şiş ve edamame lütfen.", "An assorted yakitori plate and edamame, please."),
        staff("焼[や]き鳥[とり]はタレと塩[しお]、どちらにしますか。", "yakitori wa tare to shio, dochira ni shimasu ka.", "Tavuk şiş soslu mu tuzlu mu olsun?", "Sauce or salt for the yakitori?"),
        you("塩[しお]でお願[ねが]いします。", "shio de onegai shimasu.", "Tuzlu lütfen.", "Salt, please."),
        staff("そろそろラストオーダーですが、ご注文[ちゅうもん]はよろしいですか。", "sorosoro rasuto oodaa desu ga, gochuumon wa yoroshii desu ka.", "Son sipariş zamanı yaklaşıyor; başka bir şey alır mısınız?", "It's nearly last orders; anything else?"),
        you("大丈夫[だいじょうぶ]です。お会計[かいけい]お願[ねが]いします。", "daijoubu desu. okaikei onegai shimasu.", "Yok, teşekkürler. Hesap lütfen.", "We're fine. The bill, please."),
      ],
    },
    heading("Hesap ve çıkış", "The bill and leaving"),
    text(
      "Çoğu restoranda ödeme masada değil, kapının yanındaki kasada (**レジ**) yapılır. Masaya bırakılan hesap fişini (伝票[でんぴょう]) alıp kasaya götür. Bazı izakaya ve daha şık yerlerde ödeme masada olur; o zaman **お会計[かいけい]お願[ねが]いします** de ya da havada parmaklarınla küçük bir X işareti yap. Ayrı ödemek istiyorsanız **別々[べつべつ]で** de. Japonya'da **bahşiş yoktur**; masaya para bırakırsan peşinden koşup geri getirebilirler.",
      "In most restaurants you pay not at the table but at the **レジ** (register) by the door. Take the bill slip left on your table (伝票[でんぴょう]) to the register. At some izakaya and nicer places you pay at the table; then say **お会計[かいけい]お願[ねが]いします** or make a small X with your fingers. To pay separately, say **別々[べつべつ]で**. There is **no tipping** in Japan; if you leave money on the table, staff may run after you to return it."
    ),
    tip(
      "Çıkarken **ごちそうさまでした** demek çok makbuldür; küçük dükkânlarda aşçı bundan gerçekten hoşlanır. Ramen dükkânında boş kâseyi tezgâhın üstüne koymak da ince bir teşekkür sayılır.",
      "Saying **ごちそうさまでした** on the way out is much appreciated; at small shops the cook genuinely enjoys it. At a ramen counter, putting your empty bowl up on the counter top is a quiet thank-you too."
    ),
    {
      type: "dialogue",
      title: l("Kasada ödeme", "Paying at the register"),
      lines: [
        you("お会計[かいけい]お願[ねが]いします。", "okaikei onegai shimasu.", "Hesap lütfen.", "The bill, please."),
        staff("お会計[かいけい]、ご一緒[いっしょ]でよろしいですか。", "okaikei, goissho de yoroshii desu ka.", "Hesap birlikte mi olsun?", "One bill together?"),
        you("別々[べつべつ]でお願[ねが]いします。", "betsubetsu de onegai shimasu.", "Ayrı ayrı lütfen.", "Separately, please."),
        staff("千[せん]二百[にひゃく]円[えん]になります。", "sen nihyaku en ni narimasu.", "1.200 yen tutuyor.", "That comes to 1,200 yen."),
        you("カードで払[はら]えますか。", "kaado de haraemasu ka.", "Kartla ödeyebilir miyim?", "Can I pay by card?"),
        staff("はい、こちらにタッチしてください。", "hai, kochira ni tacchi shite kudasai.", "Evet, buraya dokundurun lütfen.", "Yes, please tap here."),
        staff("ありがとうございました。", "arigatou gozaimashita.", "Teşekkür ederiz.", "Thank you very much."),
        you("ごちそうさまでした。", "gochisousama deshita.", "Elinize sağlık, çok güzeldi.", "Thank you for the meal."),
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// 2. Konbini
// ---------------------------------------------------------------------------

const konbini: Guide = {
  key: "konbini",
  icon: "🏪",
  title: l("Konbini: 24 saatlik kurtarıcı", "Konbini: the 24-hour lifesaver"),
  summary: l(
    "7-Eleven, Lawson, FamilyMart: yemek, ATM, bilet, çıktı ve tuvalet. Kasada duyacağın sorular, ödeme ve çöp kuralları.",
    "7-Eleven, Lawson, FamilyMart: food, ATMs, tickets, printing and toilets. The questions you will hear at the till, payment and trash rules."
  ),
  blocks: [
    heading("Konbini'de neler var?", "What a konbini offers"),
    text(
      "**コンビニ** (convenience store) her köşede ve çoğu 24 saat açık. Sadece atıştırmalık değil: taze **お弁当[べんとう]**, sıcak yemekler, kahve, ilaç dışı temel bakım ürünleri, şarj kablosu, şemsiye ve iç çamaşırı bulursun. Ayrıca **ATM**, fotokopi/çıktı makinesi (マルチコピー機[き]), bazı etkinlik ve müze biletleri, kargo ve fatura ödeme gibi hizmetler de var.",
      "**コンビニ** (convenience stores) are on every corner and most are open 24 hours. Not just snacks: you will find fresh **お弁当[べんとう]** (boxed meals), hot food, coffee, basic toiletries, charging cables, umbrellas and underwear. There are also **ATMs**, copy/print machines (マルチコピー機[き]), some event and museum tickets, parcel shipping and bill payment."
    ),
    tip(
      "Yabancı kartla nakit çekmek için en güvenilir yer genellikle 7-Eleven'daki **セブン銀行[ぎんこう]** ATM'leridir; ekranda İngilizce seçeneği olur. Diğer konbini ATM'leri de çoğu zaman çalışır ama kartına göre değişir.",
      "The most reliable place to withdraw cash with a foreign card is usually the **セブン銀行[ぎんこう]** ATM at 7-Eleven; the screen has an English option. Other konbini ATMs often work too, depending on your card."
    ),
    text(
      "Çoğu konbinide müşteri tuvaleti vardır, ama özellikle şehir merkezlerinde bazıları güvenlik için kapalıdır. Kullanmadan önce sormak naziktir ve bir şey satın almak da güzel bir jest olur.",
      "Most konbini have a customer toilet, though some in city centres keep it closed for security. It is polite to ask before using it, and buying something is a nice gesture."
    ),
    {
      type: "phrases",
      title: l("Mağazada sorular", "Questions in the store"),
      items: [
        ph("トイレをお借[か]りしてもいいですか。", "toire o okari shite mo ii desu ka.", "Tuvaleti kullanabilir miyim?", "May I use the toilet?", {
          reply: rp("はい、奥[おく]にございます。", "hai, oku ni gozaimasu.", "Evet, arkada.", "Yes, it's at the back."),
        }),
        ph("ATMはどこですか。", "eetiiemu wa doko desu ka.", "ATM nerede?", "Where is the ATM?"),
        ph("充電器[じゅうでんき]はありますか。", "juudenki wa arimasu ka.", "Şarj aleti var mı?", "Do you have a charger?"),
        ph("傘[かさ]はどこですか。", "kasa wa doko desu ka.", "Şemsiye nerede?", "Where are the umbrellas?"),
        ph("Wi-Fiは使[つか]えますか。", "waifai wa tsukaemasu ka.", "Wi-Fi kullanabilir miyim?", "Can I use Wi-Fi?"),
        ph("コピー機[き]の使[つか]い方[かた]を教[おし]えてください。", "kopiiki no tsukaikata o oshiete kudasai.", "Fotokopi makinesini nasıl kullanacağımı gösterir misiniz?", "Could you show me how to use the copier?"),
      ],
    },
    heading("Kasada duyacağın sorular", "Questions you will hear at the till"),
    text(
      "Kasiyer birkaç standart soruyu çok hızlı sorar. İyi haber: hepsine **はい、お願[ねが]いします** (evet lütfen) ya da **大丈夫[だいじょうぶ]です** (gerek yok) diyerek cevap verebilirsin. **大丈夫[だいじょうぶ]です** burada nazik bir \"hayır, teşekkürler\" anlamındadır.",
      "The cashier asks a few standard questions very fast. Good news: you can answer all of them with **はい、お願[ねが]いします** (yes please) or **大丈夫[だいじょうぶ]です** (no need). Here **大丈夫[だいじょうぶ]です** works as a polite \"no, thanks\"."
    ),
    {
      type: "phrases",
      title: l("Kasiyerin soruları ve cevapların", "Cashier questions and your answers"),
      items: [
        ph("温[あたた]めますか。", "atatamemasu ka.", "Isıtayım mı?", "Shall I heat it up?", {
          hear: true,
          note: l("Bento, makarna ve ısıtılabilen diğer yemeklerde sorulur; mikrodalgada ısıtırlar.", "Asked for bento, pasta and other heatable food; they microwave it for you."),
          reply: rp("はい、お願[ねが]いします。", "hai, onegai shimasu.", "Evet, lütfen.", "Yes, please."),
        }),
        ph("お箸[はし]おつけしますか。", "ohashi otsuke shimasu ka.", "Yemek çubuğu koyayım mı?", "Shall I add chopsticks?", {
          hear: true,
          reply: rp("はい、一膳[いちぜん]お願[ねが]いします。", "hai, ichizen onegai shimasu.", "Evet, bir çift lütfen.", "Yes, one pair please."),
        }),
        ph("スプーンおつけしますか。", "supuun otsuke shimasu ka.", "Kaşık koyayım mı?", "Shall I add a spoon?", {
          hear: true,
          reply: rp("大丈夫[だいじょうぶ]です。", "daijoubu desu.", "Gerek yok.", "No need."),
        }),
        ph("袋[ふくろ]はご利用[りよう]ですか。", "fukuro wa goriyou desu ka.", "Poşet ister misiniz?", "Would you like a bag?", {
          hear: true,
          note: l("Poşetler küçük bir ücrete tabi. Bazen sadece \"袋[ふくろ]は？\" derler.", "Bags cost a small fee. Sometimes they just say \"袋[ふくろ]は？\"."),
          reply: rp("袋[ふくろ]はいりません。", "fukuro wa irimasen.", "Poşet istemiyorum.", "I don't need a bag."),
        }),
        ph("ポイントカードはお持[も]ちですか。", "pointo kaado wa omochi desu ka.", "Puan kartınız var mı?", "Do you have a points card?", {
          hear: true,
          reply: rp("ないです。", "nai desu.", "Yok.", "No, I don't."),
        }),
        ph("レシートはご利用[りよう]ですか。", "reshiito wa goriyou desu ka.", "Fiş ister misiniz?", "Would you like the receipt?", {
          hear: true,
          reply: rp("大丈夫[だいじょうぶ]です。", "daijoubu desu.", "Gerek yok.", "No need."),
        }),
        ph("お支[し]払[はら]いは？", "oshiharai wa?", "Nasıl ödeyeceksiniz?", "How will you pay?", {
          hear: true,
          reply: rp("カードでお願[ねが]いします。", "kaado de onegai shimasu.", "Kartla lütfen.", "By card, please."),
        }),
        ph("袋[ふくろ]、分[わ]けますか。", "fukuro, wakemasu ka.", "Sıcakla soğuğu ayrı poşete koyayım mı?", "Shall I bag them separately?", {
          hear: true,
          reply: rp("はい、お願[ねが]いします。", "hai, onegai shimasu.", "Evet, lütfen.", "Yes, please."),
        }),
        ph("こちらの画面[がめん]のタッチをお願[ねが]いします。", "kochira no gamen no tacchi o onegai shimasu.", "Lütfen bu ekrana dokunun.", "Please touch this screen.", {
          hear: true,
          note: l("Alkol/sigara için yaş onayı ya da ödeme yöntemi seçimi.", "For the age check on alcohol/tobacco or choosing a payment method."),
        }),
      ],
    },
    {
      type: "dialogue",
      title: l("Akşam yemeği bento'su almak", "Buying a bento for dinner"),
      lines: [
        staff("いらっしゃいませ。", "irasshaimase.", "Hoş geldiniz.", "Welcome."),
        staff("お弁当[べんとう]、温[あたた]めますか。", "obentou, atatamemasu ka.", "Bento'yu ısıtayım mı?", "Shall I heat the bento?"),
        you("はい、お願[ねが]いします。", "hai, onegai shimasu.", "Evet, lütfen.", "Yes, please."),
        staff("お箸[はし]はおつけしますか。", "ohashi wa otsuke shimasu ka.", "Yemek çubuğu koyayım mı?", "Shall I add chopsticks?"),
        you("はい、お願[ねが]いします。", "hai, onegai shimasu.", "Evet, lütfen.", "Yes, please."),
        staff("袋[ふくろ]はご利用[りよう]ですか。", "fukuro wa goriyou desu ka.", "Poşet ister misiniz?", "Would you like a bag?"),
        you("はい、一[ひと]つください。", "hai, hitotsu kudasai.", "Evet, bir tane lütfen.", "Yes, one please."),
        staff("七百[ななひゃく]八十[はちじゅう]円[えん]になります。お支[し]払[はら]いは？", "nanahyaku hachijuu en ni narimasu. oshiharai wa?", "780 yen. Nasıl ödersiniz?", "That's 780 yen. How will you pay?"),
        you("Suicaで。", "suika de.", "Suica ile.", "With Suica."),
        staff("こちらにタッチしてください。…ありがとうございました。", "kochira ni tacchi shite kudasai. ... arigatou gozaimashita.", "Buraya dokundurun. ... Teşekkür ederiz.", "Tap here, please. ... Thank you very much."),
      ],
    },
    heading("Ödeme ve yaş onayı", "Payment and the age check"),
    text(
      "Konbiniler nakit, kredi kartı, **交通系[こうつうけい]IC** kartlar (Suica, ICOCA, PASMO) ve QR ödemeleri alır. Çoğu kasada müşteriye dönük bir ekran vardır: ödeme yöntemini kendin seçersin. Nakit ödemede parayı kasiyerin eline değil, tezgâhtaki küçük tepsiye koy; bazı mağazalarda para otomatik makineye atılır ve para üstü oradan çıkar. Self-servis kasalar (**セルフレジ**) da yaygınlaşıyor.",
      "Konbini accept cash, credit cards, **交通系[こうつうけい]IC** cards (Suica, ICOCA, PASMO) and QR payments. Most tills have a customer-facing screen where you choose the payment method yourself. When paying cash, put it on the small tray on the counter rather than in the cashier's hand; some stores have you feed cash into a machine that returns the change. Self-checkouts (**セルフレジ**) are spreading too."
    ),
    tip(
      "Alkol ya da sigara alırsan ekranda yaşının 20'den büyük olduğunu onaylaman istenir: **はい** düğmesine dokun. Japonya'da yasal içki yaşı 20'dir. Bazen kimlik de sorulabilir.",
      "If you buy alcohol or tobacco, the screen asks you to confirm you are over 20: tap **はい**. The legal drinking age in Japan is 20. You may occasionally be asked for ID."
    ),
    {
      type: "dialogue",
      title: l("Sıcak atıştırmalık ve yaş onayı", "A hot snack and the age check"),
      lines: [
        you("このビールと、唐揚[からあ]げを一[ひと]つください。", "kono biiru to, karaage o hitotsu kudasai.", "Bu bira ve bir porsiyon karaage lütfen (arkadaşın için).", "This beer and one karaage, please (for a friend)."),
        staff("唐揚[からあ]げお一[ひと]つですね。ほかにご注文[ちゅうもん]はございますか。", "karaage ohitotsu desu ne. hoka ni gochuumon wa gozaimasu ka.", "Bir karaage, değil mi? Başka bir şey var mı?", "One karaage, right? Anything else?"),
        you("以上[いじょう]です。", "ijou desu.", "Bu kadar.", "That's all."),
        staff("お酒[さけ]がございますので、画面[がめん]の確認[かくにん]をお願[ねが]いします。", "osake ga gozaimasu node, gamen no kakunin o onegai shimasu.", "Alkol olduğu için ekrandaki onayı yapın lütfen.", "Since there's alcohol, please confirm on the screen."),
        you("はい。(画面[がめん]の「はい」をタッチ)", "hai. (gamen no \"hai\" o tacchi)", "Tamam. (ekrandaki \"はい\"ye dokun)", "Okay. (tap \"はい\" on the screen)"),
        staff("袋[ふくろ]はご利用[りよう]ですか。", "fukuro wa goriyou desu ka.", "Poşet ister misiniz?", "Would you like a bag?"),
        you("大丈夫[だいじょうぶ]です。", "daijoubu desu.", "Gerek yok.", "No need."),
        staff("お支[し]払[はら]い方法[ほうほう]を画面[がめん]からお選[えら]びください。", "oshiharai houhou o gamen kara oerabi kudasai.", "Ödeme yöntemini ekrandan seçin lütfen.", "Please choose your payment method on the screen."),
        you("トイレをお借[か]りしてもいいですか。", "toire o okari shite mo ii desu ka.", "Tuvaleti kullanabilir miyim?", "May I use the toilet?"),
        staff("はい、どうぞ。奥[おく]の右側[みぎがわ]です。", "hai, douzo. oku no migigawa desu.", "Tabii, buyurun. Arkada, sağda.", "Sure, go ahead. It's at the back on the right."),
      ],
    },
    {
      type: "signs",
      title: l("Konbini'de göreceklerin", "What you will see in a konbini"),
      items: [
        sign("ticket", "20歳以上ですか はい", "20 yaşından büyük müsünüz? Evet (dokun)", "Are you 20 or older? Yes (tap)"),
        sign("info", "セルフレジ", "Self-servis kasa", "Self-checkout"),
        sign("ticket", "温め 500W 1分", "Isıtma: 500 W'ta 1 dakika", "Heating: 1 minute at 500 W"),
        sign("info", "電子レンジ", "Mikrodalga (müşteri kullanımı)", "Microwave (for customers)"),
        sign("warning", "お手洗いは使用できません", "Tuvalet kullanılamaz", "Toilet not available"),
        sign("info", "燃えるゴミ", "Yanan çöp", "Burnable trash"),
        sign("info", "ペットボトル", "Pet şişe", "PET bottles"),
        sign("info", "かん・びん", "Teneke kutu ve cam şişe", "Cans and bottles"),
      ],
    },
    heading("Popüler ürünler", "Popular items"),
    {
      type: "table",
      title: l("Raflarda göreceğin ürünler", "Items you will see on the shelves"),
      columns: [l("Japonca", "Japanese"), l("Okunuş", "Romaji"), l("Anlamı", "Meaning")],
      rows: [
        ["おにぎり", "onigiri", l("Yosunlu üçgen pilav topu", "Rice ball wrapped in seaweed")],
        ["お弁当[べんとう]", "obentou", l("Hazır yemek kutusu", "Boxed meal")],
        ["サンドイッチ / サンド", "sandoicchi / sando", l("Sandviç", "Sandwich")],
        ["おでん", "oden", l("Et suyunda haşlanmış yumurta, turp vb. (kış)", "Simmered eggs, radish etc. in broth (winter)")],
        ["肉[にく]まん", "nikuman", l("Etli buharda çörek; içi genelde domuz", "Steamed meat bun; usually pork")],
        ["唐揚[からあ]げ", "karaage", l("Kızarmış tavuk parçaları", "Fried chicken pieces")],
        ["ホットスナック", "hotto sunakku", l("Kasa yanındaki sıcak atıştırmalıklar", "Hot snacks by the till")],
        ["カップ麺[めん]", "kappumen", l("Hazır kap erişte", "Cup noodles")],
        ["菓子[かし]パン", "kashipan", l("Tatlı çörek", "Sweet bun")],
        ["お茶[ちゃ]", "ocha", l("Şekersiz yeşil çay (şişe)", "Unsweetened green tea (bottle)")],
        ["牛乳[ぎゅうにゅう]", "gyuunyuu", l("Süt", "Milk")],
        ["サラダ", "sarada", l("Salata", "Salad")],
        ["鮭[さけ]", "sake / shake", l("Somon (onigiri dolgusu)", "Salmon (onigiri filling)")],
        ["ツナマヨ", "tsunamayo", l("Mayonezli ton balığı (onigiri)", "Tuna mayo (onigiri)")],
        ["梅[うめ]", "ume", l("Ekşi erik turşusu (onigiri)", "Pickled plum (onigiri)")],
      ],
    },
    tip(
      "Paketli ürünlerde içindekiler **原材料名[げんざいりょうめい]** başlığı altında yazar. Domuz için **豚肉[ぶたにく]**, **ポーク**, **ラード**, **豚脂[とんし]** ve bazen **ゼラチン** kelimelerine bak. Alerjen kutusunda **豚肉[ぶたにく]** çoğu üründe ayrıca belirtilir, ama bu zorunlu değil; içindekiler listesini de oku.",
      "On packaged food the ingredients are listed under **原材料名[げんざいりょうめい]**. For pork, look for **豚肉[ぶたにく]**, **ポーク**, **ラード**, **豚脂[とんし]** and sometimes **ゼラチン** (gelatin). The allergen box often flags **豚肉[ぶたにく]** separately, but that is not mandatory, so read the ingredient list too."
    ),
    tip(
      "Onigiri ambalajı numaralı şeritle açılır: önce ortadaki 1 numaralı şeridi aşağı çek, sonra 2 ve 3 numaralı köşeleri yanlara çek. Böylece yosun pilava çıtır çıtır sarılır.",
      "Onigiri wrappers open by number: pull the middle strip 1 down, then pull corners 2 and 3 out to the sides. The seaweed then wraps the rice and stays crisp."
    ),
    heading("Çöp kuralları", "Trash rules"),
    text(
      "Japonya'da sokakta neredeyse hiç çöp kutusu yoktur; çöpünü yanında taşıman beklenir. Konbinilerin önünde ya da içinde çoğu zaman ayrıştırılmış çöp kutuları vardır, ama bunlar asıl olarak o mağazadan alınanlar içindir. Kutuya atarken kategorilere dikkat et: kâğıt ve yemek artıkları **燃[も]えるゴミ**, plastik ve metal gibi yanmayanlar **燃[も]えないゴミ**, şişeler **ペットボトル**, teneke ve cam **缶[かん]・びん**.",
      "There are almost no public trash bins on Japanese streets; you are expected to carry your trash with you. Konbini often have sorted bins out front or inside, mainly for things bought there. Mind the categories: paper and food waste go in **燃[も]えるゴミ** (burnable), non-burnables like some plastics and metal in **燃[も]えないゴミ**, bottles in **ペットボトル**, cans and glass in **缶[かん]・びん**."
    ),
    {
      type: "table",
      title: l("Çöp kategorileri", "Trash categories"),
      columns: [l("Japonca", "Japanese"), l("Okunuş", "Romaji"), l("Ne atılır", "What goes in")],
      rows: [
        ["燃[も]えるゴミ / 可燃[かねん]ゴミ", "moeru gomi / kanen gomi", l("Kâğıt, peçete, yemek artığı", "Paper, napkins, food scraps")],
        ["燃[も]えないゴミ / 不燃[ふねん]ゴミ", "moenai gomi / funen gomi", l("Metal, cam kırığı, bazı plastikler", "Metal, broken glass, some plastics")],
        ["ペットボトル", "petto botoru", l("Pet şişe (kapak ve etiketi ayrı)", "PET bottles (cap and label separate)")],
        ["缶[かん]・びん", "kan / bin", l("Teneke kutu ve cam şişe", "Cans and glass bottles")],
        ["プラスチック / プラ", "purasuchikku / pura", l("Plastik ambalaj", "Plastic packaging")],
        ["キャップ・ラベル", "kyappu / raberu", l("Şişe kapağı ve etiketi", "Bottle caps and labels")],
      ],
    },
    tip(
      "Yanında küçük bir poşet taşı; gün içinde çöpünü ona koy, akşam otelde at. Mağaza önündeki kutulara evden ya da otelden çöp getirmek hoş karşılanmaz.",
      "Carry a small bag for your trash during the day and throw it away at the hotel in the evening. Bringing household or hotel trash to store bins is frowned upon."
    ),
  ],
};

// ---------------------------------------------------------------------------
// 3. Stay: hotel, ryokan, onsen
// ---------------------------------------------------------------------------

const stay: Guide = {
  key: "stay",
  icon: "♨️",
  title: l("Otel, ryokan ve onsen", "Hotel, ryokan and onsen"),
  summary: l(
    "Check-in ve check-out, bavul bırakmak, oda sorunları, ryokan adabı, onsen'e adım adım giriş ve sento.",
    "Check-in and check-out, leaving luggage, room problems, ryokan etiquette, entering an onsen step by step, and sento."
  ),
  blocks: [
    heading("Check-in", "Check-in"),
    text(
      "Japon otellerinde check-in genellikle öğleden sonra, check-out sabah saatlerindedir; saatler rezervasyonunda yazar. Yabancı turistlerin check-in'de **pasaport** göstermesi zorunludur; resepsiyon fotokopisini alır. Odan hazır değilse bavulunu bırakıp gezmeye çıkabilirsin; neredeyse her otel bunu ücretsiz yapar.",
      "Japanese hotels usually check in in the afternoon and check out in the morning; the times are in your booking. Foreign tourists must show their **passport** at check-in; reception takes a copy. If your room is not ready, you can leave your bags and go sightseeing; almost every hotel does this for free."
    ),
    {
      type: "dialogue",
      title: l("Resepsiyonda check-in", "Checking in at reception"),
      lines: [
        you("チェックインをお願[ねが]いします。予約[よやく]しています。", "chekkuin o onegai shimasu. yoyaku shite imasu.", "Check-in yapmak istiyorum. Rezervasyonum var.", "I'd like to check in. I have a reservation."),
        staff("お名前[なまえ]をお願[ねが]いします。", "onamae o onegai shimasu.", "İsminizi alabilir miyim?", "Your name, please."),
        you("ユルマズです。", "yurumazu desu.", "Yılmaz.", "Yilmaz."),
        staff("パスポートを拝見[はいけん]してもよろしいですか。", "pasupooto o haiken shite mo yoroshii desu ka.", "Pasaportunuza bakabilir miyim?", "May I see your passport?"),
        you("はい、どうぞ。", "hai, douzo.", "Evet, buyurun.", "Yes, here you are."),
        staff("三泊[さんぱく]のご予約[よやく]ですね。こちらにご記入[きにゅう]ください。", "sanpaku no goyoyaku desu ne. kochira ni gokinyuu kudasai.", "Üç gecelik rezervasyon, değil mi? Lütfen burayı doldurun.", "A three-night booking, right? Please fill this in."),
        you("朝食[ちょうしょく]は何時[なんじ]からですか。", "choushoku wa nanji kara desu ka.", "Kahvaltı saat kaçta başlıyor?", "What time does breakfast start?"),
        staff("七時[しちじ]から九時[くじ]まで、二階[にかい]のレストランでございます。", "shichiji kara kuji made, nikai no resutoran de gozaimasu.", "Saat 7'den 9'a kadar, ikinci kattaki (asansörde 2F) restoranda.", "From 7 to 9, at the restaurant on the second floor (2F)."),
        staff("こちらがお部屋[へや]の鍵[かぎ]です。503号室[ごうしつ]でございます。", "kochira ga oheya no kagi desu. go-maru-san goushitsu de gozaimasu.", "Bu oda anahtarınız. Oda numaranız 503.", "Here is your room key. Room 503."),
        you("ありがとうございます。", "arigatou gozaimasu.", "Teşekkür ederim.", "Thank you."),
      ],
    },
    {
      type: "phrases",
      title: l("Otelde işine yarayacaklar", "Useful at the hotel"),
      items: [
        ph("荷物[にもつ]を預[あず]かっていただけますか。", "nimotsu o azukatte itadakemasu ka.", "Bavulumu bırakabilir miyim?", "Could you keep my luggage?", {
          reply: rp("はい、こちらの番号札[ばんごうふだ]をお持[も]ちください。", "hai, kochira no bangoufuda o omochi kudasai.", "Elbette, bu numaralı fişi saklayın.", "Of course; please keep this claim tag."),
        }),
        ph("チェックアウトは何時[なんじ]ですか。", "chekkuauto wa nanji desu ka.", "Check-out saat kaçta?", "What time is check-out?", {
          reply: rp("十時[じゅうじ]でございます。", "juuji de gozaimasu.", "Saat 10'da.", "It's at ten."),
        }),
        ph("Wi-Fiのパスワードを教[おし]えてください。", "waifai no pasuwaado o oshiete kudasai.", "Wi-Fi şifresini söyler misiniz?", "Could you tell me the Wi-Fi password?"),
        ph("タオルをもう一枚[いちまい]いただけますか。", "taoru o mou ichimai itadakemasu ka.", "Bir havlu daha alabilir miyim?", "Could I have one more towel?"),
        ph("コインランドリーはありますか。", "koin randorii wa arimasu ka.", "Çamaşırhane var mı?", "Is there a coin laundry?", {
          reply: rp("三階[さんがい]にございます。", "sangai ni gozaimasu.", "Üçüncü katta (asansörde 3F).", "It's on the third floor (3F)."),
        }),
        ph("近[ちか]くにコンビニはありますか。", "chikaku ni konbini wa arimasu ka.", "Yakında konbini var mı?", "Is there a konbini nearby?"),
        ph("タクシーを呼[よ]んでいただけますか。", "takushii o yonde itadakemasu ka.", "Taksi çağırabilir misiniz?", "Could you call a taxi?"),
        ph("もう一泊[いっぱく]できますか。", "mou ippaku dekimasu ka.", "Bir gece daha kalabilir miyim?", "Can I stay one more night?"),
      ],
    },
    heading("Odada sorun çıkarsa", "If something is wrong in the room"),
    text(
      "Sorunu resepsiyona telefonla ya da aşağı inerek söyleyebilirsin. Basit yapı yeterli: **[şey] が [durum]** ve sonuna **んですが** eklersen yumuşak bir \"şöyle bir sorun var\" tonu olur. Japon otel odaları küçüktür; bu bir sorun sayılmaz, ama ses, sıcaklık ve temizlik sorunları hemen çözülür.",
      "You can report a problem by phone or by going down to reception. A simple pattern is enough: **[thing] が [state]**, and adding **んですが** at the end gives a soft \"there's a problem\" tone. Japanese rooms are small; that is not a complaint, but noise, temperature and cleanliness issues get fixed quickly."
    ),
    {
      type: "phrases",
      title: l("Oda sorunları", "Room problems"),
      items: [
        ph("エアコンがつかないんですが。", "eakon ga tsukanai n desu ga.", "Klima çalışmıyor.", "The air conditioner won't turn on."),
        ph("お湯[ゆ]が出[で]ません。", "oyu ga demasen.", "Sıcak su gelmiyor.", "There's no hot water."),
        ph("部屋[へや]が寒[さむ]いです。", "heya ga samui desu.", "Oda soğuk.", "The room is cold."),
        ph("トイレが流[なが]れません。", "toire ga nagaremasen.", "Tuvaletin sifonu çalışmıyor.", "The toilet won't flush."),
        ph("鍵[かぎ]を部屋[へや]に忘[わす]れました。", "kagi o heya ni wasuremashita.", "Anahtarı odada unuttum.", "I left my key in the room."),
        ph("隣[となり]の部屋[へや]がうるさいです。", "tonari no heya ga urusai desu.", "Yan oda çok gürültülü.", "The room next door is noisy."),
        ph("部屋[へや]を替[か]えていただけますか。", "heya o kaete itadakemasu ka.", "Odamı değiştirebilir misiniz?", "Could I change rooms?", {
          reply: rp("確認[かくにん]いたしますので、少々[しょうしょう]お待[ま]ちください。", "kakunin itashimasu node, shoushou omachi kudasai.", "Kontrol ediyorum, bir dakika bekleyin.", "Let me check; one moment please."),
        }),
        ph("すぐに確認[かくにん]に参[まい]ります。", "sugu ni kakunin ni mairimasu.", "Hemen kontrol etmeye geliyoruz.", "We'll come and check right away.", { hear: true }),
      ],
    },
    tip(
      "Oda kartı çoğu zaman elektriği de açar: kapı yanındaki yuvaya takmazsan ışık ve klima çalışmaz. Kartı çıkarınca bir süre sonra elektrik kesilir; şarjdaki telefonun durabilir.",
      "The room card often switches on the power too: unless it is in the slot by the door, the lights and air conditioning stay off. Pull it out and the power cuts after a while, which can stop your phone charging."
    ),
    heading("Check-out", "Check-out"),
    {
      type: "dialogue",
      title: l("Check-out ve bavul bırakma", "Checking out and leaving bags"),
      lines: [
        you("チェックアウトをお願[ねが]いします。", "chekkuauto o onegai shimasu.", "Check-out yapmak istiyorum.", "I'd like to check out."),
        staff("鍵[かぎ]をお預[あず]かりします。冷蔵庫[れいぞうこ]のご利用[りよう]はございますか。", "kagi o oazukari shimasu. reizouko no goriyou wa gozaimasu ka.", "Anahtarı alıyorum. Minibardan bir şey kullandınız mı?", "I'll take the key. Did you use anything from the fridge?"),
        you("いいえ、ありません。", "iie, arimasen.", "Hayır, kullanmadım.", "No, nothing."),
        staff("追加[ついか]のお支[し]払[はら]いはございません。", "tsuika no oshiharai wa gozaimasen.", "Ek ödemeniz yok.", "There is nothing extra to pay."),
        you("三時[さんじ]まで荷物[にもつ]を預[あず]かってもらえますか。", "sanji made nimotsu o azukatte moraemasu ka.", "Bavulumu saat 3'e kadar bırakabilir miyim?", "Could you keep my bags until three?"),
        staff("はい、かしこまりました。こちらが控[ひか]えです。", "hai, kashikomarimashita. kochira ga hikae desu.", "Tabii. Bu da fişiniz.", "Certainly. Here is your receipt tag."),
        you("ありがとうございます。またあとで来[き]ます。", "arigatou gozaimasu. mata ato de kimasu.", "Teşekkürler. Sonra geri geleceğim.", "Thank you. I'll be back later."),
      ],
    },
    tip(
      "Şehirden şehre geçerken bavulunu otelden bir sonraki otele **宅急便[たっきゅうびん]** (kargo) ile gönderebilirsin; resepsiyon ya da konbini halleder ve genelde ertesi gün ulaşır. Shinkansen'e büyük bavulla binmek yerine çok rahattır.",
      "When moving between cities you can send your suitcase from one hotel to the next with **宅急便[たっきゅうびん]** (luggage delivery); reception or a konbini will arrange it and it usually arrives the next day. Much easier than hauling a big case onto the shinkansen."
    ),
    heading("Ryokan adabı", "Ryokan etiquette"),
    text(
      "**旅館[りょかん]** geleneksel Japon hanıdır: tatami odalar, yer yatağı, çoğu zaman akşam yemeği ve kahvaltı dahil, ve genelde içinde onsen. Girişte ayakkabını çıkarırsın; personel **スリッパ** verir. Tatami odaya terlikle girilmez, sadece çorapla ya da çıplak ayakla. Tuvaletin kendine ait terlikleri vardır; onları tuvaletten çıkarken orada bırak.",
      "A **旅館[りょかん]** is a traditional Japanese inn: tatami rooms, futon bedding, usually dinner and breakfast included, and often an onsen. You take your shoes off at the entrance and staff give you **スリッパ** (slippers). You never walk on tatami in slippers, only in socks or bare feet. The toilet has its own slippers; leave them there when you come out."
    ),
    {
      type: "steps",
      title: l("Ryokan'da bir akşam", "An evening at a ryokan"),
      steps: [
        step("Varış", "Arrival", "Girişte ayakkabını çıkar, terliklere geç. Çoğu ryokan önce odada çay ve küçük bir tatlı ikram eder; personel saatleri anlatır.", "Take off your shoes at the entrance and switch to slippers. Most ryokan first serve tea and a small sweet in your room while staff explain the times."),
        step("Yemek saatini seç", "Choose your dinner time", "Akşam yemeği için birkaç saat seçeneği sunulur; birini seç.", "You will be offered a few dinner time slots; pick one.", { jp: "夕食[ゆうしょく]は七時[しちじ]でお願[ねが]いします。", romaji: "yuushoku wa shichiji de onegai shimasu." }),
        step("Yukata giy", "Put on the yukata", "Odadaki **浴衣[ゆかた]** ile ryokan içinde, yemekte ve onsende rahatça dolaşabilirsin. Sol taraf sağın üstüne gelecek şekilde kapat; ters kapatmak cenazeye özeldir.", "You can wear the **浴衣[ゆかた]** in your room around the ryokan, to dinner and to the bath. Wrap left side over right; the reverse is for the dead."),
        step("Onsen", "Bath", "Yemekten önce ya da sonra onsene git. Havlular genelde odadadır.", "Visit the bath before or after dinner. Towels are usually in the room."),
        step("Yemek", "Dinner", "Akşam yemeği çok tabaklı bir **会席[かいせき]** menüsüdür; odada ya da yemek salonunda servis edilir. Kısıtlamanı rezervasyonda önceden bildirmek en iyisidir.", "Dinner is a multi-course **会席[かいせき]** meal, served in your room or a dining hall. Telling them about restrictions when you book is best."),
        step("Futon", "Futon", "Sen yemekteyken personel yer yatağını (**布団[ふとん]**) serer. Sabah toplamana gerek yok; bazı ryokanlarda kendin serersin.", "While you are at dinner, staff lay out the **布団[ふとん]** (futon). You do not need to fold it in the morning; at some ryokan you lay it out yourself."),
      ],
    },
    {
      type: "phrases",
      title: l("Ryokan'da duyacakların ve söyleyeceklerin", "Ryokan: what you'll hear and say"),
      items: [
        ph("ようこそお越[こ]しくださいました。", "youkoso okoshi kudasaimashita.", "Hoş geldiniz (geldiğiniz için teşekkürler).", "Welcome (thank you for coming).", { hear: true }),
        ph("夕食[ゆうしょく]は何時[なんじ]になさいますか。", "yuushoku wa nanji ni nasaimasu ka.", "Akşam yemeği saat kaçta olsun?", "What time would you like dinner?", {
          hear: true,
          reply: rp("七時[しちじ]でお願[ねが]いします。", "shichiji de onegai shimasu.", "Saat 7 lütfen.", "Seven, please."),
        }),
        ph("朝食[ちょうしょく]は何時[なんじ]ですか。", "choushoku wa nanji desu ka.", "Kahvaltı saat kaçta?", "What time is breakfast?"),
        ph("お風呂[ふろ]は何時[なんじ]まで入[はい]れますか。", "ofuro wa nanji made hairemasu ka.", "Banyoya saat kaça kadar girilebilir?", "Until what time can I use the bath?", {
          reply: rp("夜[よる]十二時[じゅうにじ]までです。朝[あさ]は六時[ろくじ]からです。", "yoru juuniji made desu. asa wa rokuji kara desu.", "Gece 12'ye kadar. Sabah 6'dan itibaren.", "Until midnight. From six in the morning."),
        }),
        ph("浴衣[ゆかた]の着方[きかた]を教[おし]えてください。", "yukata no kikata o oshiete kudasai.", "Yukata'nın nasıl giyildiğini gösterir misiniz?", "Could you show me how to wear the yukata?"),
        ph("豚肉[ぶたにく]が食[た]べられないのですが、大丈夫[だいじょうぶ]ですか。", "butaniku ga taberarenai no desu ga, daijoubu desu ka.", "Domuz eti yiyemiyorum; sorun olur mu?", "I can't eat pork; is that okay?", {
          reply: rp("かしこまりました。調理場[ちょうりば]に伝[つた]えます。", "kashikomarimashita. chouriba ni tsutaemasu.", "Anlaşıldı, mutfağa iletiyorum.", "Understood; I'll tell the kitchen."),
        }),
        ph("お布団[ふとん]を敷[し]きに参[まい]りました。", "ofuton o shiki ni mairimashita.", "Yatağınızı sermeye geldim.", "I've come to lay out your futon.", { hear: true }),
      ],
    },
    heading("Onsen adım adım", "The onsen step by step"),
    text(
      "**温泉[おんせん]** doğal kaplıca suyudur; ryokanlarda, otellerde ve günübirlik tesislerde bulunur. Kadın ve erkek bölümleri ayrıdır ve çıplak girilir; mayo giyilmez. Girişlerdeki kumaş perdeye **暖簾[のれん]** denir: üstünde **男[おとこ]** ya da **男湯[おとこゆ]** yazan erkekler, **女[おんな]** ya da **女湯[おんなゆ]** yazan kadınlar içindir. Renklere güvenme, kanjiye bak: bazı yerlerde bölümler gün içinde yer değiştirir.",
      "An **温泉[おんせん]** is a natural hot spring bath, found at ryokan, hotels and day-use facilities. Men's and women's sections are separate and you bathe naked; no swimsuits. The fabric curtain at each entrance is a **暖簾[のれん]**: **男[おとこ]** or **男湯[おとこゆ]** is for men, **女[おんな]** or **女湯[おんなゆ]** for women. Do not trust colours, read the kanji: at some places the sections swap during the day."
    ),
    {
      type: "signs",
      title: l("Onsen ve ryokan tabelaları", "Onsen and ryokan signs"),
      items: [
        sign("noren", "男湯", "Erkekler banyosu", "Men's bath"),
        sign("noren", "女湯", "Kadınlar banyosu", "Women's bath"),
        sign("noren", "ゆ", "Banyo (sıcak su)", "Bath (hot water)"),
        sign("info", "脱衣所", "Soyunma odası", "Changing room"),
        sign("info", "貸切風呂", "Özel kiralık banyo", "Private bath"),
        sign("warning", "タオルを湯船に入れないでください", "Havluyu havuza sokmayın", "Do not put towels in the bath"),
        sign("warning", "刺青・タトゥーのある方のご入浴はお断りします", "Dövmesi olanlar banyoya giremez", "People with tattoos may not bathe"),
        sign("info", "入替制", "Bölümler dönüşümlü (saatle değişir)", "Sections rotate (swap by time)"),
      ],
    },
    {
      type: "steps",
      title: l("Onsene giriş sırası", "Onsen order of steps"),
      steps: [
        step("Doğru perdeden gir", "Enter through the right curtain", "Perdedeki kanjiyi oku: 男[おとこ] erkek, 女[おんな] kadın. Ayakkabını girişteki dolaba ya da rafa bırak.", "Read the kanji on the curtain: 男[おとこ] men, 女[おんな] women. Leave your shoes in the locker or on the rack at the entrance."),
        step("Soyun", "Undress", "Soyunma odasında (**脱衣所[だついじょ]**) tüm kıyafetlerini sepete ya da dolaba koy. Sadece küçük havluyu yanına al; büyük havlu burada kalır.", "In the **脱衣所[だついじょ]** (changing room), put all your clothes in a basket or locker. Take only the small towel with you; the big towel stays here."),
        step("Önce yıkan", "Wash first", "Yıkanma yerinde (**洗[あら]い場[ば]**) küçük tabureye otur, duşla baştan ayağa sabunla yıkan ve iyice durulan. Havuza kirli girmek en büyük ayıptır.", "At the **洗[あら]い場[ば]** (washing area), sit on the little stool and wash head to toe with soap, then rinse thoroughly. Entering the bath unwashed is the biggest faux pas."),
        step("Yavaşça gir", "Get in slowly", "Su çok sıcak olabilir; önce üstüne biraz su dök (かけ湯[ゆ]). Uzun saçlıysan saçını topla; saç suya değmemeli.", "The water can be very hot; pour some over yourself first (かけ湯[ゆ]). If you have long hair, tie it up; hair should not touch the water."),
        step("Küçük havlu suya girmez", "The small towel stays out of the water", "Havluyu katlayıp başının üstüne koy ya da havuz kenarına bırak. Asla suya batırma.", "Fold the towel and rest it on your head or on the edge of the bath. Never dip it in the water."),
        step("Kısa tut, su iç", "Keep it short, hydrate", "Birkaç dakika yeter; başın dönerse çık. Çıkmadan önce soyunma odasını ıslatmamak için küçük havluyla kurulan.", "A few minutes is enough; get out if you feel dizzy. Dry off with the small towel before returning to the changing room so you do not drip on the floor."),
      ],
    },
    tip(
      "Birçok onsen ve spor tesisi **dövmeli** misafirleri kabul etmez; küçük bir dövme bile sorun olabilir. Bazı yerler bant ya da yapışkanla örtmeye izin verir, bazıları tamamen serbesttir. Dövmen varsa önceden sor ya da **貸切風呂[かしきりぶろ]** (özel kiralık banyo) seç.",
      "Many onsen and gyms refuse guests with **tattoos**; even a small one can be an issue. Some allow covering it with a patch or sticker, some are fully tattoo-friendly. If you have one, ask beforehand or choose a **貸切風呂[かしきりぶろ]** (private bath)."
    ),
    {
      type: "dialogue",
      title: l("Özel banyo ve dövme sorusu", "Private bath and the tattoo question"),
      lines: [
        you("すみません、タトゥーがあるんですが、温泉[おんせん]に入[はい]れますか。", "sumimasen, tatuu ga aru n desu ga, onsen ni hairemasu ka.", "Affedersiniz, dövmem var; onsene girebilir miyim?", "Excuse me, I have a tattoo; can I use the onsen?"),
        staff("申[もう]し訳[わけ]ございませんが、大浴場[だいよくじょう]はご遠慮[えんりょ]いただいております。", "moushiwake gozaimasen ga, daiyokujou wa goenryo itadaite orimasu.", "Çok üzgünüz, büyük ortak banyoyu kullanamıyorsunuz.", "We're very sorry, but we must ask you not to use the main bath."),
        staff("貸切風呂[かしきりぶろ]でしたらご利用[りよう]いただけます。", "kashikiriburo deshitara goriyou itadakemasu.", "Ama özel banyoyu kullanabilirsiniz.", "You can, however, use the private bath."),
        you("貸切風呂[かしきりぶろ]は予約[よやく]が必要[ひつよう]ですか。", "kashikiriburo wa yoyaku ga hitsuyou desu ka.", "Özel banyo için rezervasyon gerekiyor mu?", "Do I need to book the private bath?"),
        staff("はい、四十五分[よんじゅうごふん]ずつのご予約[よやく]制[せい]です。", "hai, yonjuugofun zutsu no goyoyakusei desu.", "Evet, 45 dakikalık rezervasyonla.", "Yes, by reservation in 45-minute slots."),
        you("じゃあ、九時[くじ]からお願[ねが]いします。", "jaa, kuji kara onegai shimasu.", "O zaman saat 9 için lütfen.", "Then nine o'clock, please."),
        staff("かしこまりました。こちらが鍵[かぎ]です。", "kashikomarimashita. kochira ga kagi desu.", "Anlaşıldı. Anahtarı buyurun.", "Certainly. Here is the key."),
      ],
    },
    heading("Sento: mahalle hamamı", "Sento: the neighbourhood bathhouse"),
    text(
      "**銭湯[せんとう]** şehirdeki mahalle hamamıdır; su genelde kaplıca değil, ısıtılmış şebeke suyudur ama kurallar onsenle aynıdır. Giriş ücreti düşüktür ve girişte ya da bilet makinesinde ödenir. Havlu ve sabun bazı sentolarda yoktur; yanında götür ya da girişte kirala/satın al. Dövme konusunda sentolar genellikle onsenlerden daha toleranslıdır, ama yine tesisten tesise değişir.",
      "A **銭湯[せんとう]** is a neighbourhood public bath in the city; the water is usually heated tap water, not a hot spring, but the rules are the same as an onsen. Entry is cheap and paid at the counter or a ticket machine. Some sento have no towels or soap; bring your own or rent/buy at the entrance. Sento are generally more tolerant of tattoos than onsen, though it still varies."
    ),
    {
      type: "table",
      title: l("Banyo kelimeleri", "Bath vocabulary"),
      columns: [l("Japonca", "Japanese"), l("Okunuş", "Romaji"), l("Anlamı", "Meaning")],
      rows: [
        ["温泉[おんせん]", "onsen", l("Kaplıca", "Hot spring")],
        ["銭湯[せんとう]", "sentou", l("Mahalle hamamı", "Public bathhouse")],
        ["大浴場[だいよくじょう]", "daiyokujou", l("Büyük ortak banyo", "Large shared bath")],
        ["露天風呂[ろてんぶろ]", "rotenburo", l("Açık hava havuzu", "Outdoor bath")],
        ["貸切風呂[かしきりぶろ]", "kashikiriburo", l("Özel kiralık banyo", "Private bath")],
        ["男湯[おとこゆ] / 女湯[おんなゆ]", "otokoyu / onnayu", l("Erkek / kadın banyosu", "Men's / women's bath")],
        ["脱衣所[だついじょ]", "datsuijo", l("Soyunma odası", "Changing room")],
        ["洗[あら]い場[ば]", "araiba", l("Yıkanma bölümü", "Washing area")],
        ["湯船[ゆぶね]", "yubune", l("Havuz, küvet", "The bath tub itself")],
        ["浴衣[ゆかた]", "yukata", l("Hafif pamuklu kimono", "Light cotton robe")],
        ["タオル / バスタオル", "taoru / basutaoru", l("Küçük havlu / büyük havlu", "Small towel / bath towel")],
        ["シャンプー / ボディソープ", "shanpuu / bodii soopu", l("Şampuan / duş jeli", "Shampoo / body wash")],
      ],
    },
    tip(
      "Kasım akşamları özellikle dağlık bölgelerde serin olur; açık hava havuzu (**露天風呂[ろてんぶろ]**) tam bu mevsimde en keyifli halindedir. Banyodan sonra su içmeyi unutma.",
      "November evenings get chilly, especially in the mountains; an outdoor bath (**露天風呂[ろてんぶろ]**) is at its best in this season. Remember to drink water after bathing."
    ),
  ],
};

// ---------------------------------------------------------------------------
// 4. Keigo you will hear
// ---------------------------------------------------------------------------

const keigo: Guide = {
  key: "keigo",
  icon: "🎎",
  title: l("Personelin kibar dili: duyacağın keigo", "Staff Japanese: the keigo you will hear"),
  summary: l(
    "Mağaza, restoran ve istasyonlarda her gün duyacağın kalıp keigo cümleleri: harfiyen ne dedikleri, pratikte ne anlama geldikleri ve sana yetecek basit cevap.",
    "The fixed keigo phrases you will hear daily in shops, restaurants and stations: what they literally say, what they mean in practice, and the simple reply that is enough."
  ),
  blocks: [
    heading("Neden anlamadığın gibi geliyor?", "Why it sounds so hard to follow"),
    text(
      "Japonya'da personel müşteriyle **敬語[けいご]** (saygı dili) konuşur. Ders kitabındaki です/ます Japoncasından farklıdır: fiiller değişir (ある yerine ござる, いる yerine おる, する yerine いたす), cümleler uzar ve çok hızlı söylenir. İyi haber şu: bu cümleler **kalıptır**. Her mağazada aynı birkaç düzine cümleyi duyarsın; bunları tanıdığında anlaman birden kolaylaşır.",
      "In Japan staff speak to customers in **敬語[けいご]** (honorific language). It differs from textbook です/ます Japanese: verbs change (ござる for ある, おる for いる, いたす for する), sentences get longer, and they are spoken very fast. The good news: these sentences are **fixed formulas**. You hear the same few dozen in every shop; once you recognise them, understanding suddenly gets much easier."
    ),
    text(
      "Senin keigo üretmen gerekmiyor. Personel de bunu beklemiyor. Sen basit ve kibar です/ます Japoncası konuş: **はい**, **お願[ねが]いします**, **大丈夫[だいじょうぶ]です**, **ありがとうございます**. Bu dört ifade cevapların çoğunu karşılar.",
      "You do not need to produce keigo, and staff do not expect it. Speak simple polite です/ます Japanese: **はい**, **お願[ねが]いします**, **大丈夫[だいじょうぶ]です**, **ありがとうございます**. These four cover most replies."
    ),
    tip(
      "Kalıbın sonunu yakalamaya odaklan. **〜ですか / 〜ますか / 〜でしょうか** ile biten her şey bir sorudur ve genelde evet/hayır cevabı bekler. **〜ください / 〜くださいませ** ile biten bir ricadır. **〜ました** ile biten bir bildirimdir; başını sallaman yeter.",
      "Focus on catching the ending. Anything ending in **〜ですか / 〜ますか / 〜でしょうか** is a question, usually yes/no. Ending in **〜ください / 〜くださいませ** is a request. Ending in **〜ました** is an announcement; a nod is enough."
    ),
    heading("Büyük tablo: mağaza ve restoran keigosu", "The big table: shop and restaurant keigo"),
    {
      type: "table",
      title: l("Duyacağın kalıplar ve cevabın", "Phrases you will hear and your reply"),
      columns: [l("Duyduğun", "What you hear"), l("Harfiyen", "Literally"), l("Pratikte", "In practice"), l("Senin cevabın", "Your reply")],
      rows: [
        ["いらっしゃいませ", l("Buyurun gelin (saygılı)", "Please come in (honorific)"), l("Hoş geldiniz; dükkâna her girene söylenir", "Welcome; said to everyone who enters"), l("Cevap gerekmez", "No reply needed")],
        ["少々[しょうしょう]お待[ま]ちください", l("Biraz bekleyin lütfen", "Please wait a little"), l("Bir dakika, hemen hallediyorum", "One moment, I'm on it"), "はい"],
        ["お待[ま]たせいたしました", l("Sizi beklettim", "I have made you wait"), l("Buyurun, siparişiniz/sıranız geldi", "Here you go; your order or turn is ready"), "ありがとうございます"],
        ["かしこまりました", l("Saygıyla anladım", "I humbly understand"), l("Tamam, siparişiniz alındı", "Got it; your request is noted"), l("Cevap gerekmez", "No reply needed")],
        ["〜でよろしいでしょうか", l("〜 uygun olur mu acaba?", "Would 〜 be all right?"), l("Doğru mu anladım, onaylıyor musun?", "Confirming: is this right?"), "はい、お願[ねが]いします"],
        ["〜になります", l("〜 olacaktır", "It will become 〜"), l("Bu 〜 (fiyat ya da ürün sunarken)", "This is 〜 (stating a price or handing over)"), "はい"],
        ["〜円[えん]お預[あず]かりします", l("〜 yeni emanet alıyorum", "I will take custody of 〜 yen"), l("〜 yen verdiniz", "You gave me 〜 yen"), l("Cevap gerekmez", "No reply needed")],
        ["〜円[えん]のお返[かえ]しです", l("〜 yen iadesidir", "This is 〜 yen returned"), l("Para üstünüz 〜 yen", "Your change is 〜 yen"), "ありがとうございます"],
        ["ありがとうございました", l("Teşekkür ettim (geçmiş zaman)", "Thank you (past tense)"), l("Alışveriş bitti, teşekkürler", "The transaction is done, thanks"), "ありがとうございます / どうも"],
        ["またお越[こ]しくださいませ", l("Lütfen yine teşrif edin", "Please honour us again"), l("Yine bekleriz", "Please come again"), l("Küçük bir baş selamı", "A small nod")],
        ["申[もう]し訳[わけ]ございません", l("Söyleyecek mazeretim yok", "There is no excuse"), l("Çok özür dileriz (genelde \"yok/olmuyor\" haberinden önce)", "We're very sorry (usually before a \"no\")"), "大丈夫[だいじょうぶ]です"],
        ["恐[おそ]れ入[い]りますが", l("Korkuyla girerim ama", "I am in awe, but"), l("Kusura bakmayın ama (bir rica geliyor)", "Excuse me, but (a request follows)"), "はい"],
        ["ご注意[ちゅうい]ください", l("Dikkatinizi rica ederim", "Please give your attention"), l("Dikkat edin", "Be careful"), l("Cevap gerekmez", "No reply needed")],
        ["こちらへどうぞ", l("Bu tarafa buyurun", "This way, please"), l("Beni takip edin", "Follow me"), "はい"],
        ["ごゆっくりどうぞ", l("Yavaşça buyurun", "Please take it slowly"), l("Afiyet olsun, keyfinize bakın", "Enjoy, take your time"), "ありがとうございます"],
        ["失礼[しつれい]いたします", l("Kabalık ediyorum", "I commit a rudeness"), l("Affedersiniz (masaya/odaya yaklaşırken)", "Excuse me (approaching your table or room)"), l("Cevap gerekmez", "No reply needed")],
        ["お次[つぎ]のお客様[きゃくさま]どうぞ", l("Sıradaki müşteri buyursun", "Next customer, please come"), l("Sıradaki!", "Next, please!"), l("Kasaya ilerle", "Step forward")],
      ],
    },
    tip(
      "**〜になります** dil bilgisi açısından tartışmalıdır ama her kasada duyacaksın: **千円[せんえん]になります** sadece \"bin yen\" demek. Aynı şekilde **こちらコーヒーになります** \"işte kahveniz\" demek; bir şeye dönüşmüyor.",
      "**〜になります** is grammatically debated but you will hear it at every till: **千円[せんえん]になります** just means \"that's 1,000 yen\". Likewise **こちらコーヒーになります** means \"here is your coffee\"; nothing is turning into anything."
    ),
    heading("Kasadaki para akışı", "The money flow at the till"),
    text(
      "Nakit ödediğinde kasiyer üç şeyi sırayla söyler: önce toplam (**〜円[えん]になります**), sonra senden aldığı miktar (**〜円[えん]お預[あず]かりします**), en sonunda para üstü (**〜円[えん]のお返[かえ]しです**). Bazen para üstünden önce banknotu sayarak gösterir: **先[さき]に大[おお]きい方[ほう]、千[せん]円[えん]のお返[かえ]しです**, yani \"önce büyük olan, 1.000 yen\". Ardından bozuklukları ve fişi verir.",
      "When you pay cash, the cashier says three things in order: the total (**〜円[えん]になります**), the amount received from you (**〜円[えん]お預[あず]かりします**), and finally the change (**〜円[えん]のお返[かえ]しです**). Sometimes they count out notes first: **先[さき]に大[おお]きい方[ほう]、千[せん]円[えん]のお返[かえ]しです**, meaning \"the big one first, 1,000 yen\". Then come the coins and the receipt."
    ),
    {
      type: "dialogue",
      title: l("Nakit ödeme: kelime kelime", "Paying cash, word by word"),
      lines: [
        staff("いらっしゃいませ。", "irasshaimase.", "Hoş geldiniz.", "Welcome."),
        staff("ポイントカードはお持[も]ちでしょうか。", "pointo kaado wa omochi deshou ka.", "Puan kartınız var mı acaba?", "Would you have a points card?"),
        you("ないです。", "nai desu.", "Yok.", "No."),
        staff("お会計[かいけい]、千[せん]三百[さんびゃく]二十[にじゅう]円[えん]になります。", "okaikei, sen sanbyaku nijuu en ni narimasu.", "Toplam 1.320 yen.", "Your total is 1,320 yen."),
        you("はい。", "hai.", "Tamam.", "Okay."),
        staff("二千[にせん]円[えん]お預[あず]かりします。", "nisen en oazukari shimasu.", "2.000 yen aldım.", "I've received 2,000 yen."),
        staff("六百[ろっぴゃく]八十[はちじゅう]円[えん]のお返[かえ]しです。レシートでございます。", "roppyaku hachijuu en no okaeshi desu. reshiito de gozaimasu.", "Para üstünüz 680 yen. Fişiniz.", "Your change is 680 yen. Here is your receipt."),
        you("ありがとうございます。", "arigatou gozaimasu.", "Teşekkürler.", "Thank you."),
        staff("ありがとうございました。またお越[こ]しくださいませ。", "arigatou gozaimashita. mata okoshi kudasaimase.", "Teşekkür ederiz. Yine bekleriz.", "Thank you very much. Please come again."),
      ],
    },
    {
      type: "phrases",
      title: l("Mağaza ve restoranda duyacakların", "What you will hear in shops and restaurants"),
      items: [
        ph("ただいま満席[まんせき]でございます。", "tadaima manseki de gozaimasu.", "Şu an tüm masalar dolu.", "We are fully seated right now.", {
          hear: true,
          reply: rp("どのくらい待[ま]ちますか。", "dono kurai machimasu ka.", "Ne kadar bekleriz?", "How long is the wait?"),
        }),
        ph("お決[き]まりになりましたらお呼[よ]びください。", "okimari ni narimashitara oyobi kudasai.", "Karar verince çağırın.", "Call us when you have decided.", {
          hear: true,
          reply: rp("はい。", "hai.", "Tamam.", "Okay."),
        }),
        ph("ご注文[ちゅうもん]を繰[く]り返[かえ]させていただきます。", "gochuumon o kurikaesasete itadakimasu.", "Siparişinizi tekrar ediyorum.", "Let me repeat your order.", {
          hear: true,
          reply: rp("はい、お願[ねが]いします。", "hai, onegai shimasu.", "Evet, lütfen.", "Yes, please."),
        }),
        ph("こちらでお召[め]し上[あ]がりですか、お持[も]ち帰[かえ]りですか。", "kochira de omeshiagari desu ka, omochikaeri desu ka.", "Burada mı yiyeceksiniz, paket mi?", "For here or to go?", {
          hear: true,
          reply: rp("ここで食[た]べます。 / 持[も]ち帰[かえ]りで。", "koko de tabemasu. / mochikaeri de.", "Burada yiyeceğim. / Paket olsun.", "For here. / To go."),
        }),
        ph("お熱[あつ]いのでお気[き]をつけください。", "oatsui node oki o tsuke kudasai.", "Sıcaktır, dikkat edin.", "It's hot, please be careful.", {
          hear: true,
          reply: rp("ありがとうございます。", "arigatou gozaimasu.", "Teşekkürler.", "Thank you."),
        }),
        ph("こちらで以上[いじょう]でよろしいでしょうか。", "kochira de ijou de yoroshii deshou ka.", "Bu kadar mı olacak?", "Will that be everything?", {
          hear: true,
          reply: rp("はい、以上[いじょう]です。", "hai, ijou desu.", "Evet, bu kadar.", "Yes, that's all."),
        }),
        ph("あいにく品切[しなぎ]れでございます。", "ainiku shinagire de gozaimasu.", "Maalesef tükendi.", "Unfortunately it's sold out.", {
          hear: true,
          reply: rp("そうですか。じゃあ、これをください。", "sou desu ka. jaa, kore o kudasai.", "Anladım. O zaman bunu alayım.", "I see. Then this one, please."),
        }),
        ph("カードのお支[し]払[はら]いは一括[いっかつ]でよろしいですか。", "kaado no oshiharai wa ikkatsu de yoroshii desu ka.", "Kartla tek çekim mi olsun?", "Card payment in a single installment?", {
          hear: true,
          note: l("Mağazalarda büyük alışverişte sorulur; yabancı kartlarda neredeyse her zaman tek çekimdir.", "Asked for bigger purchases; with a foreign card it is almost always a single payment."),
          reply: rp("はい、一括[いっかつ]で。", "hai, ikkatsu de.", "Evet, tek çekim.", "Yes, single payment."),
        }),
        ph("お手数[てすう]ですが、こちらにサインをお願[ねが]いします。", "otesuu desu ga, kochira ni sain o onegai shimasu.", "Zahmet olacak ama buraya imza atar mısınız?", "Sorry for the trouble, but please sign here.", {
          hear: true,
          reply: rp("はい。", "hai.", "Tamam.", "Sure."),
        }),
        ph("ごゆっくりどうぞ。", "goyukkuri douzo.", "Afiyet olsun, keyfinize bakın.", "Enjoy, take your time.", { hear: true }),
      ],
    },
    {
      type: "dialogue",
      title: l("Kafede keigo: sen sadece basit cevap ver", "Keigo at a café: you just answer simply"),
      lines: [
        staff("いらっしゃいませ。店内[てんない]でお召[め]し上[あ]がりですか。", "irasshaimase. tennai de omeshiagari desu ka.", "Hoş geldiniz. İçeride mi içeceksiniz?", "Welcome. Will you be having it here?"),
        you("はい、ここで。", "hai, koko de.", "Evet, burada.", "Yes, here."),
        staff("ご注文[ちゅうもん]をお伺[うかが]いします。", "gochuumon o oukagai shimasu.", "Siparişinizi alayım.", "May I take your order?"),
        you("ホットコーヒーのMをください。", "hotto koohii no emu o kudasai.", "Orta boy sıcak kahve lütfen.", "A medium hot coffee, please."),
        staff("ホットコーヒーのMサイズでよろしいでしょうか。", "hotto koohii no emu saizu de yoroshii deshou ka.", "Orta boy sıcak kahve, doğru mu?", "A medium hot coffee, is that right?"),
        you("はい。", "hai.", "Evet.", "Yes."),
        staff("かしこまりました。三百[さんびゃく]五十[ごじゅう]円[えん]になります。", "kashikomarimashita. sanbyaku gojuu en ni narimasu.", "Anlaşıldı. 350 yen.", "Certainly. That's 350 yen."),
        staff("少々[しょうしょう]お待[ま]ちください。…お待[ま]たせいたしました。", "shoushou omachi kudasai. ... omatase itashimashita.", "Bir dakika lütfen. ... Buyurun, kahveniz.", "One moment, please. ... Here you are."),
        you("ありがとうございます。", "arigatou gozaimasu.", "Teşekkürler.", "Thank you."),
        staff("ごゆっくりどうぞ。", "goyukkuri douzo.", "Keyfinize bakın.", "Enjoy."),
      ],
    },
    heading("İstasyon ve trende duyacakların", "What you will hear at stations and on trains"),
    text(
      "İstasyon anonsları da kalıptır ve hep aynı kelimelerle gelir. **参[まい]ります** (gelir) trenin girdiğini, **閉[し]まります** kapıların kapandığını, **お下[さ]がりください** geri çekilmeni söyler. Büyük şehirlerde aynı anons genelde İngilizce de tekrarlanır, ama hızlı bir Japonca anonsu yakalayabilmek seni bir adım önde tutar.",
      "Station announcements are formulas too and always use the same words. **参[まい]ります** (is coming) means the train is arriving, **閉[し]まります** that doors are closing, **お下[さ]がりください** that you should step back. In big cities the announcement is usually repeated in English, but catching the fast Japanese one keeps you a step ahead."
    ),
    {
      type: "phrases",
      title: l("İstasyon anonsları", "Station announcements"),
      items: [
        ph("まもなく、一番線[いちばんせん]に電車[でんしゃ]が参[まい]ります。", "mamonaku, ichibansen ni densha ga mairimasu.", "Birazdan 1 numaralı perona tren geliyor.", "A train will shortly arrive at platform 1.", { hear: true }),
        ph("黄色[きいろ]い線[せん]の内側[うちがわ]までお下[さ]がりください。", "kiiroi sen no uchigawa made osagari kudasai.", "Lütfen sarı çizginin gerisine çekilin.", "Please stand behind the yellow line.", { hear: true }),
        ph("ドアが閉[し]まります。ご注意[ちゅうい]ください。", "doa ga shimarimasu. gochuui kudasai.", "Kapılar kapanıyor. Dikkat edin.", "The doors are closing. Please be careful.", { hear: true }),
        ph("駆[か]け込[こ]み乗車[じょうしゃ]はおやめください。", "kakekomi jousha wa oyame kudasai.", "Koşarak trene binmeyin.", "Please do not rush onto the train.", { hear: true }),
        ph("次[つぎ]は、京都[きょうと]です。", "tsugi wa, kyouto desu.", "Sıradaki durak: Kyoto.", "The next stop is Kyoto.", { hear: true }),
        ph("お出口[でぐち]は右側[みぎがわ]です。", "odeguchi wa migigawa desu.", "Çıkış sağ taraftan.", "The doors on the right side will open.", { hear: true }),
        ph("お忘[わす]れ物[もの]のないよう、ご注意[ちゅうい]ください。", "owasuremono no nai you, gochuui kudasai.", "Eşyalarınızı unutmamaya dikkat edin.", "Please make sure you have all your belongings.", { hear: true }),
        ph("ただいま、電車[でんしゃ]が遅[おく]れております。", "tadaima, densha ga okurete orimasu.", "Şu an trenler gecikmeli.", "Trains are currently delayed.", { hear: true }),
        ph("ご迷惑[めいわく]をおかけして申[もう]し訳[わけ]ございません。", "gomeiwaku o okake shite moushiwake gozaimasen.", "Verdiğimiz rahatsızlık için çok özür dileriz.", "We apologise for the inconvenience.", { hear: true }),
      ],
    },
    {
      type: "signs",
      title: l("Yazılı keigo: tabelalarda", "Written keigo: on signs"),
      items: [
        sign("info", "少々お待ちください", "Lütfen biraz bekleyin", "Please wait a moment"),
        sign("warning", "足元にご注意ください", "Adımınıza dikkat edin", "Watch your step"),
        sign("info", "こちらにお並びください", "Lütfen burada sıraya girin", "Please queue here", { arrow: "down" }),
        sign("shop", "本日の営業は終了しました", "Bugünkü çalışma saatlerimiz sona erdi", "We are closed for today"),
        sign("warning", "ご遠慮ください", "Lütfen yapmayın (kibar yasak)", "Please refrain (polite prohibition)"),
        sign("ticket", "またのお越しをお待ちしております", "Yine gelmenizi bekleriz", "We look forward to your next visit"),
      ],
    },
    tip(
      "**ご遠慮[えんりょ]ください** kelimesi \"lütfen çekinin\" der ama gerçekte kesin bir **yasaktır**. Tabelada **撮影[さつえい]はご遠慮[えんりょ]ください** görürsen fotoğraf çekme.",
      "**ご遠慮[えんりょ]ください** literally says \"please hold back\" but in practice it is a firm **ban**. If a sign says **撮影[さつえい]はご遠慮[えんりょ]ください**, do not take photos."
    ),
    heading("Anlamadığında", "When you don't understand"),
    text(
      "Keigo hızlı gelir ve her şeyi anlaman beklenmez. Durumu kurtarmanın en kibar yolu nazikçe tekrar istemek ya da daha basit konuşmalarını rica etmektir. Çoğu personel hemen el hareketine, ekrana ya da İngilizce kelimelere geçer.",
      "Keigo comes fast and nobody expects you to catch everything. The politest rescue is to ask gently for a repeat or for simpler Japanese. Most staff will switch straight to gestures, a screen or English words."
    ),
    {
      type: "phrases",
      title: l("Kurtarıcı cümleler", "Rescue phrases"),
      items: [
        ph("すみません、もう一度[いちど]お願[ねが]いします。", "sumimasen, mou ichido onegai shimasu.", "Affedersiniz, bir kez daha söyler misiniz?", "Sorry, once more please."),
        ph("ゆっくり話[はな]してください。", "yukkuri hanashite kudasai.", "Yavaş konuşur musunuz?", "Please speak slowly."),
        ph("日本語[にほんご]が少[すこ]しだけわかります。", "nihongo ga sukoshi dake wakarimasu.", "Biraz Japonca anlıyorum.", "I understand a little Japanese."),
        ph("簡単[かんたん]な日本語[にほんご]でお願[ねが]いします。", "kantan na nihongo de onegai shimasu.", "Basit Japonca ile lütfen.", "Simple Japanese, please."),
        ph("書[か]いてもらえますか。", "kaite moraemasu ka.", "Yazabilir misiniz?", "Could you write it down?"),
        ph("英語[えいご]で大丈夫[だいじょうぶ]ですか。", "eigo de daijoubu desu ka.", "İngilizce olur mu?", "Is English okay?"),
      ],
    },
    tip(
      "Ne dendiğini anlamadığın bir soru gelirse, bağlam çoğu zaman yeter: kasada her şey poşet, ısıtma, kart ya da fiş üzerinedir. Emin değilsen **大丈夫[だいじょうぶ]です** de; bir şey eksik kalırsa zaten tekrar sorarlar.",
      "If you miss a question, context usually saves you: at a till it is always about a bag, heating, card or receipt. If unsure, say **大丈夫[だいじょうぶ]です**; if something is missing, they will ask again."
    ),
  ],
};

// ---------------------------------------------------------------------------
// 5. Sightseeing: temples, shrines, directions
// ---------------------------------------------------------------------------

const sightseeing: Guide = {
  key: "sightseeing",
  icon: "⛩️",
  title: l("Tapınaklar, mabetler ve gezilecek yerler", "Temples, shrines and sights"),
  summary: l(
    "Budist tapınağı ile Şinto mabedi farkı, arınma ve dua adımları, tılsım ve fallar, fotoğraf kuralları, açılış saatleri, yol sormak ve Kasım'ın kızıl yaprak mevsimi.",
    "Buddhist temples versus Shinto shrines, purification and prayer steps, charms and fortunes, photo rules, opening hours, asking directions, and November's autumn leaves."
  ),
  blocks: [
    heading("お寺[てら] mı 神社[じんじゃ] mı?", "お寺[てら] or 神社[じんじゃ]?"),
    text(
      "Japonya'da iki ayrı dinin mekânlarını göreceksin. **お寺[てら]** Budist tapınağıdır; isimleri genelde **〜寺[じ]** ya da **〜院[いん]** ile biter (清水寺[きよみずでら], 金閣寺[きんかくじ]). **神社[じんじゃ]** Şinto mabedidir; isimleri **〜神社[じんじゃ]**, **〜宮[ぐう]** ya da **〜大社[たいしゃ]** ile biter (伏見稲荷大社[ふしみいなりたいしゃ], 明治神宮[めいじじんぐう]). En kolay ayırt etme yolu girişe bakmaktır: **鳥居[とりい]** (iki direkli kapı) varsa mabettir.",
      "In Japan you will visit sites of two different religions. An **お寺[てら]** is a Buddhist temple; names usually end in **〜寺[じ]** or **〜院[いん]** (清水寺[きよみずでら], 金閣寺[きんかくじ]). A **神社[じんじゃ]** is a Shinto shrine; names end in **〜神社[じんじゃ]**, **〜宮[ぐう]** or **〜大社[たいしゃ]** (伏見稲荷大社[ふしみいなりたいしゃ], 明治神宮[めいじじんぐう]). The easiest tell is the entrance: if there is a **鳥居[とりい]** (two-pillar gate), it is a shrine."
    ),
    {
      type: "table",
      title: l("Tapınak ve mabet karşılaştırması", "Temple vs shrine at a glance"),
      columns: [l("Konu", "Topic"), l("お寺[てら] (Budist)", "お寺[てら] (Buddhist)"), l("神社[じんじゃ] (Şinto)", "神社[じんじゃ] (Shinto)")],
      rows: [
        [l("Giriş kapısı", "Entrance gate"), l("山門[さんもん]: çatılı büyük ahşap kapı", "山門[さんもん]: large roofed wooden gate"), l("鳥居[とりい]: çoğu zaman kırmızı, iki direkli", "鳥居[とりい]: often red, two pillars")],
        [l("Saygı gösterilen", "Worshipped"), l("Buda ve bodhisattvalar", "Buddha and bodhisattvas"), l("Kami (doğa ve ata ruhları)", "Kami (spirits of nature and ancestors)")],
        [l("Dua şekli", "How to pray"), l("Sessizce eller birleşik; el çırpılmaz", "Hands together silently; no clapping"), l("İki eğil, iki el çırp, bir eğil", "Two bows, two claps, one bow")],
        [l("Tütsü", "Incense"), l("Genelde var (お線香[せんこう])", "Usually yes (お線香[せんこう])"), l("Genelde yok", "Usually not")],
        [l("Bekçi heykeller", "Guardian statues"), l("Kapıda iki öfkeli koruyucu (仁王[におう])", "Two fierce guardians at the gate (仁王[におう])"), l("Aslan-köpek çifti (狛犬[こまいぬ]), Inari'de tilki", "Lion-dog pair (狛犬[こまいぬ]), foxes at Inari shrines")],
        [l("Rahip", "Clergy"), l("Keşiş (お坊[ぼう]さん)", "Monk (お坊[ぼう]さん)"), l("Rahip (神主[かんぬし]) ve tapınak görevlisi kızlar (巫女[みこ])", "Priest (神主[かんぬし]) and shrine maidens (巫女[みこ])")],
        [l("Giriş ücreti", "Admission"), l("Bahçe ve salonlar için sık sık ücretli (拝観料[はいかんりょう])", "Often charged for gardens and halls (拝観料[はいかんりょう])"), l("Çoğu zaman ücretsiz", "Usually free")],
        [l("Mühür (御朱印[ごしゅいん])", "Seal (御朱印[ごしゅいん])"), l("Var", "Yes"), l("Var", "Yes")],
      ],
    },
    tip(
      "Torii'nin altından geçerken ortadan değil, kenardan yürü; orta yol geleneksel olarak kami'ye ayrılmıştır. Girerken ve çıkarken torii'ye doğru hafifçe eğilmek nazik bir jesttir ama zorunlu değildir.",
      "Walk through a torii along the side rather than down the centre; the middle path is traditionally reserved for the kami. A slight bow toward the torii on entering and leaving is a nice gesture, though not required."
    ),
    heading("Arınma: 手水[ちょうず]", "Purification: 手水[ちょうず]"),
    text(
      "Mabet ve birçok tapınak girişinde kepçeli bir su havuzu vardır: **手水舎[ちょうずや]**. Dua etmeden önce eller ve ağız sembolik olarak temizlenir. Su içilmez ve kepçeye ağız değdirilmez.",
      "At shrines and many temples there is a water basin with ladles near the entrance: the **手水舎[ちょうずや]**. Before praying, you symbolically cleanse your hands and mouth. You do not drink the water, and your lips never touch the ladle."
    ),
    {
      type: "steps",
      title: l("手水[ちょうず] adım adım", "手水[ちょうず] step by step"),
      steps: [
        step("Sağ elle kepçeyi al", "Take the ladle in your right hand", "Kepçeyi sağ elinle al ve suyla doldur. Bütün adımlar için bu tek kepçe suyu kullanırsın.", "Pick up the ladle with your right hand and fill it. You use this one scoop of water for all the steps."),
        step("Sol eli yıka", "Rinse your left hand", "Sol elinin üstüne biraz su dök.", "Pour a little water over your left hand."),
        step("Sağ eli yıka", "Rinse your right hand", "Kepçeyi sol eline geçir ve sağ elinin üstüne su dök.", "Switch the ladle to your left hand and pour water over your right hand."),
        step("Ağzını çalkala", "Rinse your mouth", "Kepçeyi tekrar sağ eline al, sol avucuna biraz su dök, avucundan ağzına alıp çalkala ve yere, havuzun dışına sessizce tükür.", "Take the ladle in your right hand again, pour a little water into your left palm, sip it from your palm, rinse, and spit it quietly onto the ground outside the basin."),
        step("Sol eli tekrar yıka", "Rinse your left hand again", "Ağzına değen sol elini bir kez daha yıka.", "Rinse your left hand once more, since it touched your mouth."),
        step("Kepçeyi temizle", "Clean the ladle", "Kepçeyi dik tut, kalan suyun sapından aşağı akmasını sağla, sonra ağzı aşağı bakacak şekilde yerine koy.", "Tilt the ladle upright so the remaining water runs down the handle, then put it back face down."),
      ],
    },
    heading("Mabette dua: 二礼二拍手一礼[にれいにはくしゅいちれい]", "Praying at a shrine: 二礼二拍手一礼[にれいにはくしゅいちれい]"),
    {
      type: "steps",
      title: l("Mabette dua sırası", "Shrine prayer sequence"),
      steps: [
        step("Bağış at", "Offer a coin", "Ana salonun önündeki bağış kutusuna (**賽銭箱[さいせんばこ]**) nazikçe bir bozuk para at. 5 yen şans getirir diye sevilir ama miktar önemli değildir.", "Gently drop a coin into the offering box (**賽銭箱[さいせんばこ]**) in front of the main hall. A 5-yen coin is a popular choice, but the amount does not matter."),
        step("Zili çal", "Ring the bell", "Bir ip varsa sallayıp zili çal; kami'ye geldiğini bildirir.", "If there is a rope, shake it to ring the bell; it lets the kami know you are there."),
        step("İki kez eğil", "Bow twice", "Belinden derince iki kez eğil.", "Bow deeply from the waist twice.", { jp: "二礼[にれい]", romaji: "nirei" }),
        step("İki kez el çırp", "Clap twice", "Ellerini göğüs hizasında birleştirip iki kez çırp, sonra ellerin birleşik halde kısa bir dua ya da dilek yap.", "Put your hands together at chest height, clap twice, then with hands joined make a short prayer or wish.", { jp: "二拍手[にはくしゅ]", romaji: "nihakushu" }),
        step("Bir kez eğil", "Bow once", "Son olarak bir kez derince eğil ve kenara çekil.", "Finally bow deeply once and step aside.", { jp: "一礼[いちれい]", romaji: "ichirei" }),
      ],
    },
    tip(
      "Budist tapınağında **el çırpılmaz**. Bozuk parayı at, ellerini sessizce birleştir, kısa bir dua et ve hafifçe eğil. Büyük tapınaklarda önce **お線香[せんこう]** (tütsü) yakabilirsin: küçük bir bağışla tütsü al, yak, alevi elinle sallayarak söndür (üfleme) ve kazana dik. İnsanlar dumanı iyileşme dileğiyle başlarına ve vücutlarına doğru çekerler.",
      "At a Buddhist temple you **do not clap**. Drop a coin, join your hands silently, pray briefly and bow slightly. At big temples you can first light **お線香[せんこう]** (incense): buy a bundle with a small offering, light it, put out the flame by waving your hand (do not blow), and stand it in the burner. People waft the smoke over their heads and bodies as a wish for good health."
    ),
    heading("お守[まも]り, おみくじ ve 御朱印[ごしゅいん]", "お守[まも]り, おみくじ and 御朱印[ごしゅいん]"),
    text(
      "Tapınak ve mabetlerdeki satış köşesine **授与所[じゅよしょ]** ya da **お守[まも]り所[じょ]** denir. **お守[まも]り** belirli bir dilek için taşınan küçük tılsımlardır: sağlık, trafik güvenliği, sınav başarısı, aşk. **おみくじ** kâğıt fallardır; kötü çıkarsa kâğıdı katlayıp oradaki tellere bağlarsın. **御朱印[ごしゅいん]** keşiş ya da görevlinin elle yazıp mühürlediği hatıra mühürdür; özel bir deftere (**御朱印帳[ごしゅいんちょう]**) yazdırılır.",
      "The sales counter at temples and shrines is called **授与所[じゅよしょ]** or **お守[まも]り所[じょ]**. **お守[まも]り** are small charms carried for a specific wish: health, traffic safety, exam success, love. **おみくじ** are paper fortunes; if yours is bad, fold it and tie it to the wires provided. A **御朱印[ごしゅいん]** is a hand-written, stamped seal made by a monk or attendant as a record of your visit; it goes in a special book (**御朱印帳[ごしゅいんちょう]**)."
    ),
    {
      type: "phrases",
      title: l("Satış köşesinde", "At the charm counter"),
      items: [
        ph("御朱印[ごしゅいん]をお願[ねが]いできますか。", "goshuin o onegai dekimasu ka.", "Mühür yazdırabilir miyim?", "Could I have a goshuin, please?", {
          reply: rp("御朱印帳[ごしゅいんちょう]をお預[あず]かりします。", "goshuinchou o oazukari shimasu.", "Mühür defterinizi alıyorum.", "I'll take your goshuin book."),
        }),
        ph("御朱印帳[ごしゅいんちょう]がないんですが、書[か]き置[お]きはありますか。", "goshuinchou ga nai n desu ga, kakioki wa arimasu ka.", "Mühür defterim yok; hazır yazılmış kâğıt var mı?", "I don't have a book; do you have a pre-written sheet?", {
          note: l("書[か]き置[お]き: önceden yazılmış tek sayfalık mühür.", "書[か]き置[お]き: a pre-written single-sheet seal."),
        }),
        ph("御朱印帳[ごしゅいんちょう]をください。", "goshuinchou o kudasai.", "Bir mühür defteri istiyorum.", "A goshuin book, please."),
        ph("健康[けんこう]のお守[まも]りはどれですか。", "kenkou no omamori wa dore desu ka.", "Sağlık tılsımı hangisi?", "Which one is the health charm?", {
          reply: rp("こちらでございます。", "kochira de gozaimasu.", "Bu.", "This one."),
        }),
        ph("おみくじを引[ひ]きたいです。", "omikuji o hikitai desu.", "Fal çekmek istiyorum.", "I'd like to draw a fortune."),
        ph("英語[えいご]のおみくじはありますか。", "eigo no omikuji wa arimasu ka.", "İngilizce fal var mı?", "Do you have an English fortune?"),
        ph("番号[ばんごう]は何番[なんばん]ですか。", "bangou wa nanban desu ka.", "Numaranız kaç?", "What number did you draw?", {
          hear: true,
          note: l("Bazı yerlerde kutudan çıkan çubuğun numarasını söylersin, görevli ilgili kâğıdı verir.", "At some places you shake out a numbered stick and tell the attendant the number; they give you the matching slip."),
        }),
        ph("写真[しゃしん]を撮[と]ってもいいですか。", "shashin o totte mo ii desu ka.", "Fotoğraf çekebilir miyim?", "May I take a photo?", {
          reply: rp("中[なか]での撮影[さつえい]はご遠慮[えんりょ]ください。", "naka de no satsuei wa goenryo kudasai.", "İçeride fotoğraf çekmeyin lütfen.", "Please refrain from taking photos inside."),
        }),
      ],
    },
    {
      type: "table",
      title: l("おみくじ sonuçları", "おみくじ results"),
      columns: [l("Japonca", "Japanese"), l("Okunuş", "Romaji"), l("Anlamı", "Meaning")],
      rows: [
        ["大吉[だいきち]", "daikichi", l("Büyük şans", "Great blessing")],
        ["中吉[ちゅうきち]", "chuukichi", l("Orta şans", "Middle blessing")],
        ["小吉[しょうきち]", "shoukichi", l("Küçük şans", "Small blessing")],
        ["吉[きち]", "kichi", l("Şans", "Blessing")],
        ["末吉[すえきち]", "suekichi", l("Gelecekte şans", "Future blessing")],
        ["凶[きょう]", "kyou", l("Kötü şans; kâğıdı bağla", "Bad luck; tie the slip up")],
        ["大凶[だいきょう]", "daikyou", l("Büyük kötü şans (nadir)", "Great curse (rare)")],
      ],
    },
    heading("Kurallar, ücretler ve saatler", "Rules, fees and hours"),
    text(
      "Ana salonların içinde ve heykellerin önünde fotoğraf çekmek sık sık yasaktır; **撮影禁止[さつえいきんし]** tabelasına dikkat et. Bazı salonlara ayakkabıyla girilmez (**土足厳禁[どそくげんきん]**); girişte ayakkabını çıkarıp poşete koyar ya da rafa bırakırsın. Tapınakların çoğu akşamüstü erken kapanır ve son giriş kapanıştan önce biter; **受付終了[うけつけしゅうりょう]** saatine dikkat et.",
      "Photography is often banned inside main halls and in front of statues; watch for **撮影禁止[さつえいきんし]** signs. Some halls are no-shoes (**土足厳禁[どそくげんきん]**); you take your shoes off at the entrance and carry them in a bag or leave them on a rack. Most temples close fairly early, in the late afternoon, and the last entry is before closing; check the **受付終了[うけつけしゅうりょう]** time."
    ),
    {
      type: "signs",
      title: l("Tapınaklarda göreceğin tabelalar", "Signs at temples and shrines"),
      items: [
        sign("warning", "撮影禁止", "Fotoğraf çekmek yasak", "No photography"),
        sign("warning", "土足厳禁", "Ayakkabıyla girmek kesinlikle yasak", "Strictly no shoes"),
        sign("warning", "立入禁止", "Girmek yasak", "No entry"),
        sign("info", "拝観受付", "Ziyaretçi girişi ve bilet", "Visitor reception and tickets", { arrow: "right" }),
        sign("ticket", "拝観料 大人 小人", "Giriş ücreti: yetişkin / çocuk", "Admission: adult / child"),
        sign("info", "参道", "Mabede giden yürüyüş yolu", "Approach path to the shrine", { arrow: "up" }),
        sign("shop", "御朱印所", "Mühür (goshuin) köşesi", "Goshuin counter"),
        sign("info", "拝観時間 9:00〜17:00", "Ziyaret saatleri 9:00 ile 17:00 arası", "Visiting hours 9:00 to 17:00"),
      ],
    },
    {
      type: "table",
      title: l("Saat ve giriş kelimeleri", "Hours and admission vocabulary"),
      columns: [l("Japonca", "Japanese"), l("Okunuş", "Romaji"), l("Anlamı", "Meaning")],
      rows: [
        ["拝観料[はいかんりょう]", "haikanryou", l("Tapınak giriş ücreti", "Temple admission fee")],
        ["入場料[にゅうじょうりょう]", "nyuujouryou", l("Giriş ücreti (müze vb.)", "Admission fee (museums etc.)")],
        ["大人[おとな] / 小人[しょうにん]", "otona / shounin", l("Yetişkin / çocuk", "Adult / child")],
        ["営業時間[えいぎょうじかん]", "eigyou jikan", l("Çalışma saatleri", "Business hours")],
        ["拝観時間[はいかんじかん]", "haikan jikan", l("Ziyaret saatleri", "Visiting hours")],
        ["開門[かいもん] / 閉門[へいもん]", "kaimon / heimon", l("Kapıların açılışı / kapanışı", "Gate opening / closing")],
        ["受付終了[うけつけしゅうりょう]", "uketsuke shuuryou", l("Son giriş (bilet satışı biter)", "Last admission (ticket sales end)")],
        ["最終入場[さいしゅうにゅうじょう]", "saishuu nyuujou", l("Son giriş saati", "Last entry")],
        ["定休日[ていきゅうび]", "teikyuubi", l("Haftalık tatil günü", "Regular closing day")],
        ["休館日[きゅうかんび]", "kyuukanbi", l("Müzenin kapalı olduğu gün", "Museum closing day")],
        ["年中無休[ねんじゅうむきゅう]", "nenjuu mukyuu", l("Yıl boyu açık", "Open every day of the year")],
        ["夜間[やかん]拝観[はいかん] / ライトアップ", "yakan haikan / raito appu", l("Gece ziyareti / ışıklandırma", "Night visit / illumination")],
      ],
    },
    heading("Kasım: kızıl yaprak mevsimi (紅葉[こうよう])", "November: autumn leaves season (紅葉[こうよう])"),
    text(
      "Kasım, **紅葉[こうよう]** yani kızıl yaprak mevsimidir ve seyahatin tam buna denk geliyor. Kyoto ve Tokyo'da renkler genellikle Kasım ortası ile Aralık başı arasında en canlı halinde olur; dağlık bölgelerde daha erken başlar. Ünlü tapınaklar bu dönemde çok kalabalıklaşır ve birçoğu özel **ライトアップ** (akşam ışıklandırması) düzenler; bunlar ayrı biletlidir. Kalabalıktan kaçmak için popüler tapınaklara açılış saatinde git; sabah ışığı da fotoğraf için en güzelidir. Haberlerde ve istasyonlarda **見頃[みごろ]** (en güzel dönem) kelimesini görürsen yapraklar zirvede demektir.",
      "November is **紅葉[こうよう]** season, the autumn leaves, and your trip lands right in it. In Kyoto and Tokyo the colours usually peak between mid-November and early December; the mountains turn earlier. Famous temples get very crowded and many hold special **ライトアップ** (evening illuminations), which need a separate ticket. To beat the crowds, arrive at popular temples at opening time; the morning light is also best for photos. If you see the word **見頃[みごろ]** (best viewing) in news or at stations, the leaves are at their peak."
    ),
    heading("Sokakta yol sormak", "Asking for directions on the street"),
    text(
      "Japonlar genelde yol tarifinde çok yardımseverdir; bazen seni bizzat götürürler. Önce **すみません** ile dikkatini çek, sonra yeri söyle ve **はどこですか** ekle. Telefonundaki haritayı göstermek de işe yarar. Cevapta **まっすぐ**, **右[みぎ]**, **左[ひだり]**, **信号[しんごう]**, **角[かど]** kelimelerini dinle. Japonya'da sokak adresleri çoğu yerde sokak adıyla değil, blok numarasıyla çalışır (Kyoto'nun merkezinde sistem farklıdır); yerliler bile adresten yer bulmakta zorlanır. Yol sorarken adres yerine yer adını (tapınak, otel, istasyon) söyle ya da haritayı göster. Koban (polis kulübesi) da yol sormak için iyi bir yerdir.",
      "Japanese people are usually very helpful with directions; sometimes they will walk you there. Get attention with **すみません**, say the place and add **はどこですか**. Showing the map on your phone works too. In the answer, listen for **まっすぐ**, **右[みぎ]**, **左[ひだり]**, **信号[しんごう]** and **角[かど]**. Japanese addresses mostly work by block number, not street name (central Kyoto uses a different system); even locals struggle to find places by address. When asking, name the place (temple, hotel, station) or show the map instead of the address. A koban (police box) is also a good place to ask for directions."
    ),
    {
      type: "dialogue",
      title: l("Tapınağa giden yolu sormak", "Asking the way to a temple"),
      lines: [
        you("すみません、清水寺[きよみずでら]はどこですか。", "sumimasen, kiyomizudera wa doko desu ka.", "Affedersiniz, Kiyomizu-dera nerede?", "Excuse me, where is Kiyomizu-dera?"),
        staff("清水寺[きよみずでら]ですか。この坂[さか]をまっすぐ上[のぼ]ってください。", "kiyomizudera desu ka. kono saka o massugu nobotte kudasai.", "Kiyomizu-dera mı? Bu yokuştan dümdüz yukarı çıkın.", "Kiyomizu-dera? Go straight up this slope."),
        you("歩[ある]いて何分[なんぷん]ぐらいですか。", "aruite nanpun gurai desu ka.", "Yürüyerek kaç dakika sürer?", "About how many minutes on foot?"),
        staff("十[じゅっ]分[ぷん]ぐらいですね。", "juppun gurai desu ne.", "Yaklaşık on dakika.", "About ten minutes."),
        staff("突[つ]き当[あ]たりを右[みぎ]に曲[ま]がると、門[もん]が見[み]えますよ。", "tsukiatari o migi ni magaru to, mon ga miemasu yo.", "Yolun sonunda sağa dönünce kapıyı görürsünüz.", "Turn right at the end of the road and you'll see the gate."),
        you("突[つ]き当[あ]たりを右[みぎ]ですね。", "tsukiatari o migi desu ne.", "Yolun sonunda sağa, değil mi?", "Right at the end of the road, yes?"),
        staff("はい、そうです。", "hai, sou desu.", "Evet, aynen.", "Yes, that's it."),
        you("ありがとうございました。", "arigatou gozaimashita.", "Çok teşekkürler.", "Thank you very much."),
      ],
    },
    {
      type: "dialogue",
      title: l("İstasyonu bulmak", "Finding the station"),
      lines: [
        you("すみません、駅[えき]に行[い]きたいんですが。", "sumimasen, eki ni ikitai n desu ga.", "Affedersiniz, istasyona gitmek istiyorum.", "Excuse me, I'd like to get to the station."),
        staff("どの駅[えき]ですか。", "dono eki desu ka.", "Hangi istasyon?", "Which station?"),
        you("祇園四条[ぎおんしじょう]駅[えき]です。", "gion shijou eki desu.", "Gion-Shijo istasyonu.", "Gion-Shijo station."),
        staff("二[ふた]つ目[め]の信号[しんごう]を左[ひだり]に曲[ま]がってください。橋[はし]の手前[てまえ]にあります。", "futatsume no shingou o hidari ni magatte kudasai. hashi no temae ni arimasu.", "İkinci trafik ışığından sola dönün. Köprüden hemen önce.", "Turn left at the second traffic light. It's just before the bridge."),
        you("すみません、もう一度[いちど]お願[ねが]いします。", "sumimasen, mou ichido onegai shimasu.", "Affedersiniz, bir kez daha söyler misiniz?", "Sorry, once more please."),
        staff("二[ふた]つ目[め]の信号[しんごう]、左[ひだり]。橋[はし]の前[まえ]。", "futatsume no shingou, hidari. hashi no mae.", "İkinci ışık, sol. Köprünün önü.", "Second light, left. Before the bridge."),
        you("わかりました。助[たす]かりました！", "wakarimashita. tasukarimashita!", "Anladım. Çok yardımcı oldunuz!", "Got it. That really helped!"),
      ],
    },
    {
      type: "phrases",
      title: l("Yol sorma ve tarif kelimeleri", "Asking and understanding directions"),
      items: [
        ph("〜はどこですか。", "... wa doko desu ka.", "〜 nerede?", "Where is 〜?"),
        ph("〜に行[い]きたいんですが。", "... ni ikitai n desu ga.", "〜'e gitmek istiyorum.", "I'd like to go to 〜."),
        ph("この地図[ちず]のここに行[い]きたいです。", "kono chizu no koko ni ikitai desu.", "Bu haritada şuraya gitmek istiyorum.", "I want to go here on this map."),
        ph("近[ちか]いですか。", "chikai desu ka.", "Yakın mı?", "Is it close?", {
          reply: rp("すぐそこですよ。", "sugu soko desu yo.", "Hemen şurada.", "It's just over there."),
        }),
        ph("まっすぐ行[い]ってください。", "massugu itte kudasai.", "Dümdüz gidin.", "Go straight.", { hear: true }),
        ph("右[みぎ]に曲[ま]がってください。", "migi ni magatte kudasai.", "Sağa dönün.", "Turn right.", { hear: true }),
        ph("左[ひだり]に曲[ま]がってください。", "hidari ni magatte kudasai.", "Sola dönün.", "Turn left.", { hear: true }),
        ph("信号[しんごう]を渡[わた]ってください。", "shingou o watatte kudasai.", "Işıklardan karşıya geçin.", "Cross at the traffic light.", { hear: true }),
        ph("角[かど]にあります。", "kado ni arimasu.", "Köşede.", "It's on the corner.", { hear: true }),
        ph("向[む]かい側[がわ]です。", "mukaigawa desu.", "Karşı tarafta.", "It's on the opposite side.", { hear: true }),
        ph("一緒[いっしょ]に行[い]きましょうか。", "issho ni ikimashou ka.", "Sizi götüreyim mi?", "Shall I take you there?", {
          hear: true,
          reply: rp("いいんですか。ありがとうございます！", "ii n desu ka. arigatou gozaimasu!", "Gerçekten mi? Çok teşekkürler!", "Really? Thank you so much!"),
        }),
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// 6. Emergency and health
// ---------------------------------------------------------------------------

const emergency: Guide = {
  key: "emergency",
  icon: "🆘",
  title: l("Sağlık ve acil durumlar", "Health and emergencies"),
  summary: l(
    "110 ve 119, belirtileri anlatmak, eczane, kayıp eşya ve pasaport, deprem ve afet uyarıları, yardım cümleleri.",
    "110 and 119, describing symptoms, pharmacies, lost items and passports, earthquake and disaster alerts, and help phrases."
  ),
  blocks: [
    heading("Acil numaralar", "Emergency numbers"),
    text(
      "Japonya'da iki numarayı ezberle: **110** polis, **119** ambulans ve itfaiye. İkisi de ücretsizdir ve her telefondan aranabilir. Operatörler önce Japonca konuşur; birçok bölgede tercüman hattına bağlayabilirler, bu yüzden **English, please** demekten çekinme. Hemen ardından basit Japoncayla ne olduğunu ve nerede olduğunu söyle. Adresi bilmiyorsan otel resepsiyonundan, konbini kasasından ya da yoldan geçen birinden yardım iste; telefonundaki konum paylaşımı da işe yarar. Otelin adını ve adresini Japonca yazılı halde (kartvizit ya da ekran görüntüsü) her zaman yanında taşı.",
      "Memorise two numbers in Japan: **110** for police, **119** for ambulance and fire. Both are free and work from any phone. Operators answer in Japanese; in many areas they can connect an interpreter, so do not hesitate to say **English, please**. Then say what happened and where, in simple Japanese. If you do not know the address, ask hotel reception, a konbini cashier or a passer-by for help; your phone's location sharing helps too. Always carry your hotel's name and address in Japanese (its card or a screenshot)."
    ),
    {
      type: "table",
      title: l("Kimi aramalı?", "Who to call"),
      columns: [l("Durum", "Situation"), l("Numara / yer", "Number / place"), l("Japonca", "Japanese")],
      rows: [
        [l("Hırsızlık, kaza, kavga", "Theft, accident, fight"), l("110 (polis)", "110 (police)"), "警察[けいさつ]"],
        [l("Ağır hastalık, yaralanma", "Serious illness, injury"), l("119 (ambulans)", "119 (ambulance)"), "救急車[きゅうきゅうしゃ]"],
        [l("Yangın", "Fire"), l("119 (itfaiye)", "119 (fire brigade)"), "消防[しょうぼう]"],
        [l("Kayıp eşya, yol sormak", "Lost items, directions"), l("En yakın koban", "Nearest koban"), "交番[こうばん]"],
        [l("Hafif hastalık, ilaç", "Minor illness, medicine"), l("Eczane", "Pharmacy"), "薬局[やっきょく] / ドラッグストア"],
        [l("Doktor görmek", "Seeing a doctor"), l("Klinik ya da hastane", "Clinic or hospital"), "病院[びょういん] / クリニック"],
        [l("Kayıp pasaport", "Lost passport"), l("Polis, sonra büyükelçilik", "Police, then embassy"), "大使館[たいしかん]"],
      ],
    },
    {
      type: "dialogue",
      title: l("119'u aramak", "Calling 119"),
      lines: [
        staff("119番[ばん]です。火事[かじ]ですか、救急[きゅうきゅう]ですか。", "hyakujuukyuu ban desu. kaji desu ka, kyuukyuu desu ka.", "119. Yangın mı, acil sağlık mı?", "This is 119. Fire or ambulance?"),
        you("救急[きゅうきゅう]です。友達[ともだち]が倒[たお]れました。", "kyuukyuu desu. tomodachi ga taoremashita.", "Ambulans. Arkadaşım yere yığıldı.", "Ambulance. My friend collapsed."),
        staff("住所[じゅうしょ]を教[おし]えてください。", "juusho o oshiete kudasai.", "Adresi söyler misiniz?", "Please tell me the address."),
        you("住所[じゅうしょ]はわかりません。京都[きょうと]駅[えき]の近[ちか]くのホテルです。", "juusho wa wakarimasen. kyouto eki no chikaku no hoteru desu.", "Adresi bilmiyorum. Kyoto İstasyonu yakınındaki bir otel.", "I don't know the address. It's a hotel near Kyoto Station."),
        staff("ホテルの名前[なまえ]は何[なん]ですか。", "hoteru no namae wa nan desu ka.", "Otelin adı ne?", "What is the hotel's name?"),
        you("英語[えいご]を話[はな]せる人[ひと]はいますか。", "eigo o hanaseru hito wa imasu ka.", "İngilizce konuşan biri var mı?", "Is there someone who speaks English?"),
        staff("通訳[つうやく]につなぎます。そのままお待[ま]ちください。", "tsuuyaku ni tsunagimasu. sono mama omachi kudasai.", "Tercümana bağlıyorum. Hatta kalın.", "I'll connect you to an interpreter. Please hold."),
      ],
    },
    {
      type: "phrases",
      title: l("Acil durumda", "In an emergency"),
      items: [
        ph("助[たす]けて！", "tasukete!", "İmdat!", "Help!"),
        ph("救急車[きゅうきゅうしゃ]を呼[よ]んでください。", "kyuukyuusha o yonde kudasai.", "Ambulans çağırın lütfen.", "Please call an ambulance."),
        ph("警察[けいさつ]を呼[よ]んでください。", "keisatsu o yonde kudasai.", "Polis çağırın lütfen.", "Please call the police."),
        ph("火事[かじ]です！", "kaji desu!", "Yangın var!", "Fire!"),
        ph("泥棒[どろぼう]！", "dorobou!", "Hırsız!", "Thief!"),
        ph("怪我[けが]をしました。", "kega o shimashita.", "Yaralandım.", "I'm injured."),
        ph("病院[びょういん]に連[つ]れて行[い]ってください。", "byouin ni tsurete itte kudasai.", "Beni hastaneye götürün lütfen.", "Please take me to a hospital."),
        ph("英語[えいご]が話[はな]せる医者[いしゃ]はいますか。", "eigo ga hanaseru isha wa imasu ka.", "İngilizce konuşan doktor var mı?", "Is there a doctor who speaks English?", {
          reply: rp("確認[かくにん]しますので、お待[ま]ちください。", "kakunin shimasu node, omachi kudasai.", "Kontrol ediyorum, bekleyin lütfen.", "Let me check; please wait."),
        }),
        ph("大丈夫[だいじょうぶ]ですか。", "daijoubu desu ka.", "İyi misiniz?", "Are you okay?", {
          hear: true,
          reply: rp("大丈夫[だいじょうぶ]じゃないです。", "daijoubu ja nai desu.", "İyi değilim.", "I'm not okay."),
        }),
        ph("海外[かいがい]旅行[りょこう]保険[ほけん]に入[はい]っています。", "kaigai ryokou hoken ni haitte imasu.", "Yurt dışı seyahat sigortam var.", "I have overseas travel insurance."),
      ],
    },
    heading("Belirtileri anlatmak", "Describing symptoms"),
    text(
      "Ağrıyı anlatmanın temel kalıbı **[vücut bölümü] が痛[いた]いです**: 頭[あたま]が痛[いた]いです (başım ağrıyor). Diğer belirtiler kalıp ifadelerdir: **熱[ねつ]があります** (ateşim var), **吐[は]き気[け]がします** (midem bulanıyor). Ne zamandan beri olduğunu eklemek için **昨日[きのう]から** (dünden beri) ya da **今朝[けさ]から** (bu sabahtan beri) de.",
      "The basic pattern for pain is **[body part] が痛[いた]いです**: 頭[あたま]が痛[いた]いです (I have a headache). Other symptoms are set expressions: **熱[ねつ]があります** (I have a fever), **吐[は]き気[け]がします** (I feel nauseous). To say since when, add **昨日[きのう]から** (since yesterday) or **今朝[けさ]から** (since this morning)."
    ),
    {
      type: "table",
      title: l("Vücut bölümleri", "Body parts"),
      columns: [l("Japonca", "Japanese"), l("Okunuş", "Romaji"), l("Anlamı", "Meaning")],
      rows: [
        ["頭[あたま]", "atama", l("Baş", "Head")],
        ["目[め]", "me", l("Göz", "Eye")],
        ["耳[みみ]", "mimi", l("Kulak", "Ear")],
        ["歯[は]", "ha", l("Diş", "Tooth")],
        ["喉[のど]", "nodo", l("Boğaz", "Throat")],
        ["胸[むね]", "mune", l("Göğüs", "Chest")],
        ["お腹[なか]", "onaka", l("Karın, mide", "Stomach, belly")],
        ["背中[せなか]", "senaka", l("Sırt", "Back")],
        ["腰[こし]", "koshi", l("Bel", "Lower back")],
        ["腕[うで]", "ude", l("Kol", "Arm")],
        ["手[て]", "te", l("El", "Hand")],
        ["足[あし]", "ashi", l("Ayak, bacak", "Foot, leg")],
        ["膝[ひざ]", "hiza", l("Diz", "Knee")],
        ["足首[あしくび]", "ashikubi", l("Ayak bileği", "Ankle")],
      ],
    },
    {
      type: "phrases",
      title: l("Belirtiler", "Symptoms"),
      items: [
        ph("頭[あたま]が痛[いた]いです。", "atama ga itai desu.", "Başım ağrıyor.", "I have a headache."),
        ph("お腹[なか]が痛[いた]いです。", "onaka ga itai desu.", "Karnım ağrıyor.", "I have a stomach ache."),
        ph("喉[のど]が痛[いた]いです。", "nodo ga itai desu.", "Boğazım ağrıyor.", "I have a sore throat."),
        ph("熱[ねつ]があります。", "netsu ga arimasu.", "Ateşim var.", "I have a fever.", {
          reply: rp("何度[なんど]ですか。", "nando desu ka.", "Kaç derece?", "How high is it?"),
        }),
        ph("咳[せき]が出[で]ます。", "seki ga demasu.", "Öksürüyorum.", "I have a cough."),
        ph("吐[は]き気[け]がします。", "hakike ga shimasu.", "Midem bulanıyor.", "I feel nauseous."),
        ph("下痢[げり]をしています。", "geri o shite imasu.", "İshalim var.", "I have diarrhoea."),
        ph("めまいがします。", "memai ga shimasu.", "Başım dönüyor.", "I feel dizzy."),
        ph("足首[あしくび]をひねりました。", "ashikubi o hinerimashita.", "Ayak bileğimi burktum.", "I twisted my ankle."),
        ph("昨日[きのう]からです。", "kinou kara desu.", "Dünden beri.", "Since yesterday."),
        ph("アレルギーがあります。", "arerugii ga arimasu.", "Alerjim var.", "I have an allergy.", {
          reply: rp("何[なん]のアレルギーですか。", "nan no arerugii desu ka.", "Neye alerjiniz var?", "What are you allergic to?"),
        }),
        ph("この薬[くすり]を飲[の]んでいます。", "kono kusuri o nonde imasu.", "Bu ilacı kullanıyorum.", "I'm taking this medicine."),
      ],
    },
    heading("Eczane: 薬局[やっきょく] ve ドラッグストア", "Pharmacy: 薬局[やっきょく] and ドラッグストア"),
    text(
      "Hafif rahatsızlıklar için **ドラッグストア** (drugstore) her yerde: ağrı kesici, soğuk algınlığı ilacı, mide ilacı ve yara bandı reçetesiz alınır. Bazı ilaçlar ancak **薬剤師[やくざいし]** (eczacı) görevdeyken satılır; o bölüm bazen erken kapanır. Reçeteli ilaç için **処方箋[しょほうせん]** (reçete) gereken eczaneye **薬局[やっきょく]** ya da **調剤[ちょうざい]薬局[やっきょく]** denir. Japon ilaçlarının dozu ülkendekinden farklı olabilir; kutudaki talimata ya da eczacıya sor. Kendi ülkenden getirdiğin ilaçlar için bazı etken maddeler Japonya'da kısıtlıdır (özellikle bazı güçlü ağrı kesiciler ve uyarıcılar). Düzenli kullandığın bir ilaç varsa orijinal kutusunda ve gerekirse doktor raporuyla taşı.",
      "For minor ailments **ドラッグストア** (drugstores) are everywhere: painkillers, cold medicine, stomach medicine and plasters are sold without prescription. Some medicines are sold only while a **薬剤師[やくざいし]** (pharmacist) is on duty, and that counter sometimes closes early. A pharmacy filling a **処方箋[しょほうせん]** (prescription) is a **薬局[やっきょく]** or **調剤[ちょうざい]薬局[やっきょく]**. Japanese doses may differ from home; follow the box or ask the pharmacist. Some active ingredients in medicine from home are restricted in Japan (notably some strong painkillers and stimulants). If you take a regular medicine, carry it in its original box and with a doctor's note if needed."
    ),
    {
      type: "dialogue",
      title: l("Drugstore'da", "At the drugstore"),
      lines: [
        you("すみません、風邪薬[かぜぐすり]はありますか。", "sumimasen, kazegusuri wa arimasu ka.", "Affedersiniz, soğuk algınlığı ilacı var mı?", "Excuse me, do you have cold medicine?"),
        staff("はい。どんな症状[しょうじょう]ですか。", "hai. donna shoujou desu ka.", "Var. Belirtileriniz neler?", "Yes. What are your symptoms?"),
        you("喉[のど]が痛[いた]くて、熱[ねつ]が少[すこ]しあります。", "nodo ga itakute, netsu ga sukoshi arimasu.", "Boğazım ağrıyor ve biraz ateşim var.", "My throat hurts and I have a slight fever."),
        staff("でしたら、こちらがおすすめです。", "deshitara, kochira ga osusume desu.", "O zaman bunu öneririm.", "In that case, I recommend this one."),
        you("一日[いちにち]何回[なんかい]飲[の]みますか。", "ichinichi nankai nomimasu ka.", "Günde kaç kez içiyorum?", "How many times a day do I take it?"),
        staff("一日[いちにち]三回[さんかい]、食後[しょくご]に二錠[にじょう]ずつです。", "ichinichi sankai, shokugo ni nijou zutsu desu.", "Günde üç kez, yemekten sonra ikişer tablet.", "Three times a day, two tablets after meals."),
        you("眠[ねむ]くなりますか。", "nemuku narimasu ka.", "Uyku yapar mı?", "Does it make you drowsy?"),
        staff("少[すこ]し眠[ねむ]くなることがありますので、ご注意[ちゅうい]ください。", "sukoshi nemuku naru koto ga arimasu node, gochuui kudasai.", "Biraz uyku yapabilir, dikkat edin.", "It can make you a little drowsy, so be careful."),
        you("わかりました。これをください。", "wakarimashita. kore o kudasai.", "Anladım. Bunu alayım.", "Understood. I'll take this."),
      ],
    },
    {
      type: "table",
      title: l("İlaç kelimeleri", "Medicine words"),
      columns: [l("Japonca", "Japanese"), l("Okunuş", "Romaji"), l("Anlamı", "Meaning")],
      rows: [
        ["薬[くすり]", "kusuri", l("İlaç", "Medicine")],
        ["風邪薬[かぜぐすり]", "kazegusuri", l("Soğuk algınlığı ilacı", "Cold medicine")],
        ["頭痛薬[ずつうやく]", "zutsuuyaku", l("Baş ağrısı ilacı", "Headache medicine")],
        ["痛[いた]み止[ど]め", "itamidome", l("Ağrı kesici", "Painkiller")],
        ["解熱剤[げねつざい]", "genetsuzai", l("Ateş düşürücü", "Fever reducer")],
        ["胃腸薬[いちょうやく]", "ichouyaku", l("Mide ve bağırsak ilacı", "Stomach medicine")],
        ["下痢[げり]止[ど]め", "geridome", l("İshal ilacı", "Anti-diarrhoea medicine")],
        ["酔[よ]い止[ど]め", "yoidome", l("Yol tutması ilacı", "Motion sickness medicine")],
        ["目薬[めぐすり]", "megusuri", l("Göz damlası", "Eye drops")],
        ["絆創膏[ばんそうこう]", "bansoukou", l("Yara bandı", "Plaster, band-aid")],
        ["湿布[しっぷ]", "shippu", l("Ağrı bandı (kas ağrısı için)", "Pain relief patch (for muscles)")],
        ["マスク", "masuku", l("Maske", "Face mask")],
        ["食後[しょくご] / 食前[しょくぜん]", "shokugo / shokuzen", l("Yemekten sonra / önce", "After meals / before meals")],
        ["一日[いちにち]三回[さんかい]", "ichinichi sankai", l("Günde üç kez", "Three times a day")],
      ],
    },
    heading("Kayıp eşya", "Lost items"),
    text(
      "Japonya'da kaybolan eşyaların şaşırtıcı bir kısmı sahibine geri döner. Sokakta ya da bir dükkânda kaybettiysen en yakın **交番[こうばん]** (polis kulübesi) ilk durağın olsun; bir **落[お]とし物[もの]** (kayıp eşya) formu doldurursun. Trende ya da istasyonda kaybettiysen istasyon görevlisine söyle; hangi hat, hangi saat ve mümkünse kaçıncı vagon olduğunu bil. Bulunan eşyalar bir süre sonra merkezi **遺失物[いしつぶつ]** bürosuna gönderilir.",
      "A surprising share of lost items in Japan make it back to their owners. If you lose something on the street or in a shop, the nearest **交番[こうばん]** (police box) is your first stop; you fill in a **落[お]とし物[もの]** (lost property) form. If you lose it on a train or in a station, tell the station staff; know which line, what time and, if possible, which car. Found items are later sent to a central **遺失物[いしつぶつ]** (lost property) office."
    ),
    {
      type: "dialogue",
      title: l("Koban'da kayıp cüzdan", "Lost wallet at the koban"),
      lines: [
        you("すみません、財布[さいふ]をなくしました。", "sumimasen, saifu o nakushimashita.", "Affedersiniz, cüzdanımı kaybettim.", "Excuse me, I lost my wallet."),
        staff("どこでなくしましたか。", "doko de nakushimashita ka.", "Nerede kaybettiniz?", "Where did you lose it?"),
        you("わかりません。たぶん、この近[ちか]くです。", "wakarimasen. tabun, kono chikaku desu.", "Bilmiyorum. Galiba buralarda.", "I don't know. Probably around here."),
        staff("いつごろですか。", "itsugoro desu ka.", "Yaklaşık ne zaman?", "Around when?"),
        you("一時間[いちじかん]ぐらい前[まえ]です。", "ichijikan gurai mae desu.", "Yaklaşık bir saat önce.", "About an hour ago."),
        staff("どんな財布[さいふ]ですか。", "donna saifu desu ka.", "Nasıl bir cüzdan?", "What does it look like?"),
        you("黒[くろ]い革[かわ]の財布[さいふ]です。カードと現金[げんきん]が入[はい]っています。", "kuroi kawa no saifu desu. kaado to genkin ga haitte imasu.", "Siyah deri bir cüzdan. İçinde kart ve nakit var.", "A black leather wallet. It has cards and cash in it."),
        staff("この用紙[ようし]に記入[きにゅう]してください。見[み]つかったら連絡[れんらく]します。", "kono youshi ni kinyuu shite kudasai. mitsukattara renraku shimasu.", "Bu formu doldurun. Bulunursa size haber veririz.", "Please fill in this form. We'll contact you if it's found."),
        you("よろしくお願[ねが]いします。", "yoroshiku onegai shimasu.", "İlginiz için şimdiden teşekkürler.", "Thank you in advance for your help."),
      ],
    },
    {
      type: "phrases",
      title: l("Kayıp ve çalıntı", "Lost and stolen"),
      items: [
        ph("財布[さいふ]を落[お]としました。", "saifu o otoshimashita.", "Cüzdanımı düşürdüm.", "I dropped my wallet."),
        ph("スマホを電車[でんしゃ]に忘[わす]れました。", "sumaho o densha ni wasuremashita.", "Telefonumu trende unuttum.", "I left my phone on the train.", {
          reply: rp("何線[なにせん]の何時[なんじ]ごろの電車[でんしゃ]ですか。", "nanisen no nanji goro no densha desu ka.", "Hangi hat, saat kaç gibi bir trendi?", "Which line, and about what time was the train?"),
        }),
        ph("パスポートをなくしました。", "pasupooto o nakushimashita.", "Pasaportumu kaybettim.", "I lost my passport."),
        ph("かばんを盗[ぬす]まれました。", "kaban o nusumaremashita.", "Çantam çalındı.", "My bag was stolen."),
        ph("落[お]とし物[もの]の届[とど]けを出[だ]したいです。", "otoshimono no todoke o dashitai desu.", "Kayıp eşya bildirimi yapmak istiyorum.", "I'd like to report a lost item."),
        ph("受理番号[じゅりばんごう]をください。", "juri bangou o kudasai.", "Başvuru numarasını alabilir miyim?", "Could I have the report number?", {
          note: l("Sigorta ve büyükelçilik için gerekir; mutlaka not al.", "Needed for insurance and the embassy; always write it down."),
        }),
        ph("見[み]つかったら、ホテルに連絡[れんらく]してください。", "mitsukattara, hoteru ni renraku shite kudasai.", "Bulunursa otelime haber verin lütfen.", "If it's found, please contact my hotel."),
      ],
    },
    {
      type: "steps",
      title: l("Pasaportunu kaybedersen", "If you lose your passport"),
      steps: [
        step("Polise bildir", "Report it to the police", "En yakın koban ya da karakolda kayıp ya da çalıntı bildirimi yap ve sana verilen başvuru numarasını ya da belgeyi al.", "Report the loss or theft at the nearest koban or police station and get the report number or certificate."),
        step("Büyükelçiliği ara", "Contact the embassy", "Ülkenin Tokyo'daki büyükelçiliğine (Türkiye için Türkiye'nin Tokyo Büyükelçiliği) ya da en yakın konsolosluğa ulaş. Genelde dönüş için geçici seyahat belgesi düzenlerler; gereken belgeleri ve fotoğrafları onlar söyler.", "Contact your embassy in Tokyo (for Türkiye, the Turkish Embassy in Tokyo) or the nearest consulate. They usually issue an emergency travel document for the trip home and will tell you which papers and photos are needed.", { jp: "大使館[たいしかん]", romaji: "taishikan" }),
        step("Kopyaları hazırla", "Have copies ready", "Pasaportunun fotoğrafı ya da fotokopisi süreci çok hızlandırır. Seyahatten önce telefonuna ve buluta kaydet.", "A photo or copy of your passport speeds things up a lot. Save one to your phone and the cloud before the trip."),
        step("Uçuşunu ve oteli bilgilendir", "Inform your airline and hotel", "Yeni belge gelene kadar uçuş tarihini ve konaklamanı gerekirse değiştir. Seyahat sigortanı da ara.", "Adjust your flight and accommodation if needed until the new document arrives. Call your travel insurance too."),
      ],
    },
    tip(
      "Yabancı turistlerin Japonya'da pasaportlarını **her zaman yanlarında taşıması** yasal zorunluluktur; polis isteyebilir ve vergisiz alışverişte de gerekir. Otel kasasında bırakmak yerine iç cebinde, fermuarlı bir yerde taşı.",
      "Foreign tourists are legally required to **carry their passport at all times** in Japan; police may ask for it and tax-free shopping needs it too. Carry it in an inside zipped pocket rather than leaving it in the hotel safe."
    ),
    heading("Deprem ve afetler", "Earthquakes and disasters"),
    text(
      "Japonya'da küçük depremler sık olur ve çoğu hissedilmez bile. Büyük bir sarsıntıdan birkaç saniye önce telefonların yüksek bir alarmla **緊急地震速報[きんきゅうじしんそくほう]** (deprem erken uyarısı) verebilir. Binalar depreme göre yapılmıştır; en büyük tehlikeler düşen eşyalar ve kıyıdaysan **津波[つなみ]** (tsunami). Kasım ayı tayfun mevsiminin sonu olsa da kuvvetli yağmur uyarılarını takip et.",
      "Small earthquakes are frequent in Japan and most go unnoticed. A few seconds before strong shaking, phones may sound a loud **緊急地震速報[きんきゅうじしんそくほう]** (earthquake early warning). Buildings are built for earthquakes; the main dangers are falling objects and, if you are on the coast, a **津波[つなみ]** (tsunami). November is the tail end of typhoon season, but still watch for heavy rain warnings."
    ),
    {
      type: "steps",
      title: l("Deprem anında ne yapmalı?", "What to do during an earthquake"),
      steps: [
        step("Başını koru", "Protect your head", "Sağlam bir masanın altına gir ya da başını çanta veya kollarınla koru. Sarsıntı sırasında dışarı koşma.", "Get under a sturdy table or cover your head with a bag or your arms. Do not run outside while it is shaking."),
        step("Camlardan uzak dur", "Keep away from glass", "Pencere, raf ve asılı eşyalardan uzaklaş. Sokaktaysan tabelalardan ve duvarlardan uzaklaş.", "Move away from windows, shelves and hanging objects. On the street, stay clear of signs and walls."),
        step("Sarsıntı bitince çık", "Leave once it stops", "Asansör kullanma; merdivenle çık. Otelde personelin talimatlarını izle.", "Do not use lifts; take the stairs. In a hotel, follow staff instructions."),
        step("Kıyıdaysan yükseğe çık", "On the coast, go high", "**津波警報[つなみけいほう]** (tsunami uyarısı) duyarsan ya da sarsıntı güçlüyse hemen yüksek bir yere ya da **津波避難[つなみひなん]ビル** tabelalı binaya git. Geri dönmek için resmi açıklamayı bekle.", "If you hear a **津波警報[つなみけいほう]** (tsunami warning), or if the shaking was strong, immediately go to high ground or a building marked **津波避難[つなみひなん]ビル**. Wait for the official all-clear before returning."),
        step("Bilgi al", "Get information", "Resmi uyarılar için telefonundaki bildirimleri, televizyonu ve personeli takip et. Gerekirse **避難所[ひなんじょ]** (tahliye merkezi) bilgisi verilir.", "Follow phone alerts, TV and staff for official information. If needed, you will be told where the **避難所[ひなんじょ]** (evacuation shelter) is."),
      ],
    },
    {
      type: "signs",
      title: l("Acil durum tabelaları", "Emergency signs"),
      items: [
        sign("info", "交番", "Polis kulübesi", "Police box", { sub: "KOBAN" }),
        sign("exit", "非常口", "Acil çıkış", "Emergency exit", { arrow: "right" }),
        sign("info", "避難場所", "Toplanma alanı (tahliye)", "Evacuation area"),
        sign("info", "避難所", "Tahliye merkezi (barınak)", "Evacuation shelter"),
        sign("warning", "津波注意", "Tsunami tehlikesi", "Tsunami hazard"),
        sign("info", "津波避難ビル", "Tsunami'de sığınılacak bina", "Tsunami evacuation building", { arrow: "up" }),
        sign("info", "AED", "Kalp defibrilatörü", "Defibrillator"),
        sign("info", "薬局", "Eczane", "Pharmacy"),
      ],
    },
    {
      type: "phrases",
      title: l("Afet kelimeleri ve anonslar", "Disaster words and announcements"),
      items: [
        ph("地震[じしん]です！", "jishin desu!", "Deprem!", "Earthquake!", { hear: true }),
        ph("揺[ゆ]れに注意[ちゅうい]してください。", "yure ni chuui shite kudasai.", "Sarsıntıya dikkat edin.", "Watch out for shaking.", { hear: true }),
        ph("津波[つなみ]警報[けいほう]が出[で]ています。", "tsunami keihou ga dete imasu.", "Tsunami uyarısı verildi.", "A tsunami warning has been issued.", { hear: true }),
        ph("高[たか]いところに避難[ひなん]してください。", "takai tokoro ni hinan shite kudasai.", "Yüksek bir yere tahliye olun.", "Evacuate to high ground.", { hear: true }),
        ph("避難所[ひなんじょ]はどこですか。", "hinanjo wa doko desu ka.", "Tahliye merkezi nerede?", "Where is the evacuation shelter?", {
          reply: rp("近[ちか]くの小学校[しょうがっこう]です。", "chikaku no shougakkou desu.", "Yakındaki ilkokul.", "It's the nearby elementary school."),
        }),
        ph("何[なに]が起[お]きましたか。", "nani ga okimashita ka.", "Ne oldu?", "What happened?"),
        ph("電車[でんしゃ]は動[うご]いていますか。", "densha wa ugoite imasu ka.", "Trenler çalışıyor mu?", "Are the trains running?", {
          reply: rp("今[いま]、運転[うんてん]を見[み]合[あ]わせています。", "ima, unten o miawasete imasu.", "Şu an seferler durduruldu.", "Service is currently suspended."),
        }),
        ph("落[お]ち着[つ]いて行動[こうどう]してください。", "ochitsuite koudou shite kudasai.", "Sakin hareket edin.", "Please act calmly.", { hear: true }),
      ],
    },
    tip(
      "Seyahatten önce Japonya Turizm Ajansı'nın **Safety Tips** uygulamasını indir: deprem, tsunami ve hava uyarılarını İngilizce gösterir. Bir harita uygulaması, bir çeviri uygulaması (kamera ile tabela okuma özelliği olan) ve otelinin Japonca adresi de telefonunda çevrimdışı hazır olsun. Seyahat sigortanın acil yardım numarasını ve poliçe numarasını telefonunun dışında bir yere de (kağıda) yaz. Japonya'da hastane ücretleri sigortasız yüksek olabilir ve birçok klinik önce ödeme ister.",
      "Before the trip, install the Japan Tourism Agency's **Safety Tips** app: it shows earthquake, tsunami and weather alerts in English. Keep a map app, a translation app (one that reads signs through the camera) and your hotel's Japanese address ready offline on your phone too. Write your travel insurance's emergency number and policy number somewhere besides your phone. Hospital costs in Japan can be high without insurance, and many clinics ask for payment up front."
    ),
  ],
};

export const GUIDES_B_JA: Guide[] = [restaurant, konbini, stay, keigo, sightseeing, emergency];
