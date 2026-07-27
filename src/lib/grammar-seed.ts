// Paketlenmiş gramer seed'ini tarayıcıdan çeker. İki katman (T-064):
//   public/grammar-seed/<target>.json        — tr, sahibinin DB'sinden
//     scripts/export-grammar-seed.ts ile üretilir (gerçek içerik).
//   public/grammar-seed/<target>.<native>.json — <native>, tr seed'den
//     scripts/mt-grammar-seed.mjs ile build-time makine çevirisi (source:"mt").
// Statik deploy'da yeni profiller LLM'e hiç gitmeden gramer içeriği alır.
import { withBase } from "./base-path";
import type { GrammarTopicContent } from "@/lib/llm/schemas";
import type { NativeLang } from "@/lib/llm/lang-content";

// (target, native) başına tek indirme (promise cache): sidebar listesi ve
// deep-link'lenmiş konu görünümü aynı anda istese de dosya bir kez iner;
// uygulama idempotent (applyGrammarSeed yalnız boş satırları doldurur).
const cache = new Map<
  string,
  Promise<Record<string, GrammarTopicContent> | null>
>();

/** `nativeLang` "tr" → the packaged tr seed (`<lang>.json`); otherwise the
 * MT seed for that native language (`<lang>.<nativeLang>.json`), which may
 * not exist yet — a 404 yields null exactly like a missing tr file. */
export function fetchGrammarSeed(
  lang: string,
  nativeLang: NativeLang = "tr"
): Promise<Record<string, GrammarTopicContent> | null> {
  const key = `${lang}:${nativeLang}`;
  let p = cache.get(key);
  if (!p) {
    const file = nativeLang === "tr" ? `${lang}.json` : `${lang}.${nativeLang}.json`;
    p = (async () => {
      try {
        const res = await fetch(withBase(`/grammar-seed/${file}`));
        if (!res.ok) return null;
        const body = (await res.json()) as {
          topics?: Record<string, GrammarTopicContent>;
        };
        return body.topics ?? null;
      } catch {
        return null;
      }
    })();
    cache.set(key, p);
  }
  return p;
}
