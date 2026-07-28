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
import { llmConfigGet, type LlmConfigDto } from "@/lib/client-api";
import { CATALOG, providerForBaseUrl, type ProviderId } from "@/lib/llm/catalog";
import { qualityForModels, modelLineFor } from "./llm-setup-logic";
import { useLocalLlmProbe } from "./useLocalLlmProbe";
import { LlmSetupWizard, type WizardOutcome } from "./LlmSetupWizard";

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
  }, [refresh]);

  const reopen = useCallback(() => {
    setOutcome(null);
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

  return <LlmSetupWizard key={instance} onDone={handleDone} />;
}
