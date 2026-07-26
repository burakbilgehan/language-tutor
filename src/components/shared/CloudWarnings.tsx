"use client";

import type { UnreconstitutedRow } from "@/lib/save/seed-strip";
import type { UiLanguage } from "@/lib/i18n";
import { pick } from "@/lib/i18n";

// T-048: renders PullResult.warnings — the rows a pull could NOT bring back.
//
// This is content loss, not a hiccup: the cloud blob is seed-stripped, so
// content that the packaged CDN seed no longer covers (a renamed or dropped
// slug) is simply gone from the restored save. Toasting that away would make
// the loss effectively silent, which is the exact failure T-047 built the
// manifest to prevent. So it renders as a persistent, itemised, dismissible
// panel — non-blocking, but it names what was lost.
//
// Takes uiLanguage explicitly instead of useStrings(): onboarding has no
// profile yet (draft.uiLanguage), while Settings has one. Same component, both
// callers.

const S = {
  tr: {
    title: "Bazı içerikler geri getirilemedi",
    desc: "Buluttaki kayıt, uygulamayla birlikte gelen hazır içeriğe dayanıyordu. Aşağıdaki maddeler artık o pakette yok, bu yüzden geri yüklenemedi. İlerlemen (dersler, tekrar kartları, istatistikler) etkilenmedi — yalnız bu başlıkların hazır metni boş; istersen tekrar üretebilirsin.",
    kinds: { grammar: "Gramer", kanji: "Kanji", vocab: "Kelime" } as Record<string, string>,
    more: (n: number) => `…ve ${n} tane daha`,
    dismiss: "Anladım",
  },
  en: {
    title: "Some content could not be restored",
    desc: "The cloud save relied on the content packaged with the app. The items below are no longer in that package, so they could not be restored. Your progress (lessons, review cards, stats) is unaffected — only these entries' prepared text is empty; you can regenerate them.",
    kinds: { grammar: "Grammar", kanji: "Kanji", vocab: "Vocabulary" } as Record<string, string>,
    more: (n: number) => `…and ${n} more`,
    dismiss: "Got it",
  },
};

/** Cap the rendered list — a large drift could otherwise be thousands of rows. */
const MAX_SHOWN = 30;

export function CloudWarnings({
  rows,
  uiLanguage,
  onDismiss,
}: {
  rows: UnreconstitutedRow[];
  uiLanguage: UiLanguage;
  onDismiss?: () => void;
}) {
  const t = pick(S, uiLanguage);
  if (rows.length === 0) return null;
  const shown = rows.slice(0, MAX_SHOWN);
  const rest = rows.length - shown.length;

  return (
    <div className="rounded-xl border-2 border-accent/40 bg-accent-soft/30 px-4 py-3">
      <div className="font-semibold">{t.title}</div>
      <p className="mt-1 text-sm text-ink-soft">{t.desc}</p>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {shown.map((r) => (
          <li
            key={`${r.kind}:${r.lang}:${r.key}`}
            className="rounded-full bg-surface px-2.5 py-1 text-xs"
          >
            <span className="text-ink-soft">
              {t.kinds[r.kind] ?? r.kind} · {r.lang}
            </span>{" "}
            {r.key}
          </li>
        ))}
      </ul>
      {rest > 0 && <p className="mt-2 text-xs text-ink-soft">{t.more(rest)}</p>}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="mt-3 rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold transition-colors hover:bg-surface"
        >
          {t.dismiss}
        </button>
      )}
    </div>
  );
}
