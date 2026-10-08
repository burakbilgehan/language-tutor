import { Furigana } from "@/components/shared/Furigana";
import { JpMarkdown } from "@/components/shared/JpMarkdown";
import { SpeakButton } from "@/components/shared/SpeakButton";
import type { Guide, GuideBlock, L } from "@/lib/travel/types";
import { PhraseCard } from "./PhraseCard";
import { SignCard } from "./SignMockView";

export interface GuideLabels {
  hear: string;
  reply: string;
  staff: string;
  you: string;
  tip: string;
}

function Cell({ cell, ui }: { cell: string | L; ui: "tr" | "en" }) {
  return typeof cell === "string" ? (
    <Furigana text={cell} lang="ja" />
  ) : (
    <span>{cell[ui]}</span>
  );
}

function Block({
  block,
  ui,
  labels,
}: {
  block: GuideBlock;
  ui: "tr" | "en";
  labels: GuideLabels;
}) {
  switch (block.type) {
    case "heading":
      return (
        <h2 className="font-display mt-4 text-xl font-semibold text-ink">
          {block.text[ui]}
        </h2>
      );
    case "text":
      return (
        <div className="prose-cozy text-[0.95rem] leading-relaxed">
          <JpMarkdown>{block.body[ui]}</JpMarkdown>
        </div>
      );
    case "tip":
      return (
        <aside className="rounded-cozy border-l-4 border-indigo bg-indigo-soft px-4 py-3 text-sm">
          <div className="mb-1 font-semibold text-indigo">💡 {labels.tip}</div>
          <div className="prose-cozy">
            <JpMarkdown>{block.body[ui]}</JpMarkdown>
          </div>
        </aside>
      );
    case "steps":
      return (
        <section className="flex flex-col gap-3">
          {block.title && <h3 className="font-semibold">{block.title[ui]}</h3>}
          <ol className="flex flex-col gap-3">
            {block.steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo text-sm font-bold text-surface">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1 rounded-cozy bg-surface px-4 py-3 shadow-cozy">
                  <div className="font-semibold">{s.title[ui]}</div>
                  <div className="prose-cozy text-sm">
                    <JpMarkdown>{s.body[ui]}</JpMarkdown>
                  </div>
                  {s.jp && (
                    <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-surface-2/70 px-3 py-1.5">
                      <div>
                        <div className="leading-loose">
                          <Furigana text={s.jp} lang="ja" />
                        </div>
                        {s.romaji && (
                          <div className="text-xs text-ink-soft">{s.romaji}</div>
                        )}
                      </div>
                      <SpeakButton text={s.jp} lang="ja-JP" className="shrink-0" />
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      );
    case "dialogue":
      return (
        <section className="flex flex-col gap-2 rounded-cozy bg-surface-2/50 p-3">
          {block.title && (
            <h3 className="px-1 font-semibold">💬 {block.title[ui]}</h3>
          )}
          {block.lines.map((line, i) => {
            const you = line.who === "you";
            return (
              <div
                key={i}
                className={`flex ${you ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3 py-2 shadow-cozy ${
                    you
                      ? "rounded-br-sm bg-indigo-soft"
                      : "rounded-bl-sm bg-surface"
                  }`}
                >
                  <div className="text-[0.7rem] font-semibold uppercase tracking-wide text-ink-soft">
                    {you ? labels.you : labels.staff}
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="min-w-0">
                      <div className="leading-loose">
                        <Furigana text={line.jp} lang="ja" />
                      </div>
                      <div className="text-xs text-ink-soft">{line.romaji}</div>
                      <div className="text-sm">{line.meaning[ui]}</div>
                    </div>
                    <SpeakButton text={line.jp} lang="ja-JP" className="shrink-0" />
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      );
    case "phrases":
      return (
        <section className="flex flex-col gap-3">
          {block.title && <h3 className="font-semibold">{block.title[ui]}</h3>}
          {block.items.map((p, i) => (
            <PhraseCard
              key={i}
              phrase={p}
              ui={ui}
              hearLabel={labels.hear}
              replyLabel={labels.reply}
            />
          ))}
        </section>
      );
    case "table":
      return (
        <figure className="rounded-cozy bg-surface p-4 shadow-cozy">
          <figcaption className="mb-3 font-semibold text-indigo">
            {block.title[ui]}
          </figcaption>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  {block.columns.map((c, i) => (
                    <th
                      key={i}
                      className="border-b-2 border-indigo-soft bg-surface-2 px-3 py-2 text-left font-semibold"
                    >
                      {c[ui]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, ri) => (
                  <tr key={ri} className="odd:bg-background/60">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-3 py-2 align-top leading-loose">
                        <Cell cell={cell} ui={ui} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </figure>
      );
    case "signs":
      return (
        <section className="flex flex-col gap-3">
          {block.title && <h3 className="font-semibold">{block.title[ui]}</h3>}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {block.items.map((s, i) => (
              <SignCard key={i} sign={s} ui={ui} />
            ))}
          </div>
        </section>
      );
  }
}

export function GuideView({
  guide,
  ui,
  labels,
}: {
  guide: Guide;
  ui: "tr" | "en";
  labels: GuideLabels;
}) {
  return (
    <article className="flex flex-col gap-5">
      <header className="rounded-cozy bg-surface px-5 py-4 shadow-cozy">
        <div className="text-3xl">{guide.icon}</div>
        <h1 className="font-display mt-1 text-2xl font-semibold">
          {guide.title[ui]}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">{guide.summary[ui]}</p>
      </header>
      {guide.blocks.map((b, i) => (
        <Block key={i} block={b} ui={ui} labels={labels} />
      ))}
    </article>
  );
}
