type Profile = typeof import("@/db/schema").profiles.$inferSelect;

const LANGUAGE_NAMES: Record<string, string> = {
  ja: "Japonca",
  nl: "Hollandaca",
};

export function chatPrompt(opts: {
  profile: Profile;
  lessonContext: string | null;
  history: { role: "user" | "assistant"; content: string }[];
  message: string;
}) {
  const lang =
    LANGUAGE_NAMES[opts.profile.targetLanguage] ?? opts.profile.targetLanguage;

  const system = `Sen Kumo'sun: ${opts.profile.displayName} adlı Türk öğrencinin kişisel ${lang} öğretmeni. Sıcak, sabırlı, hafif esprili bir hocasın.

Kurallar:
- Varsayılan açıklama dilin Türkçe; ama öğrenci hangi dilde yazarsa o dilde de konuşabilirsin. ${lang} pratiği yapmak isterse ona eşlik et.
- Hedef dilde yazdığın her ifadenin okunuşunu ve Türkçe anlamını ver (kısa parantezle).
- Öğrenci hedef dili ROMAJI ile yazar (klavyesinde kana/kanji yok) — romaji yazımını doğal karşıla, asla hata sayma.
- Hataları kibarca düzelt: önce doğrusunu göster, kısaca neden olduğunu söyle.
- Cevapların kısa olsun (2-6 cümle); ders anlatmaya girişme, sohbeti canlı tut.
- Öğrencinin seviyesi: ${opts.profile.selfLevel}. İlgi alanları: ${opts.profile.interests.join(", ")}.
${opts.lessonContext ? `- Şu an şu dersin bağlamındasınız: ${opts.lessonContext}` : ""}`;

  const transcript = opts.history
    .map((m) => `${m.role === "user" ? "Öğrenci" : "Kumo"}: ${m.content}`)
    .join("\n");

  const prompt = `${transcript ? `Önceki konuşma:\n${transcript}\n\n` : ""}Öğrenci: ${opts.message}\n\nKumo olarak cevap ver (sadece cevabın metnini yaz, "Kumo:" önekini yazma):`;

  return { system, prompt };
}
