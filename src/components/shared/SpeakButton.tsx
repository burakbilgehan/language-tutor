"use client";

import { stripFurigana } from "@/lib/jp";

/**
 * Free TTS via the browser's Web Speech API — no server, no tokens.
 *
 * Voice pitfalls handled here:
 * - getVoices() is async-populated; the first call often returns [] and the
 *   utterance then falls back to the DEFAULT (English) voice — which is why
 *   Dutch read as English. We trigger loading at module scope and re-resolve
 *   at click time, waiting for voiceschanged when the list is still empty.
 * - Quality: Google's network voices (Chrome desktop) beat the local ones,
 *   especially for zh tones — prefer them when present.
 * - zh is spoken slower (0.65) so the tones are audible; others 0.85.
 */
export function SpeakButton({
  text,
  lang,
  className,
}: {
  text: string;
  lang: string; // BCP-47: zh-CN, ja-JP, nl-NL
  className?: string;
}) {
  const speak = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof speechSynthesis === "undefined") return;
    const fire = () => {
      const u = new SpeechSynthesisUtterance(stripFurigana(text));
      u.lang = lang;
      const norm = (l: string) => l.toLowerCase().replaceAll("_", "-");
      const prefix = lang.slice(0, 2).toLowerCase();
      const candidates = speechSynthesis
        .getVoices()
        .filter((v) => norm(v.lang).startsWith(prefix));
      const exact = candidates.filter((v) => norm(v.lang) === lang.toLowerCase());
      const pool = exact.length > 0 ? exact : candidates;
      const voice =
        pool.find((v) => /google/i.test(v.name)) ?? pool[0] ?? null;
      if (voice) u.voice = voice;
      u.rate = prefix === "zh" ? 0.65 : 0.85;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    };
    if (speechSynthesis.getVoices().length === 0) {
      speechSynthesis.addEventListener("voiceschanged", fire, { once: true });
      // Safari never fires voiceschanged when the list is truly empty; don't
      // leave the click dead.
      setTimeout(fire, 300);
    } else {
      fire();
    }
  };
  return (
    <button
      type="button"
      onClick={speak}
      title="Dinle"
      className={`select-none rounded-full px-1.5 text-sm opacity-60 transition-opacity hover:opacity-100 ${className ?? ""}`}
    >
      🔊
    </button>
  );
}
