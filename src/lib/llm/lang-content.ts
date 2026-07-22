// T-031: cached LLM content is stored per learner-native-language so switching
// nativeLanguage (tr↔en) doesn't serve stale wrong-language content. The DB json
// columns (lessons/grammar_topics/kanji_entries/vocab_entries `.content`) hold a
// lang-keyed map instead of a bare payload. The LLM still generates ONE language
// per call — the prompt/output schemas in schemas.ts are unchanged; this is only
// a storage/read wrapper.
//
//   stored = { tr: <payload>, en: <payload> }   // either key optional
//
// Legacy rows (written before this change) hold a bare payload with none of the
// lang keys. They are read as tr (tr was the historical native default). This is
// a one-time migration-on-read: the first time such a row is re-serialized (a
// merge write) it becomes { tr: <payload> }.

export type NativeLang = "tr" | "en";

export type LangKeyed<T> = Partial<Record<NativeLang, T>>;

const LANG_KEYS: NativeLang[] = ["tr", "en"];

/** True when `stored` is already a lang-keyed map (has a tr and/or en key and no
 * foreign top-level keys that look like payload fields). We detect the map shape
 * by the presence of a lang key; a legacy payload never has a top-level `tr`/`en`
 * key (its fields are `title_tr`, `meanings_tr`, ... — never bare `tr`). */
function isLangKeyed(stored: unknown): stored is LangKeyed<unknown> {
  if (stored === null || typeof stored !== "object" || Array.isArray(stored)) {
    return false;
  }
  return LANG_KEYS.some((k) => k in (stored as Record<string, unknown>));
}

/** Normalize any stored value to a lang-keyed map. Legacy bare payloads become
 * `{ tr: payload }`. Null/undefined → `{}`. */
export function normalizeLangContent<T>(stored: unknown): LangKeyed<T> {
  if (stored === null || stored === undefined) return {};
  if (isLangKeyed(stored)) return stored as LangKeyed<T>;
  // legacy bare payload → tr
  return { tr: stored as T };
}

/** Read the payload for `lang`, treating legacy bare content as tr. Returns null
 * when there is no content in that language — callers treat null as
 * needsGeneration / pending (the language-mismatch gate). */
export function readLangContent<T>(
  stored: unknown,
  lang: NativeLang
): T | null {
  const map = normalizeLangContent<T>(stored);
  return map[lang] ?? null;
}

/** Merge a freshly generated payload into the existing stored map under `lang`,
 * preserving the OTHER language. This is the exact-restore invariant: a write
 * must never replace the whole column, or switching back loses the original.
 *
 *   set({ content: mergeLangContent(existingRow.content, nativeLang, fresh) })
 */
export function mergeLangContent<T>(
  existing: unknown,
  lang: NativeLang,
  fresh: T
): LangKeyed<T> {
  return { ...normalizeLangContent<T>(existing), [lang]: fresh };
}
