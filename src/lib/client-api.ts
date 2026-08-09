"use client";

// Client data layer: business logic (src/core/*) runs against the sql.js DB
// in the browser; no network calls. Components call these functions instead
// of fetch. (T-069: the server runtime is gone; static/local-first is the
// only mode. A fresh environment starts on an empty IndexedDB and goes
// through onboarding; Settings file import restores an existing save.)

import type { Rating } from "@/lib/srs";
import { AppError } from "@/lib/errors";
import { startLessonGen } from "@/lib/lesson-gen-store";

function browserDb() {
  return import("@/db/browser").then((m) => m.getBrowserDb());
}

// ------------------------------------------------------------------ Harita / Profil / Stats

export async function roadmap(): Promise<import("@/core/roadmap").Roadmap> {
  const { db } = await browserDb();
  const coreP = await import("@/core/profile");
  const coreR = await import("@/core/roadmap");
  const profile = coreP.getActiveProfile(db);
  if (!profile) throw new AppError("profile_missing");
  const result = coreR.getRoadmap(db, profile.id);
  if (!result) throw new AppError("curriculum_not_ready");
  return result;
}

export interface ProfileData {
  profile: import("@/core/profile").Profile | null;
  /** Müfredatı olan diller — onboarding'in "bu dil kullanımda" kilidi.
   * (Eski sunucularda alan yok; çağıran fallback'ler.) */
  usedLanguages?: string[];
  profiles: {
    id: string;
    displayName: string;
    targetLanguage: string;
    selfLevel: string;
    isActive: boolean;
  }[];
}

export async function profileData(): Promise<ProfileData> {
  const { db } = await browserDb();
  const core = await import("@/core/profile");
  return {
    profile: core.getActiveProfile(db),
    profiles: core.listProfiles(db),
    usedLanguages: core.languagesWithCurriculum(db),
  };
}

export async function patchProfile(
  patch: Record<string, unknown>
): Promise<{ profile: import("@/core/profile").Profile }> {
  const { db, persistSoon } = await browserDb();
  const core = await import("@/core/profile");
  const profile = core.updateActiveProfile(
    db,
    patch as Parameters<typeof core.updateActiveProfile>[1]
  );
  persistSoon();
  if (!profile) throw new AppError("profile_missing");
  return { profile };
}

export async function switchProfile(profileId: string): Promise<void> {
  const handle = await browserDb();
  const core = await import("@/core/profile");
  if (!core.setActiveProfile(handle.db, profileId))
    throw new AppError("profile_missing");
  // Çağıran hemen full-reload yapar — debounce yerine yazmayı BEKLE, yoksa
  // switch yarışta kaybolur ve eski profil geri gelir.
  await handle.persistNow();
}

export async function stats(): Promise<ReturnType<typeof import("@/core/stats").getStats>> {
  const { db } = await browserDb();
  const core = await import("@/core/stats");
  return core.getStats(db);
}

/** Statikte aktif tarayıcı LLM'i; yapılandırılmamışsa net mesajla düşer. */
async function browserGen() {
  const { getBrowserGen } = await import("@/lib/llm/browser-provider");
  const gen = getBrowserGen();
  if (!gen) {
    throw new AppError("llm_unconfigured");
  }
  return gen;
}

/** Üretim hatasını kullanıcıya gösterilebilir metne çevirir (llm-diagnosis).
 * Store'a HAM sağlayıcı metni yazılmaz; teşhis başarısız olursa yerelleştirilmiş
 * genel mesaja düşer. */
async function diagnoseGenError(err: unknown): Promise<string> {
  try {
    const { diagnoseGenerationFailure } = await import("@/lib/llm-diagnosis");
    const config = await llmConfigGet();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const uiLang = await activeUiLanguage();
    const diagnosis = await diagnoseGenerationFailure({
      err,
      baseUrl: config.baseUrl,
      uiLang,
      isLocalOrigin: /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin),
      origin,
    });
    return diagnosis.message;
  } catch {
    return err instanceof Error ? err.message : String(err);
  }
}

/** Aktif profilin UI dili (teşhis metinleri için). Profil yoksa tr. */
async function activeUiLanguage(): Promise<"tr" | "en"> {
  try {
    const data = await profileData();
    return data.profile?.uiLanguage === "en" ? "en" : "tr";
  } catch {
    return "tr";
  }
}

/**
 * Statikte ders üretimi (sunucudaki ensureLessonJob muadili).
 *
 * Tekilleştirme + SONUÇ KAYDI artık lesson-gen-store'da (T-070-B): üretimin
 * sonucu çağıran bileşenin ömründen bağımsız olarak saklanır, böylece
 * drawer kapatıldıktan sonra biten hata bir yüzeyde görünebilir. Eskiden
 * burada duran `lessonGenInFlight` haritası oraya taşındı.
 */
function ensureLessonGen(nodeId: string, urgent = false): Promise<void> {
  return startLessonGen(nodeId, {
    urgent,
    diagnose: diagnoseGenError,
    promote: () => {
      void import("@/lib/llm/browser-queue").then((m) =>
        m.promoteUrgentCall(`lesson:${nodeId}`)
      );
    },
    run: async (signal) => {
      const gen = await browserGen();
      const { db, persistSoon } = await browserDb();
      const coreG = await import("@/core/llm-gen");
      try {
        await coreG.generateLessonContent(db, gen, nodeId, null, {
          urgent,
          signal,
        });
      } finally {
        // finally, catch DEĞİL: generateLessonContent hata yolunda satırı
        // "error" (iptalde "pending") damgalayıp RETHROW ediyor. persistSoon
        // yalnız başarı yolunda çağrılsaydı o damga IndexedDB'ye hiç inmezdi;
        // reload sonrası openNode yine needsGeneration görür ve sessiz 3
        // dakikalık üretim yeniden başlardı, yani kara delik bir refresh'i
        // atlatırdı. ("Başka bir yazım nasılsa flush eder" savunması da
        // geçmiyor: köprü zaman aşımı pencerenin TÜM hedeflerini aynı anda
        // öldürüyor, ortada flush edecek başka yazım kalmıyor.)
        persistSoon();
      }
    },
  });
}

/**
 * T-068 penceresi, statik ayak: `anchor`'dan itibaren n..n+k içeriksiz
 * dersleri arkaplanda üretir. Hepsi hazırsa SIFIR çağrı. Prefetch'ler
 * urgent'sız gider; kullanıcının açtığı ders kuyrukta onların önüne geçer.
 */
async function runLessonWindow(anchorNodeId: string, k = 2): Promise<void> {
  const { getBrowserGen } = await import("@/lib/llm/browser-provider");
  if (!getBrowserGen()) return; // LLM yok → arka plan üretimi sessizce no-op
  const { db } = await browserDb();
  const coreP = await import("@/core/profile");
  const coreW = await import("@/core/lesson-window");
  const nativeLang = (coreP.getActiveProfile(db)?.nativeLanguage ?? "tr") as
    | "tr"
    | "en";
  const { lessonGenState } = await import("@/lib/lesson-gen-store");
  for (const id of coreW.lessonWindowTargets(db, anchorNodeId, k, nativeLang)) {
    // Kullanıcının BU OTURUMDA iptal ettiği ders pencere hedefi olmaz. İptal
    // DB satırını "pending" bırakıyor (doğru: hata değil), ama bu onu pencere
    // için GARANTİ hedef yapıyordu; tam sayfa /lesson'da "Vazgeç" → /map →
    // primeLessonWindow zinciri üretimi saniyeler içinde, üstelik iptal
    // butonu olmadan yeniden başlatıyordu.
    //
    // Filtre bilerek OTURUM kapsamlı (store bellekte): reload sonrası pending
    // satırın yeniden hedef olması doğru davranış, kullanıcı o dersi hiç
    // istemiyorsa zaten açmaz.
    if (lessonGenState(id)?.kind === "cancelled") continue;
    void ensureLessonGen(id).catch((err) =>
      console.warn("[prefetch] ders üretimi hata:", id, err)
    );
  }
  // Pencere içindeki KALICI error dersleri: oturum başına EN FAZLA bir kez
  // otomatik yeniden dene. Kalıcı damga çoğunlukla geçici bir köprü/timeout
  // arızasının fosili (2026-08-01: 180s kesimleri); hiç denenmezse kullanıcı
  // frontier'a geldiğinde çıkmaz sokağa giriyor, sınırsız denenirse bozuk
  // prompt sonsuz harcama olur. Bir deneme ikisinin de ortası: yine ölürse
  // rozet kalır, sonraki deneme kullanıcının (harita rozeti / retry ekranı).
  const { clearLessonGen } = await import("@/lib/lesson-gen-store");
  for (const id of coreW.lessonWindowErrored(db, anchorNodeId, k)) {
    if (autoRetriedLessonGens.has(id)) continue;
    const st = lessonGenState(id)?.kind;
    // Oturumda zaten bir sonuç/aksiyon varsa karışma: çalışan üretim, taze
    // hata, kullanıcı iptali ya da bu oturumda üretilmiş içerik.
    if (st) continue;
    autoRetriedLessonGens.add(id);
    clearLessonGen(id);
    void ensureLessonGen(id).catch((err) =>
      console.warn("[prefetch] otomatik retry hata:", id, err)
    );
  }
}

/** Oturum başına tek otomatik retry defteri (bkz. runLessonWindow). */
const autoRetriedLessonGens = new Set<string>();

/** App/map open trigger (T-068 third trigger): once, from the frontier.
 * Quietly recovers in-flight generations killed by a closed tab; no-op when
 * the window is already full. */
export async function primeLessonWindow(): Promise<void> {
  try {
    const { db } = await browserDb();
    const coreP = await import("@/core/profile");
    const coreW = await import("@/core/lesson-window");
    const profile = coreP.getActiveProfile(db);
    if (!profile) return;
    const frontier = coreW.frontierNodeId(db, profile.id);
    if (frontier) await runLessonWindow(frontier);
  } catch (err) {
    console.warn("[prefetch] pencere tetiklenemedi:", err);
  }
}

/** Statik auto-extend (sunucudaki maybeAutoExtend muadili): zincirin kuyruğu
 * temizlendiyse sıradaki seviyeyi arkaplanda üretir; üretilen seviyeyi döner. */
let chapterGenInFlight = false;
async function maybeAutoExtendStatic(
  nodeId: string,
  profileId: string,
  targetLanguage: string
): Promise<string | null> {
  if (chapterGenInFlight) return null;
  const handle = await browserDb();
  const coreR = await import("@/core/roadmap");
  if (!coreR.isCurriculumTail(handle.db, nodeId)) return null;
  const { eq } = await import("drizzle-orm");
  const tables = await import("@/db/schema");
  const curriculum = handle.db
    .select()
    .from(tables.curricula)
    .where(eq(tables.curricula.profileId, profileId))
    .limit(1)
    .get();
  if (!curriculum) return null;
  const coreC = await import("@/core/curriculum-gen");
  const { nextLevelFor } = await import("@/lib/curriculum/levels");
  const top = coreC.topChapterLevel(handle.db, curriculum.id, targetLanguage);
  const next = top ? nextLevelFor(targetLanguage, top) : null;
  if (!next) return null;
  chapterGenInFlight = true;
  void (async () => {
    try {
      const gen = await browserGen();
      await coreC.generateChapter(handle.db, gen, profileId, next, {
        onPedagogyReady: () => handle.persistNow(),
      });
      await handle.persistNow();
    } catch (err) {
      console.warn("[auto-extend] bölüm üretimi hata:", err);
    } finally {
      chapterGenInFlight = false;
    }
  })();
  return next;
}

// ------------------------------------------------------------------ Kanji / Sözlük

export async function kanjiList(): Promise<{
  entries: { char: string; level: string; status: string; meaningsEn: string[] }[];
}> {
  const { db, persistSoon } = await browserDb();
  const coreP = await import("@/core/profile");
  const coreK = await import("@/core/kanji");
  const profile = coreP.getActiveProfile(db);
  if (!profile) throw new AppError("profile_missing");
  const nativeLang = (profile.nativeLanguage ?? "tr") as "tr" | "en";
  let entries = coreK.listKanji(db, profile.targetLanguage, nativeLang);
  // Boş girişleri paketlenmiş seed'den doldur (LLM'siz dolu kanji sözlüğü).
  if (entries.some((e) => e.status === "pending" || e.status === "error")) {
    const { fetchKanjiSeed } = await import("@/lib/kanji-seed");
    const seed = await fetchKanjiSeed(profile.targetLanguage, nativeLang);
    if (
      seed &&
      coreK.applyKanjiSeed(db, profile.targetLanguage, seed, nativeLang, nativeLang) > 0
    ) {
      entries = coreK.listKanji(db, profile.targetLanguage, nativeLang);
    }
  }
  persistSoon(); // seed yeni satır eklemiş/doldurmuş olabilir
  return { entries };
}

export async function kanjiDetail(char: string): Promise<{
  char: string;
  level: string;
  onyomi: string[];
  kunyomi: string[];
  meaningsEn: string[];
  status: string;
  content: unknown | null;
}> {
  const { db, persistSoon } = await browserDb();
  const coreP = await import("@/core/profile");
  const coreK = await import("@/core/kanji");
  const profile = coreP.getActiveProfile(db);
  if (!profile) throw new AppError("profile_missing");
  const nativeLang = (profile.nativeLanguage ?? "tr") as "tr" | "en";
  let entry = coreK.findKanji(db, profile.targetLanguage, char);
  if (!entry) {
    // Deep link (?char=) liste yüklenmeden gelebilir — önce seed'le.
    coreK.ensureKanjiSeeded(db, profile.targetLanguage);
    entry = coreK.findKanji(db, profile.targetLanguage, char);
    if (entry) persistSoon();
  }
  if (entry && (entry.status === "pending" || entry.status === "error")) {
    const { fetchKanjiSeed } = await import("@/lib/kanji-seed");
    const seed = await fetchKanjiSeed(profile.targetLanguage, nativeLang);
    if (
      seed &&
      coreK.applyKanjiSeed(db, profile.targetLanguage, seed, nativeLang, nativeLang) > 0
    ) {
      entry = coreK.findKanji(db, profile.targetLanguage, char) ?? entry;
      persistSoon();
    }
  }
  if (!entry) throw new AppError("not_found");
  const { readLangContent } = await import("@/lib/llm/lang-content");
  const localized =
    entry.status === "ready"
      ? readLangContent(entry.content, nativeLang)
      : null;
  return {
    char: entry.char,
    level: entry.level,
    onyomi: entry.onyomi,
    kunyomi: entry.kunyomi,
    meaningsEn: entry.meaningsEn,
    status: localized ? "ready" : "pending",
    content: localized,
  };
}

export type KanjiLookupResult = ReturnType<
  typeof import("@/core/kanji").kanjiLookup
>;

export async function kanjiLookupApi(text: string): Promise<KanjiLookupResult> {
  const { db } = await browserDb();
  const coreP = await import("@/core/profile");
  const coreK = await import("@/core/kanji");
  const profile = coreP.getActiveProfile(db);
  if (!profile) throw new AppError("profile_missing");
  return coreK.kanjiLookup(
    db,
    profile.targetLanguage,
    text,
    (profile.nativeLanguage ?? "tr") as "tr" | "en"
  );
}

// ------------------------------------------------------------------ Kelime sözlüğü

export interface VocabEntrySummary {
  word: string;
  reading: string;
  meaningsEn: string[];
  level: string;
  status: "pending" | "generating" | "ready" | "error";
}

export async function vocabList(): Promise<{ entries: VocabEntrySummary[] }> {
  const { db, persistSoon } = await browserDb();
  const coreP = await import("@/core/profile");
  const coreV = await import("@/core/vocab");
  const profile = coreP.getActiveProfile(db);
  if (!profile) throw new AppError("profile_missing");
  const nativeLang = (profile.nativeLanguage ?? "tr") as "tr" | "en";
  let entries = coreV.listVocab(db, profile.targetLanguage, nativeLang);
  // Boş girişleri paketlenmiş seed'den doldur (LLM'siz tam sözlük).
  if (entries.some((e) => e.status === "pending" || e.status === "error")) {
    const { fetchVocabSeed } = await import("@/lib/vocab-seed");
    const seed = await fetchVocabSeed(profile.targetLanguage, nativeLang);
    if (
      seed &&
      coreV.applyVocabSeed(db, profile.targetLanguage, seed, nativeLang, nativeLang) > 0
    ) {
      entries = coreV.listVocab(db, profile.targetLanguage, nativeLang);
    }
  }
  persistSoon(); // seed yeni satır eklemiş/doldurmuş olabilir
  return { entries: entries as VocabEntrySummary[] };
}

export async function vocabDetail(word: string): Promise<{
  word: string;
  traditional: string | null;
  reading: string;
  meaningsEn: string[];
  classifiers: string[] | null;
  level: string;
  status: string;
  content: unknown | null;
}> {
  const { db, persistSoon } = await browserDb();
  const coreP = await import("@/core/profile");
  const coreV = await import("@/core/vocab");
  const profile = coreP.getActiveProfile(db);
  if (!profile) throw new AppError("profile_missing");
  const nativeLang = (profile.nativeLanguage ?? "tr") as "tr" | "en";
  let entry = coreV.findVocab(db, profile.targetLanguage, word);
  if (!entry) {
    // Deep link (?word=) liste yüklenmeden gelebilir — önce seed'le.
    coreV.ensureVocabSeeded(db, profile.targetLanguage);
    entry = coreV.findVocab(db, profile.targetLanguage, word);
    if (entry) persistSoon();
  }
  if (entry && (entry.status === "pending" || entry.status === "error")) {
    const { fetchVocabSeed } = await import("@/lib/vocab-seed");
    const seed = await fetchVocabSeed(profile.targetLanguage, nativeLang);
    if (
      seed &&
      coreV.applyVocabSeed(db, profile.targetLanguage, seed, nativeLang, nativeLang) > 0
    ) {
      entry = coreV.findVocab(db, profile.targetLanguage, word) ?? entry;
      persistSoon();
    }
  }
  if (!entry) throw new AppError("not_found");
  const { readLangContent } = await import("@/lib/llm/lang-content");
  const localized =
    entry.status === "ready"
      ? readLangContent(entry.content, nativeLang)
      : null;
  return {
    word: entry.word,
    traditional: entry.traditional,
    reading: entry.reading,
    meaningsEn: entry.meaningsEn,
    classifiers: entry.classifiers,
    level: entry.level,
    status: localized ? "ready" : "pending",
    content: localized,
  };
}

export async function vocabGenerate(word: string): Promise<void> {
  const gen = await browserGen();
  const { db, persistSoon } = await browserDb();
  const coreP = await import("@/core/profile");
  const coreV = await import("@/core/vocab");
  const coreG = await import("@/core/llm-gen");
  const profile = coreP.getActiveProfile(db);
  if (!profile) throw new AppError("profile_missing");
  const entry = coreV.findVocab(db, profile.targetLanguage, word);
  if (!entry) throw new AppError("not_found");
  await coreG.generateVocabContent(db, gen, entry.id);
  persistSoon();
}

export async function vocabGenerateBatch(level?: string): Promise<void> {
  // Sequential inline generation (runs as long as the tab stays open; the UI
  // already polls the status badges).
  const gen = await browserGen();
  const handle = await browserDb();
  const coreP = await import("@/core/profile");
  const coreG = await import("@/core/llm-gen");
  const { eq } = await import("drizzle-orm");
  const tables = await import("@/db/schema");
  const { readLangContent } = await import("@/lib/llm/lang-content");
  const profile = coreP.getActiveProfile(handle.db);
  if (!profile) throw new AppError("profile_missing");
  const nativeLang = (profile.nativeLanguage ?? "tr") as "tr" | "en";
  const entries = handle.db
    .select()
    .from(tables.vocabEntries)
    .where(eq(tables.vocabEntries.targetLanguage, profile.targetLanguage))
    .all()
    // Not ready IN THE CURRENT native language (mirrors the server route, T-031).
    .filter(
      (e) =>
        (!level || e.level === level) &&
        (e.status !== "ready" || !readLangContent(e.content, nativeLang))
    );
  const { startJob, newBatchId } = await import("@/lib/jobs-store");
  const batchId = newBatchId();
  void (async () => {
    for (const e of entries) {
      const j = startJob("vocab", e.id, batchId);
      if (j.signal.aborted) {
        j.fail(new Error("iptal edildi"));
        break;
      }
      try {
        await coreG.generateVocabContent(handle.db, gen, e.id);
        j.done();
      } catch (err) {
        console.warn("[batch] sözlük üretimi hata:", e.word, err);
        j.fail(err);
      }
      handle.persistSoon();
    }
  })();
}

// ------------------------------------------------------------------ Overview / Chat / Çeviri

export async function overview(): Promise<
  ReturnType<typeof import("@/core/overview").getOverview>
> {
  const { db } = await browserDb();
  const coreP = await import("@/core/profile");
  const coreO = await import("@/core/overview");
  const profile = coreP.getActiveProfile(db);
  if (!profile) throw new AppError("profile_missing");
  return coreO.getOverview(db, profile);
}

export async function chatHistoryApi(): Promise<{
  sessionId: string | null;
  messages: { role: string; content: string; lang: string }[];
}> {
  const { db } = await browserDb();
  const coreP = await import("@/core/profile");
  const coreC = await import("@/core/chat");
  const profile = coreP.getActiveProfile(db);
  if (!profile) return { sessionId: null, messages: [] };
  return coreC.chatHistory(db, profile.id);
}

export async function chatSend(body: {
  sessionId: string | null;
  message: string;
}): Promise<{ sessionId: string; reply: string }> {
  const gen = await browserGen();
  const { db, persistSoon } = await browserDb();
  const coreP = await import("@/core/profile");
  const coreG = await import("@/core/llm-gen");
  const profile = coreP.getActiveProfile(db);
  if (!profile) throw new AppError("profile_missing");
  const result = await coreG.sendChatMessage(db, gen, profile, {
    sessionId: body.sessionId,
    message: body.message,
  });
  persistSoon();
  return result;
}

export async function translateText(
  text: string,
  cachedOnly?: boolean
): Promise<{ translation: string | null }> {
  const { db } = await browserDb();
  const coreP = await import("@/core/profile");
  const coreT = await import("@/core/translate");
  const profile = coreP.getActiveProfile(db);
  if (!profile) return { translation: null };
  const normalized = coreT.normalizeTranslateText(text);
  const cached = normalized
    ? coreT.cachedTranslation(
        db,
        profile.targetLanguage,
        normalized,
        profile.nativeLanguage ?? "tr"
      )
    : null;
  if (cached || cachedOnly) return { translation: cached };
  const gen = await browserGen();
  const coreG = await import("@/core/llm-gen");
  const { persistSoon } = await browserDb();
  const translation = await coreG.freshTranslation(db, gen, profile, normalized);
  persistSoon();
  return { translation: translation || null };
}

// ------------------------------------------------------------------ Save (statik: tarayıcı imajı)

export async function saveExportApi(): Promise<void> {
  const handle = await browserDb();
  await handle.persistNow();
  const bytes = handle.exportBytes();
  const stamp = new Date().toISOString().slice(0, 10);
  const blob = new Blob([bytes.buffer as ArrayBuffer], {
    type: "application/octet-stream",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `language-tutor-save-${stamp}.db`;
  a.click();
  URL.revokeObjectURL(url);
  // A manual download counts as a backup — reset the reminder (T-032).
  const { recordManualExport } = await import("@/lib/backup/controller");
  recordManualExport();
}

// ------------------------------------------------------------------ Bulut save-sync (T-047)
//
// Üçüncü yol: statik mod + oturum açılmış → kendi Worker API'mize senkron.
// Kaldırılan Drive yedeklemesinin (T-032/T-050) R2 ardılı; mantık
// src/lib/backup/cloud.ts'te, burası yalnız seam. Manuel: otomatik yükleme
// YOK (multi-MB blob her yazımda R2 Class A + kullanıcı uplink'i yakar).
//
// Sunuculu modda bulut senkronu yok: orada save zaten diskte, kendi .bak'ıyla.
// UI T-048'in işi — burada yalnız çağrılabilir fonksiyonlar var.

export async function cloudPush(): Promise<import("@/lib/backup/cloud").PushResult> {
  const { pushToCloud } = await import("@/lib/backup/cloud");
  return pushToCloud();
}

export async function cloudPull(): Promise<import("@/lib/backup/cloud").PullResult> {
  const { pullFromCloud } = await import("@/lib/backup/cloud");
  return pullFromCloud();
}

export async function cloudInfo(): Promise<import("@/lib/backup/cloud").CloudSaveInfo> {
  const { getCloudInfo } = await import("@/lib/backup/cloud");
  return getCloudInfo();
}

/** Is cloud sync available here (i.e. is the user signed in)? */
export async function cloudAvailable(): Promise<boolean> {
  const { isSignedIn } = await import("@/lib/backup/cloud");
  return isSignedIn();
}

export async function saveImportApi(file: File): Promise<void> {
  // T-041 S4: boyutu wasm'a DOKUNMADAN önce ele. `browserDb()` sql.js'i
  // başlatır ve `file.arrayBuffer()` dosyayı belleğe alır — çok-GB'lık sahte
  // bir "save" ikisinden önce reddedilmeli.
  const { MAX_SAVE_BYTES } = await import("@/lib/save/limits");
  if (file.size > MAX_SAVE_BYTES) {
    throw new AppError("save_invalid");
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  // Başlık + şema sürümü + kötücül trigger/view kontrolü tek yerde:
  // importBytes → validateSaveImage (src/lib/backup/save-image.ts). Buradaki
  // kopya doğrulama T-041'de kaldırıldı — iki ayrı validator ikisinin
  // birbirinden ayrışmasına yol açıyordu.
  const handle = await browserDb();
  await handle.importBytes(bytes);
}

// ------------------------------------------------------------------ LLM gerektiren aksiyonlar (statik gate)

export async function regenerateLesson(
  nodeId: string,
  feedback?: string | null
): Promise<void> {
  const gen = await browserGen();
  const { db, persistSoon } = await browserDb();
  const coreG = await import("@/core/llm-gen");
  await coreG.generateLessonContent(db, gen, nodeId, feedback);
  persistSoon();
}

// There is no jobs table and therefore no (jobType, refId) dedupe: without
// this guard every extra click on a generate/extend button (or an impatient
// reload-and-click) would start a REAL second multi-minute LLM generation and
// burn money. One in-flight chapter generation per profile; concurrent
// callers JOIN the running one. The promise self-clears when it settles; a
// full page reload kills the generation with the JS context, so a stale
// entry cannot outlive the work it guards.
const inflightChapterGen = new Map<string, Promise<void>>();

function joinChapterGen(
  profileId: string,
  start: () => Promise<void>
): Promise<void> {
  const running = inflightChapterGen.get(profileId);
  if (running) return running;
  const p = start().finally(() => inflightChapterGen.delete(profileId));
  inflightChapterGen.set(profileId, p);
  return p;
}

export async function curriculumExtend(profileId: string): Promise<void> {
  return joinChapterGen(profileId, () => curriculumExtendInline(profileId));
}

async function curriculumExtendInline(profileId: string): Promise<void> {
  const gen = await browserGen();
  const handle = await browserDb();
  const coreP = await import("@/core/profile");
  const coreC = await import("@/core/curriculum-gen");
  const { nextLevelFor } = await import("@/lib/curriculum/levels");
  const { eq } = await import("drizzle-orm");
  const tables = await import("@/db/schema");
  const profile = coreP.getActiveProfile(handle.db);
  if (!profile || profile.id !== profileId) throw new AppError("profile_mismatch");
  const curriculum = handle.db
    .select()
    .from(tables.curricula)
    .where(eq(tables.curricula.profileId, profileId))
    .limit(1)
    .get();
  if (!curriculum) throw new AppError("curriculum_missing");
  const top = coreC.topChapterLevel(handle.db, curriculum.id, profile.targetLanguage);
  const next = top ? nextLevelFor(profile.targetLanguage, top) : null;
  if (!next) throw new AppError("no_level_to_extend");
  await coreC.generateChapter(handle.db, gen, profileId, next, {
    onPedagogyReady: () => handle.persistNow(),
  });
  await handle.persistNow();
}

export async function grammarGenerate(slug: string): Promise<void> {
  const gen = await browserGen();
  const { db, persistSoon } = await browserDb();
  const coreP = await import("@/core/profile");
  const coreGr = await import("@/core/grammar");
  const coreG = await import("@/core/llm-gen");
  const profile = coreP.getActiveProfile(db);
  if (!profile) throw new AppError("profile_missing");
  const topic = coreGr.findGrammarTopic(db, profile.targetLanguage, slug);
  if (!topic) throw new AppError("not_found");
  await coreG.generateGrammarContent(db, gen, topic.id);
  persistSoon();
}

export async function grammarGenerateBatch(level?: string): Promise<void> {
  // Sequential inline generation (runs as long as the tab stays open; the UI
  // already polls the status badges).
  const gen = await browserGen();
  const handle = await browserDb();
  const coreP = await import("@/core/profile");
  const coreG = await import("@/core/llm-gen");
  const { eq } = await import("drizzle-orm");
  const tables = await import("@/db/schema");
  const { grammarNeedsGeneration } = await import("@/core/grammar");
  const profile = coreP.getActiveProfile(handle.db);
  if (!profile) throw new AppError("profile_missing");
  const nativeLang = (profile.nativeLanguage ?? "tr") as "tr" | "en";
  const topics = handle.db
    .select()
    .from(tables.grammarTopics)
    .where(eq(tables.grammarTopics.targetLanguage, profile.targetLanguage))
    .all()
    // The ONE shared needs-generation definition (core) — pending/error,
    // ready-in-another-language (T-031) AND ready-but-machine-translated
    // (T-064) all count; mirrors the server route exactly.
    .filter(
      (t) =>
        (!level || t.level === level) && grammarNeedsGeneration(t, nativeLang)
    );
  const { startJob, newBatchId } = await import("@/lib/jobs-store");
  const batchId = newBatchId();
  void (async () => {
    for (const t of topics) {
      const j = startJob("grammar", t.id, batchId);
      if (j.signal.aborted) {
        j.fail(new Error("iptal edildi"));
        break;
      }
      try {
        await coreG.generateGrammarContent(handle.db, gen, t.id);
        j.done();
      } catch (err) {
        console.warn("[batch] gramer üretimi hata:", t.slug, err);
        j.fail(err);
      }
      handle.persistSoon();
    }
  })();
}

export async function kanjiGenerate(char: string): Promise<void> {
  const gen = await browserGen();
  const { db, persistSoon } = await browserDb();
  const coreP = await import("@/core/profile");
  const coreK = await import("@/core/kanji");
  const coreG = await import("@/core/llm-gen");
  const profile = coreP.getActiveProfile(db);
  if (!profile) throw new AppError("profile_missing");
  const entry = coreK.findKanji(db, profile.targetLanguage, char);
  if (!entry) throw new AppError("not_found");
  await coreG.generateKanjiContent(db, gen, entry.id);
  persistSoon();
}

export async function kanjiGenerateBatch(level: string): Promise<{ queued: number }> {
  const gen = await browserGen();
  const handle = await browserDb();
  const coreP = await import("@/core/profile");
  const coreG = await import("@/core/llm-gen");
  const { eq, and } = await import("drizzle-orm");
  const tables = await import("@/db/schema");
  const { readLangContent } = await import("@/lib/llm/lang-content");
  const profile = coreP.getActiveProfile(handle.db);
  if (!profile) throw new AppError("profile_missing");
  const nativeLang = (profile.nativeLanguage ?? "tr") as "tr" | "en";
  const entries = handle.db
    .select()
    .from(tables.kanjiEntries)
    .where(
      and(
        eq(tables.kanjiEntries.targetLanguage, profile.targetLanguage),
        eq(tables.kanjiEntries.level, level)
      )
    )
    .all()
    // Not ready IN THE CURRENT native language (mirrors the server route, T-031).
    .filter(
      (e) => e.status !== "ready" || !readLangContent(e.content, nativeLang)
    );
  const { startJob, newBatchId } = await import("@/lib/jobs-store");
  const batchId = newBatchId();
  void (async () => {
    for (const e of entries) {
      const j = startJob("kanji", e.id, batchId);
      if (j.signal.aborted) {
        j.fail(new Error("iptal edildi"));
        break;
      }
      try {
        await coreG.generateKanjiContent(handle.db, gen, e.id);
        j.done();
      } catch (err) {
        console.warn("[batch] kanji üretimi hata:", e.char, err);
        j.fail(err);
      }
      handle.persistSoon();
    }
  })();
  return { queued: entries.length };
}


export async function createProfileApi(
  input: Record<string, unknown>
): Promise<{ profile: import("@/core/profile").Profile | null }> {
  const handle = await browserDb();
  const core = await import("@/core/profile");
  const { profile, duplicate } = core.createOrReuseProfile(
    handle.db,
    input as Parameters<typeof core.createOrReuseProfile>[1]
  );
  if (duplicate) {
    throw new AppError("duplicate_profile");
  }
  await handle.persistNow();
  return { profile };
}

/**
 * Müfredatın ilk bölümünü üretir. `level` (T-082): şemanın ilk seviyesi yerine
 * hangi seviyeden BAŞLANACAĞI; öncesindeki seviyeler hiç üretilmez. Verilmezse
 * eski davranış (şemanın ilk seviyesi) birebir korunur.
 */
export async function curriculumGenerate(
  profileId: string,
  level?: string | null
): Promise<void> {
  // No job queue: generation runs inline (can take 2-5 min; the caller shows
  // its own waiting screen). A second call for the same profile JOINS the
  // running one (inflight dedupe above).
  return joinChapterGen(profileId, async () => {
    const gen = await browserGen();
    const handle = await browserDb();
    const coreC = await import("@/core/curriculum-gen");
    await coreC.generateChapter(handle.db, gen, profileId, level ?? null, {
      // Persist as soon as the pedagogy body is stored: a tab closed during
      // the multi-minute chapter call must not lose the paid meta-call.
      onPedagogyReady: () => handle.persistNow(),
    });
    await handle.persistNow();
  });
}

/**
 * T-082. Profilin TÜM müfredatını siler (bölümler, üniteler, node'lar,
 * önbellekli dersler + onların alıştırma/denemeleri). XP, seri, SRS kartları ve
 * `curriculum_pedagogy` profil düzeyindedir; hayatta kalır. Yıkıcı yazma:
 * statik modda görüntü hemen kalıcılaştırılır (persistSoon değil), yoksa sekme
 * kapanınca silme geri gelir.
 */
export async function curriculumDelete(profileId: string): Promise<{
  deleted: import("@/core/curriculum-delete").CurriculumDeletionCounts;
}> {
  const handle = await browserDb();
  const coreD = await import("@/core/curriculum-delete");
  const result = coreD.deleteCurriculum(handle.db, profileId);
  await handle.persistNow();
  return { deleted: result.deleted };
}

/**
 * T-082. Tek bir node'un önbellekli dersini atar; node'un tamamlanma durumu
 * DEĞİŞMEZ. Sonraki açılışta ders sıfırdan üretilir.
 */
export async function lessonDiscard(nodeId: string): Promise<void> {
  const handle = await browserDb();
  const coreD = await import("@/core/curriculum-delete");
  coreD.discardLesson(handle.db, nodeId);
  // Statik modda üretim durumu bellekte de tutulur; atılan dersin eski
  // hata/iptal kaydı kalırsa yeniden üretim engellenir (retryLessonGen ile
  // aynı gerekçe).
  const { clearLessonGen } = await import("@/lib/lesson-gen-store");
  clearLessonGen(nodeId);
  await handle.persistNow();
}

/**
 * T-080. Üretimin göndereceği TAM prompt: kilitli sözleşme yarıları
 * (`before`/`after`) ile düzenlenebilir pedagoji gövdesi. Profilde kullanılabilir
 * gövde yoksa derin katman meta-çağrısını burada tetikler (bir dakikayı
 * bulabilir; bekleme durumunu çağıran gösterir). `force` = kullanıcının açık
 * "yeniden yaz" isteği; el yazması bir gövdenin üzerine YALNIZ bu yazar.
 */
export async function curriculumPedagogyPreview(
  profileId: string,
  force?: boolean
): Promise<import("@/core/curriculum-gen").PedagogyPreview> {
  const gen = await browserGen();
  const handle = await browserDb();
  const coreC = await import("@/core/curriculum-gen");
  const preview = await coreC.previewCurriculumPrompt(
    handle.db,
    gen,
    profileId,
    { force }
  );
  await handle.persistNow(); // meta-çağrı gövdeyi yazdıysa kalıcı olsun
  return preview;
}

/** T-080. El ile düzenlenmiş pedagoji gövdesini profile yazar; sonraki her
 * bölüm (extend dahil) bunu kullanır. LLM çağrısı yok. */
export async function curriculumPedagogySave(
  profileId: string,
  pedagogy: string
): Promise<void> {
  const handle = await browserDb();
  const coreC = await import("@/core/curriculum-gen");
  coreC.saveCurriculumPedagogy(handle.db, profileId, pedagogy);
  await handle.persistNow();
}

/** Müfredat başlıklarını mevcut ana dile yerinde çevirir (T-031). İlerleme
 * silinmez; yalnızca görünen metinler değişir. */
export async function curriculumRetranslate(): Promise<{ translated: number }> {
  const gen = await browserGen();
  const handle = await browserDb();
  const coreP = await import("@/core/profile");
  const coreC = await import("@/core/curriculum-gen");
  const profile = coreP.getActiveProfile(handle.db);
  if (!profile) throw new AppError("profile_missing");
  const translated = await coreC.retranslateCurriculum(
    handle.db,
    gen,
    profile.id
  );
  await handle.persistNow();
  return { translated };
}

// ------------------------------------------------------------------ Gramer

export interface GrammarTopicSummary {
  slug: string;
  titleTr: string;
  category: string;
  level: string | null;
  status: "pending" | "generating" | "ready" | "error";
  /** T-064: ready but machine-translated — usable now, still upgradeable by
   * a real LLM pass; the sidebar's batch buttons count these. */
  mt: boolean;
}

export async function grammarTopics(): Promise<{ topics: GrammarTopicSummary[] }> {
  const { db, persistSoon } = await browserDb();
  const coreP = await import("@/core/profile");
  const coreG = await import("@/core/grammar");
  const profile = coreP.getActiveProfile(db);
  if (!profile) throw new AppError("profile_missing");
  const nativeLang = (profile.nativeLanguage ?? "tr") as "tr" | "en";
  let topics = coreG.listGrammarTopics(db, profile.targetLanguage, nativeLang);
  // Boş konuları paketlenmiş seed'den doldur: tr = gerçek içerik, diğer
  // native diller = build-time MT (T-064).
  if (topics.some((t) => t.status === "pending" || t.status === "error")) {
    const { fetchGrammarSeed } = await import("@/lib/grammar-seed");
    const seed = await fetchGrammarSeed(profile.targetLanguage, nativeLang);
    if (
      seed &&
      coreG.applyGrammarSeed(db, profile.targetLanguage, seed, nativeLang, nativeLang) > 0
    ) {
      topics = coreG.listGrammarTopics(db, profile.targetLanguage, nativeLang);
    }
  }
  persistSoon(); // ensureSeeded/applyGrammarSeed yazmış olabilir
  return { topics: topics as GrammarTopicSummary[] };
}

export async function grammarTopic(slug: string): Promise<{
  slug: string;
  titleTr: string;
  category: string;
  status: string;
  content: unknown | null;
}> {
  const { db, persistSoon } = await browserDb();
  const coreP = await import("@/core/profile");
  const coreG = await import("@/core/grammar");
  const profile = coreP.getActiveProfile(db);
  if (!profile) throw new AppError("profile_missing");
  const nativeLang = (profile.nativeLanguage ?? "tr") as "tr" | "en";
  let topic = coreG.findGrammarTopic(db, profile.targetLanguage, slug);
  if (!topic) throw new AppError("not_found");
  const { readLangContent } = await import("@/lib/llm/lang-content");
  // Deep link (?topic=) liste yüklenmeden gelebilir — bu dildeki slot boşsa
  // seed'den doldur. Slot-boşluğu kontrolü (salt pending/error değil): tr
  // seed'iyle dolmuş `ready` satırın en slotu da MT seed'in dolduracağı
  // boşluktur (T-064); applyGrammarSeed dolu slota zaten asla yazmaz.
  if (
    topic.status !== "generating" &&
    !readLangContent(topic.content, nativeLang)
  ) {
    const { fetchGrammarSeed } = await import("@/lib/grammar-seed");
    const seed = await fetchGrammarSeed(profile.targetLanguage, nativeLang);
    if (
      seed &&
      coreG.applyGrammarSeed(db, profile.targetLanguage, seed, nativeLang, nativeLang) > 0
    ) {
      topic = coreG.findGrammarTopic(db, profile.targetLanguage, slug) ?? topic;
      persistSoon();
    }
  }
  const { titleFor } = await import("@/lib/grammar-index");
  // Mevcut içerik satır statüsünden bağımsız okunur (sunucu route'uyla aynı):
  // ne regen sırasında ("generating" — sessizce değişir) ne de başarısız
  // regen sonrasında ("error" — eski içerik hâlâ kolonda) görünür içerik
  // ekrandan silinmez (T-064).
  const localized = readLangContent(topic.content, nativeLang);
  return {
    slug: topic.slug,
    titleTr: titleFor(profile.targetLanguage, topic.slug, topic.titleTr, nativeLang),
    category: topic.category,
    status:
      topic.status === "generating"
        ? "generating"
        : localized
          ? "ready"
          : "pending",
    content: localized,
  };
}

// ------------------------------------------------------------------ Ders akışı

export async function openNodeApi(nodeId: string): Promise<
  | import("@/core/lesson").OpenNodeResult
  | { status: "generating"; jobId: string | null }
> {
  const { db } = await browserDb();
  const core = await import("@/core/lesson");
  const coreP = await import("@/core/profile");
  const nativeLang = (coreP.getActiveProfile(db)?.nativeLanguage ?? "tr") as
    | "tr"
    | "en";
  const result = core.openNode(db, nodeId, nativeLang);
  if (result.status === "notFound") throw new AppError("not_found");
  if (result.status === "locked") throw new AppError("node_locked");
  // T-070-B: son üretim denemesi başarısız → sessiz otomatik yeniden üretim
  // YOK. Çağıran "başarısız, tekrar dene" ekranını gösterir; retry
  // kullanıcının açık eylemi (retryLessonGen).
  if (result.status === "error") {
    // Pencereyi yine de tetikle: bu ders bozuk olsa da ardılları hazırlanabilir.
    void runLessonWindow(nodeId).catch(() => {});
    return result;
  }
  if (result.status === "needsGeneration") {
    // Tarayıcı LLM'iyle inline üret (1-3 dk sürebilir; UI hazırlanıyor
    // ekranını gösterir), sonra cache'ten servis et. Prefetch aynı dersi
    // üretiyorsa ensureLessonGen aynı promise'i paylaşır. urgent: kullanıcı
    // ekranda BEKLİYOR, kuyrukta prefetch'lerin önüne geçer (T-070-D).
    await ensureLessonGen(nodeId, true);
    // Kullanıcı iptal ettiyse hata DEĞİL: "hazırlanıyor" durumunda kal,
    // çağıran zaten haritaya dönüyor. Aksi halde kendi bastığı "Vazgeç"
    // kullanıcıya "Ders hazırlanamadı" ekranı olarak geri dönerdi.
    const { lessonGenState } = await import("@/lib/lesson-gen-store");
    if (lessonGenState(nodeId)?.kind === "cancelled") {
      return { status: "generating", jobId: null };
    }
    const after = core.openNode(db, nodeId, nativeLang);
    if (after.status !== "ready") throw new AppError("lesson_gen_failed");
    // Açılan ders hazır olur olmaz pencereyi ilerlet (T-068 birinci tetik).
    void runLessonWindow(nodeId).catch(() => {});
    return after;
  }
  // Zaten hazır: T-068 birinci tetik (ders açılışı) buradan koşar.
  void runLessonWindow(nodeId).catch(() => {});
  return result;
}

/** T-070-B/C: kullanıcının açık "tekrar dene" eylemi. Store'daki hata kaydını
 * temizler ve üretimi yeniden başlatır. Varsayılan urgent (retry ekranında
 * kullanıcı bekliyor); harita rozetinden tetiklenen retry `urgent: false`
 * geçer; kullanıcı beklemiyor, o an açık dersin çağrısının önüne geçmesin. */
export async function retryLessonGen(
  nodeId: string,
  opts?: { urgent?: boolean }
): Promise<void> {
  const { clearLessonGen } = await import("@/lib/lesson-gen-store");
  clearLessonGen(nodeId);
  await ensureLessonGen(nodeId, opts?.urgent ?? true);
}

export async function completeNodeApi(nodeId: string): Promise<{
  xpAwarded: number;
  newCards: number;
  unlockedNodeIds: string[];
  extendingLevel: string | null;
}> {
  const { db, persistSoon } = await browserDb();
  const coreP = await import("@/core/profile");
  const coreL = await import("@/core/lesson");
  const profile = coreP.getActiveProfile(db);
  if (!profile) throw new AppError("profile_missing");
  const { eq } = await import("drizzle-orm");
  const tables = await import("@/db/schema");
  const node = db
    .select()
    .from(tables.nodes)
    .where(eq(tables.nodes.id, nodeId))
    .limit(1)
    .get();
  const wasCompleted = node?.status === "completed";
  const flow = coreL.completeNodeFlow(db, nodeId, profile.id);
  persistSoon();
  if (!flow) throw new AppError("not_found");

  // LLM bağlıysa: açılan dersleri arkaplanda önden üret, kuyruk
  // temizlendiyse sıradaki seviyeyi ekle (sunucudaki akışın muadili).
  const { getBrowserGen } = await import("@/lib/llm/browser-provider");
  let extendingLevel: string | null = null;
  if (getBrowserGen()) {
    // T-068 ikinci tetik: yeni aktif ders = açılan ardıl. Pencere ondan
    // itibaren n..n+2'yi doldurur; zaten hazır olanlar için sıfır çağrı.
    // (Eskiden yalnız DOĞRUDAN ardıl üretiliyordu, yani tamamla→tıkla arası
    // 5-10 sn'lik pencereye 1-3 dk'lık üretim sığmıyordu.)
    for (const unlockedId of flow.unlockedNodeIds) {
      void runLessonWindow(unlockedId).catch((err) =>
        console.warn("[prefetch] pencere hata:", unlockedId, err)
      );
    }
    if (!wasCompleted && node?.nodeType === "main") {
      extendingLevel = await maybeAutoExtendStatic(
        nodeId,
        profile.id,
        profile.targetLanguage
      );
    }
  }
  // Backup nudge + local snapshot (T-032). Static only, and
  // only for a first-time completion (re-completing an already-done node isn't
  // new progress). Best-effort — never blocks or throws into the flow.
  if (!wasCompleted && node?.nodeType === "main") {
    void import("@/lib/backup/controller")
      .then((m) => m.onLessonCompleted())
      .catch(() => {});
  }
  return { ...flow, extendingLevel };
}

export async function attemptApi(
  exerciseId: string,
  response: string,
  selfVerdict?: boolean
): Promise<
  | { needsSelfCheck: true; expected: { answer: string; acceptAlso: string[] } }
  | import("@/core/lesson").AttemptResultDto
> {
  const { db, persistSoon } = await browserDb();
  const coreP = await import("@/core/profile");
  const coreL = await import("@/core/lesson");
  const profile = coreP.getActiveProfile(db);
  if (!profile) throw new AppError("profile_missing");
  const { getBrowserGen } = await import("@/lib/llm/browser-provider");
  const gen = getBrowserGen();
  const coreG = await import("@/core/llm-gen");
  const outcome = await coreL.attemptExercise(db, {
    exerciseId,
    response,
    selfVerdict,
    profile,
    // Tarayıcı LLM'i bağlıysa gerçek değerlendirme; değilse self-check.
    llmGrade: gen ? coreG.makeLlmGrader(gen, profile, response) : undefined,
  });
  if (outcome.kind === "notFound") throw new AppError("not_found");
  persistSoon();
  if (outcome.kind === "needsSelfCheck") {
    return { needsSelfCheck: true, expected: outcome.expected };
  }
  return outcome.result;
}

// ------------------------------------------------------------------ SRS

export async function srsDue(): Promise<{
  cards: import("@/core/srs").DueCard[];
  dueCount: number;
}> {
  const { db } = await browserDb();
  const core = await import("@/core/srs");
  const result = core.srsDue(db);
  return result ?? { cards: [], dueCount: 0 };
}

export async function srsReview(
  cardId: string,
  rating: Rating
): Promise<{ remaining: number }> {
  const { db, persistSoon } = await browserDb();
  const core = await import("@/core/srs");
  const result = core.srsReview(db, cardId, rating);
  persistSoon();
  if (!result) throw new AppError("not_found");
  return result;
}

// ------------------------------------------------------------------ LLM ayarları

export interface LlmConfigDto {
  mode: "cli" | "openai" | "anthropic" | "none";
  baseUrl?: string;
  apiKeyMasked?: string;
  hasKey: boolean;
  models?: { fast?: string; balanced?: string; deep?: string };
  jsonMode?: boolean;
  concurrency?: number;
  cliAllowed: boolean;
}

function maskKey(key?: string): string | undefined {
  if (!key) return undefined;
  return key.length <= 4 ? "••••" : `••••${key.slice(-4)}`;
}

export async function llmConfigGet(): Promise<LlmConfigDto> {
  const { readBrowserLlmConfig } = await import("@/lib/llm/browser-provider");
  const c = readBrowserLlmConfig();
  return {
    mode: c?.mode ?? "none",
    baseUrl: c?.baseUrl,
    apiKeyMasked: maskKey(c?.apiKey),
    hasKey: Boolean(c?.apiKey),
    models: c?.models,
    jsonMode: c?.jsonMode,
    cliAllowed: false, // statikte CLI yok — çağrılar tarayıcıdan çıkar
  };
}

export interface LlmConfigPutInput {
  mode: string;
  baseUrl?: string;
  apiKey?: string;
  models?: { fast?: string; balanced?: string; deep?: string };
  jsonMode?: boolean;
}

export async function llmConfigPut(input: LlmConfigPutInput): Promise<void> {
  const { readBrowserLlmConfig, writeBrowserLlmConfig } = await import(
    "@/lib/llm/browser-provider"
  );
  const { mergeLlmConfig } = await import("@/lib/llm/config-merge");
  const existing = readBrowserLlmConfig();
  // Same rule as the server route (config-merge.ts): an empty/masked apiKey
  // input preserves the stored key only when saving onto the SAME (mode,
  // baseUrl) endpoint — otherwise a key typed for one provider would ride
  // along onto a different one when the user switches providers.
  const merged = mergeLlmConfig(
    existing ? { mode: existing.mode, baseUrl: existing.baseUrl, apiKey: existing.apiKey } : null,
    { mode: input.mode, baseUrl: input.baseUrl, apiKey: input.apiKey }
  );
  writeBrowserLlmConfig({
    mode: (input.mode === "cli" ? "none" : input.mode) as
      | "openai"
      | "anthropic"
      | "none",
    baseUrl: merged.baseUrl,
    apiKey: merged.apiKey,
    models: input.models,
    jsonMode: input.jsonMode,
  });
}

/** T-066: `candidate` tests an UNSAVED config (the "test before save" path —
 * see LlmSetupWizard's testAndSave) without persisting anything. Omitted =
 * test the SAVED config (LlmAdvancedPanel's separate "Test connection"
 * button keeps this behaviour by design — it has its own Save button). */
export async function llmTest(
  candidate?: LlmConfigPutInput
): Promise<{ ok: boolean; ms?: number; error?: string }> {
  if (candidate) {
    const { probeBrowserConfig } = await import("@/lib/llm/browser-provider");
    return probeBrowserConfig({
      mode: (candidate.mode === "cli" ? "none" : candidate.mode) as
        | "openai"
        | "anthropic"
        | "none",
      baseUrl: candidate.baseUrl,
      apiKey: candidate.apiKey,
      models: candidate.models,
      jsonMode: candidate.jsonMode,
    });
  }
  const started = Date.now();
  try {
    const gen = await browserGen();
    const { z } = await import("zod");
    const result = await gen.generateJson({
      system: "Kısa cevap ver.",
      prompt: 'JSON döndür: {"ok": true}',
      schema: z.object({ ok: z.boolean() }),
      fixtureKey: "smoke",
      tier: "fast",
      timeoutMs: 60_000,
    });
    return { ok: result.ok === true, ms: Date.now() - started };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ------------------------------------------------------------------ Job queue (T-034)
// Shared seam for the pop + panel UI, fed by the in-browser store
// (src/lib/jobs-store.ts); there is no jobs table.

export async function jobsList(): Promise<import("@/core/jobs").JobsSnapshot> {
  const { snapshotJobs } = await import("@/lib/jobs-store");
  return snapshotJobs();
}

export async function cancelJobApi(jobId: string): Promise<void> {
  const { cancelJobLocal } = await import("@/lib/jobs-store");
  cancelJobLocal(jobId);
}

export async function cancelAllJobsApi(includeSystem = false): Promise<void> {
  const { cancelAllJobsLocal } = await import("@/lib/jobs-store");
  cancelAllJobsLocal({ userOnly: !includeSystem });
}

/**
 * Subscribe to job changes (browser store). `cb` fires on every fresh
 * snapshot; the returned function closes the subscription.
 */
export function onJobsChange(
  cb: (snap: import("@/core/jobs").JobsSnapshot) => void
): () => void {
  let unsub = () => {};
  void (async () => {
    const { subscribeJobs } = await import("@/lib/jobs-store");
    const push = () => void jobsList().then(cb).catch(() => {});
    push();
    unsub = subscribeJobs(push);
  })();
  return () => unsub();
}
