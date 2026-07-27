"use client";

// T-060/2: "Bilgisayarımdaki AI" kapısının canlı algılama checklist'i.
//
// Kullanıcı komutu yapıştırıp "test"e KÖRLEMESİNE basmasın diye sihirbaz
// kendi yoklar: köprü ayakta mı, Ollama ayakta mı. İki kural:
//
//  1. YALNIZ kapı açıkken. Hook `enabled` false iken tek istek atmaz ve
//     interval kurmaz — OnboardingWizard.tsx'teki "arka planda cross-origin
//     probe pahalı" dersi (T-049) burada da geçerli.
//  2. TAVSİYE NİTELİĞİNDE. Probe sonucu "Test et" düğmesini ASLA kilitlemez.
//     Aynı dersin somut hâli: pesimist default'a bakıp kullanıcının önünü
//     kapatmak, algılama yanılınca çıkışsız bir ekran bırakır. Kullanıcı her
//     zaman deneyebilmeli; probe sadece ne olup bittiğini anlatır.
//
// Neden fetch hataları ayrıştırılamıyor: köprü izinsiz origin'e 403 döner ve
// CORS başlığı VERMEZ (T-039 kapısı) — tarayıcı bunu ağ hatasından ayırt
// edilemez bir TypeError olarak gösterir. Bu yüzden "absent" durumu hem
// "çalışmıyor" hem "--origin verilmemiş" demektir; copy iki olasılığı da
// söylemek zorunda.

import { useCallback, useEffect, useRef, useState } from "react";

export type ProbeState =
  /** Kapı kapalı — hiç yoklanmadı. */
  | "idle"
  /** İlk yoklama uçuşta. */
  | "searching"
  /** Yanıt verdi. */
  | "found"
  /** Ayakta ama /health bilmiyor: T-059 öncesi indirilmiş köprü kopyası. */
  | "stale"
  /** Yanıt yok: kapalı ya da origin izinli değil. */
  | "absent";

export interface BridgeProbe {
  state: ProbeState;
  /** Köprünün hangi CLI ile başlatıldığı (claude/codex/...). */
  backend: string | null;
  /** O CLI PATH'te bulundu mu. YALNIZ PATH taraması — login/abonelik
   * durumu hakkında hiçbir şey söylemez, copy de söylememeli. */
  cliFound: boolean | null;
}

export interface OllamaProbe {
  state: ProbeState;
  /** `ollama pull` ile indirilmiş model tag'leri (T-061 canlı listeler için
   * hazır duruyor; bu ticket yalnız sayısını kullanır). */
  models: string[];
}

export interface LocalLlmProbe {
  bridge: BridgeProbe;
  ollama: OllamaProbe;
  /** Elle tekrar yokla (kullanıcı komutu yeni çalıştırdıysa beklemesin). */
  refresh: () => void;
}

/** Kısa timeout: yerel bir sunucu ya hemen yanıtlar ya hiç. Uzun beklemek
 * kullanıcıyı "arıyor..." ekranında tutar, bilgi eklemez. */
const PROBE_TIMEOUT_MS = 1500;
/** Yoklama aralığı. Kullanıcının terminale gidip komutu çalıştırması ~10-30
 * saniye; 4 saniye "elle yenile"ye ihtiyaç bırakmadan yeterince canlı. */
const PROBE_INTERVAL_MS = 4000;

async function fetchWithTimeout(
  url: string,
  signal: AbortSignal
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
  // Dışarıdan gelen iptal (unmount / kapı kapandı) iç controller'a da geçsin.
  const onAbort = () => ctrl.abort();
  signal.addEventListener("abort", onAbort);
  try {
    // Başlık EKLEME: özel başlık bu GET'i preflight gerektiren bir isteğe
    // çevirir; sade hâliyle CORS "simple request" olarak gidiyor.
    return await fetch(url, { signal: ctrl.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", onAbort);
  }
}

async function probeBridge(
  baseUrl: string,
  signal: AbortSignal
): Promise<BridgeProbe> {
  // baseUrl ".../v1" — /health kökte duruyor.
  const root = baseUrl.replace(/\/v1\/?$/, "");
  try {
    const res = await fetchWithTimeout(`${root}/health`, signal);
    if (res.status === 404) {
      // Köprü ayakta (yanıt verdi) ama /health yok → T-059 öncesi sürüm.
      return { state: "stale", backend: null, cliFound: null };
    }
    if (!res.ok) return { state: "absent", backend: null, cliFound: null };
    const body = (await res.json()) as {
      ok?: boolean;
      backend?: string;
      cliFound?: boolean;
    };
    return {
      state: "found",
      backend: body.backend ?? null,
      cliFound: body.cliFound ?? null,
    };
  } catch {
    return { state: "absent", backend: null, cliFound: null };
  }
}

async function probeOllama(
  baseUrl: string,
  signal: AbortSignal
): Promise<OllamaProbe> {
  // Ollama'nın kendi API'si /api/tags; OpenAI-uyumlu yüzü /v1 altında, o
  // yüzden /v1 sökülür (birleştirilirse 404 alınır).
  const root = baseUrl.replace(/\/v1\/?$/, "");
  try {
    const res = await fetchWithTimeout(`${root}/api/tags`, signal);
    if (!res.ok) return { state: "absent", models: [] };
    const body = (await res.json()) as { models?: { name?: string }[] };
    return {
      state: "found",
      models: (body.models ?? [])
        .map((m) => m.name)
        .filter((n): n is string => Boolean(n)),
    };
  } catch {
    return { state: "absent", models: [] };
  }
}

export type ProbeTarget = "bridge" | "ollama" | "both";

/**
 * Yerel LLM uçlarını yoklar. `enabled` false iken TAMAMEN sessizdir: istek
 * yok, interval yok, state "idle"da kalır.
 */
export function useLocalLlmProbe(
  enabled: boolean,
  bridgeBaseUrl: string,
  ollamaBaseUrl: string,
  target: ProbeTarget = "both"
): LocalLlmProbe {
  const [bridge, setBridge] = useState<BridgeProbe>({
    state: "idle",
    backend: null,
    cliFound: null,
  });
  const [ollama, setOllama] = useState<OllamaProbe>({
    state: "idle",
    models: [],
  });
  const [nonce, setNonce] = useState(0);
  // Elle yenilemede durumu "searching"e geri al: aksi hâlde "absent"ten
  // "absent"e geçiş görsel olarak hiçbir şey değiştirmez ve kullanıcı
  // düğmenin çalışıp çalışmadığını 1.5 saniye boyunca bilemez — canlı geri
  // bildirim iddiasındaki bir widget'ta kabul edilemez.
  const refresh = useCallback(() => {
    setBridge((p) => (p.state === "idle" ? p : { ...p, state: "searching" }));
    setOllama((p) => (p.state === "idle" ? p : { ...p, state: "searching" }));
    setNonce((n) => n + 1);
  }, []);

  // Uçuştaki isteği unmount/kapanışta iptal etmek için: cleanup abort eder,
  // sonuç geldiğinde de `abortRef.current.signal.aborted` ile state yazımı
  // engellenir (React'in "unmounted component" sızıntısı olmasın).
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled) {
      // Kapı kapandı: uçuştakini kes, durumu sıfırla ki tekrar açıldığında
      // bayat bir "bulundu" göstermesin. Sıfırlama IDEMPOTENT: zaten idle
      // ise aynı state'i yeni bir nesne olarak yazmak gereksiz render
      // doğurur (dep'ler sabit olduğu için bugün döngüye girmez, ama
      // buraya bir dep eklendiğinde girerdi — kapıyı şimdiden kapat).
      abortRef.current?.abort();
      abortRef.current = null;
      setBridge((p) =>
        p.state === "idle" ? p : { state: "idle", backend: null, cliFound: null }
      );
      setOllama((p) => (p.state === "idle" ? p : { state: "idle", models: [] }));
      return;
    }

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const wantBridge = target === "both" || target === "bridge";
    const wantOllama = target === "both" || target === "ollama";

    if (wantBridge) setBridge((p) => (p.state === "idle" ? { ...p, state: "searching" } : p));
    if (wantOllama) setOllama((p) => (p.state === "idle" ? { ...p, state: "searching" } : p));

    const tick = async () => {
      if (wantBridge) {
        const r = await probeBridge(bridgeBaseUrl, ctrl.signal);
        if (!ctrl.signal.aborted) setBridge(r);
      }
      if (wantOllama) {
        const r = await probeOllama(ollamaBaseUrl, ctrl.signal);
        if (!ctrl.signal.aborted) setOllama(r);
      }
    };

    void tick();
    const id = setInterval(() => void tick(), PROBE_INTERVAL_MS);

    return () => {
      clearInterval(id);
      ctrl.abort();
    };
  }, [enabled, bridgeBaseUrl, ollamaBaseUrl, target, nonce]);

  return { bridge, ollama, refresh };
}
