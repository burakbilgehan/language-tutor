"use client";

// İstemci veri katmanı seam'i. İki mod:
//   - Sunuculu (bugünkü varsayılan): /api/* fetch — davranış birebir eski.
//   - Statik (NEXT_PUBLIC_STATIC_BUILD=1): aynı iş mantığı (src/core/*)
//     tarayıcıdaki sql.js DB'siyle çalışır; ağ çağrısı yok.
// Bileşenler fetch yerine bu fonksiyonları çağırır; taşınan her route buraya
// bir fonksiyon olarak eklenir.

import type { Rating } from "@/lib/srs";

export const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_BUILD === "1";

let seeded = false;

async function browserDb() {
  // Dinamik import: sunuculu modda sql.js istemci bundle'ına hiç girmez.
  const { getBrowserDb } = await import("@/db/browser");
  const handle = await getBrowserDb();

  // POC geçici iskele: tarayıcı DB'si boşsa (profil yok) dev sunucusundan
  // save çekip tohumla. Gerçek statik deploy'da /api yok → sessizce atlanır;
  // kalıcı akış Settings'teki dosya import'u olacak (T-009 kapsamı).
  if (!seeded) {
    seeded = true;
    const core = await import("@/core/profile");
    if (!core.getActiveProfile(handle.db)) {
      try {
        const res = await fetch("/api/save/export");
        if (res.ok) {
          const bytes = new Uint8Array(await res.arrayBuffer());
          await handle.importBytes(bytes);
          console.log("[browser-db] dev seed: sunucu save'i yüklendi");
        }
      } catch {
        // statik ortam — seed yok, boş DB ile devam
      }
    }
  }
  return handle;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ------------------------------------------------------------------ Harita / Profil / Stats

export async function roadmap(): Promise<import("@/core/roadmap").Roadmap> {
  if (!IS_STATIC) return fetchJson("/api/roadmap");
  const { db } = await browserDb();
  const coreP = await import("@/core/profile");
  const coreR = await import("@/core/roadmap");
  const profile = coreP.getActiveProfile(db);
  if (!profile) throw new Error("Profil yok");
  const result = coreR.getRoadmap(db, profile.id);
  if (!result) throw new Error("Müfredat hazır değil");
  return result;
}

export interface ProfileData {
  profile: import("@/core/profile").Profile | null;
  profiles: {
    id: string;
    displayName: string;
    targetLanguage: string;
    selfLevel: string;
    isActive: boolean;
  }[];
}

export async function profileData(): Promise<ProfileData> {
  if (!IS_STATIC) return fetchJson("/api/profile");
  const { db } = await browserDb();
  const core = await import("@/core/profile");
  return {
    profile: core.getActiveProfile(db),
    profiles: core.listProfiles(db),
  };
}

export async function patchProfile(
  patch: Record<string, unknown>
): Promise<{ profile: import("@/core/profile").Profile }> {
  if (!IS_STATIC) {
    return fetchJson("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  }
  const { db, persistSoon } = await browserDb();
  const core = await import("@/core/profile");
  const profile = core.updateActiveProfile(
    db,
    patch as Parameters<typeof core.updateActiveProfile>[1]
  );
  persistSoon();
  if (!profile) throw new Error("Profil bulunamadı");
  return { profile };
}

export async function switchProfile(profileId: string): Promise<void> {
  if (!IS_STATIC) {
    await fetchJson("/api/profile/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId }),
    });
    return;
  }
  const handle = await browserDb();
  const core = await import("@/core/profile");
  if (!core.setActiveProfile(handle.db, profileId))
    throw new Error("Profil bulunamadı");
  // Çağıran hemen full-reload yapar — debounce yerine yazmayı BEKLE, yoksa
  // switch yarışta kaybolur ve eski profil geri gelir.
  await handle.persistNow();
}

export async function stats(): Promise<ReturnType<typeof import("@/core/stats").getStats>> {
  if (!IS_STATIC) return fetchJson("/api/stats");
  const { db } = await browserDb();
  const core = await import("@/core/stats");
  return core.getStats(db);
}

/** Statikte aktif tarayıcı LLM'i; yapılandırılmamışsa net mesajla düşer. */
async function browserGen() {
  const { getBrowserGen } = await import("@/lib/llm/browser-provider");
  const gen = getBrowserGen();
  if (!gen) {
    throw new Error(
      "LLM yapılandırılmamış — Ayarlar → LLM Sağlayıcı'dan köprü/Ollama/API key bağla."
    );
  }
  return gen;
}

/** Statikte ders üretimi tekilleştirme (sunucudaki ensureLessonJob muadili):
 * prefetch + kullanıcının dersi açması aynı anda gelirse tek üretime iner. */
const lessonGenInFlight = new Map<string, Promise<void>>();
function ensureLessonGen(nodeId: string): Promise<void> {
  const existing = lessonGenInFlight.get(nodeId);
  if (existing) return existing;
  const p = (async () => {
    const gen = await browserGen();
    const { db, persistSoon } = await browserDb();
    const coreG = await import("@/core/llm-gen");
    await coreG.generateLessonContent(db, gen, nodeId);
    persistSoon();
  })().finally(() => lessonGenInFlight.delete(nodeId));
  lessonGenInFlight.set(nodeId, p);
  return p;
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
      await coreC.generateChapter(handle.db, gen, profileId, next);
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
  if (!IS_STATIC) return fetchJson("/api/kanji");
  const { db, persistSoon } = await browserDb();
  const coreP = await import("@/core/profile");
  const coreK = await import("@/core/kanji");
  const profile = coreP.getActiveProfile(db);
  if (!profile) throw new Error("Profil yok");
  const entries = coreK.listKanji(db, profile.targetLanguage);
  persistSoon(); // seed yeni satır eklemiş olabilir
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
  if (!IS_STATIC) return fetchJson(`/api/kanji/${encodeURIComponent(char)}`);
  const { db } = await browserDb();
  const coreP = await import("@/core/profile");
  const coreK = await import("@/core/kanji");
  const profile = coreP.getActiveProfile(db);
  if (!profile) throw new Error("Profil yok");
  const entry = coreK.findKanji(db, profile.targetLanguage, char);
  if (!entry) throw new Error("Kanji bulunamadı");
  return {
    char: entry.char,
    level: entry.level,
    onyomi: entry.onyomi,
    kunyomi: entry.kunyomi,
    meaningsEn: entry.meaningsEn,
    status: entry.status,
    content: entry.status === "ready" ? entry.content : null,
  };
}

export type KanjiLookupResult = ReturnType<
  typeof import("@/core/kanji").kanjiLookup
>;

export async function kanjiLookupApi(text: string): Promise<KanjiLookupResult> {
  if (!IS_STATIC)
    return fetchJson(`/api/kanji/lookup?text=${encodeURIComponent(text)}`);
  const { db } = await browserDb();
  const coreP = await import("@/core/profile");
  const coreK = await import("@/core/kanji");
  const profile = coreP.getActiveProfile(db);
  if (!profile) throw new Error("Profil yok");
  return coreK.kanjiLookup(db, profile.targetLanguage, text);
}

// ------------------------------------------------------------------ Overview / Chat / Çeviri

export async function overview(): Promise<
  ReturnType<typeof import("@/core/overview").getOverview>
> {
  if (!IS_STATIC) return fetchJson("/api/overview");
  const { db } = await browserDb();
  const coreP = await import("@/core/profile");
  const coreO = await import("@/core/overview");
  const profile = coreP.getActiveProfile(db);
  if (!profile) throw new Error("Profil yok");
  return coreO.getOverview(db, profile);
}

export async function chatHistoryApi(): Promise<{
  sessionId: string | null;
  messages: { role: string; content: string }[];
}> {
  if (!IS_STATIC) return fetchJson("/api/chat");
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
  if (!IS_STATIC) {
    return fetchJson("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }
  const gen = await browserGen();
  const { db, persistSoon } = await browserDb();
  const coreP = await import("@/core/profile");
  const coreG = await import("@/core/llm-gen");
  const profile = coreP.getActiveProfile(db);
  if (!profile) throw new Error("Profil yok");
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
  if (!IS_STATIC) {
    return fetchJson("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cachedOnly ? { text, cachedOnly: true } : { text }),
    });
  }
  const { db } = await browserDb();
  const coreP = await import("@/core/profile");
  const coreT = await import("@/core/translate");
  const profile = coreP.getActiveProfile(db);
  if (!profile) return { translation: null };
  const normalized = coreT.normalizeTranslateText(text);
  const cached = normalized
    ? coreT.cachedTranslation(db, profile.targetLanguage, normalized)
    : null;
  if (cached || cachedOnly) return { translation: cached };
  const gen = await browserGen();
  const coreG = await import("@/core/llm-gen");
  const { persistSoon } = await browserDb();
  const translation = await coreG.freshTranslation(db, gen, profile, normalized);
  persistSoon();
  return { translation: translation || null };
}

// ------------------------------------------------------------------ Quest

export async function questStart(nodeId: string): Promise<{
  node: { id: string; titleTr: string; xpReward: number };
  quest: unknown;
}> {
  if (!IS_STATIC) {
    return fetchJson(`/api/quests/${nodeId}/start`, { method: "POST" });
  }
  const { db } = await browserDb();
  const coreQ = await import("@/core/quest");
  const cached = coreQ.getQuestCached(db, nodeId);
  if (cached.status === "notFound") throw new Error("Yan görev bulunamadı");
  if (cached.status === "ready")
    return { node: cached.node, quest: cached.quest };
  const gen = await browserGen();
  const coreP = await import("@/core/profile");
  const coreG = await import("@/core/llm-gen");
  const { persistSoon } = await browserDb();
  const profile = coreP.getActiveProfile(db);
  if (!profile) throw new Error("Profil yok");
  const payload = await coreG.generateQuestPayload(db, gen, profile, cached.node);
  persistSoon();
  return {
    node: {
      id: cached.node.id,
      titleTr: cached.node.titleTr,
      xpReward: cached.node.xpReward,
    },
    quest: payload,
  };
}

// ------------------------------------------------------------------ Save (statik: tarayıcı imajı)

export async function saveExportApi(): Promise<void> {
  if (!IS_STATIC) {
    window.location.href = "/api/save/export";
    return;
  }
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
}

export async function saveImportApi(file: File): Promise<void> {
  if (!IS_STATIC) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/save/import", { method: "POST", body: fd });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error ?? "Yüklenemedi");
    return;
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  // Sunucu import'uyla aynı kontroller: SQLite başlığı + şema sürümü.
  const header = new TextDecoder().decode(bytes.slice(0, 15));
  if (header !== "SQLite format 3") {
    throw new Error("Geçersiz kayıt dosyası (SQLite değil)");
  }
  const { SAVE_SCHEMA_VERSION } = await import("@/lib/save/version");
  const initSqlJs = (await import("sql.js")).default;
  const { withBase } = await import("@/lib/base-path");
  const SQL = await initSqlJs({ locateFile: (f: string) => withBase(`/${f}`) });
  const probe = new SQL.Database(bytes);
  try {
    const res = probe.exec(
      "SELECT value FROM save_meta WHERE key='schemaVersion'"
    );
    const version = Number(res[0]?.values?.[0]?.[0]);
    if (version !== SAVE_SCHEMA_VERSION) {
      throw new Error(
        `Kayıt sürümü uyumsuz (dosya: v${version || "?"}, uygulama: v${SAVE_SCHEMA_VERSION})`
      );
    }
  } finally {
    probe.close();
  }
  const handle = await browserDb();
  await handle.importBytes(bytes);
}

// ------------------------------------------------------------------ LLM gerektiren aksiyonlar (statik gate)

export async function regenerateLesson(nodeId: string): Promise<void> {
  if (!IS_STATIC) {
    const res = await fetch(`/api/nodes/${nodeId}/regenerate`, { method: "POST" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message ?? body.error ?? "Yenilenemedi");
    }
    return;
  }
  const gen = await browserGen();
  const { db, persistSoon } = await browserDb();
  const coreG = await import("@/core/llm-gen");
  await coreG.generateLessonContent(db, gen, nodeId);
  persistSoon();
}

export async function curriculumExtend(profileId: string): Promise<{ jobId?: string }> {
  if (!IS_STATIC) {
    return fetchJson("/api/curriculum/extend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId }),
    });
  }
  const gen = await browserGen();
  const handle = await browserDb();
  const coreP = await import("@/core/profile");
  const coreC = await import("@/core/curriculum-gen");
  const { nextLevelFor } = await import("@/lib/curriculum/levels");
  const { eq } = await import("drizzle-orm");
  const tables = await import("@/db/schema");
  const profile = coreP.getActiveProfile(handle.db);
  if (!profile || profile.id !== profileId) throw new Error("Profil uyuşmadı");
  const curriculum = handle.db
    .select()
    .from(tables.curricula)
    .where(eq(tables.curricula.profileId, profileId))
    .limit(1)
    .get();
  if (!curriculum) throw new Error("Müfredat yok");
  const top = coreC.topChapterLevel(handle.db, curriculum.id, profile.targetLanguage);
  const next = top ? nextLevelFor(profile.targetLanguage, top) : null;
  if (!next) throw new Error("Uzatılacak seviye kalmadı");
  await coreC.generateChapter(handle.db, gen, profileId, next);
  await handle.persistNow();
  return {};
}

export async function grammarGenerate(slug: string): Promise<void> {
  if (!IS_STATIC) {
    await fetch(`/api/grammar/${slug}`, { method: "POST" });
    return;
  }
  const gen = await browserGen();
  const { db, persistSoon } = await browserDb();
  const coreP = await import("@/core/profile");
  const coreGr = await import("@/core/grammar");
  const coreG = await import("@/core/llm-gen");
  const profile = coreP.getActiveProfile(db);
  if (!profile) throw new Error("Profil yok");
  const topic = coreGr.findGrammarTopic(db, profile.targetLanguage, slug);
  if (!topic) throw new Error("Konu bulunamadı");
  await coreG.generateGrammarContent(db, gen, topic.id);
  persistSoon();
}

export async function grammarGenerateBatch(level?: string): Promise<void> {
  if (!IS_STATIC) {
    await fetch("/api/grammar/generate-batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level }),
    });
    return;
  }
  // Statik: sıralı inline üretim (sekme açık kaldıkça sürer; UI zaten
  // durum rozetlerini poll'luyor).
  const gen = await browserGen();
  const handle = await browserDb();
  const coreP = await import("@/core/profile");
  const coreG = await import("@/core/llm-gen");
  const { eq, and, inArray } = await import("drizzle-orm");
  const tables = await import("@/db/schema");
  const profile = coreP.getActiveProfile(handle.db);
  if (!profile) throw new Error("Profil yok");
  const topics = handle.db
    .select()
    .from(tables.grammarTopics)
    .where(
      and(
        eq(tables.grammarTopics.targetLanguage, profile.targetLanguage),
        inArray(tables.grammarTopics.status, ["pending", "error"])
      )
    )
    .all()
    .filter((t) => !level || t.level === level);
  for (const t of topics) {
    try {
      await coreG.generateGrammarContent(handle.db, gen, t.id);
    } catch (err) {
      console.warn("[batch] gramer üretimi hata:", t.slug, err);
    }
    handle.persistSoon();
  }
}

export async function kanjiGenerate(char: string): Promise<void> {
  if (!IS_STATIC) {
    await fetch(`/api/kanji/${encodeURIComponent(char)}`, { method: "POST" });
    return;
  }
  const gen = await browserGen();
  const { db, persistSoon } = await browserDb();
  const coreP = await import("@/core/profile");
  const coreK = await import("@/core/kanji");
  const coreG = await import("@/core/llm-gen");
  const profile = coreP.getActiveProfile(db);
  if (!profile) throw new Error("Profil yok");
  const entry = coreK.findKanji(db, profile.targetLanguage, char);
  if (!entry) throw new Error("Kanji bulunamadı");
  await coreG.generateKanjiContent(db, gen, entry.id);
  persistSoon();
}

export async function kanjiGenerateBatch(level: string): Promise<{ queued: number }> {
  if (!IS_STATIC) {
    return fetchJson("/api/kanji/generate-batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level }),
    });
  }
  const gen = await browserGen();
  const handle = await browserDb();
  const coreP = await import("@/core/profile");
  const coreG = await import("@/core/llm-gen");
  const { eq, and, inArray } = await import("drizzle-orm");
  const tables = await import("@/db/schema");
  const profile = coreP.getActiveProfile(handle.db);
  if (!profile) throw new Error("Profil yok");
  const entries = handle.db
    .select()
    .from(tables.kanjiEntries)
    .where(
      and(
        eq(tables.kanjiEntries.targetLanguage, profile.targetLanguage),
        eq(tables.kanjiEntries.level, level),
        inArray(tables.kanjiEntries.status, ["pending", "error"])
      )
    )
    .all();
  void (async () => {
    for (const e of entries) {
      try {
        await coreG.generateKanjiContent(handle.db, gen, e.id);
      } catch (err) {
        console.warn("[batch] kanji üretimi hata:", e.char, err);
      }
      handle.persistSoon();
    }
  })();
  return { queued: entries.length };
}


export async function createProfileApi(
  input: Record<string, unknown>
): Promise<{ profile: import("@/core/profile").Profile | null }> {
  if (!IS_STATIC) {
    return fetchJson("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  }
  const handle = await browserDb();
  const core = await import("@/core/profile");
  if (core.findProfileByLanguage(handle.db, String(input.targetLanguage))) {
    throw new Error(
      "Bu dil için zaten bir profil var. Ayarlardan geçiş yapabilirsin."
    );
  }
  const profile = core.createProfile(
    handle.db,
    input as Parameters<typeof core.createProfile>[1]
  );
  await handle.persistNow();
  return { profile };
}

export async function curriculumGenerate(profileId: string): Promise<{ jobId?: string }> {
  if (!IS_STATIC) {
    return fetchJson("/api/curriculum/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId }),
    });
  }
  // Statik: job kuyruğu yok — üretim inline (2-5 dk sürebilir; çağıran
  // bekleme ekranını kendisi gösterir). jobId dönmez.
  const gen = await browserGen();
  const handle = await browserDb();
  const coreC = await import("@/core/curriculum-gen");
  await coreC.generateChapter(handle.db, gen, profileId, null);
  await handle.persistNow();
  return {};
}

// ------------------------------------------------------------------ Gramer

export interface GrammarTopicSummary {
  slug: string;
  titleTr: string;
  category: string;
  level: string | null;
  status: "pending" | "generating" | "ready" | "error";
}

export async function grammarTopics(): Promise<{ topics: GrammarTopicSummary[] }> {
  if (!IS_STATIC) return fetchJson("/api/grammar");
  const { db, persistSoon } = await browserDb();
  const coreP = await import("@/core/profile");
  const coreG = await import("@/core/grammar");
  const profile = coreP.getActiveProfile(db);
  if (!profile) throw new Error("Profil yok");
  const topics = coreG.listGrammarTopics(db, profile.targetLanguage);
  persistSoon(); // ensureSeeded yeni satır eklemiş olabilir
  return { topics: topics as GrammarTopicSummary[] };
}

export async function grammarTopic(slug: string): Promise<{
  slug: string;
  titleTr: string;
  category: string;
  status: string;
  content: unknown | null;
}> {
  if (!IS_STATIC) return fetchJson(`/api/grammar/${slug}`);
  const { db } = await browserDb();
  const coreP = await import("@/core/profile");
  const coreG = await import("@/core/grammar");
  const profile = coreP.getActiveProfile(db);
  if (!profile) throw new Error("Profil yok");
  const topic = coreG.findGrammarTopic(db, profile.targetLanguage, slug);
  if (!topic) throw new Error("Konu bulunamadı");
  return {
    slug: topic.slug,
    titleTr: topic.titleTr,
    category: topic.category,
    status: topic.status,
    content: topic.status === "ready" ? topic.content : null,
  };
}

// ------------------------------------------------------------------ Ders akışı

export async function openNodeApi(nodeId: string): Promise<
  | import("@/core/lesson").OpenNodeResult
  | { status: "generating"; jobId: string | null }
> {
  if (!IS_STATIC) {
    return fetchJson(`/api/nodes/${nodeId}/open`, { method: "POST" });
  }
  const { db } = await browserDb();
  const core = await import("@/core/lesson");
  const result = core.openNode(db, nodeId);
  if (result.status === "notFound") throw new Error("Ders bulunamadı");
  if (result.status === "locked") throw new Error("Bu ders henüz kilitli");
  if (result.status === "needsGeneration") {
    // Tarayıcı LLM'iyle inline üret (1-3 dk sürebilir; UI hazırlanıyor
    // ekranını gösterir), sonra cache'ten servis et. Prefetch aynı dersi
    // üretiyorsa ensureLessonGen aynı promise'i paylaşır.
    await ensureLessonGen(nodeId);
    const after = core.openNode(db, nodeId);
    if (after.status !== "ready") throw new Error("Ders üretimi tamamlanamadı");
    return after;
  }
  return result;
}

export async function completeNodeApi(nodeId: string): Promise<{
  xpAwarded: number;
  newCards: number;
  unlockedNodeIds: string[];
  extendingLevel: string | null;
}> {
  if (!IS_STATIC) {
    return fetchJson(`/api/nodes/${nodeId}/complete`, { method: "POST" });
  }
  const { db, persistSoon } = await browserDb();
  const coreP = await import("@/core/profile");
  const coreL = await import("@/core/lesson");
  const profile = coreP.getActiveProfile(db);
  if (!profile) throw new Error("Profil yok");
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
  if (!flow) throw new Error("Ders bulunamadı");

  // LLM bağlıysa: açılan dersleri arkaplanda önden üret, kuyruk
  // temizlendiyse sıradaki seviyeyi ekle (sunucudaki akışın muadili).
  const { getBrowserGen } = await import("@/lib/llm/browser-provider");
  let extendingLevel: string | null = null;
  if (getBrowserGen()) {
    for (const unlockedId of flow.unlockedNodeIds) {
      void ensureLessonGen(unlockedId).catch((err) =>
        console.warn("[prefetch] ders üretimi hata:", unlockedId, err)
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
  if (!IS_STATIC) {
    return fetchJson(`/api/exercises/${exerciseId}/attempt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        selfVerdict === undefined ? { response } : { response, selfVerdict }
      ),
    });
  }
  const { db, persistSoon } = await browserDb();
  const coreP = await import("@/core/profile");
  const coreL = await import("@/core/lesson");
  const profile = coreP.getActiveProfile(db);
  if (!profile) throw new Error("Profil yok");
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
  if (outcome.kind === "notFound") throw new Error("Alıştırma bulunamadı");
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
  if (!IS_STATIC) return fetchJson("/api/srs/due");
  const { db } = await browserDb();
  const core = await import("@/core/srs");
  const result = core.srsDue(db);
  return result ?? { cards: [], dueCount: 0 };
}

export async function srsReview(
  cardId: string,
  rating: Rating
): Promise<{ remaining: number }> {
  if (!IS_STATIC) {
    return fetchJson("/api/srs/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId, rating }),
    });
  }
  const { db, persistSoon } = await browserDb();
  const core = await import("@/core/srs");
  const result = core.srsReview(db, cardId, rating);
  persistSoon();
  if (!result) throw new Error("Kart bulunamadı");
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
  cliAllowed: boolean;
}

function maskKey(key?: string): string | undefined {
  if (!key) return undefined;
  return key.length <= 4 ? "••••" : `••••${key.slice(-4)}`;
}

export async function llmConfigGet(): Promise<LlmConfigDto> {
  if (!IS_STATIC) return fetchJson("/api/llm-config");
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

export async function llmConfigPut(input: {
  mode: string;
  baseUrl?: string;
  apiKey?: string;
  models?: { fast?: string; balanced?: string; deep?: string };
  jsonMode?: boolean;
}): Promise<void> {
  if (!IS_STATIC) {
    await fetchJson("/api/llm-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return;
  }
  const { readBrowserLlmConfig, writeBrowserLlmConfig } = await import(
    "@/lib/llm/browser-provider"
  );
  const existing = readBrowserLlmConfig();
  const keyLooksMasked = input.apiKey?.startsWith("••••");
  writeBrowserLlmConfig({
    mode: (input.mode === "cli" ? "none" : input.mode) as
      | "openai"
      | "anthropic"
      | "none",
    baseUrl: input.baseUrl,
    apiKey:
      input.apiKey && !keyLooksMasked ? input.apiKey : existing?.apiKey,
    models: input.models,
    jsonMode: input.jsonMode,
  });
}

export async function llmTest(): Promise<{ ok: boolean; ms?: number; error?: string }> {
  if (!IS_STATIC) {
    const res = await fetch("/api/health/llm", { method: "POST" });
    return res.json();
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
