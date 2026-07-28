// T-062: OpenRouter PKCE tek-tık bağlantı — SAF mantık.
//
// llm-setup-logic.ts ile aynı gerekçe: React/JSX yok, DOM global'i yok, böylece
// `tsx --test` import edebiliyor (test src/lib/openrouter-pkce.test.ts'te —
// package.json glob'u fence dışı, o yüzden test orada duruyor).
//
// Akış (openrouter.ai/docs/use-cases/oauth-pkce, 2026-07-28'de doğrulandı):
//   1. verifier üret → S256 challenge hesapla
//   2. verifier + geri dönüşte lazım olan bağlam sessionStorage'a yazılır
//   3. openrouter.ai/auth?callback_url=…&code_challenge=…&code_challenge_method=S256
//   4. kullanıcı onaylar → callback_url'e `?code=…` ile döner
//   5. POST /api/v1/auth/keys {code, code_verifier, code_challenge_method}
//      → {key} = KULLANICIYA ait gerçek API anahtarı
//
// Anahtar bizde emanet DEĞİL: mevcut config yolundan (localStorage /
// llm-config.json) kaydedilir, kullanıcı openrouter.ai/keys'ten iptal edebilir.

/** OpenRouter'ın onay sayfası. */
const AUTH_URL = "https://openrouter.ai/auth";
/** Kod → anahtar takası. */
export const KEYS_URL = "https://openrouter.ai/api/v1/auth/keys";
/** Anahtarın kalan kredisi (T-063 durum kartı satırı). */
export const KEY_INFO_URL = "https://openrouter.ai/api/v1/key";

/** sessionStorage anahtarı. sessionStorage BİLEREK: localStorage'da kalırsa
 * yarım kalmış bir akışın verifier'ı sekmeler ve günler boyunca yaşar;
 * sessionStorage sekme kapanınca ölür ve yolculuk tam olarak bir sekme
 * içinde geçer (redirect aynı sekmede döner). */
export const PKCE_SESSION_KEY = "openrouter-pkce";

/** Dönüş yolculuğunda taşınan bağlam.
 *
 * `quality` neden burada: sihirbazın kalite seçimi React state'i ve tam sayfa
 * redirect onu yok eder. Taşımazsak "En iyi" seçip bağlanan kullanıcı geri
 * döndüğünde sessizce "Denge" kaydedilirdi (resolveQuality kayıtlı config'e
 * düşer) — T-060'ın yorumlarının tam da uyardığı etiket/değer ayrışması. */
export interface PkceSession {
  verifier: string;
  /** Kullanıcının gidiş anındaki kalite seçimi; null = "Özel" (elle seçilmiş
   * modeller korunur). */
  quality: string | null;
}

/** sessionStorage'ın test edilebilir yüzü — saf modül global'e dokunmasın. */
export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

// --------------------------------------------------------------- S256

/** base64url: standart base64'ten `+`→`-`, `/`→`_`, padding (`=`) ATILIR.
 * Padding'i bırakmak challenge'ı bozar (RFC 7636 §4.2) — OpenRouter kodu
 * reddeder ve hata "geçersiz kod" diye görünür, sebebi görünmez. */
export function base64UrlEncode(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const b of view) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** verifier → S256 challenge. RFC 7636 Appendix B vektörüyle kilitli. */
export async function createCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(hash);
}

/** Kriptografik olarak rastgele verifier. 32 oktet → base64url'de 43 karakter,
 * RFC 7636'nın önerdiği uzunluk (izinli aralık 43-128). */
export function createCodeVerifier(
  randomBytes: (n: number) => Uint8Array = defaultRandomBytes
): string {
  return base64UrlEncode(randomBytes(32));
}

function defaultRandomBytes(n: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(n));
}

// --------------------------------------------------- yetkilendirme URL'i

/**
 * Onay sayfasının URL'i.
 *
 * `callbackUrl` SORGUSUZ olmalı (çağıran origin+pathname geçirir): OpenRouter'ın
 * `?code=` parametresini zaten sorgusu olan bir callback_url'e nasıl eklediği
 * dökümante DEĞİL ve canlı hesap olmadan denenemez. Bağlamın tamamı zaten
 * sessionStorage'da taşınıyor, URL'e bir şey iliştirmeye gerek yok.
 */
export function buildAuthUrl(callbackUrl: string, challenge: string): string {
  const url = new URL(AUTH_URL);
  url.searchParams.set("callback_url", callbackUrl);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

/** Sorgu/fragment'ı atılmış callback hedefi — kullanıcının o an durduğu sayfa. */
export function callbackUrlFor(href: string): string {
  const url = new URL(href);
  return url.origin + url.pathname;
}

// ------------------------------------------------------ oturum taşıma

export function savePkceSession(storage: StorageLike, session: PkceSession): void {
  storage.setItem(PKCE_SESSION_KEY, JSON.stringify(session));
}

/** Oturumu OKUR VE SİLER. Tek atımlık: verifier bir kez harcanır, dönüş
 * ekranının yenilenmesi harcanmış bir kodu tekrar POST etmeye kalkışmasın. */
export function takePkceSession(storage: StorageLike): PkceSession | null {
  let raw: string | null = null;
  try {
    raw = storage.getItem(PKCE_SESSION_KEY);
  } catch {
    return null;
  }
  try {
    storage.removeItem(PKCE_SESSION_KEY);
  } catch {
    /* silme başarısız olsa da devam et — kod yine de takas edilebilir */
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PkceSession>;
    if (typeof parsed?.verifier !== "string" || !parsed.verifier) return null;
    return {
      verifier: parsed.verifier,
      quality: typeof parsed.quality === "string" ? parsed.quality : null,
    };
  } catch {
    return null;
  }
}

export function clearPkceSession(storage: StorageLike): void {
  try {
    storage.removeItem(PKCE_SESSION_KEY);
  } catch {
    /* yoksay */
  }
}

// ---------------------------------------------------------- dönüş parse

/** Dönüş URL'inde ne var?
 *  - `code`   → takas edilecek yetkilendirme kodu
 *  - `error`  → kullanıcı reddetti / OpenRouter hata döndürdü
 *  - hiçbiri  → bu bir PKCE dönüşü değil (sıradan sayfa açılışı) */
export type PkceReturn =
  | { kind: "code"; code: string }
  | { kind: "error"; error: string }
  | { kind: "none" };

export function parseReturnUrl(href: string): PkceReturn {
  let params: URLSearchParams;
  try {
    params = new URL(href).searchParams;
  } catch {
    return { kind: "none" };
  }
  // Hata ÖNCE bakılır: OpenRouter reddi `error`/`error_description` ile
  // bildirir ve o durumda `code` yoktur; ters sırada bakmak farketmez ama
  // niyet açık olsun.
  const error = params.get("error");
  if (error) {
    return { kind: "error", error: params.get("error_description") || error };
  }
  const code = params.get("code");
  if (code) return { kind: "code", code };
  return { kind: "none" };
}

/** İşaretçiyi URL'den düşür. Bırakılırsa her yenileme/geri-gitme harcanmış
 * kodu yeniden takas etmeye çalışır ve uydurma bir hata gösterir
 * (OnboardingWizard'ın `cloud=return` bacağıyla aynı gerekçe). */
export function strippedReturnUrl(href: string): string {
  const url = new URL(href);
  for (const p of ["code", "error", "error_description"]) {
    url.searchParams.delete(p);
  }
  return url.pathname + url.search + url.hash;
}

// -------------------------------------------------------------- takas

export class PkceExchangeError extends Error {}

/**
 * Kod → kullanıcıya ait API anahtarı.
 *
 * Sözleşme OpenRouter dökümanından (2026-07-28): POST /api/v1/auth/keys,
 * JSON gövde {code, code_verifier, code_challenge_method}, cevap {key}.
 * Çağrı tarayıcıdan çıkar (client secret yok) — CANLI olarak doğrulanmadı,
 * gerçek hesap gerektirir.
 */
export async function exchangeCodeForKey(
  code: string,
  verifier: string,
  fetchImpl: typeof fetch = fetch
): Promise<string> {
  let res: Response;
  try {
    res = await fetchImpl(KEYS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        code_verifier: verifier,
        code_challenge_method: "S256",
      }),
    });
  } catch (err) {
    // Ağ/CORS hatası — mesajı yut, çağıran i18n'li bir metin gösterir.
    throw new PkceExchangeError(err instanceof Error ? err.message : String(err));
  }
  if (!res.ok) {
    throw new PkceExchangeError(`HTTP ${res.status}`);
  }
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new PkceExchangeError("invalid_json");
  }
  const key = (body as { key?: unknown } | null)?.key;
  if (typeof key !== "string" || !key) {
    throw new PkceExchangeError("no_key");
  }
  return key;
}

// ------------------------------------------------------- kalan kredi

/** GET /api/v1/key sonucunun bizi ilgilendiren kısmı.
 *
 * `limit_remaining: null` = anahtarda üst sınır YOK (sınırsız) — bunu "0 kredi
 * kaldı" diye göstermek düpedüz yalan olurdu, o yüzden tip ayrımı korunuyor. */
export interface OpenRouterCredit {
  /** null = sınırsız. */
  limitRemaining: number | null;
  /** Şimdiye kadar harcanan kredi. */
  usage: number;
  /** Hesap hiç kredi satın almadıysa true. */
  isFreeTier: boolean;
}

export async function fetchKeyCredit(
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal
): Promise<OpenRouterCredit | null> {
  try {
    const res = await fetchImpl(KEY_INFO_URL, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal,
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: Record<string, unknown> } | null;
    const d = body?.data;
    if (!d) return null;
    const raw = d.limit_remaining;
    return {
      limitRemaining: typeof raw === "number" ? raw : null,
      usage: typeof d.usage === "number" ? d.usage : 0,
      isFreeTier: d.is_free_tier === true,
    };
  } catch {
    // Kredi satırı bilgi amaçlı — başarısızlık sessizce satırı gizler,
    // kullanıcıya bir hata daha göstermenin faydası yok.
    return null;
  }
}
