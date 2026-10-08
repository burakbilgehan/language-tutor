import Link from "next/link";
import { JA_KANJI_INDEX, type KanjiIndexEntry } from "@/lib/kanji-index/ja";
import type { KanjiGroup, SignKanji } from "@/lib/travel/types";
import { SignCard } from "./SignMockView";

// Readings are dictionary facts (KANJIDIC via kanji-index), never authored
// text: the travel content only names the kanji.
const BY_CHAR = new Map<string, KanjiIndexEntry>(
  JA_KANJI_INDEX.map((k) => [k.char, k])
);

const kun = (r: string) => r.replace(/^-|-$/g, "").replace(/\.(.+)$/, "($1)");

export interface KanjiLabels {
  on: string;
  kun: string;
  seen: string;
  stroke: string;
}

function KanjiCard({
  k,
  ui,
  labels,
}: {
  k: SignKanji;
  ui: "tr" | "en";
  labels: KanjiLabels;
}) {
  const entry = BY_CHAR.get(k.kanji);
  return (
    <article className="flex flex-col gap-3 rounded-cozy bg-surface p-4 shadow-cozy">
      <div className="flex items-start gap-4">
        <div className="flex flex-col items-center">
          <div
            lang="ja"
            className="flex h-20 w-20 items-center justify-center rounded-xl border-2 border-surface-2 bg-background text-5xl font-semibold"
          >
            {k.kanji}
          </div>
          {entry && (
            <span className="mt-1 text-[0.7rem] font-semibold text-ink-soft">
              {entry.level}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-lg font-semibold">{k.meaning[ui]}</div>
          {entry && (
            <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 text-sm">
              {entry.on.length > 0 && (
                <>
                  <dt className="text-ink-soft">{labels.on}</dt>
                  <dd lang="ja">{entry.on.join("・")}</dd>
                </>
              )}
              {entry.kun.length > 0 && (
                <>
                  <dt className="text-ink-soft">{labels.kun}</dt>
                  <dd lang="ja">{entry.kun.slice(0, 4).map(kun).join("・")}</dd>
                </>
              )}
            </dl>
          )}
          <p className="mt-2 text-sm text-ink-soft">
            <span className="font-semibold">{labels.seen}:</span>{" "}
            {k.whereSeen[ui]}
          </p>
        </div>
      </div>
      <ul className="flex flex-col divide-y divide-surface-2 rounded-lg bg-background/60">
        {k.compounds.map((c) => (
          <li key={c.word} className="flex items-center gap-3 px-3 py-1.5">
            <ruby lang="ja" className="shrink-0 text-xl font-semibold">
              {c.word}
              <rt className="text-[0.6em] font-normal text-ink-soft">
                {c.reading}
              </rt>
            </ruby>
            <div className="min-w-0 text-sm">
              <span className="text-ink-soft">{c.romaji}</span>{" "}
              <span>{c.meaning[ui]}</span>
            </div>
          </li>
        ))}
      </ul>
      {entry && (
        <Link
          href={`/stroke?char=${encodeURIComponent(k.kanji)}`}
          className="self-start text-sm text-indigo underline-offset-2 hover:underline"
        >
          ✍️ {labels.stroke}
        </Link>
      )}
    </article>
  );
}

export function KanjiGroupView({
  group,
  ui,
  labels,
}: {
  group: KanjiGroup;
  ui: "tr" | "en";
  labels: KanjiLabels;
}) {
  return (
    <section className="flex flex-col gap-5">
      <header className="rounded-cozy bg-surface px-5 py-4 shadow-cozy">
        <h2 className="font-display text-xl font-semibold">
          {group.icon} {group.title[ui]}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">{group.intro[ui]}</p>
      </header>
      {group.signs.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {group.signs.map((s, i) => (
            <SignCard key={i} sign={s} ui={ui} />
          ))}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {group.kanji.map((k) => (
          <KanjiCard key={k.kanji} k={k} ui={ui} labels={labels} />
        ))}
      </div>
    </section>
  );
}
