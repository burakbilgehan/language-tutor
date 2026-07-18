// Paketlenmiş gramer seed'ini (public/grammar-seed/<lang>.json, sahibinin
// DB'sinden scripts/export-grammar-seed.ts ile üretilir) tarayıcıdan çeker.
// Statik deploy'da yeni profiller LLM'e hiç gitmeden tam gramer içeriği alır.
import { withBase } from "./base-path";
import type { GrammarTopicContent } from "@/lib/llm/schemas";

// Dil başına tek indirme (promise cache): sidebar listesi ve deep-link'lenmiş
// konu görünümü aynı anda istese de dosya bir kez iner; uygulama idempotent
// (applyGrammarSeed yalnız boş satırları doldurur).
const cache = new Map<
  string,
  Promise<Record<string, GrammarTopicContent> | null>
>();

export function fetchGrammarSeed(
  lang: string
): Promise<Record<string, GrammarTopicContent> | null> {
  let p = cache.get(lang);
  if (!p) {
    p = (async () => {
      try {
        const res = await fetch(withBase(`/grammar-seed/${lang}.json`));
        if (!res.ok) return null;
        const body = (await res.json()) as {
          topics?: Record<string, GrammarTopicContent>;
        };
        return body.topics ?? null;
      } catch {
        return null;
      }
    })();
    cache.set(lang, p);
  }
  return p;
}
