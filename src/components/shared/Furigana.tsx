import { parseFurigana, splitJapaneseRuns } from "@/lib/jp";

/**
 * Renders target-language text, turning reading-bracket notation into
 * <ruby> annotations: 漢字[かんじ] (furigana) or 学生[xuésheng] (pinyin).
 * The lang attribute (and the CJK typography it triggers) is applied per
 * CJK-script run, not to the whole string — Turkish prose mixed into the
 * text, and Dutch content, must be neither announced nor styled as CJK.
 * The ruby lang is inferred from the reading script: kana → ja, latin
 * (pinyin) → zh, so no caller has to thread the profile language through.
 */
export function Furigana({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const segments = parseFurigana(text);
  return (
    <span className={className}>
      {segments.map((seg, i) =>
        seg.reading ? (
          <ruby key={i} lang={/[぀-ヿ]/.test(seg.reading) ? "ja" : "zh"}>
            {seg.text}
            <rt className="text-[0.65em] text-ink-soft select-none">
              {seg.reading}
            </rt>
          </ruby>
        ) : (
          splitJapaneseRuns(seg.text).map((run, j) =>
            run.ja ? (
              <span key={`${i}-${j}`} lang="ja">
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
