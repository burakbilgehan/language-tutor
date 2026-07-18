import { parseFurigana, splitCjkRuns } from "@/lib/jp";

const langAttr = (lang: "ja" | "zh"): string => (lang === "zh" ? "zh-Hans" : "ja");

/**
 * Renders target-language text, turning reading-bracket notation into
 * <ruby> annotations: 漢字[かんじ] (furigana) or 学生[xuésheng] (pinyin).
 * The lang attribute (and the CJK typography it triggers) is applied per
 * CJK-script run, not to the whole string — Turkish prose mixed into the
 * text, and Dutch content, must be neither announced nor styled as CJK.
 *
 * The script is inferred per-run (kana → ja, latin pinyin in the reading →
 * zh) so most callers don't have to thread the profile language through.
 * That inference can't distinguish an all-kanji ja run from zh hanzi
 * (kana-free ja compounds are rare but real) — callers that already know
 * the profile's targetLanguage should pass it via `lang` to pin unbracketed
 * CJK runs correctly; bracketed (furigana/pinyin) runs are unaffected since
 * their reading script disambiguates them regardless.
 */
export function Furigana({
  text,
  className,
  lang,
}: {
  text: string;
  className?: string;
  lang?: "ja" | "zh" | null;
}) {
  const segments = parseFurigana(text);
  return (
    <span className={className}>
      {segments.map((seg, i) =>
        seg.reading ? (
          <ruby
            key={i}
            lang={langAttr(/[぀-ヿ]/.test(seg.reading) ? "ja" : "zh")}
          >
            {seg.text}
            <rt className="text-[0.65em] text-ink-soft select-none">
              {seg.reading}
            </rt>
          </ruby>
        ) : (
          splitCjkRuns(seg.text, lang).map((run, j) =>
            run.lang ? (
              <span key={`${i}-${j}`} lang={langAttr(run.lang)}>
                {run.text}
              </span>
            ) : (
              <span key={`${i}-${j}`}>{run.text}</span>
            )
          )
        )
      )}
    </span>
  );
}
