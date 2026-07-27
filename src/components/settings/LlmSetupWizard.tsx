"use client";

// LLM kurulum sihirbazı — T-060 IA yeniden tasarımı (T-010'un yerine).
//
// ÜÇ KAPI, hepsi eşit ağırlıkta:
//   1. "Bağlamadan devam"  — birinci sınıf seçenek, bir "atla" linki değil.
//      Hazır kütüphane (gramer/kanji/kelime seed) ANINDA açık; ders ve sohbet
//      LLM bağlanınca açılır. Bu kapı config'e DOKUNMAZ: kayıtlı anahtarı
//      olan biri "şimdilik devam"a basınca anahtarını kaybetmemeli. LLM'i
//      gerçekten kapatmak gelişmiş paneldeki mode:"none".
//   2. "Bilgisayarımdaki AI" — Ollama ve abonelik köprüsü TEK kapı, iki şerit.
//      İkisi de aynı cümle: tarayıcın localhost'taki OpenAI-uyumlu bir
//      sunucuya bağlanır. Teknik seam ayrı (Ollama kendi endpoint'i, köprü
//      kendi portu), birleşen yalnız UX.
//   3. "API anahtarı" — sağlayıcı seç, anahtarı yapıştır.
//
// Sağlayıcı seçildikten sonra TEK model kararı var: Eko / Denge / En iyi
// (kalite profili). fast/balanced/deep üçlüsü casual akıştan tamamen çıktı —
// gelişmiş panelde duruyor. Hangi modelin çalışacağı hiçbir zaman gizli
// değil: "Kullanılacak: ..." satırı her seçimin altında.
//
// Saf mantık (profil→model, bütçe, profil çıkarımı, ollama pull) burada
// DEĞİL: llm-setup-logic.ts'te ve src/lib/llm-setup-logic.test.ts ile
// kilitli. Canlı algılama useLocalLlmProbe.ts'te. Gelişmiş form
// LlmAdvancedPanel.tsx'te.

import { useEffect, useMemo, useState } from "react";
import { CozyButton } from "@/components/shared/CozyButton";
import { useStrings } from "@/lib/i18n/use-strings";
import { invalidateLlmStatus } from "@/lib/llm-status";
import { IS_STATIC, llmConfigGet, llmConfigPut, llmTest } from "@/lib/client-api";
import { CATALOG, providerForBaseUrl, type ProviderId } from "@/lib/llm/catalog";
import { BASE_PATH } from "@/lib/base-path";
import {
  QUALITY_IDS,
  budgetHintFor,
  formatUsdPerMonth,
  modelLineFor,
  modelsForQuality,
  ollamaPullCommand,
  qualityForModels,
  type QualityProfileId,
  type SubBackend,
  type TierTriple,
} from "./llm-setup-logic";
import { useLocalLlmProbe, type ProbeState } from "./useLocalLlmProbe";
import { LlmAdvancedPanel } from "./LlmAdvancedPanel";

const S = {
  tr: {
    title: "Yapay zekâyı bağla",
    intro:
      "Dersleri, sohbeti ve değerlendirmeyi üreten kısım bu. Üç yol var; hiçbiri diğerinden daha \"doğru\" değil.",
    // --- kapılar
    doorNoneTitle: "Şimdilik bağlamadan başla",
    doorNoneBadge: "Hemen başlar",
    doorNoneDesc:
      "Hazır kütüphane (gramer, kanji, kelime) anında açık — ders üretimi ve sohbet, sen bağlayana kadar bekler. İstediğin an buraya dönebilirsin.",
    doorLocalTitle: "Bilgisayarımdaki AI",
    doorLocalBadge: "Ücretsiz / aboneliğinle",
    doorLocalDesc:
      "Ücretsiz yerel bir model (Ollama) ya da zaten ödediğin abonelik (Claude, ChatGPT, Copilot, Gemini). Tarayıcın bilgisayarındaki sunucuya bağlanır; hiçbir şey dışarı çıkmaz.",
    doorKeyTitle: "API anahtarı",
    doorKeyBadge: "~5 dakika",
    doorKeyDesc:
      "Bir sağlayıcıdan anahtar alıp yapıştırırsın. Kullandığın kadar ödersin; DeepSeek ile aylık birkaç dolar.",
    back: "← Geri",
    // --- dürüst friction (lokal kapı)
    frictionTitle: "Bu adım biraz teknik — ve buna değer",
    frictionBody:
      "Terminal açacaksın, bir komut çalıştıracaksın. Yıl 2026: AI'ı kendi makinende çalıştırabilmek artık bir beceri, öğrenmeye değer. Yine de bugün canın istemiyorsa iki çıkış var: bağlamadan başla (hazır içerik her geçen gün büyüyor) ya da 5 dakikalık API anahtarı yolu.",
    frictionToNone: "Bağlamadan başla",
    frictionToKey: "API anahtarı yolu",
    // --- lokal kapı, şeritler
    laneTitle: "Hangisi sende var?",
    laneOllama: "Ücretsiz yerel model",
    laneOllamaDesc: "Ollama kurulur, model indirilir. Hesap yok, ücret yok.",
    laneSub: "Zaten bir aboneliğim var",
    laneSubDesc: "Claude / ChatGPT / Copilot / Gemini — köprü programıyla.",
    // --- canlı algılama
    checklistTitle: "Durum",
    probeSearching: "aranıyor…",
    probeBridgeFound: (backend: string) => `köprü bulundu (${backend})`,
    probeBridgeAbsent: "köprü henüz görünmüyor",
    probeBridgeStale:
      "köprü çalışıyor ama eski bir sürüm — yine de deneyebilirsin",
    probeCliFound: (cli: string) => `${cli} bu makinede kurulu`,
    probeCliMissing: (cli: string) =>
      `${cli} PATH'te bulunamadı — önce onu kur`,
    probeCliCaveat: "(yalnızca kurulu mu bakıldı; giriş yaptın mı bilinmiyor)",
    probeOllamaFound: (n: number) =>
      n > 0 ? `Ollama çalışıyor (${n} model indirilmiş)` : "Ollama çalışıyor (henüz model indirilmemiş)",
    probeOllamaAbsent: "Ollama henüz görünmüyor",
    probeRetry: "Tekrar yokla",
    probeOriginHint: (flag: string) =>
      `Komutu çalıştırdıysan ve hâlâ görünmüyorsa: bu site senin bilgisayarına ancak izin verilirse ulaşabilir. Komutun sonundaki ${flag} kısmının eksiksiz olduğundan emin ol.`,
    probeAdvisory:
      "Bu kontrol yalnızca bilgi amaçlı — algılama yanılsa bile testi deneyebilirsin.",
    // --- ollama adımları
    ollamaStep1: "1. Ollama'yı kur:",
    ollamaStep2: "2. Terminal (Windows'ta PowerShell) açıp modeli indir:",
    ollamaStep3: "3. Bu siteye izin ver:",
    ollamaStep3Restart: "sonra Ollama'yı kapatıp yeniden başlat.",
    ollamaLocalNote:
      "Localhost'tan giriyorsun — ek izin gerekmez, Ollama açık olsun yeter.",
    // --- abonelik adımları
    subWhich: "Hangi abonelik?",
    subClaudeWebWarn:
      "claude.ai web aboneliği tek başına yetmez — bilgisayarına Claude Code CLI kurman gerekir; abonelik onun üzerinden çalışır.",
    subStep1: (cli: string) => `1. ${cli} kurulu değilse kur:`,
    subStep2: (cli: string) => `2. Bir kez ${cli} çalıştırıp hesabınla giriş yap.`,
    subStep3: "3. Köprüyü başlat (terminali açık bırak):",
    subNodeNote: "Köprü için Node.js gerekir:",
    subKeepOpen:
      "Köprü çalıştığı sürece üretim senin aboneliğinden gider. Terminali kapatınca durur.",
    subBackendDefault:
      "Bu backend kendi varsayılan modelini kullanır — model seçimi sende değil, o CLI'da.",
    // --- api key kapısı
    keyTitle: "Hangi sağlayıcı?",
    keyGet: "Anahtar al:",
    keyPaste: "Anahtarı yapıştır",
    // --- kalite profili
    qualityTitle: "Kalite tercihi",
    qualityEco: "Eko",
    qualityEcoDesc: "En ucuz/hızlı; günlük pratik için yeterli.",
    qualityBalanced: "Denge",
    qualityBalancedDesc: "Varsayılan. Ders kalitesi ile maliyet arası.",
    qualityBest: "En iyi",
    qualityBestDesc: "En güçlü modeller; daha yavaş ve pahalı.",
    qualityCustom: "Özel (elle seçilmiş modeller)",
    willUse: "Kullanılacak:",
    willUseFast: "hızlı işler",
    willUseDeep: "dersler",
    budgetFree: "Ek ücret yok — kendi donanımın/aboneliğin.",
    budgetEstimate: (amount: string) => `Tipik kullanımda ${amount}/ay civarı.`,
    budgetEstimateNote: "Kaba tahmin; gerçek kullanımına göre değişir.",
    budgetUnknown: "Bu endpoint'in fiyatını bilmiyoruz — tahmin veremeyiz.",
    // --- ortak
    safariWarn:
      "Safari, siteden bilgisayarındaki sunucuya bağlanmaya izin vermez — Chrome, Edge veya Firefox kullan.",
    copy: "Kopyala",
    copied: "✅",
    testSave: "Bağlantıyı test et ve kaydet",
    testing: "Test ediliyor...",
    testOk: "✅ Bağlantı kuruldu ve kaydedildi!",
    testFail: "❌ Bağlanamadı:",
    done: "Bitti",
    advanced: "Gelişmiş ayarlar",
    advancedHint:
      "Nokta atışı model id'si, özel adres, JSON modu, CLI modu, diğer backend'ler.",
    osMac: "macOS",
    osWin: "Windows",
    osLinux: "Linux",
  },
  en: {
    title: "Connect the AI",
    intro:
      "This is the part that writes your lessons, chat and grading. Three ways in; none of them is more \"correct\" than the others.",
    doorNoneTitle: "Start without connecting",
    doorNoneBadge: "Starts now",
    doorNoneDesc:
      "The ready-made library (grammar, kanji, vocabulary) works immediately — lesson generation and chat wait until you connect. You can come back any time.",
    doorLocalTitle: "AI on my computer",
    doorLocalBadge: "Free / your subscription",
    doorLocalDesc:
      "A free local model (Ollama) or the subscription you already pay for (Claude, ChatGPT, Copilot, Gemini). Your browser talks to a server on your own machine; nothing leaves it.",
    doorKeyTitle: "API key",
    doorKeyBadge: "~5 minutes",
    doorKeyDesc:
      "Get a key from a provider and paste it. Pay per use; a few dollars a month with DeepSeek.",
    back: "← Back",
    frictionTitle: "This step is a bit technical — and worth it",
    frictionBody:
      "You'll open a terminal and run one command. It's 2026: running AI on your own machine is a skill now, and it's worth learning. If today isn't the day, there are two ways out: start without connecting (the ready-made content keeps growing) or take the 5-minute API-key path.",
    frictionToNone: "Start without connecting",
    frictionToKey: "API-key path",
    laneTitle: "Which one do you have?",
    laneOllama: "Free local model",
    laneOllamaDesc: "Install Ollama, pull a model. No account, no cost.",
    laneSub: "I already have a subscription",
    laneSubDesc: "Claude / ChatGPT / Copilot / Gemini — via the bridge program.",
    checklistTitle: "Status",
    probeSearching: "looking…",
    probeBridgeFound: (backend: string) => `bridge found (${backend})`,
    probeBridgeAbsent: "no bridge yet",
    probeBridgeStale: "bridge is running but on an older version — you can still try",
    probeCliFound: (cli: string) => `${cli} is installed on this machine`,
    probeCliMissing: (cli: string) => `${cli} not found on PATH — install it first`,
    probeCliCaveat: "(only checked that it's installed; not whether you're signed in)",
    probeOllamaFound: (n: number) =>
      n > 0 ? `Ollama is running (${n} models pulled)` : "Ollama is running (no models pulled yet)",
    probeOllamaAbsent: "no Ollama yet",
    probeRetry: "Check again",
    probeOriginHint: (flag: string) =>
      `If you ran the command and it still doesn't show up: this site can only reach your computer with permission. Make sure the ${flag} part of the command is intact.`,
    probeAdvisory:
      "This check is informational only — you can hit test even if detection is wrong.",
    ollamaStep1: "1. Install Ollama:",
    ollamaStep2: "2. Open a terminal (PowerShell on Windows) and pull the model:",
    ollamaStep3: "3. Allow this site:",
    ollamaStep3Restart: "then quit and restart Ollama.",
    ollamaLocalNote:
      "You're on localhost — no extra permission needed, just keep Ollama running.",
    subWhich: "Which subscription?",
    subClaudeWebWarn:
      "A claude.ai web subscription alone isn't enough — you need the Claude Code CLI on your computer; the subscription works through it.",
    subStep1: (cli: string) => `1. Install ${cli} if you don't have it:`,
    subStep2: (cli: string) => `2. Run ${cli} once and sign in with your account.`,
    subStep3: "3. Start the bridge (keep the terminal open):",
    subNodeNote: "The bridge needs Node.js:",
    subKeepOpen:
      "While the bridge runs, generation goes through your subscription. Closing the terminal stops it.",
    subBackendDefault:
      "This backend uses its own default model — the choice lives in that CLI, not here.",
    keyTitle: "Which provider?",
    keyGet: "Get a key:",
    keyPaste: "Paste your key",
    qualityTitle: "Quality preference",
    qualityEco: "Eco",
    qualityEcoDesc: "Cheapest/fastest; fine for daily practice.",
    qualityBalanced: "Balanced",
    qualityBalancedDesc: "The default. Between lesson quality and cost.",
    qualityBest: "Best",
    qualityBestDesc: "The strongest models; slower and pricier.",
    qualityCustom: "Custom (hand-picked models)",
    willUse: "Will use:",
    willUseFast: "quick work",
    willUseDeep: "lessons",
    budgetFree: "No extra cost — your own hardware/subscription.",
    budgetEstimate: (amount: string) => `Around ${amount}/month with typical use.`,
    budgetEstimateNote: "A rough estimate; your actual use will differ.",
    budgetUnknown: "We don't know this endpoint's pricing — no estimate to give.",
    safariWarn:
      "Safari blocks the site from reaching a server on your computer — use Chrome, Edge, or Firefox.",
    copy: "Copy",
    copied: "✅",
    testSave: "Test connection & save",
    testing: "Testing...",
    testOk: "✅ Connected and saved!",
    testFail: "❌ Could not connect:",
    done: "Done",
    advanced: "Advanced settings",
    advancedHint:
      "Exact model ids, custom address, JSON mode, CLI mode, other backends.",
    osMac: "macOS",
    osWin: "Windows",
    osLinux: "Linux",
  },
};

type T = (typeof S)["tr"];

type Door = "choose" | "local" | "key";
type Lane = "ollama" | "sub";
type Os = "mac" | "win" | "linux";
type KeyProvider = "deepseek" | "openai" | "openrouter" | "anthropic";

function detectOs(): Os {
  if (typeof navigator === "undefined") return "mac";
  const ua = navigator.userAgent;
  if (/Windows/i.test(ua)) return "win";
  if (/Mac/i.test(ua)) return "mac";
  return "linux";
}

const KEY_PROVIDERS: Record<
  KeyProvider,
  { label: string; keyUrl: string; note?: { tr: string; en: string } }
> = {
  deepseek: {
    label: "DeepSeek",
    keyUrl: "https://platform.deepseek.com/api_keys",
    note: {
      tr: "En ucuzu — birkaç dolarlık bakiye aylarca yeter.",
      en: "Cheapest — a few dollars of credit lasts months.",
    },
  },
  anthropic: {
    label: "Anthropic (Claude)",
    keyUrl: "https://console.anthropic.com/settings/keys",
  },
  openai: { label: "OpenAI", keyUrl: "https://platform.openai.com/api-keys" },
  openrouter: { label: "OpenRouter", keyUrl: "https://openrouter.ai/settings/keys" },
};

/** Köprü backend'leri. `models` alanı YOK — üçlüyü artık tek üretici
 * (modelsForQuality) veriyor, sentinel istisnası dahil. */
const SUB_BACKENDS: Record<
  SubBackend,
  { label: string; cli: string; install: Record<Os, string> }
> = {
  claude: {
    label: "Claude (Max/Pro)",
    cli: "claude",
    install: {
      mac: "curl -fsSL https://claude.ai/install.sh | bash",
      linux: "curl -fsSL https://claude.ai/install.sh | bash",
      win: "irm https://claude.ai/install.ps1 | iex",
    },
  },
  codex: {
    label: "ChatGPT (Plus/Pro)",
    cli: "codex",
    install: {
      mac: "npm install -g @openai/codex",
      linux: "npm install -g @openai/codex",
      win: "npm install -g @openai/codex",
    },
  },
  copilot: {
    label: "GitHub Copilot",
    cli: "copilot",
    install: {
      mac: "npm install -g @github/copilot",
      linux: "npm install -g @github/copilot",
      win: "npm install -g @github/copilot",
    },
  },
  gemini: {
    label: "Google Gemini",
    cli: "gemini",
    install: {
      mac: "npm install -g @google/gemini-cli",
      linux: "npm install -g @google/gemini-cli",
      win: "npm install -g @google/gemini-cli",
    },
  },
  opencode: {
    label: "opencode",
    cli: "opencode",
    install: {
      mac: "npm install -g opencode-ai",
      linux: "npm install -g opencode-ai",
      win: "npm install -g opencode-ai",
    },
  },
};

// Casual akışta gösterilen abonelikler. opencode gelişmiş kitle içindir —
// listeyi kalabalıklaştırmasın diye gelişmiş panele bırakıldı (orada
// backend seçimi base URL + model id ile elle yapılabiliyor).
const CASUAL_BACKENDS: SubBackend[] = ["claude", "codex", "copilot", "gemini"];

// --------------------------------------------------------------- parçacıklar

function CmdBlock({
  cmd,
  copyLabel,
  copiedLabel,
}: {
  cmd: string;
  copyLabel: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-start gap-2">
      <code className="min-w-0 flex-1 overflow-x-auto whitespace-pre rounded-xl bg-surface-2 px-3 py-2 font-mono text-xs">
        {cmd}
      </code>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(cmd).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
        className="shrink-0 rounded-lg border-2 border-surface-2 px-2 py-1.5 text-xs hover:border-accent-soft"
      >
        {copied ? copiedLabel : copyLabel}
      </button>
    </div>
  );
}

function OsTabs({ os, setOs, t }: { os: Os; setOs: (o: Os) => void; t: T }) {
  const labels: Record<Os, string> = { mac: t.osMac, win: t.osWin, linux: t.osLinux };
  return (
    <div className="flex gap-1">
      {(["mac", "win", "linux"] as const).map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => setOs(o)}
          className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
            os === o
              ? "bg-indigo-soft text-indigo-deep"
              : "bg-surface-2 text-ink-soft hover:bg-indigo-soft/40"
          }`}
        >
          {labels[o]}
        </button>
      ))}
    </div>
  );
}

function Pill({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
        selected
          ? "bg-indigo-soft text-indigo-deep"
          : "bg-surface-2 text-ink-soft hover:bg-indigo-soft/40"
      }`}
    >
      {children}
    </button>
  );
}

/** Canlı algılama satırı. İkon durum rengini taşır; indigo = bilgi/durum
 * (yeşil yok — Yūyake rol kuralı). */
function CheckRow({ state, text }: { state: ProbeState; text: string }) {
  const mark =
    state === "found" ? "●" : state === "searching" ? "◌" : state === "stale" ? "◐" : "○";
  const tone =
    state === "found"
      ? "text-indigo-deep"
      : state === "stale"
        ? "text-amber-text"
        : "text-ink-soft";
  return (
    <div className={`flex items-baseline gap-2 text-xs ${tone}`}>
      <span aria-hidden className={state === "searching" ? "animate-pulse" : ""}>
        {mark}
      </span>
      <span>{text}</span>
    </div>
  );
}

/** Kalite profili seçimi + "Kullanılacak: ..." + bütçe ipucu. Model
 * kararının TEK casual yüzü. */
function QualityPicker({
  t,
  provider,
  quality,
  onChange,
  models,
}: {
  t: T;
  provider: ProviderId;
  quality: QualityProfileId | null;
  onChange: (q: QualityProfileId) => void;
  /** GERÇEKTEN kaydedilecek üçlü — burada yeniden türetilmez. Türetseydi
   * "Özel" etiketinin altında katalog varsayılanları görünürdü; ekrandaki
   * ad ile kaydedilen değer ayrışırdı. */
  models: TierTriple;
}) {
  const line = modelLineFor(models);
  const budget = budgetHintFor(provider, models);
  const labels: Record<QualityProfileId, { label: string; desc: string }> = {
    eco: { label: t.qualityEco, desc: t.qualityEcoDesc },
    balanced: { label: t.qualityBalanced, desc: t.qualityBalancedDesc },
    best: { label: t.qualityBest, desc: t.qualityBestDesc },
  };
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-surface-2/60 px-3 py-3">
      <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
        {t.qualityTitle}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {QUALITY_IDS.map((q) => (
          <Pill key={q} selected={quality === q} onClick={() => onChange(q)}>
            {labels[q].label}
          </Pill>
        ))}
      </div>
      <p className="text-xs text-ink-soft">
        {quality ? labels[quality].desc : t.qualityCustom}
      </p>
      {line && (
        <p className="text-xs">
          <span className="font-semibold">{t.willUse}</span>{" "}
          {line.same ? (
            <span>{line.fastLabel}</span>
          ) : (
            <>
              <span>
                {line.fastLabel}{" "}
                <span className="text-ink-soft">({t.willUseFast})</span>
              </span>
              {" · "}
              <span>
                {line.deepLabel}{" "}
                <span className="text-ink-soft">({t.willUseDeep})</span>
              </span>
            </>
          )}
        </p>
      )}
      <p className="text-xs text-ink-soft">
        {budget.kind === "free" && t.budgetFree}
        {budget.kind === "unknown" && t.budgetUnknown}
        {budget.kind === "estimate" && (
          <>
            {t.budgetEstimate(formatUsdPerMonth(budget.usdPerMonth))}{" "}
            <span className="opacity-80">{t.budgetEstimateNote}</span>
          </>
        )}
      </p>
    </div>
  );
}

function TestRow({
  t,
  testing,
  testMsg,
  succeeded,
  onTest,
  onDone,
  disabled,
}: {
  t: T;
  testing: boolean;
  testMsg: string | null;
  succeeded: boolean;
  onTest: () => void;
  onDone: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="mt-1 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <CozyButton variant="soft" onClick={onTest} disabled={testing || disabled}>
          {testing ? t.testing : t.testSave}
        </CozyButton>
        {succeeded && (
          <CozyButton variant="ghost" onClick={onDone}>
            {t.done}
          </CozyButton>
        )}
      </div>
      {testMsg && <p className="text-sm">{testMsg}</p>}
    </div>
  );
}

// ------------------------------------------------------------------ sihirbaz

export function LlmSetupWizard({ onDone }: { onDone: () => void }) {
  const t = useStrings(S);
  const [door, setDoor] = useState<Door>("choose");
  const [lane, setLane] = useState<Lane | null>(null);
  const [os, setOs] = useState<Os>(detectOs);
  const [keyProvider, setKeyProvider] = useState<KeyProvider>("deepseek");
  const [apiKey, setApiKey] = useState("");
  const [subBackend, setSubBackend] = useState<SubBackend>("claude");
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const isLocalOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  const isSafari =
    typeof navigator !== "undefined" &&
    /Safari/i.test(navigator.userAgent) &&
    !/Chrome|Chromium|Edg/i.test(navigator.userAgent);

  // Kayıtlı config'ten kalite profilini geri çıkar. Config'te profil alanı
  // yok (llmConfigPut yalnız çözülmüş üçlüyü taşır), o yüzden üçlüyü
  // katalogla eşleştiriyoruz.
  //
  // Çıkarım HANGİ SAĞLAYICIYA ait olduğuyla birlikte saklanır. Aksi hâlde
  // "elle seçilmiş modeller" (null = Özel) durumu tüm kapılara sızardı:
  // kullanıcı API-anahtarı kapısına geçtiğinde ekranda "Özel" yazarken
  // kaydedilen üçlü sessizce "Denge" olurdu — etiket ile kaydedilen değerin
  // çeliştiği tam da bu ticket'ın kapatmaya çalıştığı belirsizlik.
  const [storedQuality, setStoredQuality] = useState<{
    provider: ProviderId;
    quality: QualityProfileId | null;
    /** Kayıtlı üçlünün kendisi — profil "Özel" iken (elle seçilmiş
     * modeller) casual kaydın onu EZMEMESİ için saklanır. */
    models: TierTriple;
  } | null>(null);
  const [picked, setPicked] = useState<QualityProfileId | null>(null);

  useEffect(() => {
    let alive = true;
    llmConfigGet()
      .then((d) => {
        if (!alive || !d.models) return;
        const provider: ProviderId =
          d.mode === "anthropic"
            ? "anthropic"
            : (providerForBaseUrl(d.baseUrl) ?? "custom");
        setStoredQuality({
          provider,
          quality: qualityForModels(provider, d.models),
          models: {
            fast: d.models.fast ?? "",
            balanced: d.models.balanced ?? "",
            deep: d.models.deep ?? "",
          },
        });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Aktif sağlayıcı: kalite profili ve bütçe bunun üstünden hesaplanır.
  const activeProvider: ProviderId =
    door === "key"
      ? keyProvider
      : lane === "ollama"
        ? "ollama"
        : "bridge";

  const activeBackend = door === "local" && lane === "sub" ? subBackend : undefined;

  // Gösterilecek profil: kullanıcı bu oturumda seçtiyse o; yoksa kayıtlı
  // config AYNI sağlayıcıya aitse ondan çıkarılan (null = Özel dahil);
  // başka bir sağlayıcıya geçildiyse varsayılan "Denge".
  const quality: QualityProfileId | null =
    picked ??
    (storedQuality && storedQuality.provider === activeProvider
      ? storedQuality.quality
      : "balanced");

  // Kaydedilecek üçlü. "Özel" (quality === null) durumunda kullanıcının
  // gelişmiş panelde elle seçtiği modeller AYNEN korunur — casual kapıya
  // uğrayıp "Test et ve kaydet"e basmak onları sessizce "Denge"ye
  // ezmemeli. Bu, ekrandaki etiket ("Özel") ile kaydedilen değerin
  // çelişmemesini de sağlar.
  const activeModels: TierTriple =
    quality === null && storedQuality?.provider === activeProvider
      ? storedQuality.models
      : modelsForQuality(activeProvider, quality ?? "balanced", activeBackend);

  // Canlı algılama YALNIZ lokal kapı açıkken. Şeride göre daraltılır:
  // Ollama şeridinde köprüyü yoklamanın anlamı yok.
  const probe = useLocalLlmProbe(
    door === "local" && lane !== null,
    CATALOG.bridge.baseUrl,
    CATALOG.ollama.baseUrl,
    lane === "ollama" ? "ollama" : "bridge"
  );

  // Köprü komutu: T-059 ile birincil yol `npx okumo-bridge`. Hosted origin'de
  // --origin ŞART (köprünün T-039 kapısı izinsiz origin'de CLI'yı hiç
  // çalıştırmaz); localhost'ta gereksiz.
  const originFlag = isLocalOrigin ? "" : ` --origin ${origin}`;
  const bridgeCmd = useMemo(() => {
    const backendFlag = subBackend === "claude" ? "" : ` --backend ${subBackend}`;
    if (!IS_STATIC && isLocalOrigin) {
      // Repo içindeyken (sahibin server modu) yerel scripti çalıştırmak daha
      // doğrudan; npm run llm:bridge argümanları `--` sonrası alır.
      return `npm run llm:bridge${backendFlag ? ` --${backendFlag}` : ""}`;
    }
    return `npx okumo-bridge${backendFlag}${originFlag}`;
  }, [subBackend, originFlag, isLocalOrigin]);

  // Registry'ye erişemeyenler için siteden indirilen kopya (T-059 fallback).
  const bridgeFallbackCmd = useMemo(() => {
    const backendFlag = subBackend === "claude" ? "" : ` --backend ${subBackend}`;
    const url = `${origin}${BASE_PATH}/llm-bridge.mjs`;
    return os === "win"
      ? `iwr ${url} -OutFile llm-bridge.mjs; node llm-bridge.mjs${backendFlag}${originFlag}`
      : `curl -fsSL ${url} -o llm-bridge.mjs && node llm-bridge.mjs${backendFlag}${originFlag}`;
  }, [subBackend, os, origin, originFlag]);

  const ollamaCorsCmd: Record<Os, string> = {
    mac: `launchctl setenv OLLAMA_ORIGINS "${origin}"`,
    win: `setx OLLAMA_ORIGINS "${origin}"`,
    linux: `OLLAMA_ORIGINS="${origin}" ollama serve`,
  };

  const testAndSave = async (config: Parameters<typeof llmConfigPut>[0]) => {
    setTesting(true);
    setTestMsg(null);
    try {
      await llmConfigPut(config);
      const r = await llmTest();
      if (r.ok) {
        setTestMsg(t.testOk);
        invalidateLlmStatus();
      } else {
        setTestMsg(`${t.testFail} ${r.error ?? ""}`);
      }
    } catch (err) {
      setTestMsg(`${t.testFail} ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setTesting(false);
    }
  };

  const succeeded = testMsg === t.testOk;
  const resetMsg = () => setTestMsg(null);

  const keyNote = KEY_PROVIDERS[keyProvider].note;
  const keyNoteText = keyNote ? (t === S.en ? keyNote.en : keyNote.tr) : null;

  const doorCard = (
    onClick: () => void,
    title: string,
    desc: string,
    badge: string
  ) => (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border-2 border-surface-2 bg-background px-4 py-3 text-left transition-colors hover:border-accent-soft"
    >
      <span className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">{title}</span>
        <span className="rounded-full bg-indigo-soft px-2 py-0.5 text-[11px] font-semibold text-indigo-deep">
          {badge}
        </span>
      </span>
      <span className="mt-0.5 block text-xs text-ink-soft">{desc}</span>
    </button>
  );

  return (
    <section className="rounded-cozy bg-surface p-6 shadow-cozy">
      <h2 className="mb-1 font-semibold">{t.title}</h2>

      {door === "choose" && (
        <>
          <p className="mb-4 text-sm text-ink-soft">{t.intro}</p>
          <div className="flex flex-col gap-2">
            {/* No-LLM kapısı config'e DOKUNMAZ — sadece sihirbazdan çıkar.
                Kayıtlı anahtarı olan biri buraya basınca kaybetmemeli. */}
            {doorCard(onDone, t.doorNoneTitle, t.doorNoneDesc, t.doorNoneBadge)}
            {doorCard(
              () => {
                resetMsg();
                setLane(null);
                setDoor("local");
              },
              t.doorLocalTitle,
              t.doorLocalDesc,
              t.doorLocalBadge
            )}
            {doorCard(
              () => {
                resetMsg();
                setPicked(null);
                setDoor("key");
              },
              t.doorKeyTitle,
              t.doorKeyDesc,
              t.doorKeyBadge
            )}
          </div>
        </>
      )}

      {door !== "choose" && (
        <button
          type="button"
          onClick={() => {
            resetMsg();
            setLane(null);
            setDoor("choose");
          }}
          className="mb-3 text-xs font-semibold text-ink-soft hover:text-ink"
        >
          {t.back}
        </button>
      )}

      {/* ------------------------------------------------ API anahtarı kapısı */}
      {door === "key" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold">{t.keyTitle}</p>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(KEY_PROVIDERS) as KeyProvider[]).map((p) => (
              <Pill
                key={p}
                selected={keyProvider === p}
                onClick={() => {
                  setKeyProvider(p);
                  resetMsg();
                }}
              >
                {KEY_PROVIDERS[p].label}
              </Pill>
            ))}
          </div>
          {keyNoteText && <p className="text-xs text-ink-soft">{keyNoteText}</p>}
          <p className="text-sm">
            {t.keyGet}{" "}
            <a
              href={KEY_PROVIDERS[keyProvider].keyUrl}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-indigo underline"
            >
              {KEY_PROVIDERS[keyProvider].keyUrl.replace("https://", "")}
            </a>
          </p>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={t.keyPaste}
            className="w-full rounded-xl border-2 border-surface-2 bg-background px-3 py-2 font-mono text-xs outline-none focus:border-indigo focus:ring-4 focus:ring-indigo/15"
          />
          <QualityPicker
            t={t}
            provider={keyProvider}
            quality={quality}
            onChange={setPicked}
            models={activeModels}
          />
          <TestRow
            t={t}
            testing={testing}
            testMsg={testMsg}
            succeeded={succeeded}
            onDone={onDone}
            disabled={!apiKey}
            onTest={() =>
              testAndSave(
                keyProvider === "anthropic"
                  ? { mode: "anthropic", apiKey, models: activeModels }
                  : {
                      mode: "openai",
                      baseUrl: CATALOG[keyProvider].baseUrl,
                      apiKey,
                      models: activeModels,
                      jsonMode: CATALOG[keyProvider].jsonMode,
                    }
              )
            }
          />
        </div>
      )}

      {/* ------------------------------------------------------- lokal kapı */}
      {door === "local" && (
        <div className="flex flex-col gap-4 text-sm">
          {/* Dürüst friction: gizleme, gerekçelendir, iki çıkış göster. */}
          <div className="rounded-xl bg-indigo-soft/50 px-4 py-3">
            <p className="text-sm font-semibold">{t.frictionTitle}</p>
            <p className="mt-1 text-xs text-ink-soft">{t.frictionBody}</p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold">
              <button type="button" onClick={onDone} className="text-indigo underline">
                {t.frictionToNone}
              </button>
              <button
                type="button"
                onClick={() => {
                  resetMsg();
                  setPicked(null);
                  setDoor("key");
                }}
                className="text-indigo underline"
              >
                {t.frictionToKey}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="font-semibold">{t.laneTitle}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  resetMsg();
                  setLane("ollama");
                }}
                className={`flex-1 rounded-xl border-2 px-4 py-3 text-left transition-colors ${
                  lane === "ollama"
                    ? "border-indigo bg-indigo-soft/40"
                    : "border-surface-2 bg-background hover:border-indigo-soft"
                }`}
              >
                <span className="block text-sm font-semibold">{t.laneOllama}</span>
                <span className="block text-xs text-ink-soft">{t.laneOllamaDesc}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  resetMsg();
                  setLane("sub");
                }}
                className={`flex-1 rounded-xl border-2 px-4 py-3 text-left transition-colors ${
                  lane === "sub"
                    ? "border-indigo bg-indigo-soft/40"
                    : "border-surface-2 bg-background hover:border-indigo-soft"
                }`}
              >
                <span className="block text-sm font-semibold">{t.laneSub}</span>
                <span className="block text-xs text-ink-soft">{t.laneSubDesc}</span>
              </button>
            </div>
          </div>

          {isSafari && lane !== null && (
            <p className="text-xs font-semibold text-danger">{t.safariWarn}</p>
          )}

          {/* --------------------------------------------- Ollama şeridi */}
          {lane === "ollama" && (
            <div className="flex flex-col gap-3">
              <p>
                {t.ollamaStep1}{" "}
                <a
                  href="https://ollama.com/download"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-indigo underline"
                >
                  ollama.com/download
                </a>
              </p>
              <QualityPicker
                t={t}
                provider="ollama"
                quality={quality}
                onChange={setPicked}
                models={activeModels}
              />
              <p>{t.ollamaStep2}</p>
              {/* Pull komutu SEÇİLEN profilden türer — "En iyi" seçip 7b
                  indirmek üretimi indirilmemiş modelde patlatırdı. */}
              <CmdBlock
                cmd={ollamaPullCommand(activeModels)}
                copyLabel={t.copy}
                copiedLabel={t.copied}
              />
              {isLocalOrigin ? (
                <p className="text-xs text-ink-soft">{t.ollamaLocalNote}</p>
              ) : (
                <>
                  <p>{t.ollamaStep3}</p>
                  <OsTabs os={os} setOs={setOs} t={t} />
                  <CmdBlock
                    cmd={ollamaCorsCmd[os]}
                    copyLabel={t.copy}
                    copiedLabel={t.copied}
                  />
                  {os !== "linux" && (
                    <p className="text-xs text-ink-soft">{t.ollamaStep3Restart}</p>
                  )}
                </>
              )}
              <Checklist t={t} title={t.checklistTitle} onRetry={probe.refresh}>
                <CheckRow
                  state={probe.ollama.state}
                  text={
                    probe.ollama.state === "found"
                      ? t.probeOllamaFound(probe.ollama.models.length)
                      : probe.ollama.state === "searching"
                        ? t.probeSearching
                        : t.probeOllamaAbsent
                  }
                />
                {probe.ollama.state === "absent" && !isLocalOrigin && (
                  <p className="text-xs text-ink-soft">
                    {t.probeOriginHint("OLLAMA_ORIGINS")}
                  </p>
                )}
              </Checklist>
              <TestRow
                t={t}
                testing={testing}
                testMsg={testMsg}
                succeeded={succeeded}
                onDone={onDone}
                onTest={() =>
                  testAndSave({
                    mode: "openai",
                    baseUrl: CATALOG.ollama.baseUrl,
                    models: activeModels,
                    jsonMode: CATALOG.ollama.jsonMode,
                  })
                }
              />
            </div>
          )}

          {/* ------------------------------------------ abonelik şeridi */}
          {lane === "sub" && (
            <div className="flex flex-col gap-3">
              <p className="font-semibold">{t.subWhich}</p>
              <div className="flex flex-wrap gap-1.5">
                {CASUAL_BACKENDS.map((b) => (
                  <Pill
                    key={b}
                    selected={subBackend === b}
                    onClick={() => {
                      setSubBackend(b);
                      resetMsg();
                    }}
                  >
                    {SUB_BACKENDS[b].label}
                  </Pill>
                ))}
              </div>
              {subBackend === "claude" && (
                <p className="rounded-xl bg-indigo-soft px-3 py-2 text-xs">
                  {t.subClaudeWebWarn}
                </p>
              )}
              <OsTabs os={os} setOs={setOs} t={t} />
              <p>{t.subStep1(SUB_BACKENDS[subBackend].cli)}</p>
              <CmdBlock
                cmd={SUB_BACKENDS[subBackend].install[os]}
                copyLabel={t.copy}
                copiedLabel={t.copied}
              />
              <p>{t.subStep2(SUB_BACKENDS[subBackend].cli)}</p>
              <p>{t.subStep3}</p>
              <CmdBlock cmd={bridgeCmd} copyLabel={t.copy} copiedLabel={t.copied} />
              {IS_STATIC && (
                <details className="text-xs text-ink-soft">
                  <summary className="cursor-pointer">npx çalışmıyorsa</summary>
                  <div className="mt-2">
                    <CmdBlock
                      cmd={bridgeFallbackCmd}
                      copyLabel={t.copy}
                      copiedLabel={t.copied}
                    />
                  </div>
                </details>
              )}
              {/* claude dışındaki backend'lerde model seçimi bizde değil:
                  köprü sentinel'i CLI'nın kendi varsayılanını kullandırır. */}
              {subBackend === "claude" ? (
                <QualityPicker
                  t={t}
                  provider="bridge"
                  quality={quality}
                  onChange={setPicked}
                  models={activeModels}
                />
              ) : (
                <p className="rounded-xl bg-surface-2/60 px-3 py-2 text-xs text-ink-soft">
                  {t.subBackendDefault} {t.budgetFree}
                </p>
              )}
              <Checklist t={t} title={t.checklistTitle} onRetry={probe.refresh}>
                <CheckRow
                  state={probe.bridge.state}
                  text={
                    probe.bridge.state === "found"
                      ? t.probeBridgeFound(probe.bridge.backend ?? "?")
                      : probe.bridge.state === "stale"
                        ? t.probeBridgeStale
                        : probe.bridge.state === "searching"
                          ? t.probeSearching
                          : t.probeBridgeAbsent
                  }
                />
                {probe.bridge.state === "found" && probe.bridge.cliFound !== null && (
                  <CheckRow
                    state={probe.bridge.cliFound ? "found" : "absent"}
                    text={`${
                      probe.bridge.cliFound
                        ? t.probeCliFound(probe.bridge.backend ?? "CLI")
                        : t.probeCliMissing(probe.bridge.backend ?? "CLI")
                    } ${t.probeCliCaveat}`}
                  />
                )}
                {probe.bridge.state === "absent" && !isLocalOrigin && (
                  <p className="text-xs text-ink-soft">
                    {t.probeOriginHint(`--origin ${origin}`)}
                  </p>
                )}
              </Checklist>
              <p className="text-xs text-ink-soft">
                {t.subNodeNote}{" "}
                <a
                  href="https://nodejs.org"
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo underline"
                >
                  nodejs.org
                </a>
                {" — "}
                {t.subKeepOpen}
              </p>
              <TestRow
                t={t}
                testing={testing}
                testMsg={testMsg}
                succeeded={succeeded}
                onDone={onDone}
                onTest={() =>
                  testAndSave({
                    mode: "openai",
                    baseUrl: CATALOG.bridge.baseUrl,
                    models: activeModels,
                    jsonMode: CATALOG.bridge.jsonMode,
                  })
                }
              />
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------ gelişmiş accordion */}
      <div className="mt-6 border-t border-surface-2 pt-3">
        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 text-left"
          aria-expanded={advancedOpen}
        >
          <span>
            <span className="block text-sm font-semibold">{t.advanced}</span>
            <span className="block text-xs text-ink-soft">{t.advancedHint}</span>
          </span>
          <span aria-hidden className="text-xs text-ink-soft">
            {advancedOpen ? "▲" : "▼"}
          </span>
        </button>
        {advancedOpen && (
          <div className="mt-4">
            <LlmAdvancedPanel onSaved={() => setTestMsg(null)} />
          </div>
        )}
      </div>
    </section>
  );
}

function Checklist({
  t,
  title,
  onRetry,
  children,
}: {
  t: T;
  title: string;
  onRetry: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border-2 border-surface-2 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
          {title}
        </span>
        <button
          type="button"
          onClick={onRetry}
          className="text-xs font-semibold text-indigo hover:underline"
        >
          {t.probeRetry}
        </button>
      </div>
      {children}
      <p className="text-[11px] text-ink-soft opacity-80">{t.probeAdvisory}</p>
    </div>
  );
}
