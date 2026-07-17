"use client";

import { stripFurigana } from "@/lib/jp";

/**
 * Free TTS via the browser's Web Speech API — no server, no tokens. Chrome
 * ships zh-CN/ja-JP/nl-NL voices; tones are what make this matter for zh.
 * Bracket readings (汉字[hànzì]) are stripped before speaking. Slightly slow
 * rate for learners. No-ops silently where speechSynthesis is unavailable.
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
    const u = new SpeechSynthesisUtterance(stripFurigana(text));
    u.lang = lang;
    const voice = speechSynthesis
      .getVoices()
      .find((v) => v.lang.replaceAll("_", "-").startsWith(lang));
    if (voice) u.voice = voice;
    u.rate = 0.85;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
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
