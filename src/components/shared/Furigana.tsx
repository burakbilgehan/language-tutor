import { parseFurigana } from "@/lib/jp";

/**
 * Renders target-language text, turning 漢字[かんじ] bracket notation into
 * <ruby> annotations (hiragana above the kanji).
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
    <span lang="ja" className={className}>
      {segments.map((seg, i) =>
        seg.reading ? (
          <ruby key={i}>
            {seg.text}
            <rt className="text-[0.55em] text-ink-soft select-none">
              {seg.reading}
            </rt>
          </ruby>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </span>
  );
}
