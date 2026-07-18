"use client";

// LLM kurulum sihirbazı (T-010): kod bilmeyen kullanıcı için rehberli akış.
// "Hangi sağlayıcıyla hesabın var?" sorusundan başlar, OS'e göre tek satır
// komutlar verir, bağlantı testinde başarılıysa config'i kaydeder.
// Teknik form (LlmProviderSection) gelişmiş seçenek olarak yanında durur.

import { useMemo, useState } from "react";
import { CozyButton } from "@/components/shared/CozyButton";
import { useStrings } from "@/lib/i18n/use-strings";
import { invalidateLlmStatus } from "@/lib/llm-status";
import { IS_STATIC, llmConfigPut, llmTest } from "@/lib/client-api";
import { PRESETS } from "@/lib/llm/presets";
import { BASE_PATH } from "@/lib/base-path";

const S = {
  tr: {
    title: "LLM bağlantı sihirbazı",
    intro:
      "Dersleri ve değerlendirmeleri üretecek yapay zekâyı bağlayalım. Nasıl bağlanmak istersin?",
    optKey: "API anahtarı ile",
    optKeyBadge: "Önerilen — kurulum yok",
    optKeyDesc:
      "Bir sağlayıcıdan anahtar alıp yapıştırırsın, 5 dakikada hazır. Kullandığın kadar ödersin (DeepSeek çok ucuz).",
    optOllama: "Bilgisayarımda ücretsiz model (Ollama)",
    optOllamaBadge: "Önerilen — tamamen ücretsiz",
    optOllamaDesc:
      "Ollama'yı kurar, modeli indirirsin. Hesap ve ücret yok; orta güçte ama yeterli.",
    optSub: "Mevcut aboneliğimle (Claude / ChatGPT / Copilot / Gemini)",
    optSubDesc:
      "Bilgisayarında küçük bir köprü programı çalıştırırsın; istekler kendi aboneliğine gider.",
    optSkip: "Şimdilik bağlamadan devam et",
    optSkipDesc:
      "Hazır (önceden üretilmiş) içerikler çalışır; yeni ders/sohbet üretimi kapalı kalır.",
    back: "← Geri",
    // key path
    keyTitle: "Hangi sağlayıcıdan anahtarın var (veya alacaksın)?",
    keyGet: "Anahtar almak için:",
    keyPaste: "Anahtarı buraya yapıştır",
    // ollama path
    ollamaStep1: "1. Ollama'yı kur:",
    ollamaStep1Link: "ollama.com/download",
    ollamaStep2: "2. Terminal (Windows'ta PowerShell) açıp modelleri indir:",
    ollamaStep3:
      "3. Bu site Ollama'ya tarayıcından bağlanacak — izin vermek için:",
    ollamaStep3Restart: "sonra Ollama'yı kapatıp yeniden başlat.",
    ollamaLocalNote:
      "Localhost'tan kullanıyorsun — ek izin gerekmez, Ollama açık olsun yeter.",
    // subscription path
    subTitle: "Hangi aboneliğin var?",
    subClaudeWebWarn:
      "Not: claude.ai web aboneliği tek başına buradan KULLANILAMAZ — bilgisayarına Claude Code CLI kurman gerekir (aboneliğin onunla çalışır). CLI istemiyorsan API anahtarı yolu daha kolay.",
    subStep1: (cli: string) => `1. ${cli} kurulu değilse kur:`,
    subStep2: (cli: string) =>
      `2. Bir kez ${cli} yazıp çalıştır, hesabınla giriş yap.`,
    subStep3: "3. Köprüyü başlat (terminali açık bırak):",
    subNodeNote: "Köprü için Node.js gerekir:",
    subKeepOpen:
      "Köprü çalıştığı sürece uygulama aboneliğin üzerinden üretim yapar. Terminali kapatınca durur.",
    // shared
    safariWarn:
      "Safari, siteden bilgisayarındaki sunucuya bağlanmaya izin vermez — Chrome, Edge veya Firefox kullan.",
    copy: "Kopyala",
    copied: "✅",
    testSave: "Bağlantıyı test et ve kaydet",
    testing: "Test ediliyor...",
    testOk: "✅ Bağlantı kuruldu ve kaydedildi!",
    testFail: "❌ Bağlanamadı:",
    done: "Bitti",
    osMac: "macOS",
    osWin: "Windows",
    osLinux: "Linux",
  },
  en: {
    title: "LLM setup wizard",
    intro:
      "Let's connect the AI that will generate lessons and grading. How do you want to connect?",
    optKey: "With an API key",
    optKeyBadge: "Recommended — no install",
    optKeyDesc:
      "Get a key from a provider and paste it — ready in 5 minutes. Pay per use (DeepSeek is very cheap).",
    optOllama: "Free model on my computer (Ollama)",
    optOllamaBadge: "Recommended — completely free",
    optOllamaDesc:
      "Install Ollama and download a model. No account, no cost; mid-strength but sufficient.",
    optSub: "With my existing subscription (Claude / ChatGPT / Copilot / Gemini)",
    optSubDesc:
      "You run a small bridge program on your computer; requests go through your own subscription.",
    optSkip: "Continue without connecting for now",
    optSkipDesc:
      "Already-generated content keeps working; new lesson/chat generation stays off.",
    back: "← Back",
    keyTitle: "Which provider do you have (or will get) a key from?",
    keyGet: "Get a key here:",
    keyPaste: "Paste your key here",
    ollamaStep1: "1. Install Ollama:",
    ollamaStep1Link: "ollama.com/download",
    ollamaStep2: "2. Open a terminal (PowerShell on Windows) and pull the models:",
    ollamaStep3:
      "3. This site connects to Ollama from your browser — to allow it:",
    ollamaStep3Restart: "then quit and restart Ollama.",
    ollamaLocalNote:
      "You're on localhost — no extra permission needed, just keep Ollama running.",
    subTitle: "Which subscription do you have?",
    subClaudeWebWarn:
      "Note: a claude.ai web subscription alone CANNOT be used here — you need the Claude Code CLI installed on your computer (your subscription works through it). If you don't want a CLI, the API-key path is easier.",
    subStep1: (cli: string) => `1. Install ${cli} if you don't have it:`,
    subStep2: (cli: string) =>
      `2. Run ${cli} once and sign in with your account.`,
    subStep3: "3. Start the bridge (keep the terminal open):",
    subNodeNote: "The bridge needs Node.js:",
    subKeepOpen:
      "While the bridge runs, the app generates through your subscription. Closing the terminal stops it.",
    safariWarn:
      "Safari blocks the site from reaching a server on your computer — use Chrome, Edge, or Firefox.",
    copy: "Copy",
    copied: "✅",
    testSave: "Test connection & save",
    testing: "Testing...",
    testOk: "✅ Connected and saved!",
    testFail: "❌ Could not connect:",
    done: "Done",
    osMac: "macOS",
    osWin: "Windows",
    osLinux: "Linux",
  },
};

type Path = "choose" | "key" | "ollama" | "sub";
type Os = "mac" | "win" | "linux";
type KeyProvider = "deepseek" | "openai" | "openrouter" | "anthropic";
type SubBackend = "claude" | "codex" | "copilot" | "gemini";

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
  anthropic: { label: "Anthropic (Claude)", keyUrl: "https://console.anthropic.com/settings/keys" },
  openai: { label: "OpenAI", keyUrl: "https://platform.openai.com/api-keys" },
  openrouter: { label: "OpenRouter", keyUrl: "https://openrouter.ai/settings/keys" },
};

const SUB_BACKENDS: Record<
  SubBackend,
  {
    label: string;
    cli: string;
    install: Record<Os, string>;
    models: { fast: string; balanced: string; deep: string };
  }
> = {
  claude: {
    label: "Claude (Max/Pro)",
    cli: "claude",
    install: {
      mac: "curl -fsSL https://claude.ai/install.sh | bash",
      linux: "curl -fsSL https://claude.ai/install.sh | bash",
      win: "irm https://claude.ai/install.ps1 | iex",
    },
    models: { fast: "haiku", balanced: "sonnet", deep: "opus" },
  },
  codex: {
    label: "ChatGPT (Plus/Pro)",
    cli: "codex",
    install: {
      mac: "npm install -g @openai/codex",
      linux: "npm install -g @openai/codex",
      win: "npm install -g @openai/codex",
    },
    models: { fast: "", balanced: "", deep: "" },
  },
  copilot: {
    label: "GitHub Copilot",
    cli: "copilot",
    install: {
      mac: "npm install -g @github/copilot",
      linux: "npm install -g @github/copilot",
      win: "npm install -g @github/copilot",
    },
    models: { fast: "", balanced: "", deep: "" },
  },
  gemini: {
    label: "Google Gemini",
    cli: "gemini",
    install: {
      mac: "npm install -g @google/gemini-cli",
      linux: "npm install -g @google/gemini-cli",
      win: "npm install -g @google/gemini-cli",
    },
    models: { fast: "", balanced: "", deep: "" },
  },
};

function CmdBlock({ cmd, copyLabel, copiedLabel }: { cmd: string; copyLabel: string; copiedLabel: string }) {
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

function OsTabs({ os, setOs, t }: { os: Os; setOs: (o: Os) => void; t: (typeof S)["tr"] }) {
  const labels: Record<Os, string> = { mac: t.osMac, win: t.osWin, linux: t.osLinux };
  return (
    <div className="flex gap-1">
      {(["mac", "win", "linux"] as const).map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => setOs(o)}
          className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
            os === o ? "bg-accent-soft" : "bg-surface-2 text-ink-soft hover:bg-accent-soft/40"
          }`}
        >
          {labels[o]}
        </button>
      ))}
    </div>
  );
}

export function LlmSetupWizard({ onDone }: { onDone: () => void }) {
  const t = useStrings(S);
  const [path, setPath] = useState<Path>("choose");
  const [os, setOs] = useState<Os>(detectOs);
  const [keyProvider, setKeyProvider] = useState<KeyProvider>("deepseek");
  const [apiKey, setApiKey] = useState("");
  const [subBackend, setSubBackend] = useState<SubBackend>("claude");
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState<string | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const isLocalOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  const isSafari =
    typeof navigator !== "undefined" &&
    /Safari/i.test(navigator.userAgent) &&
    !/Chrome|Chromium|Edg/i.test(navigator.userAgent);

  // Köprü scripti statik sitede kökten servis edilir; server modda repo scripti.
  const bridgeCmd = useMemo(() => {
    const backendFlag = subBackend === "claude" ? "" : ` --backend ${subBackend}`;
    const originFlag = isLocalOrigin ? "" : ` --origin ${origin}`;
    if (!IS_STATIC)
      return `npm run llm:bridge${backendFlag ? ` --${backendFlag}` : ""}`;
    const url = `${origin}${BASE_PATH}/llm-bridge.mjs`;
    return os === "win"
      ? `iwr ${url} -OutFile llm-bridge.mjs; node llm-bridge.mjs${backendFlag}${originFlag}`
      : `curl -fsSL ${url} -o llm-bridge.mjs && node llm-bridge.mjs${backendFlag}${originFlag}`;
  }, [subBackend, os, origin, isLocalOrigin]);

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

  const keyNote = KEY_PROVIDERS[keyProvider].note;
  const keyNoteText = keyNote ? (t === S.en ? keyNote.en : keyNote.tr) : null;

  const choiceCard = (
    onClick: () => void,
    label: string,
    desc: string,
    badge?: string
  ) => (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border-2 border-surface-2 bg-background px-4 py-3 text-left transition-colors hover:border-accent-soft"
    >
      <span className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">{label}</span>
        {badge && (
          <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold">
            {badge}
          </span>
        )}
      </span>
      <span className="mt-0.5 block text-xs text-ink-soft">{desc}</span>
    </button>
  );

  return (
    <section className="rounded-cozy bg-surface p-6 shadow-cozy">
      <h2 className="mb-1 font-semibold">{t.title}</h2>

      {path === "choose" && (
        <>
          <p className="mb-4 text-sm text-ink-soft">{t.intro}</p>
          <div className="flex flex-col gap-2">
            {choiceCard(() => { setTestMsg(null); setPath("key"); }, t.optKey, t.optKeyDesc, t.optKeyBadge)}
            {choiceCard(() => { setTestMsg(null); setPath("ollama"); }, t.optOllama, t.optOllamaDesc, t.optOllamaBadge)}
            {choiceCard(() => { setTestMsg(null); setPath("sub"); }, t.optSub, t.optSubDesc)}
            {choiceCard(onDone, t.optSkip, t.optSkipDesc)}
          </div>
        </>
      )}

      {path !== "choose" && (
        <button
          type="button"
          onClick={() => { setTestMsg(null); setPath("choose"); }}
          className="mb-3 text-xs font-semibold text-ink-soft hover:text-ink"
        >
          {t.back}
        </button>
      )}

      {path === "key" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold">{t.keyTitle}</p>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(KEY_PROVIDERS) as KeyProvider[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setKeyProvider(p)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  keyProvider === p
                    ? "bg-accent-soft"
                    : "bg-surface-2 text-ink-soft hover:bg-accent-soft/40"
                }`}
              >
                {KEY_PROVIDERS[p].label}
              </button>
            ))}
          </div>
          {keyNoteText && <p className="text-xs text-ink-soft">{keyNoteText}</p>}
          <p className="text-sm">
            {t.keyGet}{" "}
            <a
              href={KEY_PROVIDERS[keyProvider].keyUrl}
              target="_blank"
              rel="noreferrer"
              className="font-semibold underline"
            >
              {KEY_PROVIDERS[keyProvider].keyUrl.replace("https://", "")}
            </a>
          </p>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={t.keyPaste}
            className="w-full rounded-xl border-2 border-surface-2 bg-background px-3 py-2 font-mono text-xs outline-none focus:border-accent"
          />
          <WizardTestRow
            t={t}
            testing={testing}
            testMsg={testMsg}
            succeeded={succeeded}
            onDone={onDone}
            disabled={!apiKey}
            onTest={() =>
              testAndSave(
                keyProvider === "anthropic"
                  ? {
                      mode: "anthropic",
                      apiKey,
                      models: {
                        fast: "claude-haiku-4-5",
                        balanced: "claude-sonnet-4-6",
                        deep: "claude-opus-4-6",
                      },
                    }
                  : {
                      mode: "openai",
                      baseUrl: PRESETS[keyProvider].baseUrl,
                      apiKey,
                      models: PRESETS[keyProvider].models,
                      jsonMode: PRESETS[keyProvider].jsonMode,
                    }
              )
            }
          />
        </div>
      )}

      {path === "ollama" && (
        <div className="flex flex-col gap-3 text-sm">
          <p>
            {t.ollamaStep1}{" "}
            <a
              href="https://ollama.com/download"
              target="_blank"
              rel="noreferrer"
              className="font-semibold underline"
            >
              {t.ollamaStep1Link}
            </a>
          </p>
          <p>{t.ollamaStep2}</p>
          <CmdBlock
            cmd="ollama pull llama3.2 && ollama pull llama3.1"
            copyLabel={t.copy}
            copiedLabel={t.copied}
          />
          {isLocalOrigin ? (
            <p className="text-xs text-ink-soft">{t.ollamaLocalNote}</p>
          ) : (
            <>
              <p>{t.ollamaStep3}</p>
              <OsTabs os={os} setOs={setOs} t={t} />
              <CmdBlock cmd={ollamaCorsCmd[os]} copyLabel={t.copy} copiedLabel={t.copied} />
              {os !== "linux" && <p className="text-xs text-ink-soft">{t.ollamaStep3Restart}</p>}
            </>
          )}
          {isSafari && <p className="text-xs font-semibold text-danger">{t.safariWarn}</p>}
          <WizardTestRow
            t={t}
            testing={testing}
            testMsg={testMsg}
            succeeded={succeeded}
            onDone={onDone}
            onTest={() =>
              testAndSave({
                mode: "openai",
                baseUrl: PRESETS.ollama.baseUrl,
                models: { fast: "llama3.2", balanced: "llama3.1", deep: "llama3.1" },
                jsonMode: true,
              })
            }
          />
        </div>
      )}

      {path === "sub" && (
        <div className="flex flex-col gap-3 text-sm">
          <p className="font-semibold">{t.subTitle}</p>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(SUB_BACKENDS) as SubBackend[]).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setSubBackend(b)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  subBackend === b
                    ? "bg-accent-soft"
                    : "bg-surface-2 text-ink-soft hover:bg-accent-soft/40"
                }`}
              >
                {SUB_BACKENDS[b].label}
              </button>
            ))}
          </div>
          {subBackend === "claude" && (
            <p className="rounded-xl bg-surface-2 px-3 py-2 text-xs">{t.subClaudeWebWarn}</p>
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
          <p className="text-xs text-ink-soft">
            {t.subNodeNote}{" "}
            <a href="https://nodejs.org" target="_blank" rel="noreferrer" className="underline">
              nodejs.org
            </a>
            {" — "}
            {t.subKeepOpen}
          </p>
          {isSafari && <p className="text-xs font-semibold text-danger">{t.safariWarn}</p>}
          <WizardTestRow
            t={t}
            testing={testing}
            testMsg={testMsg}
            succeeded={succeeded}
            onDone={onDone}
            onTest={() =>
              testAndSave({
                mode: "openai",
                baseUrl: PRESETS.bridge.baseUrl,
                models: SUB_BACKENDS[subBackend].models,
                jsonMode: false,
              })
            }
          />
        </div>
      )}
    </section>
  );
}

function WizardTestRow({
  t,
  testing,
  testMsg,
  succeeded,
  onTest,
  onDone,
  disabled,
}: {
  t: (typeof S)["tr"];
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
