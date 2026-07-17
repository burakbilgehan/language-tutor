// Lightweight UI localization. There is no central catalog: each component
// co-locates its own strings as `const S = { tr: {...}, en: {...} }` and
// resolves them with useStrings(S) (client) or pick(S, uiLanguage) (server).
// `tr` is the source of truth; `en` must mirror its shape (enforced by the
// LocalizedStrings type below). Unknown/missing uiLanguage falls back to tr
// so existing profiles (default "tr") behave exactly as before.

export type UiLanguage = "tr" | "en";

export interface LocalizedStrings<T> {
  tr: T;
  en: T;
}

export function pick<T>(
  strings: LocalizedStrings<T>,
  uiLanguage: string | null | undefined
): T {
  return uiLanguage === "en" ? strings.en : strings.tr;
}
