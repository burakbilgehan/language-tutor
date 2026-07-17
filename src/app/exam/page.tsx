import Link from "next/link";
import { StatsHeader } from "@/components/shared/StatsHeader";
import { getActiveProfile } from "@/lib/profile";
import { pick } from "@/lib/i18n";

export const dynamic = "force-dynamic";

interface ExamPart {
  name: string;
  descTr: string;
  descEn: string;
}

interface ExamInfo {
  id: string;
  title: string;
  levelTr: string;
  levelEn: string;
  forTr: string;
  forEn: string;
  parts: ExamPart[];
  links: { label: string; url: string }[];
}

// Static, curated exam guide. Official practice material stays on the
// official sites (copyright); we describe the format and link out. Mock
// sections generated in-app follow later.
const EXAMS: ExamInfo[] = [
  {
    id: "inburgering",
    title: "Inburgeringsexamen",
    levelTr: "A2 (Wi2021 kapsamında B1 hedefli)",
    levelEn: "A2 (B1-oriented under Wi2021)",
    forTr: "Oturum izni ve vatandaşlık için temel şart.",
    forEn: "The base requirement for residency and naturalization.",
    parts: [
      { name: "Lezen", descTr: "Okuma — kısa metinler üzerine çoktan seçmeli.", descEn: "Reading — multiple choice on short texts." },
      { name: "Luisteren", descTr: "Dinleme — ses/video parçaları + çoktan seçmeli.", descEn: "Listening — clips + multiple choice." },
      { name: "Schrijven", descTr: "Yazma — form doldurma, kısa mesaj/mektup.", descEn: "Writing — forms, short messages." },
      { name: "Spreken", descTr: "Konuşma — soruya sesli yanıt, resim anlatma.", descEn: "Speaking — recorded answers, describing pictures." },
      { name: "KNM", descTr: "Hollanda toplumu bilgisi (Kennis van de Nederlandse Maatschappij).", descEn: "Knowledge of Dutch society." },
    ],
    links: [
      { label: "inburgeren.nl — resmî portal + örnek sınavlar", url: "https://www.inburgeren.nl/examen-doen/oefenen.jsp" },
      { label: "oefenen.nl — ücretsiz alıştırma platformu", url: "https://oefenen.nl" },
      { label: "DUO — sınav kaydı ve kurallar", url: "https://duo.nl/particulier/inburgeren/" },
    ],
  },
  {
    id: "nt2-1",
    title: "Staatsexamen NT2 — Programma I",
    levelTr: "B1",
    levelEn: "B1",
    forTr: "Meslek eğitimi (mbo) ve iş için; inburgering yerine de geçer.",
    forEn: "For vocational study/work; also satisfies inburgering.",
    parts: [
      { name: "Lezen", descTr: "Okuma — günlük/iş metinleri, çoktan seçmeli.", descEn: "Reading — everyday/work texts." },
      { name: "Luisteren", descTr: "Dinleme — günlük konuşmalar.", descEn: "Listening — everyday speech." },
      { name: "Schrijven", descTr: "Yazma — e-posta, kısa rapor.", descEn: "Writing — emails, short reports." },
      { name: "Spreken", descTr: "Konuşma — kısa ve uzun yanıt görevleri.", descEn: "Speaking — short and long response tasks." },
    ],
    links: [
      { label: "staatsexamensnt2.nl — resmî örnek sınavlar (çıkmış format)", url: "https://www.staatsexamensnt2.nl/oefenen" },
      { label: "College voor Toetsen en Examens — bilgi", url: "https://www.cvte.nl/onderwerpen/staatsexamens-nt2" },
    ],
  },
  {
    id: "nt2-2",
    title: "Staatsexamen NT2 — Programma II",
    levelTr: "B2",
    levelEn: "B2",
    forTr: "Üniversite (hbo/wo) ve profesyonel meslekler için.",
    forEn: "For higher education and professional roles.",
    parts: [
      { name: "Lezen / Luisteren / Schrijven / Spreken", descTr: "Aynı dört beceri, B2 metin ve görevleriyle.", descEn: "Same four skills at B2 complexity." },
    ],
    links: [
      { label: "staatsexamensnt2.nl — Programma II örnekleri", url: "https://www.staatsexamensnt2.nl/oefenen" },
    ],
  },
];

const S = {
  tr: {
    title: "Sınav Hazırlığı",
    titleShort: "Sınav",
    nlOnly: "Sınav rehberi şimdilik Felemenkçe profiline özel.",
    backToMap: "Haritaya dön",
    intro:
      "Hollanda'da oturum/vatandaşlık için inburgeringsexamen, eğitim/iş için Staatsexamen NT2 istenir. Formatlar aşağıda; resmî örnek sınavlar (çıkmış format) linklerde. Uygulama içi format-taklidi deneme bölümleri yolda.",
    level: "Seviye",
    whoFor: "Kimin için",
    parts: "Bölümler",
    links: "Resmî kaynaklar",
  },
  en: {
    title: "Exam Preparation",
    titleShort: "Exams",
    nlOnly: "The exam guide is Dutch-only for now.",
    backToMap: "Back to the map",
    intro:
      "The Netherlands requires the inburgeringsexamen for residency/citizenship and Staatsexamen NT2 for study/work. Formats below; official practice exams behind the links. In-app mock sections are coming.",
    level: "Level",
    whoFor: "Who it's for",
    parts: "Parts",
    links: "Official resources",
  },
};

export default function ExamPage() {
  const profile = getActiveProfile();
  const t = pick(S, profile?.uiLanguage);
  const en = profile?.uiLanguage === "en";
  if (profile && profile.targetLanguage !== "nl") {
    return (
      <div className="min-h-dvh pb-16">
        <StatsHeader title={t.titleShort} />
        <div className="flex flex-col items-center gap-3 py-24 text-center text-ink-soft">
          <div className="text-4xl">🌿</div>
          <p>{t.nlOnly}</p>
          <Link href="/map" className="underline">
            {t.backToMap}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-16">
      <StatsHeader title={t.title} />
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
        <p className="text-sm text-ink-soft">{t.intro}</p>
        {EXAMS.map((exam) => (
          <section key={exam.id} className="rounded-cozy bg-surface p-4 shadow-cozy">
            <h2 className="font-display text-lg font-bold">{exam.title}</h2>
            <div className="mt-1 text-sm">
              <span className="font-semibold">{t.level}:</span>{" "}
              {en ? exam.levelEn : exam.levelTr}
            </div>
            <div className="text-sm text-ink-soft">
              {en ? exam.forEn : exam.forTr}
            </div>
            <div className="mt-2 text-xs font-semibold tracking-wider text-accent">
              {t.parts.toUpperCase()}
            </div>
            <ul className="mt-1 flex flex-col gap-1 text-sm">
              {exam.parts.map((p) => (
                <li key={p.name}>
                  <span className="font-semibold" lang="nl">
                    {p.name}
                  </span>{" "}
                  — {en ? p.descEn : p.descTr}
                </li>
              ))}
            </ul>
            <div className="mt-2 text-xs font-semibold tracking-wider text-accent">
              {t.links.toUpperCase()}
            </div>
            <ul className="mt-1 flex flex-col gap-1 text-sm">
              {exam.links.map((l) => (
                <li key={l.url}>
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-dotted underline-offset-2 hover:text-accent"
                  >
                    {l.label} ↗
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
    </div>
  );
}
