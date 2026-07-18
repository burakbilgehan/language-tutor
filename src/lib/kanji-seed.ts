// Paketlenmiş kanji seed'ini (public/kanji-seed/<lang>.json, sahibinin
// DB'sinden scripts/export-kanji-seed.ts ile üretilir) tarayıcıdan çeker.
// Statik deploy'da yeni profiller LLM'e hiç gitmeden dolu kanji sözlüğü alır.
import { withBase } from "./base-path";
import type { KanjiContent } from "@/lib/llm/schemas";

// Dil başına tek indirme (promise cache): liste ve deep-link'lenmiş karakter
// görünümü aynı anda istese de dosya bir kez iner; uygulama idempotent
// (applyKanjiSeed yalnız boş satırları doldurur).
const cache = new Map<string, Promise<Record<string, KanjiContent> | null>>();

export function fetchKanjiSeed(
  lang: string
): Promise<Record<string, KanjiContent> | null> {
  let p = cache.get(lang);
  if (!p) {
    p = (async () => {
      try {
        const res = await fetch(withBase(`/kanji-seed/${lang}.json`));
        if (!res.ok) return null;
        const body = (await res.json()) as {
          chars?: Record<string, KanjiContent>;
        };
        return body.chars ?? null;
      } catch {
        return null;
      }
    })();
    cache.set(lang, p);
  }
  return p;
}
