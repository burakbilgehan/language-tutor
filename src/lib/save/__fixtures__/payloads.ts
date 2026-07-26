// Schema-VALID sample payloads for the seed-strip fixture, shared by the
// fixture generator (scripts/build-strip-fixture.mjs) and the test
// (../seed-strip.test.ts) so the two can never drift apart.
//
// They must satisfy the real zod schemas in src/lib/llm/schemas.ts: the strip
// compares stored content against the seed *through* those schemas, so an
// invalid payload is treated as un-strippable and every assertion would fail
// for the wrong reason.

export function grammarPayload(tag: string) {
  return {
    title_tr: `${tag} başlık`,
    intro_tr: `${tag} giriş`,
    tables: [
      {
        caption_tr: `${tag} tablo`,
        column_headers: ["Biçim", "Anlam"],
        rows: [[`${tag}-form`, `${tag}-anlam`]],
      },
    ],
    examples: [
      { target: `${tag}例一`, translation_tr: `${tag} örnek 1` },
      { target: `${tag}例二`, translation_tr: `${tag} örnek 2` },
    ],
  };
}

export function kanjiPayload(tag: string) {
  return {
    meanings_tr: [`${tag} anlam`],
    note_tr: `${tag} not`,
    examples: [
      { word: `${tag}語`, reading: "ご", meaning_tr: `${tag} kelime 1` },
      { word: `${tag}日`, reading: "び", meaning_tr: `${tag} kelime 2` },
    ],
  };
}

export function vocabPayload(tag: string) {
  return {
    meanings_tr: [`${tag} anlam`],
    note_tr: `${tag} not`,
    examples: [
      { sentence: `${tag}句一`, translation_tr: `${tag} cümle 1` },
      { sentence: `${tag}句二`, translation_tr: `${tag} cümle 2` },
    ],
  };
}
