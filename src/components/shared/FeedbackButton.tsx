"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useStrings } from "@/lib/i18n/use-strings";
import { useProfileMeta } from "@/lib/use-profile-meta";
import { IS_STATIC } from "@/lib/client-api";
import { CozyButton } from "./CozyButton";

const REPO_URL = "https://github.com/burakbilgehan/language-tutor";
// Cloudflare Worker proxy (workers/feedback): files the issue anonymously —
// no GitHub account needed, screenshot attached automatically. Env var only
// overrides (e.g. wrangler dev); set it to "off" to force the prefill flow.
const FEEDBACK_ENDPOINT =
  process.env.NEXT_PUBLIC_FEEDBACK_URL === "off"
    ? ""
    : process.env.NEXT_PUBLIC_FEEDBACK_URL ||
      "https://kumo-feedback.burakbilgehan-p.workers.dev";

const S = {
  tr: {
    open: "Geri bildirim gönder",
    title: "Geri bildirim",
    kindBug: "Sorun bildir",
    kindIdea: "Öneri",
    titleLabel: "Başlık",
    titlePlaceholder: "Kısa özet (boş bırakılabilir)",
    descLabel: "Anlat",
    descPlaceholderBug:
      "Ne oldu? Ne bekliyordun? Adım adım yazarsan daha hızlı çözülür.",
    descPlaceholderIdea: "Ne eksik, ne daha iyi olabilir?",
    shotTake: "Ekran görüntüsü çek",
    shotRetake: "Yeniden çek",
    shotBusy: "Çekiliyor…",
    shotAttached: "Görüntü rapora otomatik eklenecek.",
    shotCopied:
      "Panoya kopyalandı — issue açılınca metin kutusuna yapıştır (⌘V / Ctrl+V).",
    shotDownloaded:
      "Pano desteklenmedi, PNG indirildi — issue'ya sürükleyip bırakabilirsin.",
    shotError: "Ekran görüntüsü alınamadı.",
    settingsWarn:
      "Ayarlar sayfasındasın — görüntüde API anahtarı gibi kişisel bilgi kalmadığından emin ol.",
    send: "Gönder",
    sendBusy: "Gönderiliyor…",
    sentMsg: "Alındı, teşekkürler! 🙏",
    sentView: "Kaydı görüntüle",
    sendError: "Gönderilemedi. GitHub üzerinden açmayı deneyebilirsin:",
    submitGh: "GitHub'da issue aç",
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
    titleLabel: "Title",
    titlePlaceholder: "Short summary (optional)",
    descLabel: "Describe",
    descPlaceholderBug:
      "What happened? What did you expect? Step-by-step helps a lot.",
    descPlaceholderIdea: "What's missing, what could be better?",
    shotTake: "Capture screenshot",
    shotRetake: "Retake",
    shotBusy: "Capturing…",
    shotAttached: "The capture will be attached to the report automatically.",
    shotCopied:
      "Copied to clipboard — paste it into the issue box (⌘V / Ctrl+V).",
    shotDownloaded:
      "Clipboard unavailable, PNG downloaded — drag it into the issue instead.",
    shotError: "Screenshot failed.",
    settingsWarn:
      "You're on the settings page — make sure the capture shows no personal info like API keys.",
    send: "Send",
    sendBusy: "Sending…",
    sentMsg: "Received, thank you! 🙏",
    sentView: "View the report",
    sendError: "Sending failed. You can try opening it on GitHub instead:",
    submitGh: "Open a GitHub issue",
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
type ShotState = "idle" | "busy" | "ready" | "copied" | "downloaded" | "error";
type SendState = "idle" | "busy" | "sent" | "error";

/**
 * Global feedback entry (T-017). Two transports:
 * - FEEDBACK_ENDPOINT set → anonymous POST to the Cloudflare Worker proxy,
 *   which files the issue with the owner's token and uploads the screenshot.
 * - unset → prefilled GitHub issue URL; screenshot goes to the clipboard
 *   (html2canvas-pro; classic html2canvas chokes on the color-mix()/oklch
 *   values Tailwind 4 emits) and the user pastes it in.
 */
export function FeedbackButton() {
  const t = useStrings(S);
  const pathname = usePathname();
  const lang = useProfileMeta()?.targetLanguage ?? "?";

  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("bug");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [shot, setShot] = useState<ShotState>("idle");
  const [send, setSend] = useState<SendState>("idle");
  const [sentUrl, setSentUrl] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function reset() {
    setTitle("");
    setDesc("");
    setShot("idle");
    setSend("idle");
    setPreview(null);
    canvasRef.current = null;
  }

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
      canvasRef.current = canvas;
      setPreview(canvas.toDataURL("image/jpeg", 0.7));

      if (FEEDBACK_ENDPOINT) {
        // The worker uploads it — nothing else to do client-side.
        setShot("ready");
        return;
      }
      // Fallback transport: hand the image to the user via clipboard.
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("toBlob"))),
          "image/png",
        ),
      );
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        setShot("copied");
      } catch {
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

  async function submitViaWorker() {
    setSend("busy");
    try {
      const res = await fetch(FEEDBACK_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          title: title.trim() || undefined,
          desc: desc.trim(),
          page: pathname,
          mode: IS_STATIC ? "static" : "server",
          lang,
          ua: navigator.userAgent,
          screenshot:
            canvasRef.current?.toDataURL("image/jpeg", 0.85) ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? res.status);
      setSentUrl(typeof data.url === "string" ? data.url : null);
      setSend("sent");
    } catch {
      setSend("error");
    }
  }

  function openPrefilledIssue() {
    const meta = [
      `${t.bodyKind[kind]}`,
      `${t.bodyPage}: ${pathname}`,
      `${t.bodyMode}: ${IS_STATIC ? "static" : "server"}`,
      `${t.bodyLang}: ${lang}`,
      `${t.bodyBrowser}: ${navigator.userAgent}`,
    ].join(" · ");
    const body = `${desc.trim()}\n\n---\n${meta}\n`;
    const issueTitle = `${t.titlePrefix[kind]} ${title.trim() || pathname}`;
    const url =
      `${REPO_URL}/issues/new?labels=feedback` +
      `&title=${encodeURIComponent(issueTitle)}&body=${encodeURIComponent(body)}`;
    window.open(url, "_blank", "noopener");
    setOpen(false);
    reset();
  }

  const shotMsg = {
    idle: null,
    busy: t.shotBusy,
    ready: t.shotAttached,
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

            {send === "sent" ? (
              <div className="flex flex-col items-start gap-2">
                <p className="text-sm">{t.sentMsg}</p>
                {sentUrl && (
                  <a
                    href={sentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-accent underline"
                  >
                    {t.sentView}
                  </a>
                )}
                <CozyButton
                  variant="soft"
                  className="mt-1 !px-4 !py-2 text-sm"
                  onClick={() => {
                    setOpen(false);
                    reset();
                  }}
                >
                  {t.close}
                </CozyButton>
              </div>
            ) : (
              <>
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
                  {t.titleLabel.toUpperCase()}
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t.titlePlaceholder}
                  maxLength={120}
                  className="mb-3 w-full rounded-cozy bg-background p-3 text-sm outline-none placeholder:text-ink-soft/60"
                />

                <label className="mb-1 block text-xs font-semibold tracking-wider text-accent">
                  {t.descLabel.toUpperCase()}
                </label>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder={
                    kind === "bug" ? t.descPlaceholderBug : t.descPlaceholderIdea
                  }
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
                        📸 {preview ? t.shotRetake : t.shotTake}
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

                {FEEDBACK_ENDPOINT ? (
                  <>
                    <CozyButton
                      className="w-full !py-2.5 text-sm"
                      disabled={!desc.trim() || send === "busy"}
                      onClick={submitViaWorker}
                    >
                      {send === "busy" ? t.sendBusy : t.send}
                    </CozyButton>
                    {send === "error" && (
                      <div className="mt-2 text-xs text-danger">
                        {t.sendError}{" "}
                        <button
                          type="button"
                          onClick={openPrefilledIssue}
                          className="font-semibold underline"
                        >
                          {t.submitGh}
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <CozyButton
                      className="w-full !py-2.5 text-sm"
                      disabled={!desc.trim()}
                      onClick={openPrefilledIssue}
                    >
                      {t.submitGh}
                    </CozyButton>
                    <p className="mt-2 text-xs text-ink-soft">{t.ghNote}</p>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
