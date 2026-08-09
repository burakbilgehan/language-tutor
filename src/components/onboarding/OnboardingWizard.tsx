"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { withBase } from "@/lib/base-path";
import { CozyButton } from "@/components/shared/CozyButton";
import { ChipGrid, ChoiceCard } from "@/components/shared/ProfileControls";
import { pick } from "@/lib/i18n";
import { localizeError } from "@/lib/i18n/errors";
import { resolveUiLang } from "@/lib/i18n/use-localize-error";
import { markVisited } from "@/lib/visited-flag";
import { requestCurriculumChain } from "@/lib/curriculum-chain";
import { resetProfileMeta } from "@/lib/use-profile-meta";
import {
  profileData,
  createProfileApi,
  saveImportApi,
  cloudInfo,
  cloudPull,
  cloudPush,
} from "@/lib/client-api";
import {
  fetchAuthStatus,
  startGoogleSignIn,
  useAuthStatus,
} from "@/lib/auth-status";
import { describeCloudError } from "@/lib/cloud-error";
import { CloudWarnings } from "@/components/shared/CloudWarnings";
import type { UnreconstitutedRow } from "@/lib/save/seed-strip";
import { useLlmStatus } from "@/lib/llm-status";
import { LlmSetupWizard } from "@/components/settings/LlmSetupWizard";
import { PromptCustomizer } from "@/components/curriculum/PromptCustomizer";
import {
  GOAL_OPTIONS,
  INTEREST_OPTIONS,
  LANGUAGES,
  languageLabel,
  levelsFor,
  minuteOptionsFor,
  NATIVE_LANGUAGES,
  optionLabel,
  type LanguageCode,
  type NativeLanguageCode,
  type SelfLevel,
} from "@/lib/profile-options";

interface Draft {
  targetLanguage: LanguageCode;
  nativeLanguage: NativeLanguageCode;
  uiLanguage: NativeLanguageCode;
  displayName: string;
  goals: string[];
  selfLevel: SelfLevel;
  minutesPerWeek: number;
  interests: string[];
  motivation: string;
}

const TOTAL_STEPS = 6;

// No profile exists yet during onboarding, so the copy follows the native
// language the user picks in step 0 (draft.uiLanguage) live, via pick().
const S = {
  tr: {
    introTitle: "Merhaba! 🌸",
    introSubtitle:
      "Ben Kumo — bu yolculukta yol arkadaşınım. Nasıl başlamak istersin?",
    setupTitle: "Yolculuğuna başla",
    setupDesc:
      "Birkaç soruyla seni tanıyayım; hedefine göre sana özel bir yol haritası çizeyim.",
    setupButton: "✨ Hadi başlayalım",
    loadTitle: "Kaydını geri yükle",
    loadDesc: "Daha önce indirdiğin bir kayıt dosyan varsa yükle, kaldığın yerden devam et.",
    loadButton: "📂 Dosya seç",
    loadingLabel: "Yükleniyor...",
    anonTitle: "Önce bir göz at",
    anonDesc:
      "Soruları atla — gramer ve sözlük kütüphanesi hemen açılsın. Ayrıntıları sonra Ayarlar'dan kişiselleştirebilirsin. Hangi dile bakıyoruz?",
    signInTitle: "Giriş yap",
    signInDesc:
      "Google hesabınla giriş yap, buluttaki kaydını bu cihaza getir. (Giriş isteğe bağlı — istemezsen anonim devam edebilirsin.)",
    signInButton: "🔑 Google ile giriş yap",
    signInStarting: "Yönlendiriliyor…",
    signInFailed: "Giriş başlatılamadı",
    returnTitle: "Hoş geldin!",
    returnChecking: "Buluttaki kaydın kontrol ediliyor…",
    returnFoundTitle: "Buluttaki kaydın bulundu",
    returnFoundDesc: (when: string) =>
      `Son gönderim: ${when}. Bu cihaza getirip kaldığın yerden devam edebilirsin.`,
    returnFoundNoDate:
      "Buluta gönderilmiş bir kaydın var. Bu cihaza getirip kaldığın yerden devam edebilirsin.",
    returnPull: "⬇️ Buluttan getir",
    returnPulling: "Getiriliyor…",
    returnNoneTitle: "Buluttan kayıt getirilemedi",
    returnNoneDesc:
      "Henüz buluta kayıt göndermemiş olabilirsin ya da servise şu an ulaşılamıyor. Yeni bir yolculuk başlatabilir, sonra ayarlardan kaydını buluta gönderebilirsin.",
    returnRetry: "Tekrar dene",
    returnContinue: "Devam et",
    returnPullConfirm:
      "Bu, bu cihazdaki mevcut ilerlemeyi silip buluttaki kayıtla değiştirir. Emin misin?",
    // T-049 fix 1: the return leg's third action — a signed-in user with no
    // cloud save but a save FILE in hand had no way forward but "start over".
    checkingAccount: "Hesap durumu kontrol ediliyor…",
    returnLoadFile: "📂 Kayıt dosyası yükle",
    returnLoadHint:
      "Elinde indirilmiş bir kayıt dosyası varsa buradan yükleyebilirsin.",
    // T-049 fix 2: the import→push bridge, shown after any successful import
    // while signed in. Inline and dismissible — never a window.confirm.
    pushOfferTitle: "Kayıt yüklendi ✅",
    pushOfferDesc:
      "Giriş yapmış durumdasın — bu kaydı buluta gönderip başka cihazlarda da kullanabilirsin.",
    pushOfferButton: "⬆️ Buluta gönder",
    pushOfferPushing: "Gönderiliyor…",
    pushOfferSkip: "Şimdilik geç",
    pushOfferDone: "✅ Buluta gönderildi.",
    pushErrLocalEmpty:
      "Bu cihazdaki kayıt boş görünüyor — üzerine yazmamak için gönderim durduruldu.",
    pushErrTooLarge:
      "Kayıt bulut senkronu için fazla büyük (üst sınır 30 MB). Kaydın sağlam — yalnız yüklenemiyor.",
    continueToApp: "Devam et",
    // T-049 fix 3: the intro's sign-in door, for an ALREADY signed-in user.
    signedInTitle: "Giriş yapıldı",
    signedInAs: (who: string) => `Hesabın: ${who}`,
    signedInDesc:
      "Buluttaki kaydını bu cihaza getirebilir ya da aşağıdan anonim olarak devam edebilirsin.",
    errNotSignedIn: "Oturum açılamadı. Tekrar giriş yapmayı dene.",
    errUnavailable:
      "Bulut servisine ulaşılamadı ya da buluta gönderilmiş bir kayıt yok.",
    errVersion: (file: string, app: string) =>
      `Buluttaki kaydın sürümü uyumsuz (bulut: v${file}, uygulama: v${app}).`,
    errUnknown: "Bir şeyler ters gitti.",
    importFailed: "Kayıt yüklenemedi",
    profileSaveFailed: "Profil kaydedilemedi",
    curriculumStartFailed: "Müfredat üretimi başlatılamadı",
    genericError: "Bir şeyler ters gitti",
    // T-060: aşağıdaki sihirbaz "bağlamadan devam"ı zaten birinci sınıf bir
    // kapı olarak sunuyor — burada onu "atla" diye ikinci kez adlandırmak
    // ikisini çelişkiye düşürüyordu. Bu satır artık yalnız BAĞLAMın ne
    // olduğunu söyler, kararı kapılara bırakır.
    llmNeeded:
      "Kişisel müfredat üretimi bir yapay zekâ bağlantısı ister. Gramer ve sözlük kütüphanesi ise bağlantı olmadan da hazır — aşağıdan sana uyan yolu seç.",
    step0Title: "Merhaba! 🌸",
    step0Subtitle:
      "Ben Kumo. Sana özel bir dil yolculuğu hazırlayacağım. Önce tanışalım — adın ne, hangi dili öğreniyoruz?",
    namePlaceholder: "Adın",
    alreadyUsedDesc: "Zaten mevcut — ayarlardan geç",
    spokenLanguageLabel: "Konuştuğun dil (dersler ve arayüz bu dilde olur):",
    step1Title: "Hedefin ne?",
    step1Subtitle:
      "Birden fazla seçebilirsin — müfredatını buna göre şekillendireceğim.",
    step2Title: "Şu an neredesin?",
    step2Subtitle: "Dürüst ol, buna göre başlangıç noktanı seçeceğim.",
    step3Title: "Haftada ne kadar vakit ayırabilirsin?",
    step3Subtitle: "Gerçekçi bir tempo, sürdürülebilir bir yolculuk demek.",
    step4Title: "Nelerden hoşlanırsın?",
    step4Subtitle:
      "Ders örneklerini ilgi alanlarından seçeceğim — öğrenmek böyle daha tatlı.",
    step5Title: "Son soru: neden bu dil?",
    step5Subtitle:
      "Kendi cümlelerinle anlat — motivasyonunu bilmek yolculuğu kişiselleştirir. (İstersen boş bırak.)",
    motivationPlaceholder:
      "Örn: Çocukluğumdan beri Japonya'ya taşınmayı hayal ediyorum...",
    back: "Geri",
    next: "Devam",
    preparing: "Hazırlanıyor...",
    start: "Yolculuğu Başlat ✨",
    // T-080: üretim öncesi iki kapı.
    customize: "Promptu özelleştir",
    customizeHint:
      "Müfredatını üretecek metni görmek ve pedagoji bölümünü kendine göre değiştirmek istersen.",
  },
  en: {
    introTitle: "Hello! 🌸",
    introSubtitle:
      "I'm Kumo — your companion on this journey. How would you like to start?",
    setupTitle: "Start your journey",
    setupDesc:
      "A few questions so I can get to know you; I'll draw a map tailored to your goal.",
    setupButton: "✨ Let's begin",
    loadTitle: "Restore a save",
    loadDesc: "If you have a save file from before, load it and pick up where you left off.",
    loadButton: "📂 Choose file",
    loadingLabel: "Loading...",
    anonTitle: "Look around first",
    anonDesc:
      "Skip the questions — the grammar and dictionary library opens right away. You can customize the details later in Settings. Which language shall we look at?",
    signInTitle: "Sign in",
    signInDesc:
      "Sign in with your Google account and bring your cloud save to this device. (Optional — you can continue anonymously instead.)",
    signInButton: "🔑 Sign in with Google",
    signInStarting: "Redirecting…",
    signInFailed: "Could not start sign-in",
    returnTitle: "Welcome back!",
    returnChecking: "Checking your cloud save…",
    returnFoundTitle: "Found your cloud save",
    returnFoundDesc: (when: string) =>
      `Last upload: ${when}. Bring it to this device and pick up where you left off.`,
    returnFoundNoDate:
      "You have a save in the cloud. Bring it to this device and pick up where you left off.",
    returnPull: "⬇️ Get from cloud",
    returnPulling: "Restoring…",
    returnNoneTitle: "Could not get a save from the cloud",
    returnNoneDesc:
      "You may not have sent a save to the cloud yet, or the service can't be reached right now. You can start a new journey and send your save from Settings later.",
    returnRetry: "Try again",
    returnContinue: "Continue",
    returnPullConfirm:
      "This will erase the current progress on this device and replace it with the cloud save. Are you sure?",
    checkingAccount: "Checking your account…",
    returnLoadFile: "📂 Load a save file",
    returnLoadHint:
      "If you have a downloaded save file, you can load it right here.",
    pushOfferTitle: "Save loaded ✅",
    pushOfferDesc:
      "You're signed in — you can send this save to the cloud and use it on your other devices.",
    pushOfferButton: "⬆️ Send to cloud",
    pushOfferPushing: "Sending…",
    pushOfferSkip: "Not now",
    pushOfferDone: "✅ Sent to the cloud.",
    pushErrLocalEmpty:
      "The save on this device looks empty — the upload was stopped so it would not overwrite your cloud save.",
    pushErrTooLarge:
      "The save is too large for cloud sync (30 MB cap). Your save is fine — it just cannot be uploaded.",
    continueToApp: "Continue",
    signedInTitle: "Signed in",
    signedInAs: (who: string) => `Your account: ${who}`,
    signedInDesc:
      "You can bring your cloud save to this device, or continue anonymously below.",
    errNotSignedIn: "Could not establish a session. Try signing in again.",
    errUnavailable:
      "The cloud service could not be reached, or there is no save stored in the cloud.",
    errVersion: (file: string, app: string) =>
      `The cloud save's version does not match (cloud: v${file}, app: v${app}).`,
    errUnknown: "Something went wrong.",
    importFailed: "Could not load the save",
    profileSaveFailed: "Could not save the profile",
    curriculumStartFailed: "Could not start curriculum generation",
    genericError: "Something went wrong",
    llmNeeded:
      "Generating your personal curriculum needs an AI connection. The grammar and dictionary library works without one — pick the path that suits you below.",
    step0Title: "Hello! 🌸",
    step0Subtitle:
      "I'm Kumo. I'll craft a language journey just for you. First, let's meet — what's your name, and which language are we learning?",
    namePlaceholder: "Your name",
    alreadyUsedDesc: "Already exists — switch from settings",
    spokenLanguageLabel:
      "Your language (lessons and the interface will use it):",
    step1Title: "What's your goal?",
    step1Subtitle:
      "You can pick more than one — I'll shape your curriculum around it.",
    step2Title: "Where are you right now?",
    step2Subtitle: "Be honest — I'll pick your starting point based on this.",
    step3Title: "How much time can you spare each week?",
    step3Subtitle: "A realistic pace means a sustainable journey.",
    step4Title: "What do you enjoy?",
    step4Subtitle:
      "I'll pick lesson examples from your interests — learning is sweeter that way.",
    step5Title: "Last question: why this language?",
    step5Subtitle:
      "Tell me in your own words — knowing your motivation personalizes the journey. (Feel free to leave it blank.)",
    motivationPlaceholder:
      "E.g. I've dreamed of moving to Japan since childhood...",
    back: "Back",
    next: "Continue",
    preparing: "Preparing...",
    start: "Start the Journey ✨",
    customize: "Customize the prompt",
    customizeHint:
      "If you want to see the text that will build your curriculum and adjust the pedagogy section to suit you.",
  },
};

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>({
    targetLanguage: "ja",
    nativeLanguage: "tr",
    uiLanguage: "tr",
    displayName: "",
    goals: [],
    selfLevel: "zero",
    minutesPerWeek: 150,
    interests: [],
    motivation: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // T-080. The profile row created by whichever door was taken first; both
  // doors need it (the pedagogy prompt is built from the profile) and reusing
  // it keeps "customize, cancel, then generate" from creating a second row.
  const [profileId, setProfileId] = useState<string | null>(null);
  const [customizing, setCustomizing] = useState(false);
  // Statikte ilk açılışta LLM bağlı değildir; son adımda sihirbazı gömerek
  // submit'ten önce bağlanma şansı ver (atlanabilir — hata mesajı yol gösterir).
  const llm = useLlmStatus();
  const [llmDone, setLlmDone] = useState(false);

  const t = pick(S, draft.uiLanguage);

  // Languages that already have a profile — "adding a language" mode: those
  // are switched from settings, not re-onboarded.
  const [usedLanguages, setUsedLanguages] = useState<string[]>([]);

  // T-025: on a truly empty session (no profile at all — not "adding a
  // language", which lands here with profiles.length > 0), the very first
  // screen offers Load save / New game instead of jumping straight into the
  // wizard. "checking" avoids flashing the wrong screen while profileData()
  // is in flight; showIntro flips to false forever once left (New game or a
  // successful Load, which navigates away anyway).
  const [checkingProfiles, setCheckingProfiles] = useState(true);
  const [showIntro, setShowIntro] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- T-056: the anonymous door — one-touch language pick, sensible
  // defaults for everything else, straight to the /map hub. --------------
  const [anonBusy, setAnonBusy] = useState<string | null>(null);
  const [anonError, setAnonError] = useState<string | null>(null);

  const startAnonymous = async (lang: LanguageCode) => {
    setAnonBusy(lang);
    setAnonError(null);
    try {
      // A NORMAL profile (no schema special-casing): targetLanguage is the one
      // question that can't be defaulted (core reads are profile-bound and the
      // language is immutable per profile). Everything else falls to neutral
      // defaults the user can change in Settings — or by re-running the wizard
      // for the same language, which reuses this profile (createOrReuseProfile).
      await createProfileApi({
        targetLanguage: lang,
        nativeLanguage: draft.nativeLanguage, // browser-locale preselection
        uiLanguage: draft.uiLanguage,
        displayName: draft.uiLanguage === "en" ? "Guest" : "Misafir",
        goals: ["Günlük konuşma"],
        selfLevel: "zero",
        minutesPerWeek: 150,
        interests: ["Seyahat"],
        motivation: "",
      });
      // Deliberately NO curriculumGenerate here, even with an LLM configured:
      // the personalization questions are unanswered, so generating from
      // defaults would waste tokens. The /map hub owns the trigger.
      markVisited(); // T-054: artık profil var — landing bir daha araya girmesin
      window.location.href = withBase("/map");
    } catch (err) {
      setAnonError(localizeError(err, resolveUiLang(draft.uiLanguage)));
      setAnonBusy(null);
    }
  };

  // ---- T-048: the third door (Google sign-in) + the OAuth return leg -------
  //
  // The marker is read from window.location.search rather than useSearchParams
  // on purpose: this page has no <Suspense> boundary, and useSearchParams
  // requires one under static export. A plain read has no such constraint.
  const auth = useAuthStatus();
  const [cloudReturn, setCloudReturn] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [cloudInfoState, setCloudInfoState] = useState<
    { exists: boolean; updatedAt: string | null } | null | "error"
  >(null);
  const [pulling, setPulling] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [pullWarnings, setPullWarnings] = useState<UnreconstitutedRow[] | null>(
    null
  );
  // Only true once profileData() RESOLVED with zero profiles. Default false so
  // "unknown" and "read failed" both behave as "there may be data here".
  const [profilesKnownEmpty, setProfilesKnownEmpty] = useState(false);
  const [infoAttempt, setInfoAttempt] = useState(0);
  // T-049 fix 2: non-null once a file import succeeded while signed in — the
  // inline "send it to the cloud?" bridge. null = no import happened here.
  const [pushOffer, setPushOffer] = useState<
    null | "idle" | "pushing" | "done"
  >(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("cloud") !== "return") return;
    setCloudReturn(true);
    // Consume the marker. Leaving it in the URL would re-enter the return leg
    // on every refresh or back-navigation, long after the user dismissed it.
    url.searchParams.delete("cloud");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }, []);

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    // No confirm() here unlike Settings: an empty session has nothing to
    // erase, so the "this replaces your progress" warning doesn't apply.
    setImporting(true);
    setImportError(null);
    setPushOffer(null); // drop any offer left by a previous import
    try {
      await saveImportApi(file);
      // T-054: import ETTİ = bu tarayıcıda artık veri var. Bayrağı burada
      // yaz — aşağıdaki iki çıkıştan (push teklifi / doğrudan /map) biri
      // navigasyonsuz döndüğü için çıkışlara koymak bir yolu ıskalardı.
      markVisited();
      // T-049 fix 1+2 (import→push bridge). A signed-in user's device now
      // holds real data that the cloud does not — offer to push it BEFORE
      // navigating away, because /map has no such affordance and Settings is
      // where the owner failed to find it in the first place. Signed-out (or
      // no backend) users keep the original behaviour exactly: straight to
      // /map, no extra screen.
      //
      // AWAIT the settled status rather than reading the `auth` snapshot: the
      // import is entirely local (no network) while useAuthStatus needs two
      // sequential cross-origin probes, and it defaults pessimistic. Reading
      // the snapshot would hard-navigate a signed-in user straight past the
      // offer whenever the probes hadn't landed yet — the very dead end this
      // ticket closes, failing intermittently and looking like correct
      // signed-out behaviour. fetchStatus() is cached, so this is free once
      // resolved.
      const settled = await fetchAuthStatus();
      if (settled.backendAvailable && settled.user) {
        setImporting(false);
        setPushOffer("idle");
        return;
      }
      window.location.href = withBase("/map"); // full reload → fresh reads, skip wizard entirely
    } catch (err) {
      setImportError(localizeError(err, resolveUiLang(draft.uiLanguage)));
      setImporting(false);
    }
  };

  const cloudErrorText = useCallback(
    (err: unknown): string => {
      const tt = pick(S, draft.uiLanguage);
      const { kind, params } = describeCloudError(err);
      if (kind === "not_signed_in") return tt.errNotSignedIn;
      if (kind === "unavailable") return tt.errUnavailable;
      if (kind === "local_empty") return tt.pushErrLocalEmpty;
      if (kind === "too_large") return tt.pushErrTooLarge;
      if (kind === "version_mismatch")
        return tt.errVersion(String(params?.file ?? "?"), String(params?.app ?? "?"));
      return tt.errUnknown;
    },
    [draft.uiLanguage]
  );

  // T-049: push the just-imported save. No window.confirm — the inline offer IS
  // the confirmation, and the user picked the file seconds ago, so intent is
  // unambiguous. (Settings keeps its confirm: there a push can overwrite a real
  // cloud save the user did not just create.)
  const onPushAfterImport = async () => {
    setPushOffer("pushing");
    setCloudError(null);
    try {
      await cloudPush();
      setPushOffer("done");
    } catch (err) {
      setCloudError(cloudErrorText(err));
      setPushOffer("idle");
    }
  };

  const onSignIn = async () => {
    setSigningIn(true);
    setCloudError(null);
    try {
      // Absolute URL, and back to THIS page with a marker: with an API-base
      // override in play a relative callbackURL would resolve against the
      // Worker's origin and drop the user on the backend instead of the app.
      await startGoogleSignIn(
        `${window.location.origin}${withBase("/onboarding")}?cloud=return`
      );
    } catch {
      setCloudError(pick(S, draft.uiLanguage).signInFailed);
      setSigningIn(false);
    }
  };

  // On the return leg: ask the cloud what it holds (HEAD — no egress, no
  // download) instead of blind-pulling, which would throw save_load_failed for
  // the perfectly normal "first device, nothing stored yet" case.
  useEffect(() => {
    if (!cloudReturn || auth.loading || !auth.user) return;
    let alive = true;
    cloudInfo()
      .then((i) => {
        if (alive) setCloudInfoState({ exists: i.exists, updatedAt: i.updatedAt });
      })
      .catch((err) => {
        if (!alive) return;
        setCloudInfoState("error");
        setCloudError(cloudErrorText(err));
      });
    return () => {
      alive = false;
    };
  }, [cloudReturn, auth.loading, auth.user, cloudErrorText, infoAttempt]);

  const onCloudPull = async () => {
    // A pull is replace-all, and it must carry the same confirmation weight as
    // the Settings file-import flow. The intro screen's reasoning ("an empty
    // session has nothing to erase") only holds when local really IS empty.
    //
    // `profilesKnownEmpty` and NOT `usedLanguages.length === 0`: usedLanguages
    // is curriculum-joined (src/core/profile.ts inner-joins curricula), so a
    // profile that exists without a curriculum — the ordinary half-finished
    // state when no LLM is configured — would read as empty and lose its SRS
    // cards and settings to a silent replace-all. It is also false-by-default
    // on a REJECTED profileData(), so a transient read failure asks rather
    // than assumes.
    if (
      !profilesKnownEmpty &&
      !window.confirm(pick(S, draft.uiLanguage).returnPullConfirm)
    )
      return;
    setPulling(true);
    setCloudError(null);
    try {
      const r = await cloudPull();
      // T-054: pull başarılı = veri indi. Uyarı dalı navigasyonsuz döndüğü
      // için bayrak burada, dallanmadan önce yazılır.
      markVisited();
      if (r.warnings.length > 0) {
        // Do NOT navigate yet — the navigation would discard the list, making
        // seed-drift content loss silent. Acknowledge first.
        setPullWarnings(r.warnings);
        setPulling(false);
        return;
      }
      window.location.href = withBase("/map"); // full reload → fresh reads
    } catch (err) {
      setCloudError(cloudErrorText(err));
      setPulling(false);
    }
  };

  // Detect the visitor's spoken language from the browser locale and
  // preselect it — they can still override in step 0.
  useEffect(() => {
    const browser = (navigator.language || "").toLowerCase();
    const detected = NATIVE_LANGUAGES.find((l) =>
      browser.startsWith(l.code)
    )?.code;
    if (detected) {
      setDraft((d) => ({ ...d, nativeLanguage: detected, uiLanguage: detected }));
    }
  }, []);

  useEffect(() => {
    profileData()
      .then((d) => {
        // Müfredatı olan diller kilitlenir; yarım kalmış (müfredatsız) profil
        // dili yeniden onboard edilebilir. Eski sunucu DTO'suna fallback.
        const used =
          d.usedLanguages ?? (d.profiles ?? []).map((p) => p.targetLanguage);
        setUsedLanguages(used);
        const free = LANGUAGES.find((l) => !used.includes(l.code));
        setDraft((prev) => ({
          ...prev,
          targetLanguage: free?.code ?? prev.targetLanguage,
          displayName: prev.displayName || (d.profile?.displayName ?? ""),
        }));
        // Truly empty session (no profile whatsoever) → offer Load/New.
        // Adding a 2nd+ language already has profiles, so it skips straight
        // to the wizard as before.
        setShowIntro((d.profiles ?? []).length === 0);
        // T-048: set ONLY here, never in the catch. A rejected read must not
        // read as "empty" — that is the state in which a silent replace-all
        // would be most damaging.
        setProfilesKnownEmpty((d.profiles ?? []).length === 0);
      })
      .catch(() => {
        // profileData() failing (e.g. fresh static DB before first read)
        // reads the same as "no profile" — still offer Load/New.
        setShowIntro(true);
      })
      .finally(() => setCheckingProfiles(false));
  }, []);

  const toggle = (key: "goals" | "interests", value: string) =>
    setDraft((d) => ({
      ...d,
      [key]: d[key].includes(value)
        ? d[key].filter((v) => v !== value)
        : [...d[key], value],
    }));

  // T-080. Both doors need the profile row first: the pedagogy meta-prompt is
  // built FROM the profile (`curriculumPedagogyPrompt({ profile })`), so there
  // is nothing to preview until it exists.
  //
  // Deliberately NOT short-circuited on an already-created profileId. The
  // customize door can create the profile, get cancelled, and leave the user
  // back on step 5 editing their motivation; short-circuiting would then
  // generate the curriculum from the PRE-EDIT draft and silently drop the
  // change. createOrReuseProfile patches the existing curriculum-less row with
  // the current draft (and only 409s once a curriculum exists), so calling it
  // every time is idempotent AND keeps the last-write-wins behaviour the flow
  // had before this ticket.
  const ensureProfile = useCallback(async (): Promise<string> => {
    const t = pick(S, draft.uiLanguage);
    const { profile } = await createProfileApi(
      draft as unknown as Record<string, unknown>
    );
    if (!profile) throw new Error(t.profileSaveFailed);
    // T-054: profil oluştu. Müfredat üretimi bundan sonra başarısız olsa
    // bile (LLM yok / job hatası) profil DURUYOR; /map kendi boş durumunu
    // gösterir. Bayrağı burada yazmak, o kullanıcıyı landing'e geri
    // düşürmemek demek.
    markVisited();
    setProfileId(profile.id);
    return profile.id;
  }, [draft]);

  const openCustomizer = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      await ensureProfile();
      setCustomizing(true);
    } catch (err) {
      setError(localizeError(err, resolveUiLang(draft.uiLanguage)));
    } finally {
      setSubmitting(false);
    }
  }, [draft.uiLanguage, ensureProfile]);

  const submit = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      const id = await ensureProfile();

      // Do NOT run the multi-minute generation here; hand the user to the map
      // immediately and let it own the whole chain (the chain flag makes the
      // map auto-start the first level and continue to the scheme's top; the
      // rest of the site stays usable meanwhile). SPA navigation on purpose:
      // a full reload would kill nothing here, but the map's generation must
      // survive later in-app navigation, and the profile-meta cache is reset
      // explicitly instead (T-013's reason for the old full reload).
      requestCurriculumChain(id);
      resetProfileMeta();
      router.push("/map");
      return;
    } catch (err) {
      setError(localizeError(err, resolveUiLang(draft.uiLanguage)));
    } finally {
      setSubmitting(false);
    }
  }, [draft.uiLanguage, ensureProfile, router]);

  // T-080: the customizer owns the screen while open. Saving the edited body
  // hands straight over to the ordinary generation path, which now reads the
  // user's wording instead of the auto-generated one.
  if (customizing && profileId) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-6 py-12">
        <PromptCustomizer
          profileId={profileId}
          uiLanguage={draft.uiLanguage}
          onSaved={() => {
            setCustomizing(false);
            void submit();
          }}
          onCancel={() => setCustomizing(false)}
        />
      </div>
    );
  }

  // The hidden file input is rendered by EVERY branch below (see `fileInput`),
  // because T-049 fix 1 puts a "load a save file" action on the return leg too
  // — and the input used to live inside the showIntro JSX, which is not mounted
  // there, so clicking the ref would have silently done nothing.
  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept=".db"
      className="hidden"
      onChange={onImportFile}
    />
  );

  // T-049 fix 2: the import→push bridge. Rendered by both the intro and the
  // return leg after a successful import while signed in. Inline + dismissible
  // (skip navigates on to the app), never a window.confirm.
  const pushOfferBlock = pushOffer !== null && (
    <div className="mt-4 rounded-xl border-2 border-accent/40 bg-accent-soft/20 px-4 py-3">
      <div className="font-semibold">{t.pushOfferTitle}</div>
      {pushOffer === "done" ? (
        <>
          <p className="mt-1 mb-3 text-sm text-ink-soft">{t.pushOfferDone}</p>
          <CozyButton
            onClick={() => {
              window.location.href = withBase("/map");
            }}
          >
            {t.continueToApp}
          </CozyButton>
        </>
      ) : (
        <>
          <p className="mt-1 mb-3 text-sm text-ink-soft">{t.pushOfferDesc}</p>
          <div className="flex flex-wrap gap-3">
            <CozyButton
              onClick={() => void onPushAfterImport()}
              disabled={pushOffer === "pushing"}
            >
              {pushOffer === "pushing"
                ? t.pushOfferPushing
                : t.pushOfferButton}
            </CozyButton>
            <CozyButton
              variant="ghost"
              disabled={pushOffer === "pushing"}
              onClick={() => {
                window.location.href = withBase("/map");
              }}
            >
              {t.pushOfferSkip}
            </CozyButton>
          </div>
        </>
      )}
    </div>
  );

  // T-048 OAuth return leg. Deliberately ABOVE the checkingProfiles/showIntro
  // branches: showIntro only turns true for a truly empty session, but someone
  // can sign in from a device that already has a profile, and they still need
  // the "pull your cloud save?" offer.
  if (cloudReturn && !auth.loading) {
    const info = cloudInfoState;
    return (
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6 py-12">
        <div className="rounded-cozy bg-surface p-5 shadow-cozy sm:p-8">
          <h1 className="text-2xl font-semibold">{t.returnTitle}</h1>
          <p className="mt-2 mb-6 text-ink-soft">
            {auth.user?.email ?? auth.user?.name ?? ""}
          </p>

          {!auth.user ? (
            // Came back from Google but no session resolved (cancelled, or the
            // callback failed). Say so and let them out — never a dead end.
            <>
              <p className="mb-4 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
                {t.errNotSignedIn}
              </p>
              <CozyButton onClick={() => setCloudReturn(false)}>
                {t.returnContinue}
              </CozyButton>
            </>
          ) : pullWarnings ? (
            <>
              <CloudWarnings rows={pullWarnings} uiLanguage={draft.uiLanguage} />
              <div className="mt-5">
                <CozyButton
                  onClick={() => {
                    window.location.href = withBase("/map");
                  }}
                >
                  {t.returnContinue}
                </CozyButton>
              </div>
            </>
          ) : pushOffer !== null ? (
            // A file was just imported here (T-049 fix 1) — the push offer is
            // the whole screen now; the cloud-save question is answered.
            pushOfferBlock
          ) : info === null ? (
            <p className="text-ink-soft">{t.returnChecking}</p>
          ) : info !== "error" && info.exists ? (
            <>
              <div className="font-semibold">{t.returnFoundTitle}</div>
              <p className="mt-1 mb-4 text-sm text-ink-soft">
                {info.updatedAt
                  ? t.returnFoundDesc(new Date(info.updatedAt).toLocaleString())
                  : t.returnFoundNoDate}
              </p>
              <div className="flex flex-wrap gap-3">
                <CozyButton onClick={() => void onCloudPull()} disabled={pulling}>
                  {pulling ? t.returnPulling : t.returnPull}
                </CozyButton>
                <CozyButton
                  variant="ghost"
                  onClick={() => setCloudReturn(false)}
                  disabled={pulling}
                >
                  {t.returnContinue}
                </CozyButton>
              </div>
            </>
          ) : (
            <>
              <div className="font-semibold">{t.returnNoneTitle}</div>
              <p className="mt-1 mb-4 text-sm text-ink-soft">
                {t.returnNoneDesc}
              </p>
              {/* T-049 fix 1: THE dead end this ticket exists for. Signed in,
                  nothing in the cloud, and the only ways out were "try again"
                  and "start from scratch" — while the user was holding a save
                  file. Loading it here also unlocks the push offer, which is
                  how the file gets into the cloud for the next device. */}
              <div className="flex flex-wrap gap-3">
                <CozyButton
                  variant="soft"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                >
                  {importing ? t.loadingLabel : t.returnLoadFile}
                </CozyButton>
                <CozyButton
                  variant="soft"
                  onClick={() => {
                    setCloudInfoState(null);
                    setCloudError(null);
                    setInfoAttempt((n) => n + 1);
                  }}
                  disabled={importing}
                >
                  {t.returnRetry}
                </CozyButton>
                <CozyButton
                  variant="ghost"
                  onClick={() => setCloudReturn(false)}
                  disabled={importing}
                >
                  {t.returnContinue}
                </CozyButton>
              </div>
              <p className="mt-3 text-xs text-ink-soft">{t.returnLoadHint}</p>
            </>
          )}

          {fileInput}

          {importError && (
            <p className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
              {importError}
            </p>
          )}

          {cloudError && (
            <p className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
              {cloudError}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (checkingProfiles) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-ink-soft">
        <div className="animate-float-slow text-5xl">🌸</div>
      </div>
    );
  }

  if (showIntro) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6 py-12">
        <div className="rounded-cozy bg-surface p-5 shadow-cozy sm:p-8">
          {/* T-056 follow-up: instant language switch, before any door is
              picked. Sets BOTH ui and native language so the anonymous door
              and the wizard's step-0 preselection carry the choice. Labels
              are self-named on purpose — never translate a language's own
              name. */}
          <div className="mb-3 flex justify-end gap-2">
            {(["en", "tr"] as const).map((code) => (
              <button
                key={code}
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    uiLanguage: code,
                    nativeLanguage: code,
                  }))
                }
                className={`cursor-pointer rounded-full border-2 px-3 py-1 text-sm transition-colors ${
                  draft.uiLanguage === code
                    ? "border-indigo font-semibold"
                    : "border-surface-2 text-ink-soft hover:border-indigo/50"
                }`}
              >
                {code === "en" ? "English" : "Türkçe"}
              </button>
            ))}
          </div>
          <h1 className="text-2xl font-semibold">{t.introTitle}</h1>
          <p className="mt-2 mb-6 text-ink-soft">{t.introSubtitle}</p>

          {/* Once a file has been imported here, the doors are stale: "Yeni
              başla" would drop the user into the wizard ON TOP of the data
              they just loaded. The push offer replaces them. */}
          <div
            className={`grid gap-4 sm:grid-cols-2 ${pushOffer !== null ? "hidden" : ""}`}
          >
            {/* 1 — the primary door: guided setup (T-056 reorder) */}
            <div className="rounded-xl border-2 border-accent/40 bg-background p-5 sm:col-span-2">
              <div className="font-semibold">{t.setupTitle}</div>
              <p className="mt-1 mb-4 text-sm text-ink-soft">{t.setupDesc}</p>
              <CozyButton
                onClick={() => setShowIntro(false)}
                disabled={anonBusy !== null}
              >
                {t.setupButton}
              </CozyButton>
            </div>

            {/* 2 — restore a save file */}
            <div
              className={`rounded-xl border-2 border-surface-2 bg-background p-5 ${
                auth.backendAvailable ? "" : "sm:col-span-2"
              }`}
            >
              <div className="font-semibold">{t.loadTitle}</div>
              <p className="mt-1 mb-4 text-sm text-ink-soft">{t.loadDesc}</p>
              <CozyButton
                variant="soft"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing || anonBusy !== null}
              >
                {importing ? t.loadingLabel : t.loadButton}
              </CozyButton>
            </div>

            {/* 3 — cloud (T-048). Rendered only where a cloud backend actually
                exists — a backend-less static mirror shows the other three
                doors, unchanged. Signing in is never a gate.
                T-049 fix 3: an ALREADY signed-in user must not be shown a
                sign-in button (T-048's known polish debt). While `auth.loading`
                the card renders its "checking" line rather than flashing the
                signed-out shape first — useAuthStatus defaults pessimistic. */}
            {auth.backendAvailable && (
              <div className="rounded-xl border-2 border-surface-2 bg-background p-5">
                {auth.loading ? (
                  <p className="text-sm text-ink-soft">{t.checkingAccount}</p>
                ) : auth.user ? (
                  <>
                    <div className="font-semibold">{t.signedInTitle}</div>
                    <p className="mt-1 text-sm text-ink-soft">
                      {t.signedInAs(
                        auth.user.email ?? auth.user.name ?? auth.user.id
                      )}
                    </p>
                    <p className="mt-1 mb-4 text-sm text-ink-soft">
                      {t.signedInDesc}
                    </p>
                    <CozyButton
                      variant="soft"
                      onClick={() => void onCloudPull()}
                      disabled={pulling}
                    >
                      {pulling ? t.returnPulling : t.returnPull}
                    </CozyButton>
                  </>
                ) : (
                  <>
                    <div className="font-semibold">{t.signInTitle}</div>
                    <p className="mt-1 mb-4 text-sm text-ink-soft">
                      {t.signInDesc}
                    </p>
                    <CozyButton
                      variant="soft"
                      onClick={() => void onSignIn()}
                      disabled={signingIn}
                    >
                      {signingIn ? t.signInStarting : t.signInButton}
                    </CozyButton>
                  </>
                )}
              </div>
            )}

            {/* 4 — T-056: start anonymously. One-touch language pick; the
                rest of the wizard is skipped and the user lands on the /map
                hub (static library + "connect an LLM" state). */}
            <div className="rounded-xl border-2 border-surface-2 bg-background p-5 sm:col-span-2">
              <div className="font-semibold">{t.anonTitle}</div>
              <p className="mt-1 mb-4 text-sm text-ink-soft">{t.anonDesc}</p>
              <div className="flex flex-wrap gap-3">
                {LANGUAGES.map((l) => (
                  <CozyButton
                    key={l.code}
                    variant="soft"
                    disabled={anonBusy !== null || importing}
                    onClick={() => void startAnonymous(l.code)}
                  >
                    {anonBusy === l.code
                      ? t.preparing
                      : languageLabel(l.code, draft.uiLanguage)}
                  </CozyButton>
                ))}
              </div>
            </div>
          </div>

          {fileInput}

          {pushOfferBlock}

          {/* A pull can be started from the signed-in card above, so its
              seed-drift warnings must be renderable HERE too — otherwise the
              state would be set with nothing to display it and the content
              loss would go unreported. */}
          {pullWarnings && (
            <div className="mt-4">
              <CloudWarnings rows={pullWarnings} uiLanguage={draft.uiLanguage} />
              <div className="mt-4">
                <CozyButton
                  onClick={() => {
                    window.location.href = withBase("/map");
                  }}
                >
                  {t.returnContinue}
                </CozyButton>
              </div>
            </div>
          )}

          {cloudError && (
            <p className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
              {cloudError}
            </p>
          )}

          {importError && (
            <p className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
              {importError}
            </p>
          )}

          {anonError && (
            <p className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
              {anonError}
            </p>
          )}
        </div>
      </div>
    );
  }

  const canNext = [
    draft.displayName.trim().length > 0 &&
      !usedLanguages.includes(draft.targetLanguage),
    draft.goals.length > 0,
    true, // level always has a value
    true, // minutes always has a value
    draft.interests.length > 0,
    true, // motivation optional
  ][step];

  // ChipGrid works on plain strings, so translated labels are shown while the
  // stored VALUES stay the canonical Turkish strings (DB/prompt contract).
  const chipProps = (key: "goals" | "interests", options: string[]) => ({
    options: options.map((v) => optionLabel(v, draft.uiLanguage)),
    selected: draft[key].map((v) => optionLabel(v, draft.uiLanguage)),
    onToggle: (label: string) =>
      toggle(
        key,
        options.find((v) => optionLabel(v, draft.uiLanguage) === label) ?? label
      ),
  });

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6 py-12">
      <div className="mb-8 flex gap-2">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < step ? "bg-indigo" : i === step ? "bg-accent" : "bg-surface-2"
            }`}
          />
        ))}
      </div>

      <div className="rounded-cozy bg-surface p-5 shadow-cozy sm:p-8">
        {step === 0 && (
          <StepShell title={t.step0Title} subtitle={t.step0Subtitle}>
            <input
              autoFocus
              value={draft.displayName}
              onChange={(e) =>
                setDraft((d) => ({ ...d, displayName: e.target.value }))
              }
              placeholder={t.namePlaceholder}
              className="w-full rounded-xl border-2 border-surface-2 bg-background px-4 py-3 outline-none focus:border-indigo focus:ring-4 focus:ring-indigo/15"
            />
            <div className="mt-4 grid grid-cols-2 gap-3">
              {LANGUAGES.map((l) => {
                const used = usedLanguages.includes(l.code);
                return (
                  <ChoiceCard
                    key={l.code}
                    selected={draft.targetLanguage === l.code}
                    disabled={used}
                    onClick={() =>
                      setDraft((d) => ({ ...d, targetLanguage: l.code }))
                    }
                    title={languageLabel(l.code, draft.uiLanguage)}
                    desc={used ? t.alreadyUsedDesc : undefined}
                  />
                );
              })}
            </div>
            <p className="mt-6 mb-2 text-sm font-semibold text-ink-soft">
              {t.spokenLanguageLabel}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {NATIVE_LANGUAGES.map((l) => (
                <ChoiceCard
                  key={l.code}
                  selected={draft.nativeLanguage === l.code}
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      nativeLanguage: l.code,
                      uiLanguage: l.code,
                    }))
                  }
                  title={`${l.flag} ${l.name}`}
                />
              ))}
            </div>
          </StepShell>
        )}

        {step === 1 && (
          <StepShell title={t.step1Title} subtitle={t.step1Subtitle}>
            <ChipGrid {...chipProps("goals", GOAL_OPTIONS)} />
          </StepShell>
        )}

        {step === 2 && (
          <StepShell title={t.step2Title} subtitle={t.step2Subtitle}>
            <div className="flex flex-col gap-3">
              {levelsFor(draft.uiLanguage).map((l) => (
                <ChoiceCard
                  key={l.value}
                  selected={draft.selfLevel === l.value}
                  onClick={() => setDraft((d) => ({ ...d, selfLevel: l.value }))}
                  title={l.label}
                  desc={l.desc}
                />
              ))}
            </div>
          </StepShell>
        )}

        {step === 3 && (
          <StepShell title={t.step3Title} subtitle={t.step3Subtitle}>
            <div className="flex flex-col gap-3">
              {minuteOptionsFor(draft.uiLanguage).map((m) => (
                <ChoiceCard
                  key={m.value}
                  selected={draft.minutesPerWeek === m.value}
                  onClick={() =>
                    setDraft((d) => ({ ...d, minutesPerWeek: m.value }))
                  }
                  title={m.label}
                  desc={m.desc}
                />
              ))}
            </div>
          </StepShell>
        )}

        {step === 4 && (
          <StepShell title={t.step4Title} subtitle={t.step4Subtitle}>
            <ChipGrid {...chipProps("interests", INTEREST_OPTIONS)} />
          </StepShell>
        )}

        {step === 5 && (
          <StepShell title={t.step5Title} subtitle={t.step5Subtitle}>
            <textarea
              value={draft.motivation}
              onChange={(e) =>
                setDraft((d) => ({ ...d, motivation: e.target.value }))
              }
              rows={4}
              placeholder={t.motivationPlaceholder}
              className="w-full resize-none rounded-xl border-2 border-surface-2 bg-background px-4 py-3 outline-none focus:border-indigo focus:ring-4 focus:ring-indigo/15"
            />
            {!llm.configured && !llmDone && (
              <div className="mt-6">
                <p className="mb-3 rounded-xl bg-indigo-soft px-4 py-3 text-sm">
                  {t.llmNeeded}
                </p>
                <LlmSetupWizard onDone={() => setLlmDone(true)} />
              </div>
            )}
            {/* T-080 second door. ALWAYS rendered: the old `llm.configured ||
                llmDone` gate hid it exactly when the user had just connected a
                provider through the setup block above but the stale status
                probe had not caught up yet, so the door silently vanished.
                Without an LLM the customizer itself shows the localized
                llm_unconfigured error, which is honest and discoverable. Soft
                variant on purpose; "Start the journey" below is this screen's
                one dominant action. */}
            {(
              <div className="mt-6 rounded-xl border-2 border-surface-2 bg-background p-4">
                <p className="mb-3 text-sm text-ink-soft">{t.customizeHint}</p>
                <CozyButton
                  variant="soft"
                  onClick={() => void openCustomizer()}
                  disabled={submitting}
                >
                  {submitting ? t.preparing : t.customize}
                </CozyButton>
              </div>
            )}
          </StepShell>
        )}

        {error && (
          <p className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="mt-8 flex items-center justify-between">
          <CozyButton
            variant="ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || submitting}
          >
            {t.back}
          </CozyButton>
          {step < TOTAL_STEPS - 1 ? (
            <CozyButton onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
              {t.next}
            </CozyButton>
          ) : (
            <CozyButton onClick={submit} disabled={submitting}>
              {submitting ? t.preparing : t.start}
            </CozyButton>
          )}
        </div>
      </div>
    </div>
  );
}

function StepShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 mb-6 text-ink-soft">{subtitle}</p>
      {children}
    </div>
  );
}
