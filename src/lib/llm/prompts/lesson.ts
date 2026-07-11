type Profile = typeof import("@/db/schema").profiles.$inferSelect;
type Node = typeof import("@/db/schema").nodes.$inferSelect;

const LANGUAGE_NAMES: Record<string, string> = {
  ja: "Japonca",
  nl: "Hollandaca",
};

export function lessonPrompt(opts: {
  profile: Profile;
  node: Node;
  unitTitle: string;
  unitTheme: string;
  completedTitles: string[];
}) {
  const lang =
    LANGUAGE_NAMES[opts.profile.targetLanguage] ?? opts.profile.targetLanguage;

  const system = `Sen sıcak ve sabırlı bir ${lang} öğretmenisin. Türk öğrencilere ders içeriği hazırlıyorsun. Açıklamalar Türkçe, hedef dildeki her metnin okunuşu (reading) mutlaka verilir. Sadece istenen JSON'u döndür.`;

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
- İlgi alanları: ${opts.profile.interests.join(", ")}
- Daha önce tamamladığı dersler: ${
    opts.completedTitles.length
      ? opts.completedTitles.join(", ")
      : "yok, bu ilk dersi"
  }
${boss}
Bu ders için içerik üret:
- "explanation_tr": Markdown, Türkçe, samimi bir öğretmen sesi. Konuyu sıfırdan ve net anlat.
- "examples": 3-6 örnek. "target" hedef dilde, "reading" latin okunuş, "translation_tr" Türkçe çeviri.
- "grammar_notes": varsa 1-3 kısa not.
- "vocab": bu derste geçen 3-8 yeni kelime (SRS kartına dönüşecek).
- "exercises": 6-10 karışık alıştırma:
  * "mcq": options 4 seçenek, answer seçeneklerden birinin AYNEN kendisi.
  * "fill_blank": prompt_tr içinde ___ bulunan cümle; answer boşluğa gelen ifade; accept_also kabul edilebilir alternatifler.
  * "translate": target_text hedef dilde cümle; answer Türkçe kanonik çeviri; accept_also alternatifler.
  * "free_response": prompt_tr serbest üretim istesin; answer alanına DEĞERLENDİRME KILAVUZU yaz (doğru cevabın nasıl görünmesi gerektiği).
- Örnek bağlamlarını öğrencinin ilgi alanlarından seç.

Sadece şemaya uygun JSON döndür.`;

  return { system, prompt };
}

export function gradingPrompt(opts: {
  targetLanguage: string;
  exerciseType: string;
  promptTr: string;
  targetText: string | null;
  expectedAnswer: string;
  userResponse: string;
}) {
  const lang = LANGUAGE_NAMES[opts.targetLanguage] ?? opts.targetLanguage;
  const system = `Sen bir ${lang} öğretmenisin, öğrenci cevaplarını değerlendiriyorsun. Cesaretlendirici ama dürüst ol. Geri bildirim Türkçe. Sadece istenen JSON'u döndür.`;
  const prompt = `Alıştırma (${opts.exerciseType}):
Soru: ${opts.promptTr}
${opts.targetText ? `Hedef metin: ${opts.targetText}` : ""}
Beklenen cevap / değerlendirme kılavuzu: ${opts.expectedAnswer}

Öğrencinin cevabı: "${opts.userResponse}"

Değerlendir: correct (anlamca doğru mu — küçük yazım farklarına takılma), score 0-100, feedback_tr (1-3 cümle, cesaretlendirici), gerekiyorsa corrected_answer ve mistakes. Sadece JSON döndür.`;
  return { system, prompt };
}
