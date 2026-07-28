"use client";

// T-060 (merge fix 2) + T-063: Settings'teki LLM yüzeyi.
//
// Üç-kapı IA'sı Settings'te de KALIR (Burak kararı) — ama Settings'te
// sihirbazı "bitirmenin" gidilecek bir sonraki adımı yok. Eskiden onDone
// sihirbazı remount edip kapı ekranına döndürüyordu; "Şimdilik bağlamadan
// başla"ya basan kullanıcı için bu görsel bir no-op'tu (aynı ekran, hiçbir
// tepki).
//
// T-063: sihirbazı BİTİRMEK artık yetmiyor — kullanıcı Settings'i AÇTIĞINDA
// (sihirbazla hiç etkileşmeden) "şu an neye bağlıyım?" sorusuna cevap
// bekliyor. Mount'ta llmConfigGet() okunur; bağlıysa gerçek durum kartı
// ("Bağlı: DeepSeek · Denge profili (V3 / R1)") gösterilir, sihirbaz
// "Yeniden aç"ın arkasına katlanır. Bağlı DEĞİLSE (mode:"none", henüz hiç
// yapılandırılmamış) sihirbaz açık kalır — kart göstermenin bir anlamı yok.
//
// Config güvenliği DEĞİŞMEDİ: "bağlamadan devam" hâlâ hiçbir şey yazmaz. Kart
// salt-okunur bir özet; hiçbir alanı config'e yazmaz.

import { useCallback, useEffect, useRef, useState } from "react";
import { useStrings } from "@/lib/i18n/use-strings";
import { IS_STATIC, llmConfigGet, type LlmConfigDto } from "@/lib/client-api";
import { CATALOG, providerForBaseUrl, type ProviderId } from "@/lib/llm/catalog";
import { refreshCatalogFromWorker } from "@/lib/llm/catalog-refresh";
import { qualityForModels, modelLineFor } from "./llm-setup-logic";
import { useLocalLlmProbe } from "./useLocalLlmProbe";
import { LlmSetupWizard, type WizardOutcome } from "./LlmSetupWizard";
import { fetchKeyCredit, parseReturnUrl } from "./openrouter-pkce";

const S = {
  tr: {
    title: "Yapay zekâ bağlantısı",
    connectedTo: (provider: string) => `Bağlı: ${provider}`,
    profileEco: "Eko profili",
    profileBalanced: "Denge profili",
    profileBest: "En iyi profili",
    profileCustom: "Elle seçilmiş modeller",
    profileDefault: "Varsayılan model",
    skipped:
      "Bağlanmadan devam ediliyor — hazır kütüphane çalışır, ders üretimi ve sohbet bekler.",
    reopen: "Yeniden aç",
    bridgeUp: "köprü ✓ çalışıyor",
    bridgeStale: "köprü çalışıyor (eski sürüm)",
    bridgeDown: "köprü ✗ erişilemiyor",
    bridgeSearching: "köprü aranıyor…",
    ollamaUp: "Ollama ✓ çalışıyor",
    ollamaDown: "Ollama ✗ erişilemiyor",
    ollamaSearching: "Ollama aranıyor…",
    // T-062: OpenRouter kalan kredi satırı.
    creditRemaining: (amount: string) => `kalan kredi: ${amount}`,
    creditUnlimited: "kredi sınırı yok",
    // Ücretsiz katman: limit_remaining null gelir ama bu "sınırsız" DEĞİL —
    // günlük istek kotası var. "Sınır yok" demek düpedüz yanlış olurdu.
    creditFree: "ücretsiz katman (günlük istek limiti var)",
  },
  en: {
    title: "AI connection",
    connectedTo: (provider: string) => `Connected: ${provider}`,
    profileEco: "Eco profile",
    profileBalanced: "Balanced profile",
    profileBest: "Best profile",
    profileCustom: "Hand-picked models",
    profileDefault: "Default model",
    skipped:
      "Continuing without a connection — the ready-made library works; lesson generation and chat wait.",
    reopen: "Reopen",
    bridgeUp: "bridge ✓ running",
    bridgeStale: "bridge running (older version)",
    bridgeDown: "bridge ✗ unreachable",
    bridgeSearching: "checking bridge…",
    ollamaUp: "Ollama ✓ running",
    ollamaDown: "Ollama ✗ unreachable",
    ollamaSearching: "checking Ollama…",
    creditRemaining: (amount: string) => `credit left: ${amount}`,
    creditUnlimited: "no credit cap",
    creditFree: "free tier (daily request limit)",
  },
};

/** mode + baseUrl -> catalog provider id. Mirrors LlmSetupWizard.tsx's
 * syncStored() derivation (mode:"cli" has no HTTP baseUrl to match, so it
 * needs its own branch there too — kept identical here on purpose: two
 * screens disagreeing about "which provider is this" is exactly the
 * confusion T-060/T-063 exist to remove). */
function providerFor(config: LlmConfigDto): ProviderId {
  if (config.mode === "cli") return "cli";
  if (config.mode === "anthropic") return "anthropic";
  return providerForBaseUrl(config.baseUrl) ?? "custom";
}

function ProfileLabel({
  t,
  provider,
  models,
}: {
  t: (typeof S)["tr"];
  provider: ProviderId;
  models: LlmConfigDto["models"];
}) {
  // No saved `models` (fresh cli-mode config, or an http config that never
  // touched the advanced panel) does NOT mean "nothing will run" — the
  // resolver (resolveModelId in catalog.ts) falls back to the catalog's
  // "balanced" default triple for the provider. Show what will ACTUALLY be
  // used, matching the wizard's own "Kullanılacak:" rule (T-060) — showing
  // "custom" here for a config that's really just using defaults would be
  // the same label/value divergence T-060's comments were written to avoid.
  const hasSavedModels = Boolean(models?.fast || models?.balanced || models?.deep);
  const effective: { fast: string; balanced: string; deep: string } | undefined =
    hasSavedModels
      ? { fast: models?.fast ?? "", balanced: models?.balanced ?? "", deep: models?.deep ?? "" }
      : CATALOG[provider]?.defaultModels;
  const quality = hasSavedModels
    ? qualityForModels(provider, models)
    : "balanced";
  const profileLabel =
    quality === "eco"
      ? t.profileEco
      : quality === "balanced"
        ? t.profileBalanced
        : quality === "best"
          ? t.profileBest
          : t.profileCustom;
  if (!effective) {
    // No catalog entry at all (custom provider, no defaults to fall back
    // to) — no model name to show, don't invent one.
    return <span>{t.profileDefault}</span>;
  }
  const line = modelLineFor(effective);
  if (!line) {
    // Bridge sentinel (codex/copilot/gemini) — no model name to show.
    return <span>{t.profileDefault}</span>;
  }
  // fast-then-deep, matching both the ticket's own example ("Denge profili
  // (V3 / R1)" — DeepSeek balanced is fast:V3/deep:R1) and the wizard's
  // willUse line (T-060), which orders the same way. Reuse line.fastLabel/
  // deepLabel rather than re-deriving via describeModel() — that's exactly
  // the kind of second formatter T-060's comments warn keeps drifting from
  // the wizard.
  const modelsText = line.same ? line.fastLabel : `${line.fastLabel} / ${line.deepLabel}`;
  return (
    <span>
      {profileLabel} ({modelsText})
    </span>
  );
}

/** Live ✓/✗ for local providers only — bridge/Ollama are processes that can
 * die independently of the saved config. Remote APIs (DeepSeek/OpenAI/
 * OpenRouter/Anthropic/cli) have nothing local to probe, so this renders
 * nothing for them. */
function LiveLocalStatus({
  t,
  provider,
}: {
  t: (typeof S)["tr"];
  provider: ProviderId;
}) {
  const isBridge = provider === "bridge";
  const isOllama = provider === "ollama";
  const probe = useLocalLlmProbe(
    isBridge || isOllama,
    CATALOG.bridge.baseUrl,
    CATALOG.ollama.baseUrl,
    isBridge ? "bridge" : "ollama"
  );
  if (isBridge) {
    const text =
      probe.bridge.state === "found"
        ? t.bridgeUp
        : probe.bridge.state === "stale"
          ? t.bridgeStale
          : probe.bridge.state === "searching"
            ? t.bridgeSearching
            : t.bridgeDown;
    const tone =
      probe.bridge.state === "found"
        ? "text-indigo-deep"
        : probe.bridge.state === "stale"
          ? "text-amber-text"
          : "text-ink-soft";
    return <span className={`text-xs font-semibold ${tone}`}>{text}</span>;
  }
  if (isOllama) {
    const text =
      probe.ollama.state === "found"
        ? t.ollamaUp
        : probe.ollama.state === "searching"
          ? t.ollamaSearching
          : t.ollamaDown;
    const tone = probe.ollama.state === "found" ? "text-indigo-deep" : "text-ink-soft";
    return <span className={`text-xs font-semibold ${tone}`}>{text}</span>;
  }
  return null;
}

/** T-062: OpenRouter'a bağlıyken kalan kredi — TEK satır, bilgi amaçlı.
 *
 * Kapsam daraltması (bilinçli, raporda da yazılı): YALNIZ statik mod. Sunucu
 * modunda ham anahtar `data/llm-config.json`'da yaşar ve tarayıcıya HİÇ
 * verilmez (llmConfigGet iki modda da yalnız maskeli anahtar döndürür); onu
 * okumak yeni bir API route'u demekti — bu ticket'ın kapsamı dışı ve auth
 * allowlist'ine dokunurdu. Kalıcı olarak boş kalacak bir satır çizmektense
 * sunucu modunda HİÇBİR ŞEY göstermiyoruz.
 *
 * Fetch yalnız kart mount'luyken koşar ve unmount'ta iptal edilir — kartın
 * davranış sözleşmesi (probe yalnız açıkken) bozulmasın. */
function OpenRouterCreditLine({ t }: { t: (typeof S)["tr"] }) {
  const [credit, setCredit] = useState<{
    limitRemaining: number | null;
    isFreeTier: boolean;
  } | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    let alive = true;
    (async () => {
      // Statik modda ham anahtar localStorage'da; client-api.ts ve
      // llm-status.ts de tam olarak böyle okuyor.
      const { readBrowserLlmConfig } = await import("@/lib/llm/browser-provider");
      const key = readBrowserLlmConfig()?.apiKey;
      if (!key) return;
      const c = await fetchKeyCredit(key, fetch, ctrl.signal);
      if (alive && c) {
        setCredit({ limitRemaining: c.limitRemaining, isFreeTier: c.isFreeTier });
      }
    })().catch(() => {});
    return () => {
      alive = false;
      ctrl.abort();
    };
  }, []);

  if (!credit) return null; // bilinmiyor/başarısız → satır hiç çizilmez
  // Sıra önemli: ücretsiz katmanda limit_remaining de null gelir. Önce
  // null'a bakıp "sınır yok" demek, kotalı bir anahtarı sınırsız gibi
  // gösterirdi — kartın tek işi bu tür yalanları söylememek.
  const text = credit.isFreeTier
    ? t.creditFree
    : credit.limitRemaining === null
      ? // null = anahtarda üst sınır YOK. "0 kredi kaldı" demek yalan olurdu.
        t.creditUnlimited
      : t.creditRemaining(`$${credit.limitRemaining.toFixed(2)}`);
  return <span className="text-xs font-semibold text-ink-soft">{text}</span>;
}

function ConnectedCard({
  t,
  config,
  onReopen,
}: {
  t: (typeof S)["tr"];
  config: LlmConfigDto;
  onReopen: () => void;
}) {
  const provider = providerFor(config);
  const providerLabel = CATALOG[provider]?.label ?? provider;
  return (
    <section className="rounded-cozy bg-surface p-6 shadow-cozy">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-semibold">{t.title}</h2>
        <button
          type="button"
          onClick={onReopen}
          className="text-xs font-semibold text-indigo hover:underline"
        >
          {t.reopen}
        </button>
      </div>
      <p className="mt-1 text-sm text-ink-soft">
        {t.connectedTo(providerLabel)} ·{" "}
        <ProfileLabel t={t} provider={provider} models={config.models} />
      </p>
      <div className="mt-2">
        <LiveLocalStatus t={t} provider={provider} />
        {IS_STATIC && provider === "openrouter" && <OpenRouterCreditLine t={t} />}
      </div>
    </section>
  );
}

export function LlmSettingsSection() {
  const t = useStrings(S);
  // "loading" = mount anı, henüz llmConfigGet() dönmedi: ne kart ne sihirbaz
  // gösterilir (aşağıdaki boş kabuk) — sihirbazı önce gösterip karta
  // sıçramak "bağlı değilsin" yanıp söndürürdü, kartı optimistik göstermek
  // "bağlısın" yalanı söylerdi; ikisi de bu ticket'ın çözmeye çalıştığı
  // belirsizliğin kendisi. "not-configured" = config.mode "none" YA DA
  // mode:"cli" iken cliAllowed:false (deploy guard, LLM_CLI_DISABLED=1) —
  // ikinci durumu kaçırmak "Bağlı: Claude CLI" yazıp her üretimde 503
  // llm_unconfigured almak demekti; bu kartın tek işi bu yalanı söylememek.
  const [config, setConfig] = useState<LlmConfigDto | "loading" | "not-configured">(
    "loading"
  );
  // Sihirbaz tamamlandığında (bağlanarak ya da atlayarak) gösterilecek özet;
  // "connected" sonrası config'i yeniden okuyup karta geçiyoruz.
  const [outcome, setOutcome] = useState<WizardOutcome | null>(null);
  // Sihirbazın kullanıcı isteğiyle açık tutulup tutulmadığı — "Yeniden aç"ın
  // GERÇEKTEN bir şey yapması için bu state şart. İlk turda bu değişken yoktu
  // ve "Yeniden aç" bağlı bir kullanıcı için no-op'tu (config her zaman DTO
  // kalıyor, outcome hep null kalıyor, ConnectedCard dalı hep kazanıyordu) —
  // sihirbazın kendi header yorumunun şikâyet ettiği TAM O BUG'ın tekrarı.
  const [wizardOpen, setWizardOpen] = useState(false);
  const [instance, setInstance] = useState(0);
  // T-062: bu sayfa açılışı bir OpenRouter PKCE dönüşü mü?
  //
  // Tespit BURADA, sihirbazda değil: aşağıdaki ConnectedCard dalı, kayıtlı bir
  // config'i olan kullanıcıda sihirbazı HİÇ mount etmiyor. Bağlantısı olan
  // biri PKCE'yi başlatıp `?code=…` ile geri döndüğünde sihirbaz açılmaz, kod
  // hiç takas edilmez ve kullanıcıya sebebi söylenmezdi. İşaretçiyi burada
  // görüp sihirbazı zorla açıyoruz (OnboardingWizard'ın T-048 dönüş bacağının
  // "checkingProfiles/showIntro dallarının BİLEREK ÜSTÜNDE" durmasıyla aynı
  // sınıftan hata).
  //
  // useSearchParams DEĞİL, düz window.location okuması: statik export'ta
  // useSearchParams bir <Suspense> sınırı ister, settings sayfasının böyle
  // bir sınırı yok. Düz okumanın böyle bir kısıtı yok (aynı gerekçe
  // OnboardingWizard.tsx:341-343'te de yazılı).
  //
  // Okuma RENDER'DA DEĞİL effect'te: /settings prerender ediliyor, sunucuda
  // `window` yok. Lazy initializer'da okumak sunucuda false, hydration'da
  // true üretir ve aynı slotta farklı bir ağaç render edilir — hydration
  // mismatch. Bir "flash" pahasına değil üstelik: config zaten "loading"
  // ile başlıyor, yani ilk boyada nasılsa boş kabuk görünüyor; bayrağı
  // effect'te set etmek görünür hiçbir şeyi geciktirmiyor. (T-048 bacağı
  // da tam bu yüzden useEffect kullanıyor.)
  const [pkceReturn, setPkceReturn] = useState(false);
  useEffect(() => {
    if (parseReturnUrl(window.location.href).kind !== "none") {
      setPkceReturn(true);
    }
  }, []);
  // refresh() is called both from a mount effect (which gets an automatic
  // cleanup) and from handleDone (a plain event-driven call, no cleanup
  // wired up) — a single mounted ref covers both call sites instead of two
  // different unmount-guard mechanisms.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(() => {
    llmConfigGet()
      .then((d) => {
        if (!mounted.current) return;
        const notConfigured = d.mode === "none" || (d.mode === "cli" && !d.cliAllowed);
        setConfig(notConfigured ? "not-configured" : d);
      })
      .catch(() => {
        if (mounted.current) setConfig("not-configured");
      });
  }, []);

  useEffect(() => {
    refresh();
    // T-058 seam (orchestrator wiring): the runtime catalog overlay patches
    // MODEL_REGISTRY labels/prices in place; a successful fetch re-runs
    // refresh() so the already-rendered card/wizard labels pick the fresh
    // values up on the re-render. Failure changes nothing by construction
    // (embedded catalog stays the fallback) — no error surface needed here.
    refreshCatalogFromWorker().then((payload) => {
      if (payload && mounted.current) refresh();
    });
  }, [refresh]);

  const reopen = useCallback(() => {
    setOutcome(null);
    // PKCE bayrağını DÜŞÜR. Düşürmezsek `setOutcome(null)` aşağıdaki
    // `pkceReturn && !outcome` dalını yeniden kurar ve "Yeniden aç" sayfa
    // ömrü boyunca üç-kapı ekranına değil, OpenRouter seçili API-anahtarı
    // kapısına düşerdi; üstelik sihirbaz yeniden "exchanging" ile mount olup
    // kullanıcının hiç başlatmadığı bir takas için hayalet mesaj gösterirdi.
    // Dönüş bacağı tek atımlık: kod URL'den zaten silindi.
    setPkceReturn(false);
    setWizardOpen(true);
    setInstance((n) => n + 1);
  }, []);

  // Sihirbaz kapandığında (bağlanarak ya da atlayarak) config'i tazele —
  // "connected" ise gerçek durum kartına geçilecek.
  const handleDone = useCallback(
    (o: WizardOutcome) => {
      setOutcome(o);
      setWizardOpen(false);
      refresh();
    },
    [refresh]
  );

  // T-062: PKCE dönüşü HER ŞEYİN önünde. Hem "loading" kabuğunun hem
  // ConnectedCard'ın önüne geçmesi şart:
  //  - loading: takas sihirbaz mount olunca başlar; llmConfigGet()'i beklemek
  //    onu gereksizce geciktirir (ve kabuk ekranda "hiçbir şey olmuyor" der).
  //  - ConnectedCard: kayıtlı config'i olan kullanıcıda sihirbaz hiç mount
  //    edilmez, kod sessizce yutulurdu — bu bacağın var olma sebebi.
  // Sihirbaz `?code=`i kendisi okur, takas eder ve işaretçiyi URL'den düşürür.
  if (pkceReturn && !outcome) {
    return (
      <LlmSetupWizard
        key={`pkce-${instance}`}
        onDone={handleDone}
        pkceReturn
        allowPkce
      />
    );
  }

  if (config === "loading") {
    // Mount anı: ne kart ne sihirbaz — ikisi de yanlış bir "durum" iddia
    // ederdi. Boş kabuk, bir sonraki tick'te llmConfigGet() döner.
    return (
      <section className="rounded-cozy bg-surface p-6 shadow-cozy">
        <h2 className="font-semibold">{t.title}</h2>
      </section>
    );
  }

  // Gerçek bağlantı VAR, kullanıcı "Yeniden aç"a basmadı VE sihirbazdan
  // "skipped" ile çıkılmadıysa (skipped config'e dokunmaz — kayıtlı bir
  // bağlantı varsa o bağlantı hâlâ geçerlidir, "skipped" onu geçersiz kılmaz;
  // bu satır sırf outcome'ın en son "skipped" olması kartı gizlemesin diye).
  if (config !== "not-configured" && !wizardOpen) {
    return <ConnectedCard t={t} config={config} onReopen={reopen} />;
  }

  if (!wizardOpen && outcome === "skipped") {
    return (
      <section className="rounded-cozy bg-surface p-6 shadow-cozy">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-semibold">{t.title}</h2>
          <button
            type="button"
            onClick={reopen}
            className="text-xs font-semibold text-indigo hover:underline"
          >
            {t.reopen}
          </button>
        </div>
        <p className="mt-1 text-sm text-ink-soft">{t.skipped}</p>
      </section>
    );
  }

  // allowPkce: Settings dönüş bacağını kurmuş olan TEK yer (yukarıdaki
  // pkceReturn tespiti + handleDone). Onboarding aynı komponenti mount
  // ediyor ama bu bayrağı geçmiyor — orada redirect draft'ı yakardı.
  return <LlmSetupWizard key={instance} onDone={handleDone} allowPkce />;
}
