import { Furigana } from "@/components/shared/Furigana";
import { SpeakButton } from "@/components/shared/SpeakButton";
import type { Phrase } from "@/lib/travel/types";

export function PhraseCard({
  phrase,
  ui,
  hearLabel,
  replyLabel,
}: {
  phrase: Phrase;
  ui: "tr" | "en";
  hearLabel: string;
  replyLabel: string;
}) {
  return (
    <article className="rounded-cozy bg-surface px-4 py-3 shadow-cozy">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {phrase.hear && (
            <span className="mb-1 inline-block rounded-full bg-indigo-soft px-2 py-0.5 text-xs font-semibold text-indigo">
              👂 {hearLabel}
            </span>
          )}
          <div className="text-lg leading-loose sm:text-xl">
            <Furigana text={phrase.jp} lang="ja" />
          </div>
          <div className="text-sm text-ink-soft">{phrase.romaji}</div>
          <div className="mt-1 font-semibold">{phrase.meaning[ui]}</div>
          {phrase.note && (
            <p className="mt-1 text-sm text-ink-soft">{phrase.note[ui]}</p>
          )}
        </div>
        <SpeakButton text={phrase.jp} lang="ja-JP" className="shrink-0" />
      </div>
      {phrase.reply && (
        <div className="mt-3 flex items-start justify-between gap-3 border-l-4 border-indigo-soft pl-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-indigo">
              ↩ {replyLabel}
            </div>
            <div className="leading-loose">
              <Furigana text={phrase.reply.jp} lang="ja" />
            </div>
            <div className="text-xs text-ink-soft">{phrase.reply.romaji}</div>
            <div className="text-sm">{phrase.reply.meaning[ui]}</div>
          </div>
          <SpeakButton text={phrase.reply.jp} lang="ja-JP" className="shrink-0" />
        </div>
      )}
    </article>
  );
}
