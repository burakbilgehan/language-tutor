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
    // Tarayıcı LLM katmanı gelene kadar: üretilmemiş ders statikte açılamaz.
    throw new Error(
      "Bu ders henüz üretilmemiş. (Statik mod: tarayıcı LLM katmanı yolda)"
    );
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
  const flow = coreL.completeNodeFlow(db, nodeId, profile.id);
  persistSoon();
  if (!flow) throw new Error("Ders bulunamadı");
  return { ...flow, extendingLevel: null }; // auto-extend LLM katmanıyla gelecek
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
  const outcome = await coreL.attemptExercise(db, {
    exerciseId,
    response,
    selfVerdict,
    profile,
    // llmGrade yok → compare miss'te self-check protokolü. Tarayıcı LLM
    // katmanı geldiğinde buradan beslenecek.
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
