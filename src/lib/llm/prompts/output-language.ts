// The generation prompt bodies are historically written in Turkish (they
// predate multi-native support). For a tr learner that is self-consistent;
// for any other native language the single "in ${native}" clause loses
// against an all-Turkish prompt plus a Turkish topic title, and the model
// answers in Turkish. Observed at batch scale on 2026-08-07: a full ja->en
// grammar block came back entirely Turkish under the en key. This guard adds
// an unmissable output-language contract, appended to the system prompt
// whenever the learner's native language is not Turkish.
export function outputLanguageGuard(nativeLanguage: string | undefined): string {
  if (!nativeLanguage || nativeLanguage === "tr") return "";
  const name = nativeLanguage === "en" ? "English" : nativeLanguage;
  return (
    `\n\nCRITICAL OUTPUT LANGUAGE CONTRACT: the learner reads ${name}, not Turkish. ` +
    `The instructions above are written in Turkish, but every learner-facing string in your output ` +
    `MUST be written in ${name}: every field whose name ends in "_tr" (the suffix is a historical ` +
    `column name and does NOT mean Turkish), table captions, footnotes, column_headers, notes and hints. ` +
    `Target-language material (Japanese/Chinese script, readings, bracket notation) stays in the target ` +
    `language. If a given topic title is in Turkish, render the title in ${name} as well. ` +
    `Not a single sentence of Turkish may appear in the output.`
  );
}
