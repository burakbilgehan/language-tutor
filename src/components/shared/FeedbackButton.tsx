"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useStrings } from "@/lib/i18n/use-strings";
import { useProfileMeta } from "@/lib/use-profile-meta";
import { IS_STATIC } from "@/lib/client-api";
import { CozyButton } from "./CozyButton";

const REPO_URL = "https://github.com/burakbilgehan/language-tutor";

const S = {
  tr: {
    open: "Geri bildirim gönder",
    title: "Geri bildirim",
    kindBug: "Sorun bildir",
    kindIdea: "Öneri",
    descLabel: "Anlat",
    descPlaceholderBug:
      "Ne oldu? Ne bekliyordun? Adım adım yazarsan daha hızlı çözülür.",
    descPlaceholderIdea: "Ne eksik, ne daha iyi olabilir?",
    shotTake: "Ekran görüntüsü çek",
    shotBusy: "Çekiliyor…",
    shotCopied: "Panoya kopyalandı — issue açılınca metin kutusuna yapıştır (⌘V / Ctrl+V).",
    shotDownloaded:
      "Pano desteklenmedi, PNG indirildi — issue'ya sürükleyip bırakabilirsin.",
    shotError: "Ekran görüntüsü alınamadı.",
    settingsWarn:
      "Ayarlar sayfasındasın — görüntüde API anahtarı gibi kişisel bilgi kalmadığından emin ol.",
    submit: "GitHub'da issue aç",
    ghNote:
      "Gönderim GitHub üzerinden yapılır (hesap gerektirir). Form açılınca içerik hazır gelir, sadece Submit'e basman yeterli.",
    close: "Kapat",
    bodyKind: { bug: "Sorun", idea: "Öneri" },
    bodyPage: "Sayfa",
    bodyMode: "Mod",
    bodyLang: "Dil",
    bodyBrowser: "Tarayıcı",
    titlePrefix: { bug: "[Sorun]", idea: "[Öneri]" },
  },
  en: {
    open: "Send feedback",
    title: "Feedback",
    kindBug: "Report a problem",
    kindIdea: "Suggestion",
    descLabel: "Describe",
    descPlaceholderBug:
      "What happened? What did you expect? Step-by-step helps a lot.",
    descPlaceholderIdea: "What's missing, what could be better?",
    shotTake: "Capture screenshot",
    shotBusy: "Capturing…",
    shotCopied: "Copied to clipboard — paste it into the issue box (⌘V / Ctrl+V).",
    shotDownloaded:
      "Clipboard unavailable, PNG downloaded — drag it into the issue instead.",
    shotError: "Screenshot failed.",
    settingsWarn:
      "You're on the settings page — make sure the capture shows no personal info like API keys.",
    submit: "Open a GitHub issue",
    ghNote:
      "Feedback goes through GitHub (account required). The form opens pre-filled — just hit Submit.",
    close: "Close",
    bodyKind: { bug: "Problem", idea: "Suggestion" },
    bodyPage: "Page",
    bodyMode: "Mode",
    bodyLang: "Language",
    bodyBrowser: "Browser",
    titlePrefix: { bug: "[Bug]", idea: "[Idea]" },
  },
};

type Kind = "bug" | "idea";
type ShotState = "idle" | "busy" | "copied" | "downloaded" | "error";

/**
 * Global feedback entry (T-017). Static-deploy friendly: no backend —
 * feedback lands as a prefilled GitHub issue the user submits themselves.
 * Screenshots can't ride the URL, so we capture the viewport to the
 * clipboard (html2canvas-pro; classic html2canvas chokes on the
 * color-mix()/oklch values Tailwind 4 emits) and the user pastes it in.
 */
export function FeedbackButton() {
  const t = useStrings(S);
  const pathname = usePathname();
  const lang = useProfileMeta()?.targetLanguage ?? "?";

  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("bug");
  const [desc, setDesc] = useState("");
  const [shot, setShot] = useState<ShotState>("idle");
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function capture() {
    setShot("busy");
    try {
      const html2canvas = (await import("html2canvas-pro")).default;
      const canvas = await html2canvas(document.body, {
        x: window.scrollX,
        y: window.scrollY,
        width: window.innerWidth,
        height: window.innerHeight,
        ignoreElements: (el) => el.hasAttribute("data-feedback-ignore"),
      });
      setPreview(canvas.toDataURL("image/png"));
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/png"),
      );
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        setShot("copied");
      } catch {
        // Clipboard image write unsupported (e.g. Firefox) → download instead.
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "kumo-feedback.png";
        a.click();
        URL.revokeObjectURL(a.href);
        setShot("downloaded");
      }
    } catch {
      setShot("error");
    }
  }

  function submit() {
    const meta = [
      `${t.bodyKind[kind]}`,
      `${t.bodyPage}: ${pathname}`,
      `${t.bodyMode}: ${IS_STATIC ? "static" : "server"}`,
      `${t.bodyLang}: ${lang}`,
      `${t.bodyBrowser}: ${navigator.userAgent}`,
    ].join(" · ");
    const body = `${desc.trim()}\n\n---\n${meta}\n`;
    const title = `${t.titlePrefix[kind]} ${desc.trim().slice(0, 60) || pathname}`;
    const url =
      `${REPO_URL}/issues/new?labels=feedback` +
      `&title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
    window.open(url, "_blank", "noopener");
    setOpen(false);
    setDesc("");
    setShot("idle");
    setPreview(null);
  }

  const shotMsg = {
    idle: null,
    busy: t.shotBusy,
    copied: t.shotCopied,
    downloaded: t.shotDownloaded,
    error: t.shotError,
  }[shot];

  return (
    <>
      <button
        type="button"
        title={t.open}
        data-feedback-ignore
        onClick={() => setOpen(true)}
        className="fixed bottom-5 left-5 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-lg shadow-cozy transition-transform hover:scale-105"
      >
        💬
      </button>
      {open && (
        <div
          data-feedback-ignore
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-cozy bg-surface p-5 shadow-cozy">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">{t.title}</h2>
              <button
                type="button"
                title={t.close}
                onClick={() => setOpen(false)}
                className="text-ink-soft hover:text-ink"
              >
                ✕
              </button>
            </div>

            <div className="mb-3 flex gap-2">
              {(["bug", "idea"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                    kind === k
                      ? "bg-accent text-surface"
                      : "bg-surface-2 text-ink-soft hover:text-ink"
                  }`}
                >
                  {k === "bug" ? t.kindBug : t.kindIdea}
                </button>
              ))}
            </div>

            <label className="mb-1 block text-xs font-semibold tracking-wider text-accent">
              {t.descLabel.toUpperCase()}
            </label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder={kind === "bug" ? t.descPlaceholderBug : t.descPlaceholderIdea}
              rows={4}
              className="mb-3 w-full resize-y rounded-cozy bg-background p-3 text-sm outline-none placeholder:text-ink-soft/60"
            />

            {kind === "bug" && (
              <div className="mb-3">
                <div className="flex items-center gap-3">
                  <CozyButton
                    variant="soft"
                    className="!px-4 !py-2 text-sm"
                    disabled={shot === "busy"}
                    onClick={capture}
                  >
                    📸 {t.shotTake}
                  </CozyButton>
                  {preview && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={preview}
                      alt=""
                      className="h-12 rounded border border-surface-2"
                    />
                  )}
                </div>
                {shotMsg && (
                  <p className="mt-2 text-xs text-ink-soft">{shotMsg}</p>
                )}
                {pathname === "/settings" && (
                  <p className="mt-2 text-xs font-semibold text-danger">
                    {t.settingsWarn}
                  </p>
                )}
              </div>
            )}

            <CozyButton
              className="w-full !py-2.5 text-sm"
              disabled={!desc.trim()}
              onClick={submit}
            >
              {t.submit}
            </CozyButton>
            <p className="mt-2 text-xs text-ink-soft">{t.ghNote}</p>
          </div>
        </div>
      )}
    </>
  );
}
