import { languageName, nativeLanguageName } from "@/lib/profile-options";

type Profile = typeof import("@/db/schema").profiles.$inferSelect;
type Node = typeof import("@/db/schema").nodes.$inferSelect;

export function lessonPrompt(opts: {
  profile: Profile;
  node: Node;
  unitTitle: string;
  unitTheme: string;
  completedTitles: string[];
  /** Prompt-ready line of items/topics the learner struggles with, if any. */
  strugglesLine?: string | null;
  /** Recent exercise questions across the curriculum — the LLM must not repeat them. */
  recentExercisePrompts?: string[];
}) {
  const lang = languageName(opts.profile.targetLanguage);
  const native = nativeLanguageName(opts.profile.nativeLanguage);

  const jaRules =
    opts.profile.targetLanguage === "ja"
      ? ` Kanji kullanmaktan kaçınma: seviyeye uygun temel kanjileri erken tanıt ve kullan; kanji içeren HER metinde furigana'yı köşeli parantezle ekle: 私[わたし]は日本語[にほんご]を勉強[べんきょう]します. Öğrenci cevaplarını ROMAJI ile yazar (klavyesinde kana yok) — alıştırma cevapları (answer/accept_also) parantezsiz, sade olsun.`
      : opts.profile.targetLanguage === "zh"
        ? ` Hanzi kullanmaktan kaçınma: seviyeye uygun temel hanzileri erken tanıt ve kullan; hanzi içeren HER metinde pinyin okunuşu köşeli parantezle ekle: 我[wǒ]是[shì]学生[xuésheng]. Öğrenci cevaplarını PINYIN ile yazar (klavyesinde hanzi yok) ve ton işareti YAZAMAYABİLİR — alıştırma cevaplarında (answer/accept_also) ton işaretsiz sade pinyin varyantını da ekle (ör. "wǒ shì" için "wo shi").`
        : "";

  const system = `Sen sıcak ve sabırlı bir ${lang} öğretmenisin. Ana dili ${native} olan öğrencilere ders içeriği hazırlıyorsun. Açıklamalar ${native} dilinde, hedef dildeki her metnin okunuşu (reading, latin harfli) mutlaka verilir.${jaRules} Sadece istenen JSON'u döndür.`;

  const boss =
    opts.node.lessonType === "boss"
      ? "\nBu bir BOSS dersi: öğrendiklerini birleştiren, biraz daha zorlu ve ödüllendirici bir meydan okuma tasarla."
      : opts.node.lessonType === "checkpoint"
        ? "\nBu bir KONTROL NOKTASI: yeni konu öğretme, önceki derslerin karması ağırlıklı alıştırma yap."
        : "";

  const prompt = `Ders bilgisi:
- Ünite: "${opts.unitTitle}" (tema: ${opts.unitTheme})
- Ders: "${opts.node.titleTr}" — ${opts.node.subtitleTr}
- Öğrenme hedefleri: ${opts.node.objectives.join("; ")}
- Öğrencinin seviyesi: ${opts.profile.selfLevel}
- Öğrencinin ana dili: ${native} (tüm açıklama ve çeviriler bu dilde)
- İlgi alanları: ${opts.profile.interests.join(", ")}
- Daha önce tamamladığı dersler: ${
    opts.completedTitles.length
      ? opts.completedTitles.join(", ")
      : "yok, bu ilk dersi"
  }${
    opts.strugglesLine
      ? `\n- ZORLANDIĞI alanlar (${opts.strugglesLine}) — bu ders konusuyla kesişiyorsa alıştırmalarda bunlara ekstra tekrar ve pekiştirme fırsatı ver; kesişmiyorsa zorla dahil etme. Bu veriyi ASLA öğrenciye söyleme ("zorlandığını biliyorum" gibi meta yorum yasak) — sadece içerik seçimini sessizce yönlendirsin.`
      : ""
  }
${boss}
Bu ders için içerik üret:
- "explanation_tr": Markdown, ${native} dilinde, samimi bir öğretmen sesi. Konuyu sıfırdan ve net anlat.
- "examples": 3-6 örnek. "target" hedef dilde, "reading" latin okunuş, "translation_tr" ${native} çeviri.
- "grammar_notes": varsa 1-3 kısa not.
- "vocab": bu derste geçen 3-8 yeni kelime (SRS kartına dönüşecek).
- "exercises": 6-10 karışık alıştırma:
  * "mcq": options 4 seçenek, answer seçeneklerden birinin AYNEN kendisi.
  * "fill_blank": prompt_tr içinde ___ bulunan cümle; answer boşluğa gelen ifade; accept_also kabul edilebilir alternatifler.
  * "translate": target_text hedef dilde cümle; answer ${native} dilinde kanonik çeviri; accept_also İÇİNE 3-6 kabul edilebilir alternatif yaz (eş anlamlılar, farklı sözcük sıraları, resmî/gayriresmî varyantlar) — bunlar ucuz otomatik değerlendirmeyi mümkün kılar.
  * "free_response": prompt_tr serbest üretim istesin; answer alanına DEĞERLENDİRME KILAVUZU yaz (doğru cevabın nasıl görünmesi gerektiği). AMA sorunun nesnel, kısa bir doğru cevabı varsa (sıralama, liste, tek kelime), accept_also İÇİNE birebir kabul edilebilir yazımları MUTLAKA ekle (ör. "a, i, u, e, o" / "aiueo") — deterministik eşleşme LLM çağrısını atlar, öğrenci beklemez.
- Örnek bağlamlarını öğrencinin ilgi alanlarından seç.

Alıştırma KALİTE kuralları (çok önemli, ihlal etme):
- SADECE ÖĞRETİLEN ÖGELERİ SINA: bir alıştırmanın doğru cevabı, ancak BU derste (vocab/examples/explanation içinde) veya önceki derslerde öğretilmiş bir kelime/kalıp olabilir. Öğretilmemiş bir kelimeyi tek doğru cevap yapan soru KURMA — öğrenci bilemeyeceği bir kelimeden puan kaybetmemeli.
- Soru cevabı ELE VERMESİN: cevap veya bariz kalıbı soru metninde geçmesin; konuyu bilmeyen biri sırf soru tarzından doğru cevabı tahmin edememeli.
- KANONİK SIRA YASAK: ögeleri asla sözlük/tablo sırasıyla sorma veya sıralatma (a-i-u-e-o, ka-ki-ku-ke-ko gibi diziler ezbere biliniyor, hiçbir şey ölçmez). Rastgele alt kümeler ve karışık sırayla çalıştır.
- YÖN ÇEŞİTLİLİĞİ: tanıma ile üretimi karıştır — hedef dil→${native}, ${native}→hedef dil, yazı→okunuş, okunuş→yazı yönlerinin en az üçü derste bulunsun.
- MCQ çeldiricileri gerçekten yanıltıcı olsun: şekilce/sesçe benzeyen ya da sık karıştırılan alternatifler; bariz saçma seçenek koyma.
- YAZI SİSTEMİ DE SORULSUN: derste/önceki derslerde öğretilen kanji/hanzi sınanacak ögedir — bazı alıştırmalar okunuşu veya anlamı hedeflesin (ör. "'これは 本 です' cümlesindeki 本 kelimesinin okunuşunu romaji ile yaz" → hon). ELE VERME: bir kelimenin okunuşu/anlamı test ediliyorsa o kelimeye alıştırma metninde okunuş parantezi EKLEME; test edilmeyen diğer kelimelere ekle. Cümledeki en öğretici öge dururken önemsiz ögeyi boşluk yapma.
- İyi soru kalıpları (örnek): "Bu 4 kanadan hangisi 'nu' okunur?" (benzer görünümlüler arasından: ぬ/め/ね/わ), "Hangisi な satırından DEĞİLDİR?", karışık bir listeden belirli sesi/harfi ayıklatma. Kötü kalıp (yasak): "X satırındaki harfleri sırasıyla yaz" — ezberlenmiş dizi, hiçbir şey ölçmez.
- Açıklama/örnek bölümünde geçen bir cümleyi alıştırmada AYNEN tekrar kullanma; her alıştırma farklı bir öge veya beceriyi hedeflesin.
- TEKRAR LİMİTİ (kesin kural): aynı kelime/kalıp/ifade derste EN FAZLA 2 alıştırmada test edilebilir (biri tanıma, biri üretim olacak şekilde) — üçüncü kez sorma. Ders konusu darsa (ör. 2-3 kalıptan ibaretse) 10'a tamamlamak için aynı şeyi varyasyonla tekrar sorma; bunun yerine alıştırma sayısını düşür (6 yeter) veya önceki derslerin ögeleriyle birleştiren karma sorular kur.
- ZORLUK MERDİVENİ: ilk 1-2 alıştırma ısınma olabilir, son 2-3 alıştırma gerçekten zorlayıcı olsun (birleştirme, üretim, istisna/tuzak durumu).${
    opts.recentExercisePrompts?.length
      ? `\n- Öğrencinin daha önce çözdüğü sorular aşağıda — BUNLARI ve yakın benzerlerini TEKRAR SORMA, yeni açılar bul:\n${opts.recentExercisePrompts
          .map((p) => `  • ${p}`)
          .join("\n")}`
      : ""
  }

Sadece şemaya uygun JSON döndür.`;

  return { system, prompt };
}

export function gradingPrompt(opts: {
  targetLanguage: string;
  nativeLanguage?: string;
  exerciseType: string;
  promptTr: string;
  targetText: string | null;
  expectedAnswer: string;
  acceptAlso?: string[] | null;
  userResponse: string;
}) {
  const lang = languageName(opts.targetLanguage);
  const native = nativeLanguageName(opts.nativeLanguage ?? "tr");
  const system = `Sen bir ${lang} öğretmenisin, öğrenci cevaplarını değerlendiriyorsun. Cesaretlendirici ama dürüst ol. Geri bildirim ${native} dilinde. Sadece istenen JSON'u döndür.`;

  const scriptRule =
    opts.targetLanguage === "zh"
      ? `- Öğrenci hedef dildeki cevabı PINYIN ile yazabilir (klavyesinde hanzi yok) ve ton işaretlerini yazamayabilir. "ni hao" = 你好 = "nǐ hǎo" say; yazı sistemi ve ton işareti farkını asla hata sayma, içeriğe göre değerlendir.`
      : `- Öğrenci hedef dildeki cevabı ROMAJI/latin harfleriyle yazabilir (klavyesinde kana/kanji yok). "konnichiwa" = こんにちは say; yazı sistemi farkını asla hata sayma, içeriğe göre değerlendir.`;

  const diacriticRule =
    (opts.nativeLanguage ?? "tr") === "tr"
      ? `\n- Türkçe diakritik/klavye farkını hata sayma: "hayir" = "hayır", "asagi" = "aşağı".`
      : "";

  const prompt = `Alıştırma (${opts.exerciseType}):
Soru: ${opts.promptTr}
${opts.targetText ? `Hedef metin: ${opts.targetText}` : ""}
Beklenen cevap / değerlendirme kılavuzu: ${opts.expectedAnswer}${
    opts.acceptAlso?.length
      ? `\nKabul edilebilir alternatifler: ${opts.acceptAlso.join(" / ")}`
      : ""
  }

Öğrencinin cevabı: "${opts.userResponse}"

Değerlendir: correct (anlamca doğru mu — küçük yazım farklarına takılma), score 0-100, feedback_tr (1-3 cümle, cesaretlendirici, ${native} dilinde), gerekiyorsa corrected_answer ve mistakes.
Önemli:
${scriptRule}${diacriticRule}
- Bir kelime/kanji birden çok anlam taşıyabilir: beklenen cevabın eş anlamlısı ya da aynı kavramın başka bir karşılığı da DOĞRUDUR (ör. 上 için "yukarı" da "üst" de doğru). Beklenen cevaba birebir uymuyor diye anlamca doğru cevabı yanlış sayma.
- BELİRLİ KELİME DAYATMA: soru açıkça belirli bir kelimeyi istemedikçe, anlamca doğru ve dilbilgisel olarak geçerli bir cevabı "başka kelime kullanmalıydın" diye yanlış sayma veya puan kırma. Beklenen cevaptaki kelime yerine geçerli bir eş anlamlı/yakın anlamlı kullanılmışsa correct=true ve tam puan ver; istersen feedback içinde alternatifi sadece BİLGİ olarak an.
Sadece JSON döndür.`;
  return { system, prompt };
}
