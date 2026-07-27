import type { GrammarTable as GrammarTableData } from "@/lib/llm/schemas";
import { Furigana } from "@/components/shared/Furigana";

export function GrammarTable({
  table,
  lang,
}: {
  table: GrammarTableData;
  lang?: "ja" | "zh" | null;
}) {
  return (
    <figure className="rounded-cozy bg-surface p-5 shadow-cozy">
      <figcaption className="mb-3 font-semibold text-accent">
        {table.caption_tr}
      </figcaption>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {table.column_headers.map((h, i) => (
                <th
                  key={i}
                  className="sticky top-0 border-b-2 border-accent-soft bg-surface-2 px-3 py-2 text-left font-semibold"
                >
                  <Furigana text={h} lang={lang} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, ri) => (
              <tr key={ri} className="odd:bg-background/60">
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className={`border-b border-surface-2 px-3 py-2 ${
                      ci === 0 ? "text-base font-medium" : ""
                    }`}
                  >
                    <Furigana text={cell} lang={lang} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {table.footnotes_tr && table.footnotes_tr.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1 text-xs text-ink-soft">
          {table.footnotes_tr.map((f, i) => (
            <li key={i}>
              ※ <Furigana text={f} lang={lang} />
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}
