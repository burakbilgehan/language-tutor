"use client";

// T-048 Settings surface for the cloud account (T-046 identity + T-047 sync).
// STATIC MODE ONLY, mirroring BackupSection: server mode's save already lives
// on disk with its own .bak, and there is no Worker session there.
//
// Sits next to the Drive section deliberately, not instead of it — Drive is the
// anonymous local-first backup and stays the default; this is the signed-in
// alternative. Same UX idioms as Drive: an override field for non-default
// deployments, confirm dialogs before anything destructive, inline result
// messages rather than a toast system the app does not have.

import { useCallback, useEffect, useState } from "react";
import { CozyButton } from "@/components/shared/CozyButton";
import { CloudWarnings } from "@/components/shared/CloudWarnings";
import { IS_STATIC, cloudInfo, cloudPull, cloudPush } from "@/lib/client-api";
import { useStrings } from "@/lib/i18n/use-strings";
import { useProfileMeta } from "@/lib/use-profile-meta";
import { describeCloudError, type CloudErrorKind } from "@/lib/cloud-error";
import {
  signOut,
  startGoogleSignIn,
  useAuthStatus,
} from "@/lib/auth-status";
import { readCloudApiBase, writeCloudApiBase } from "@/lib/backup/cloud";
import { withBase } from "@/lib/base-path";
import type { UnreconstitutedRow } from "@/lib/save/seed-strip";

const S = {
  tr: {
    title: "Bulut Hesabı",
    desc: "Google hesabınla giriş yap, kaydını buluta gönder ve başka bir cihazda geri getir. Giriş yapmak zorunlu değil — uygulama girişsiz de tam çalışır.",
    signIn: "Google ile giriş yap",
    signingIn: "Yönlendiriliyor…",
    signInFailed: "Giriş başlatılamadı.",
    signOut: "Çıkış yap",
    signedInAs: "Giriş yapıldı:",
    checking: "Kontrol ediliyor…",
    push: "⬆️ Buluta gönder",
    pushing: "Gönderiliyor…",
    pull: "⬇️ Buluttan getir",
    pulling: "Getiriliyor…",
    refresh: "Yenile",
    cloudState: "Buluttaki kayıt",
    // Deliberately hedged: getCloudInfo() reports `exists: false` for any
    // non-OK HEAD, so "no save" and "could not reach the service" are
    // indistinguishable here. Asserting absence would be a guess.
    noCloudSave: "Buluttan kayıt bilgisi alınamadı (henüz gönderilmemiş olabilir).",
    lastSync: (when: string) => `Son gönderim: ${when}`,
    pushConfirm:
      "Buluttaki kaydın bu cihazdaki kayıtla değiştirilecek. Devam edilsin mi?",
    pullConfirm:
      "Bu, bu cihazdaki TÜM ilerlemeyi silip buluttaki kayıtla değiştirir. Emin misin?",
    pushDone: (mb: string, orig: string) =>
      `✅ Gönderildi (${mb} MB — ${orig} MB'lık kayıttan sıkıştırıldı).`,
    pullDone: "✅ Getirildi.",
    errNotSignedIn: "❌ Oturum kapanmış görünüyor. Tekrar giriş yap.",
    errLocalEmpty:
      "❌ Bu cihazdaki kayıt boş görünüyor — üzerine yazmamak için gönderim durduruldu. Önce buluttan getirmek ister misin?",
    errTooLarge:
      "❌ Kayıt bulut senkronu için fazla büyük (üst sınır 30 MB). Kaydın sağlam — yalnız yüklenemiyor.",
    errUnavailable:
      "❌ Bulut servisine şu an ulaşılamadı ya da buluta henüz kayıt gönderilmemiş. Yerel kaydın etkilenmedi.",
    errVersion: (file: string, app: string) =>
      `❌ Buluttaki kaydın sürümü uyumsuz (bulut: v${file}, uygulama: v${app}). İki cihazda da aynı uygulama sürümü olmalı.`,
    errUnknown: "❌ Bir şeyler ters gitti.",
    pullShortcut: "Buluttan getir",
    advanced: "Gelişmiş: API adresi",
    apiBaseLabel: "API adresi (boş = bu sitenin kendi adresi)",
    apiBasePlaceholder: "http://localhost:8787",
    apiBaseHelp:
      "Normalde boş bırak. Yalnız iki durumda gerekir: yerel geliştirmede (site :3000, Worker :8787) ve bu site bulut backend'ini barındırmayan bir aynadaysa.",
    save: "Kaydet",
    saved: "Kaydedildi",
  },
  en: {
    title: "Cloud Account",
    desc: "Sign in with your Google account to send your save to the cloud and restore it on another device. Signing in is optional — the app works fully without it.",
    signIn: "Sign in with Google",
    signingIn: "Redirecting…",
    signInFailed: "Could not start sign-in.",
    signOut: "Sign out",
    signedInAs: "Signed in as:",
    checking: "Checking…",
    push: "⬆️ Send to cloud",
    pushing: "Sending…",
    pull: "⬇️ Get from cloud",
    pulling: "Restoring…",
    refresh: "Refresh",
    cloudState: "Save in the cloud",
    noCloudSave: "Could not read cloud save info (it may not have been sent yet).",
    lastSync: (when: string) => `Last upload: ${when}`,
    pushConfirm:
      "Your cloud save will be replaced with the save on this device. Continue?",
    pullConfirm:
      "This will erase ALL progress on this device and replace it with the cloud save. Are you sure?",
    pushDone: (mb: string, orig: string) =>
      `✅ Sent (${mb} MB — compressed from a ${orig} MB save).`,
    pullDone: "✅ Restored.",
    errNotSignedIn: "❌ Your session seems to have expired. Sign in again.",
    errLocalEmpty:
      "❌ The save on this device looks empty — the upload was stopped so it would not overwrite your cloud save. Would you like to restore from the cloud first?",
    errTooLarge:
      "❌ The save is too large for cloud sync (30 MB cap). Your save is fine — it just cannot be uploaded.",
    errUnavailable:
      "❌ The cloud service could not be reached, or no save has been sent yet. Your local save is unaffected.",
    errVersion: (file: string, app: string) =>
      `❌ The cloud save's version does not match (cloud: v${file}, app: v${app}). Both devices need the same app version.`,
    errUnknown: "❌ Something went wrong.",
    pullShortcut: "Get from cloud",
    advanced: "Advanced: API address",
    apiBaseLabel: "API address (empty = this site's own address)",
    apiBasePlaceholder: "http://localhost:8787",
    apiBaseHelp:
      "Normally leave this empty. It is only needed in two cases: local development (site on :3000, Worker on :8787) and when this site is a mirror that does not host the cloud backend.",
    save: "Save",
    saved: "Saved",
  },
};

function mb(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(1);
}

export function CloudAccountSection() {
  const t = useStrings(S);
  const meta = useProfileMeta();
  const uiLanguage = meta?.uiLanguage === "en" ? "en" : "tr";
  const auth = useAuthStatus();

  const [apiBase, setApiBase] = useState("");
  const [apiSaved, setApiSaved] = useState(false);
  const [busy, setBusy] = useState<"push" | "pull" | "signin" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  // `local_empty` is the one error with an action attached (pull instead of
  // push), so the kind is kept alongside the message rather than only rendered.
  const [errKind, setErrKind] = useState<CloudErrorKind | null>(null);
  const [warnings, setWarnings] = useState<UnreconstitutedRow[]>([]);
  const [info, setInfo] = useState<{
    exists: boolean;
    updatedAt: string | null;
  } | null>(null);

  useEffect(() => {
    if (!IS_STATIC) return;
    setApiBase(readCloudApiBase());
  }, []);

  const loadInfo = useCallback(async () => {
    if (!auth.user) {
      setInfo(null);
      return;
    }
    try {
      const i = await cloudInfo();
      setInfo({ exists: i.exists, updatedAt: i.updatedAt });
    } catch {
      setInfo(null);
    }
  }, [auth.user]);

  useEffect(() => {
    void loadInfo();
  }, [loadInfo]);

  const showError = useCallback(
    (err: unknown) => {
      const { kind, params } = describeCloudError(err);
      setErrKind(kind);
      setMsg(
        kind === "not_signed_in"
          ? t.errNotSignedIn
          : kind === "local_empty"
            ? t.errLocalEmpty
            : kind === "too_large"
              ? t.errTooLarge
              : kind === "unavailable"
                ? t.errUnavailable
                : kind === "version_mismatch"
                  ? t.errVersion(String(params?.file ?? "?"), String(params?.app ?? "?"))
                  : t.errUnknown
      );
      // A stale cookie must not leave the UI claiming a session.
      if (kind === "not_signed_in") auth.reload();
    },
    [t, auth]
  );

  const onSignIn = async () => {
    setBusy("signin");
    setMsg(null);
    setErrKind(null);
    try {
      // Absolute URL: with an API-base override the Worker would otherwise
      // resolve a relative path against ITS own origin, landing the user on the
      // backend instead of the app.
      await startGoogleSignIn(
        `${window.location.origin}${withBase("/settings")}`
      );
    } catch {
      setMsg(`❌ ${t.signInFailed}`);
      setBusy(null);
    }
  };

  const onSignOut = async () => {
    await signOut();
    setInfo(null);
    setMsg(null);
    setErrKind(null);
    auth.reload();
  };

  const onPush = async () => {
    if (!window.confirm(t.pushConfirm)) return;
    setBusy("push");
    setMsg(null);
    setErrKind(null);
    try {
      const r = await cloudPush();
      setMsg(t.pushDone(mb(r.bytes), mb(r.originalBytes)));
      await loadInfo();
    } catch (err) {
      showError(err);
    } finally {
      setBusy(null);
    }
  };

  const onPull = useCallback(async () => {
    // Same confirmation weight as the file-import flow: a pull is replace-all.
    if (!window.confirm(t.pullConfirm)) return;
    setBusy("pull");
    setMsg(null);
    setErrKind(null);
    setWarnings([]);
    try {
      const r = await cloudPull();
      setMsg(t.pullDone);
      // Kept in section state until dismissed — NOT navigated away from, so
      // seed-drift losses stay readable.
      setWarnings(r.warnings);
      await loadInfo();
    } catch (err) {
      showError(err);
    } finally {
      setBusy(null);
    }
  }, [t, loadInfo, showError]);

  const onSaveApiBase = () => {
    writeCloudApiBase(apiBase.trim() || null);
    setApiSaved(true);
    auth.reload();
  };

  // Server mode: no Worker, no session, nothing to render.
  if (!IS_STATIC) return null;
  // Anonymous-only deployment (the GitHub Pages mirror, or no backend
  // configured): the entire login/cloud surface stays invisible EXCEPT the
  // API-base override, which is the only way to point a mirror at a backend.
  const showAccount = auth.backendAvailable;

  return (
    <section className="rounded-cozy bg-surface p-6 shadow-cozy">
      <h2 className="mb-1 font-semibold">{t.title}</h2>
      <p className="mb-3 text-sm text-ink-soft">{t.desc}</p>

      {showAccount &&
        (auth.loading ? (
          <p className="text-sm text-ink-soft">{t.checking}</p>
        ) : auth.user ? (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm">
                <span className="text-ink-soft">{t.signedInAs}</span>{" "}
                <strong>{auth.user.email ?? auth.user.name ?? auth.user.id}</strong>
              </span>
              <CozyButton variant="ghost" onClick={() => void onSignOut()}>
                {t.signOut}
              </CozyButton>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <CozyButton
                variant="soft"
                onClick={() => void onPush()}
                disabled={busy !== null}
              >
                {busy === "push" ? t.pushing : t.push}
              </CozyButton>
              <CozyButton
                variant="soft"
                onClick={() => void onPull()}
                disabled={busy !== null}
              >
                {busy === "pull" ? t.pulling : t.pull}
              </CozyButton>
              <button
                type="button"
                onClick={() => void loadInfo()}
                className="text-xs font-medium text-ink-soft hover:text-ink"
              >
                {t.refresh}
              </button>
            </div>

            <p className="mt-3 text-xs text-ink-soft">
              <span className="font-semibold uppercase tracking-wider">
                {t.cloudState}
              </span>{" "}
              —{" "}
              {info?.exists && info.updatedAt
                ? t.lastSync(new Date(info.updatedAt).toLocaleString())
                : t.noCloudSave}
            </p>
          </>
        ) : (
          <CozyButton onClick={() => void onSignIn()} disabled={busy === "signin"}>
            {busy === "signin" ? t.signingIn : t.signIn}
          </CozyButton>
        ))}

      {msg && (
        <div className="mt-3">
          <p className="text-sm">{msg}</p>
          {/* The one error with a remedy attached. */}
          {errKind === "local_empty" && (
            <button
              type="button"
              onClick={() => void onPull()}
              className="mt-2 rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold transition-colors hover:bg-surface"
            >
              {t.pullShortcut}
            </button>
          )}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="mt-4">
          <CloudWarnings
            rows={warnings}
            uiLanguage={uiLanguage}
            onDismiss={() => setWarnings([])}
          />
        </div>
      )}

      <details className="mt-4 rounded-lg bg-background px-3 py-2">
        <summary className="cursor-pointer text-xs font-medium text-ink-soft">
          {t.advanced}
        </summary>
        <label className="mt-2 mb-1 block text-sm font-medium">
          {t.apiBaseLabel}
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={apiBase}
            onChange={(e) => {
              setApiBase(e.target.value);
              setApiSaved(false);
            }}
            placeholder={t.apiBasePlaceholder}
            className="min-w-0 flex-1 rounded-lg border border-surface-2 bg-background px-3 py-2 text-sm"
          />
          <CozyButton variant="soft" onClick={onSaveApiBase}>
            {apiSaved ? t.saved : t.save}
          </CozyButton>
        </div>
        <p className="mt-2 text-xs text-ink-soft">{t.apiBaseHelp}</p>
      </details>
    </section>
  );
}
