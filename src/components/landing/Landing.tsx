"use client";

import { useEffect, useState } from "react";
import { pick, type LocalizedStrings, type UiLanguage } from "@/lib/i18n";
import { resolveUiLang } from "@/lib/i18n/use-localize-error";
import { withBase } from "@/lib/base-path";
import { markVisited } from "@/lib/visited-flag";

// T-054 — okumo.dev pazarlama yüzeyi.
//
// KOPYA ÇÖZÜMÜ — dikkat: burada `useStrings` KULLANILAMAZ. useStrings ->
// useProfileMeta -> profileData() -> sql.js WASM + IndexedDB boot demek; yani
// landing'i gate'lemenin bütün amacını sessizce geri alır. Onboarding'in
// kalıbını izliyoruz: pick(S, resolveUiLang(null)).
//
// Senkron tr + effect'te en: statik export build zamanında (navigator yokken)
// resolveUiLang -> "tr" döndürür, böylece out/index.html GERÇEK tr kopyayla
// prerender olur — crawler ve sosyal unfurl için ticket'ın asıl sebebi bu.
// Bedeli: en ziyaretçi bir kare tr görür. Hydration-safe ve SEO-safe; pazarlama
// sayfası için doğru takas.
const S: LocalizedStrings<{
  tagline: string;
  heroTitle: string;
  heroLede: string;
  cta: string;
  resume: string;
  resumeChecking: string;
  resumeEmpty: string;
  resumeFailed: string;
  featuresTitle: string;
  f1t: string;
  f1b: string;
  f2t: string;
  f2b: string;
  f3t: string;
  f3b: string;
  ownTitle: string;
  ownBody: string;
  own1: string;
  own2: string;
  own3: string;
  previewTitle: string;
  previewLede: string;
  nodeDone: string;
  nodeNext: string;
  nodeLocked: string;
  langTitle: string;
  langBody: string;
  langMore: string;
  closingTitle: string;
  closingBody: string;
  sources: string;
}> = {
  tr: {
    tagline: "dil yolculuğun",
    heroTitle: "Kendi hızında, kendi ilgi alanlarınla dil öğren.",
    heroLede:
      "okumo sana bir müfredat çıkarır, dersleri sen ilerledikçe üretir ve unutmaya başladığın şeyi tam zamanında geri getirir. Hesap yok, abonelik yok; ilerlemen kendi tarayıcında kalır.",
    cta: "Başla",
    resume: "Kayıtlı ilerlemeni sürdür",
    resumeChecking: "Kayıt aranıyor…",
    resumeEmpty: "Bu tarayıcıda kayıtlı ilerleme bulunamadı.",
    resumeFailed:
      "Kayıtlarına şu an bakılamadı (bağlantı ya da tarayıcı depolaması). Tekrar dene.",
    featuresTitle: "Ne yapar",
    f1t: "Sana göre müfredat",
    f1b:
      "Seviyeni ve ilgi alanlarını sorar, ona göre bir yol haritası kurar. Bir seviyeyi bitirince bir sonrakini kendi ekler.",
    f2t: "Doğru zamanda tekrar",
    f2b:
      "Aralıklı tekrar (SM-2) ile ne zaman zorlandığını takip eder; zorlandığın konu sonraki derse geri gelir.",
    f3t: "Hazır başvuru kütüphanesi",
    f3b:
      "Dilbilgisi, kanji ve kelime kütüphaneleri paketle birlikte gelir; ilk günden, tek bir LLM çağrısı olmadan açılır.",
    ownTitle: "Veriler sende kalır",
    ownBody:
      "okumo yerel-öncelikli çalışır. İlerlemen tarayıcındaki bir veritabanında durur; istersen tek dosya olarak dışa aktarırsın. Yapay zekâ tarafını da sen seçersin:",
    own1: "Kendi bilgisayarında çalışan bir modelle",
    own2: "Zaten sahip olduğun bir abonelikle",
    own3: "Ya da kendi API anahtarınla",
    previewTitle: "Yol haritan böyle görünür",
    previewLede:
      "Her düğüm bir ders. Bitirdiklerin işaretlenir, sıradaki açılır, gerisi kilitli bekler.",
    nodeDone: "bitti",
    nodeNext: "sırada",
    nodeLocked: "kilitli",
    langTitle: "Diller",
    langBody:
      "Japonca (JLPT N5→N1), Çince (HSK 1→6), Felemenkçe ve Fransızca (A1→C2) için hazır içerik; başka bir dil seçersen okumo onu da standart seviyelerle açar.",
    langMore: "+ diğer diller",
    closingTitle: "Bir dil seç, ilk dersin hazır olsun.",
    closingBody: "Kurulum yok, kayıt yok. Tarayıcında açılır.",
    sources: "Kaynaklar & lisanslar",
  },
  en: {
    tagline: "your language journey",
    heroTitle: "Learn a language at your own pace, around your own interests.",
    heroLede:
      "okumo builds you a curriculum, generates lessons as you go, and brings things back right as you start to forget them. No account, no subscription; your progress stays in your own browser.",
    cta: "Get started",
    resume: "Continue saved progress",
    resumeChecking: "Looking for a save…",
    resumeEmpty: "No saved progress found in this browser.",
    resumeFailed:
      "Could not check your saved progress right now (connection or browser storage). Try again.",
    featuresTitle: "What it does",
    f1t: "A curriculum for you",
    f1b:
      "It asks about your level and interests, then lays out a roadmap. Finish a level and it appends the next one itself.",
    f2t: "Review at the right time",
    f2b:
      "Spaced repetition (SM-2) tracks what you struggle with, and the topics you find hard come back in later lessons.",
    f3t: "A reference library, included",
    f3b:
      "Grammar, kanji and vocabulary libraries ship with the app; open from day one, without a single LLM call.",
    ownTitle: "Your data stays yours",
    ownBody:
      "okumo is local-first. Your progress lives in a database inside your browser, and you can export it as a single file whenever you want. You pick the AI side too:",
    own1: "With a model running on your own machine",
    own2: "With a subscription you already have",
    own3: "Or with your own API key",
    previewTitle: "What your roadmap looks like",
    previewLede:
      "Each node is a lesson. Finished ones get marked, the next one opens, the rest wait locked.",
    nodeDone: "done",
    nodeNext: "next",
    nodeLocked: "locked",
    langTitle: "Languages",
    langBody:
      "Ready-made content for Japanese (JLPT N5→N1), Chinese (HSK 1→6), Dutch and French (A1→C2); pick any other language and okumo opens it with standard levels.",
    langMore: "+ other languages",
    closingTitle: "Pick a language and have your first lesson ready.",
    closingBody: "No install, no sign-up. It opens in your browser.",
    sources: "Sources & licenses",
  },
};

/** Kumo mark — StatsHeader'daki markanın birebir aynısı (DS v2 bölüm 04). */
function KumoMark({ height = 44 }: { height?: number }) {
  return (
    <svg viewBox="0 0 128 86" height={height} aria-hidden="true">
      <g fill="var(--accent)">
        <circle cx="40" cy="44" r="22" />
        <circle cx="68" cy="34" r="27" />
        <circle cx="94" cy="47" r="18" />
        <rect x="18" y="44" width="94" height="22" rx="11" />
      </g>
      <rect x="30" y="74" width="26" height="7" rx="3.5" fill="var(--indigo)" />
      <rect x="64" y="74" width="42" height="7" rx="3.5" fill="var(--indigo)" />
    </svg>
  );
}

export function Landing() {
  // Build zamanı (navigator yok) -> "tr". İstemcide gerçek dil effect'te gelir.
  const [lang, setLang] = useState<UiLanguage>("tr");
  useEffect(() => setLang(resolveUiLang(null)), []);
  const t = pick(S, lang);

  // "Kayıtlı ilerlemeni sürdür": YAVAŞ yol bilerek TIKLAMAYA bağlı. Mount'ta
  // profileData() çağırmak sql.js boot'unu (ve browserDb()'nin /api/save/export
  // fetch'ini) her pazarlama ziyaretçisine ödetirdi — gate'in amacını bozar.
  // "empty" (baktım, yok) ile "failed" (BAKAMADIM) ayrı durumlar olmak
  // ZORUNDA. profileData() statik modda ~645KB wasm fetch + IndexedDB açılışı
  // demek; çevrimdışı, private mode ya da storage erişimi reddinde reject
  // eder. İkisini tek "empty"de birleştirmek, verisi duran kullanıcıya
  // "kayıt bulunamadı" diye YALAN söylerdi.
  const [resumeState, setResumeState] = useState<
    "idle" | "busy" | "empty" | "failed"
  >("idle");
  const onResume = async () => {
    setResumeState("busy");
    try {
      const { profileData } = await import("@/lib/client-api");
      const d = await profileData();
      if (d?.profile) {
        markVisited(); // bayrağı geri doldur — bir dahakine anında geçsin
        window.location.href = withBase("/map");
        return;
      }
      setResumeState("empty");
    } catch {
      setResumeState("failed");
    }
  };

  return (
    <div className="min-h-dvh">
      <main className="mx-auto flex max-w-3xl flex-col gap-20 px-5 py-14 sm:py-20">
        {/* ---------------------------------------------------------- Hero */}
        <header className="flex flex-col items-center text-center">
          <div className="flex items-center gap-3">
            <KumoMark />
            <div className="text-left">
              <div className="font-display text-3xl font-bold leading-none">
                okumo
              </div>
              <div className="text-sm text-ink-soft">{t.tagline}</div>
            </div>
          </div>

          <h1 className="mt-9 max-w-2xl font-display text-4xl font-bold leading-tight sm:text-5xl">
            {t.heroTitle}
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink-soft">{t.heroLede}</p>

          {/* Sayfadaki TEK baskın vermilyon odak (DS v2 renk kuralı). */}
          <a
            href={withBase("/onboarding")}
            className="mt-9 rounded-full bg-accent px-8 py-4 text-lg font-semibold text-surface shadow-cozy transition-all hover:brightness-110 active:scale-95"
          >
            {t.cta}
          </a>

          {/* Bayrağı olmayan ama verisi olan kullanıcının çıkış yolu.
              Buton hiçbir durumda EKRANDAN KALKMAZ: "bulunamadı" da "bakamadım"
              da yeniden denenebilir olmalı, yoksa kullanıcı tam sayfa yenileme
              olmadan kilitleniyordu. */}
          <div className="mt-4 flex min-h-6 flex-col items-center gap-1 text-sm">
            <button
              onClick={() => void onResume()}
              disabled={resumeState === "busy"}
              className="cursor-pointer text-indigo underline underline-offset-4 hover:text-indigo-deep disabled:opacity-60"
            >
              {resumeState === "busy" ? t.resumeChecking : t.resume}
            </button>
            {resumeState === "empty" && (
              <span className="text-ink-soft">{t.resumeEmpty}</span>
            )}
            {resumeState === "failed" && (
              <span className="text-danger">{t.resumeFailed}</span>
            )}
          </div>
        </header>

        {/* ------------------------------------------------------ Özellikler */}
        <section>
          <h2 className="font-display text-2xl font-bold">{t.featuresTitle}</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              [t.f1t, t.f1b],
              [t.f2t, t.f2b],
              [t.f3t, t.f3b],
            ].map(([title, body]) => (
              <div
                key={title}
                className="rounded-cozy bg-surface p-5 shadow-cozy"
              >
                <h3 className="font-display text-lg font-bold">{title}</h3>
                <p className="mt-2 text-sm text-ink-soft">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ------------------------- Dürüst farklılaştırıcı (indigo = bilgi) */}
        <section className="rounded-cozy bg-indigo-soft p-7">
          <h2 className="font-display text-2xl font-bold text-indigo-deep">
            {t.ownTitle}
          </h2>
          <p className="mt-3 text-ink-soft">{t.ownBody}</p>
          <ul className="mt-4 flex flex-col gap-2 text-sm">
            {[t.own1, t.own2, t.own3].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span
                  className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-indigo"
                  aria-hidden="true"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ------------------------------------------------------- Önizleme */}
        {/* Ekran görüntüsü aseti yok (kapsam dışı) — yol haritası düğümleri
            DS v2 desenlerinden CSS ile kuruldu. Hero CTA'nın tek baskın
            vermilyon odağıyla yarışmaması için burada pulse-glow YOK. */}
        <section>
          <h2 className="font-display text-2xl font-bold">{t.previewTitle}</h2>
          <p className="mt-2 text-ink-soft">{t.previewLede}</p>
          <div className="mt-6 flex items-center justify-center gap-4 rounded-cozy bg-surface p-8 shadow-cozy sm:gap-7">
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo text-2xl text-surface">
                ✓
              </div>
              <span className="text-xs text-ink-soft">{t.nodeDone}</span>
            </div>
            <div className="h-0.5 w-6 rounded bg-indigo-soft sm:w-10" />
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-2xl text-surface shadow-cozy">
                あ
              </div>
              <span className="text-xs font-semibold text-ink">{t.nodeNext}</span>
            </div>
            <div className="h-0.5 w-6 rounded bg-locked sm:w-10" />
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-locked text-2xl opacity-70">
                🔒
              </div>
              <span className="text-xs text-ink-soft">{t.nodeLocked}</span>
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------- Diller */}
        <section>
          <h2 className="font-display text-2xl font-bold">{t.langTitle}</h2>
          <p className="mt-3 text-ink-soft">{t.langBody}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {["日本語", "中文", "Nederlands", t.langMore].map((l) => (
              <span
                key={l}
                className="rounded-full bg-surface px-4 py-2 text-sm font-semibold shadow-cozy"
              >
                {l}
              </span>
            ))}
          </div>
        </section>

        {/* -------------------------------------------------- Kapanış + footer */}
        <section className="flex flex-col items-center gap-4 text-center">
          <h2 className="font-display text-2xl font-bold">{t.closingTitle}</h2>
          <p className="text-ink-soft">{t.closingBody}</p>
          {/* İkinci CTA vermilyon DEĞİL — vermilyon bütçesi hero'da harcandı. */}
          <a
            href={withBase("/onboarding")}
            className="rounded-full bg-surface-2 px-6 py-3 font-semibold text-ink shadow-cozy transition-all hover:bg-accent-soft active:scale-95"
          >
            {t.cta}
          </a>
        </section>

        <footer className="flex items-center justify-center gap-2 border-t border-surface-2 pt-8 text-sm text-ink-soft">
          <KumoMark height={18} />
          <span>okumo</span>
          <span aria-hidden="true">·</span>
          <a href={withBase("/about")} className="underline">
            {t.sources}
          </a>
        </footer>
      </main>
    </div>
  );
}
