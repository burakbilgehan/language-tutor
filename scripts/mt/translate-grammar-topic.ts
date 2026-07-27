// T-064: field-level MT for one GrammarTopicContent payload.
//
// Whitelist (translatable native-language prose) — exactly these fields:
//   title_tr, intro_tr, tables[].caption_tr, tables[].footnotes_tr[],
//   examples[].translation_tr, examples[].note_tr
// Explicitly EXCLUDED, never touched:
//   tables[].rows        — conjugation forms / target-language data cells
//   tables[].column_headers — mixed target-language/native, e.g. "辞書形" next
//     to a native header in the same row; an untranslated header reads far
//     better than a mangled one, so we leave the whole array alone
//   examples[].target, examples[].reading — target-language sentence + its
//     reading, must never be touched by MT
//   related_slugs         — opaque keys, not prose
import type { GrammarTopicContent } from "@/lib/llm/schemas";
import type { TranslateEngine } from "./engine";
import { countUnpreservedRuns, protectText, restoreText } from "./protect";

/** One string queued for MT, with a setter closure to write the result back
 * into the cloned content tree at exactly the field it came from. */
interface Slot {
  text: string;
  set: (translated: string) => void;
}

export interface TranslateTopicResult {
  content: GrammarTopicContent;
  /** Number of whitelisted strings where a bracket-notation/CJK run did NOT
   * survive translation intact — the caller MUST treat this topic as failed,
   * never ship a partially-corrupted page. */
  placeholderFailures: number;
}

/** Translate the whitelisted fields of one topic with `engine`. Bracket-
 * notation/CJK runs are swapped for sentinel placeholders first ONLY when
 * `engine.needsProtection` says the engine has no language understanding of
 * its own (see mt/engine.ts) — either way, the result is verified against the
 * original text's protected runs before being accepted. */
export async function translateGrammarTopic(
  content: GrammarTopicContent,
  engine: TranslateEngine
): Promise<TranslateTopicResult> {
  // Structural clone so the caller's original object is never mutated even
  // on partial failure.
  const out: GrammarTopicContent = JSON.parse(JSON.stringify(content));
  const slots: Slot[] = [];

  slots.push({ text: out.title_tr, set: (v) => (out.title_tr = v) });
  slots.push({ text: out.intro_tr, set: (v) => (out.intro_tr = v) });

  out.tables.forEach((table, ti) => {
    slots.push({
      text: table.caption_tr,
      set: (v) => (out.tables[ti].caption_tr = v),
    });
    table.footnotes_tr?.forEach((fn, fi) => {
      slots.push({
        text: fn,
        set: (v) => (out.tables[ti].footnotes_tr![fi] = v),
      });
    });
  });

  out.examples.forEach((ex, ei) => {
    slots.push({
      text: ex.translation_tr,
      set: (v) => (out.examples[ei].translation_tr = v),
    });
    if (ex.note_tr) {
      slots.push({ text: ex.note_tr, set: (v) => (out.examples[ei].note_tr = v) });
    }
  });

  const inputs = engine.needsProtection
    ? slots.map((s) => protectText(s.text))
    : slots.map((s) => ({ protected: s.text, placeholders: [] as string[] }));
  const translated = await engine.translate(inputs.map((p) => p.protected));

  let placeholderFailures = 0;
  translated.forEach((mtOut, i) => {
    const restored = engine.needsProtection
      ? restoreText(mtOut, inputs[i].placeholders).restored
      : mtOut;
    if (countUnpreservedRuns(slots[i].text, restored) > 0) placeholderFailures++;
    slots[i].set(restored);
  });

  out.source = "mt";
  return { content: out, placeholderFailures };
}
