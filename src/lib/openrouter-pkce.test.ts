import test from "node:test";
import assert from "node:assert/strict";
import {
  KEYS_URL,
  KEY_INFO_URL,
  PKCE_SESSION_KEY,
  base64UrlEncode,
  buildAuthUrl,
  callbackUrlFor,
  clearPkceSession,
  createCodeChallenge,
  createCodeVerifier,
  exchangeCodeForKey,
  fetchKeyCredit,
  parseReturnUrl,
  savePkceSession,
  strippedReturnUrl,
  takePkceSession,
  PkceExchangeError,
  type StorageLike,
} from "../components/settings/openrouter-pkce";

// T-062. Test src/lib/ altında çünkü `npm test` glob'u (package.json,
// fence dışı) oraya bağlı — llm-setup-logic.test.ts ile aynı emsal.
//
// CANLI DOĞRULANMAYAN kısım: gerçek OpenRouter turu (hesap gerektirir).
// Burada kilitlenen şey URL kurulumu, challenge üretimi, dönüş parse'ı,
// oturum taşıma ve hata yollarının SÖZLEŞMESİ.

function memoryStorage(): StorageLike & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

// --------------------------------------------------------------- S256
//
// En riskli tek satır. Kendi ürettiğimiz bir verifier/challenge çiftiyle test
// etmek İŞE YARAMAZDI: padding'i yanlış soysak bile kendi kendisiyle tutarlı
// olurdu. RFC 7636 Appendix B'nin YAYIMLANMIŞ vektörü tam da bu yüzden.

test("createCodeChallenge matches the RFC 7636 Appendix B vector", async () => {
  const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
  const challenge = await createCodeChallenge(verifier);
  assert.equal(challenge, "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
});

test("base64UrlEncode strips padding and uses the URL-safe alphabet", () => {
  // RFC 7636 Appendix B'nin 32 oktetlik dizisi -> yayımlanmış verifier.
  const octets = new Uint8Array([
    116, 24, 223, 180, 151, 153, 224, 37, 79, 250, 96, 125, 216, 173, 187, 186,
    22, 212, 37, 77, 105, 214, 191, 240, 91, 88, 5, 88, 83, 132, 141, 121,
  ]);
  assert.equal(
    base64UrlEncode(octets),
    "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
  );
  // Padding gerektiren uzunluklarda `=` kalmamalı, `+`/`/` sızmamalı.
  for (const n of [1, 2, 3, 4, 5, 31, 32, 33]) {
    const out = base64UrlEncode(new Uint8Array(n).fill(251));
    assert.ok(!out.includes("="), `padding leaked at n=${n}: ${out}`);
    assert.ok(!/[+/]/.test(out), `non-url-safe char at n=${n}: ${out}`);
  }
});

test("createCodeVerifier produces a 43-char url-safe string", () => {
  const v = createCodeVerifier((n) => new Uint8Array(n).fill(7));
  assert.equal(v.length, 43); // 32 oktet -> 43 karakter (RFC 7636 §4.1)
  assert.match(v, /^[A-Za-z0-9\-_]+$/);
  // Varsayılan (gerçek rastgelelik) da aynı şekli tutmalı ve tekrarlamamalı.
  const a = createCodeVerifier();
  const b = createCodeVerifier();
  assert.equal(a.length, 43);
  assert.notEqual(a, b);
});

// -------------------------------------------------------- authorize URL

test("buildAuthUrl sets callback_url, challenge and S256", () => {
  const url = new URL(buildAuthUrl("https://okumo.dev/settings", "CHAL"));
  assert.equal(url.origin + url.pathname, "https://openrouter.ai/auth");
  assert.equal(url.searchParams.get("callback_url"), "https://okumo.dev/settings");
  assert.equal(url.searchParams.get("code_challenge"), "CHAL");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
});

test("callbackUrlFor drops query and hash", () => {
  // Sorgusuz callback ŞART: OpenRouter'ın zaten sorgusu olan bir callback_url'e
  // `?code=` eklerken ne yaptığı dökümante değil.
  assert.equal(
    callbackUrlFor("https://okumo.dev/settings?tab=llm#x"),
    "https://okumo.dev/settings"
  );
  assert.equal(callbackUrlFor("http://localhost:3000/settings"), "http://localhost:3000/settings");
});

// ----------------------------------------------------- oturum taşıma

test("pkce session round-trips and is single-use", () => {
  const s = memoryStorage();
  savePkceSession(s, { verifier: "V1", quality: "best" });
  assert.equal(s.map.size, 1);
  assert.ok(s.map.has(PKCE_SESSION_KEY));

  const got = takePkceSession(s);
  assert.deepEqual(got, { verifier: "V1", quality: "best" });
  // Okumak SİLER — yenilenen bir dönüş ekranı harcanmış kodu tekrar
  // takas etmeye kalkmasın.
  assert.equal(s.map.size, 0);
  assert.equal(takePkceSession(s), null);
});

test("pkce session tolerates missing, malformed and quality-less entries", () => {
  const s = memoryStorage();
  assert.equal(takePkceSession(s), null);

  s.map.set(PKCE_SESSION_KEY, "not json");
  assert.equal(takePkceSession(s), null);
  assert.equal(s.map.size, 0, "bozuk giriş de temizlenmeli");

  s.map.set(PKCE_SESSION_KEY, JSON.stringify({ quality: "eco" })); // verifier yok
  assert.equal(takePkceSession(s), null);

  // quality yoksa null'a düşer ("Özel" = elle seçilmiş modeller korunur).
  savePkceSession(s, { verifier: "V2", quality: null });
  assert.deepEqual(takePkceSession(s), { verifier: "V2", quality: null });
});

test("clearPkceSession removes the entry and never throws", () => {
  const s = memoryStorage();
  savePkceSession(s, { verifier: "V", quality: null });
  clearPkceSession(s);
  assert.equal(s.map.size, 0);
  // Storage erişimi patlarsa (private mode) çağıran çökmemeli.
  const hostile: StorageLike = {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
    removeItem: () => {
      throw new Error("blocked");
    },
  };
  assert.doesNotThrow(() => clearPkceSession(hostile));
  assert.equal(takePkceSession(hostile), null);
});

// ------------------------------------------------------- dönüş parse

test("parseReturnUrl distinguishes code, error and plain page loads", () => {
  assert.deepEqual(parseReturnUrl("https://okumo.dev/settings?code=abc"), {
    kind: "code",
    code: "abc",
  });
  // Sıradan açılış — PKCE dönüşü değil.
  assert.deepEqual(parseReturnUrl("https://okumo.dev/settings"), { kind: "none" });
  assert.deepEqual(parseReturnUrl("https://okumo.dev/settings?tab=llm"), {
    kind: "none",
  });
  // Kullanıcı reddetti.
  assert.deepEqual(
    parseReturnUrl("https://okumo.dev/settings?error=access_denied"),
    { kind: "error", error: "access_denied" }
  );
  // Açıklama varsa o tercih edilir.
  assert.deepEqual(
    parseReturnUrl(
      "https://okumo.dev/settings?error=access_denied&error_description=User%20refused"
    ),
    { kind: "error", error: "User refused" }
  );
  // Hata, code'a baskın gelir.
  assert.equal(
    parseReturnUrl("https://okumo.dev/s?code=x&error=nope").kind,
    "error"
  );
  assert.deepEqual(parseReturnUrl("not a url"), { kind: "none" });
});

test("strippedReturnUrl removes only the pkce markers", () => {
  assert.equal(
    strippedReturnUrl("https://okumo.dev/settings?code=abc"),
    "/settings"
  );
  // Bize ait olmayan parametreler ve hash korunur.
  assert.equal(
    strippedReturnUrl("https://okumo.dev/settings?tab=llm&code=abc#sec"),
    "/settings?tab=llm#sec"
  );
  assert.equal(
    strippedReturnUrl(
      "https://okumo.dev/settings?error=access_denied&error_description=no"
    ),
    "/settings"
  );
});

// -------------------------------------------------------------- takas

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("exchangeCodeForKey posts the documented body and returns the key", async () => {
  let seenUrl: string | undefined;
  let seenInit: RequestInit | undefined;
  const key = await exchangeCodeForKey("CODE", "VERIFIER", (async (
    url: string,
    init: RequestInit
  ) => {
    seenUrl = url;
    seenInit = init;
    return jsonResponse({ key: "sk-or-v1-real" });
  }) as unknown as typeof fetch);

  assert.equal(key, "sk-or-v1-real");
  assert.equal(seenUrl, KEYS_URL);
  assert.equal(seenInit?.method, "POST");
  assert.deepEqual(JSON.parse(String(seenInit?.body)), {
    code: "CODE",
    code_verifier: "VERIFIER",
    code_challenge_method: "S256",
  });
});

test("exchangeCodeForKey surfaces every failure path as PkceExchangeError", async () => {
  const cases: { name: string; impl: typeof fetch }[] = [
    {
      name: "http error (spent/invalid code)",
      impl: (async () => jsonResponse({ error: "bad" }, 400)) as unknown as typeof fetch,
    },
    {
      name: "network / CORS rejection",
      impl: (async () => {
        throw new TypeError("Failed to fetch");
      }) as unknown as typeof fetch,
    },
    {
      name: "non-json body",
      impl: (async () => new Response("<html>", { status: 200 })) as unknown as typeof fetch,
    },
    {
      name: "200 without a key field",
      impl: (async () => jsonResponse({ ok: true })) as unknown as typeof fetch,
    },
    {
      name: "empty key",
      impl: (async () => jsonResponse({ key: "" })) as unknown as typeof fetch,
    },
  ];
  for (const c of cases) {
    await assert.rejects(
      () => exchangeCodeForKey("C", "V", c.impl),
      PkceExchangeError,
      c.name
    );
  }
});

// -------------------------------------------------------- kalan kredi

test("fetchKeyCredit unwraps data and keeps null limit_remaining as unlimited", async () => {
  let seenUrl: string | undefined;
  let auth: string | undefined;
  const credit = await fetchKeyCredit("KEY", (async (
    url: string,
    init: RequestInit
  ) => {
    seenUrl = url;
    auth = (init.headers as Record<string, string>).Authorization;
    return jsonResponse({
      data: { limit_remaining: null, usage: 1.25, is_free_tier: false },
    });
  }) as unknown as typeof fetch);

  assert.equal(seenUrl, KEY_INFO_URL);
  assert.equal(auth, "Bearer KEY");
  // null = SINIRSIZ. 0'a çevirmek "kredin bitti" yalanı olurdu.
  assert.deepEqual(credit, { limitRemaining: null, usage: 1.25, isFreeTier: false });
});

test("fetchKeyCredit reads a real remaining balance", async () => {
  const credit = await fetchKeyCredit("KEY", (async () =>
    jsonResponse({
      data: { limit_remaining: 4.5, usage: 5.5, is_free_tier: true },
    })) as unknown as typeof fetch);
  assert.deepEqual(credit, { limitRemaining: 4.5, usage: 5.5, isFreeTier: true });
});

test("fetchKeyCredit returns null on every failure instead of throwing", async () => {
  const impls: typeof fetch[] = [
    (async () => jsonResponse({ error: "unauthorized" }, 401)) as unknown as typeof fetch,
    (async () => jsonResponse({})) as unknown as typeof fetch, // data yok
    (async () => new Response("nope")) as unknown as typeof fetch, // json değil
    (async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch,
  ];
  for (const impl of impls) {
    assert.equal(await fetchKeyCredit("KEY", impl), null);
  }
});
