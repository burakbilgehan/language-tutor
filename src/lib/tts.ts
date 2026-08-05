import { stripFurigana } from "@/lib/jp";

// Client-side TTS support (Web Speech API / speechSynthesis): zero cost, no
// key, works in static mode (T-081). This module holds the pure/shared
// pieces only: voice selection and the actual speak() call stay in
// SpeakButton.tsx, which already carries production-tuned behavior (Google
// voice preference, per-language rate) that must not regress.
//
// Single source for target-language -> BCP-47 voice tag mapping: no
// per-surface hardcoding. `en` has no target language today (see LANGUAGES
// in profile-options.ts) but the row stays for when one lands.
const LANG_TAGS: Record<string, string> = {
  ja: "ja-JP",
  zh: "zh-CN",
  nl: "nl-NL",
  fr: "fr-FR",
  en: "en-US",
};

export function ttsLangTag(targetLanguage: string | null | undefined): string | null {
  if (!targetLanguage) return null;
  return LANG_TAGS[targetLanguage] ?? null;
}

/** zh is spoken slower so tones stay audible; other languages read at a
 * slightly relaxed pace. Mirrors SpeakButton's existing tuning. */
export function ttsRateFor(langTag: string | null | undefined): number {
  return langTag?.toLowerCase().startsWith("zh") ? 0.65 : 0.85;
}

/**
 * Strip reading-bracket notation (furigana/pinyin, e.g. 漢字[かんじ] or
 * 学生[xuésheng]) before speaking - the base text only. Reuses jp.ts's
 * stripFurigana (the same regex backing the Furigana component) rather than
 * a second, divergent parser. Collapses the whitespace that can appear
 * around stripped brackets in multi-line lesson content.
 */
export function speakableText(text: string): string {
  return stripFurigana(text).replace(/[ \t]+/g, " ").trim();
}

let voicesCache: SpeechSynthesisVoice[] | null = null;
let voicesPromise: Promise<SpeechSynthesisVoice[]> | null = null;

function synth(): SpeechSynthesis | null {
  if (typeof window === "undefined") return null;
  return window.speechSynthesis ?? null;
}

/**
 * Resolve the browser's voice list. Some browsers (notably Chrome) populate
 * getVoices() asynchronously and fire `voiceschanged` once ready; others
 * (Safari, when the list is truly empty) never fire it at all. This covers
 * both: resolves immediately if voices are already there, otherwise waits
 * once for the event with a short timeout fallback so a silent browser
 * doesn't hang the caller.
 */
export function getVoicesAsync(): Promise<SpeechSynthesisVoice[]> {
  const s = synth();
  if (!s) return Promise.resolve([]);
  if (voicesCache) return Promise.resolve(voicesCache);
  if (voicesPromise) return voicesPromise;

  const immediate = s.getVoices();
  if (immediate.length > 0) {
    voicesCache = immediate;
    return Promise.resolve(immediate);
  }

  voicesPromise = new Promise((resolve) => {
    const finish = () => {
      const v = s.getVoices();
      voicesCache = v;
      voicesPromise = null;
      resolve(v);
    };
    s.addEventListener("voiceschanged", finish, { once: true });
    setTimeout(finish, 300);
  });
  return voicesPromise;
}

/** Primary-subtag match: platforms report "ja", "ja-JP", "ja_JP"
 * inconsistently, so compare only the leading language subtag. */
function voiceMatchesLang(voice: SpeechSynthesisVoice, langTag: string): boolean {
  const primary = langTag.split("-")[0].toLowerCase();
  const voicePrimary = voice.lang.replace("_", "-").split("-")[0].toLowerCase();
  return voicePrimary === primary;
}

/** Whether any installed voice can speak the given target language. Used to
 * decide whether a speaker button should render at all - hidden, not
 * rendered broken, when no voice exists. */
export async function hasVoiceFor(targetLanguage: string | null | undefined): Promise<boolean> {
  const tag = ttsLangTag(targetLanguage);
  if (!tag) return false;
  const voices = await getVoicesAsync();
  return voices.some((v) => voiceMatchesLang(v, tag));
}
