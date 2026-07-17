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
