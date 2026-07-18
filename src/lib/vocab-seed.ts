// Paketlenmiş kelime sözlüğü seed'ini (public/vocab-seed/<lang>.json,
// sahibinin DB'sinden scripts/export-vocab-seed.ts ile üretilir) tarayıcıdan
// çeker. Statik deploy'da yeni profiller LLM'e hiç gitmeden dolu sözlük alır.
import { withBase } from "./base-path";
import type { VocabContent } from "@/lib/llm/schemas";

// Dil başına tek indirme (promise cache): liste ve deep-link'lenmiş kelime
// görünümü aynı anda istese de dosya bir kez iner; uygulama idempotent
// (applyVocabSeed yalnız boş satırları doldurur).
const cache = new Map<string, Promise<Record<string, VocabContent> | null>>();

export function fetchVocabSeed(
  lang: string
): Promise<Record<string, VocabContent> | null> {
  let p = cache.get(lang);
  if (!p) {
    p = (async () => {
      try {
        const res = await fetch(withBase(`/vocab-seed/${lang}.json`));
        if (!res.ok) return null;
        const body = (await res.json()) as {
          words?: Record<string, VocabContent>;
        };
        return body.words ?? null;
      } catch {
        return null;
      }
    })();
    cache.set(lang, p);
  }
  return p;
}
