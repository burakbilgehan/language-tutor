import { and, asc, eq } from "drizzle-orm";
import * as tables from "@/db/schema";
import type { LessonContent } from "@/lib/llm/schemas";
import { readLangContent, type NativeLang } from "@/lib/llm/lang-content";
import type { AppDb } from "./db-types";

// T-068: ders prefetch penceresi. Tek invariant, iki mod:
// "aktif ders n ise n..n+k içerikli olmalı" (k=2).
//
// Buradaki her şey SAF okuma: hangi node'ların üretilmesi gerektiğini döner,
// üretimi başlatmaz. Yürütücü mod başına tek satır:
//   sunucu  → targets.forEach((id) => ensureLessonJob(id, nativeLang))
//   statik  → targets.forEach((id) => void ensureLessonGen(id))
// Dedup iki tarafta da mevcut (createJob (jobType,refId) tekilleştirmesi /
// lessonGenInFlight), yani aynı hedefi iki tetikten görmek bedava.

/** Zincirde ileri yürürken güvenlik tavanı: bozuk/çevrimsel prereq verisi
 * sonsuz döngüye çevirmesin. k=2 için fazlasıyla geniş. */
const MAX_WALK = 64;

/** Bu node'un dersi, bu ana dilde, KULLANILABİLİR mi?
 * "ready" statüsü tek başına yetmez: içerik dil-anahtarlı bir map ve başka
 * bir ana dilde üretilmiş içerik bu dil için YOK sayılır (T-031). openNode()
 * ile aynı okuma; aksi halde pencere "dolu" derken openNode hâlâ
 * needsGeneration derdi. */
function hasUsableLesson(
  db: AppDb,
  nodeId: string,
  nativeLang: NativeLang
): boolean {
  const lesson = db
    .select({
      status: tables.lessons.status,
      content: tables.lessons.content,
    })
    .from(tables.lessons)
    .where(eq(tables.lessons.nodeId, nodeId))
    .limit(1)
    .get();
  if (!lesson || lesson.status !== "ready") return false;
  return readLangContent<LessonContent>(lesson.content, nativeLang) !== null;
}

/** Son üretim denemesi başarısız mı? Bu node prefetch hedefi OLAMAZ:
 * arka planda sonsuz retry, bozuk bir prompt için sınırsız harcama demek.
 * Retry kullanıcının açık eylemi (T-070-B'nin "tekrar dene" ekranı). */
function isErrored(db: AppDb, nodeId: string): boolean {
  const lesson = db
    .select({ status: tables.lessons.status })
    .from(tables.lessons)
    .where(eq(tables.lessons.nodeId, nodeId))
    .limit(1)
    .get();
  return lesson?.status === "error";
}

/** `nodeId`'yi prereq olarak gösteren ilk main node (zincir tek parça;
 * curriculum-gen tek bir prereqNodeId zinciri kurar). */
function successorOf(db: AppDb, nodeId: string): string | null {
  const row = db
    .select({ id: tables.nodes.id })
    .from(tables.nodes)
    .where(
      and(
        eq(tables.nodes.prereqNodeId, nodeId),
        eq(tables.nodes.nodeType, "main")
      )
    )
    .orderBy(asc(tables.nodes.position))
    .limit(1)
    .get();
  return row?.id ?? null;
}

/**
 * Pencereyi doldurmak için üretilmesi gereken node id’leri, zincir sırasında
 * yakından uzağa.
 *
 * Kapsam: `activeNodeId`'nin KENDİSİ + k ardılı (varsayılan k=2 → n, n+1, n+2).
 * Anchor'ın kendisi bilerek dahil: pencerenin üçüncü tetiği (uygulama/harita
 * açılışı) frontier'dan çağrılır ve statik modda sekme kapanınca ÖLEN üretim
 * çoğu zaman tam da frontier node'un kendisidir; anchor dışlanırsa o tetik
 * kendi varlık nedenini karşılamaz. Zaten hazır olan anchor sıfır maliyetle
 * elenir, in-flight olan da executor'ın dedup'ında.
 *
 * Dışlanan: içeriği bu dilde HAZIR olanlar (sıfır LLM çağrısı: "her şey
 * hazırsa boş liste"), ve statüsü `error` olanlar (otomatik retry yok).
 * Zincir biterse pencere kısalır; auto-extend davranışı değişmez.
 *
 * Saf okuma: hiçbir şey yazmaz, hiçbir üretim başlatmaz.
 */
export function lessonWindowTargets(
  db: AppDb,
  activeNodeId: string,
  k = 2,
  nativeLang: NativeLang = "tr"
): string[] {
  const node = db
    .select({ id: tables.nodes.id, nodeType: tables.nodes.nodeType })
    .from(tables.nodes)
    .where(eq(tables.nodes.id, activeNodeId))
    .limit(1)
    .get();
  // Legacy quest-typed node (T-018) ya da olmayan id → pencere yok.
  if (!node || node.nodeType !== "main") return [];

  const targets: string[] = [];
  const seen = new Set<string>();
  let current: string | null = activeNodeId;
  for (let i = 0; i <= k && current && i < MAX_WALK; i++) {
    if (seen.has(current)) break; // bozuk/çevrimsel zincire karşı
    seen.add(current);
    if (!hasUsableLesson(db, current, nativeLang) && !isErrored(db, current)) {
      targets.push(current);
    }
    current = successorOf(db, current);
  }
  return targets;
}

/**
 * Pencerenin üçüncü tetiği için çıpa: ilk TAMAMLANMAMIŞ main node (frontier).
 * Kullanıcının aktif dersi budur; "revisit’te çekme" kuralı böyle korunur:
 * eski bir dersi tekrar açmak pencereyi geri sarmaz.
 *
 * Zincir yürüyüşü değil sıralama okuması: üniteler position'a, node'lar
 * position'a göre; ilk `completed` olmayan main node. Zincir ile sıra
 * curriculum-gen'de birlikte üretilir.
 */
export function frontierNodeId(db: AppDb, profileId: string): string | null {
  const curriculum = db
    .select({ id: tables.curricula.id })
    .from(tables.curricula)
    .where(eq(tables.curricula.profileId, profileId))
    .limit(1)
    .get();
  if (!curriculum) return null;

  const unitRows = db
    .select({ id: tables.units.id })
    .from(tables.units)
    .where(eq(tables.units.curriculumId, curriculum.id))
    .orderBy(asc(tables.units.position))
    .all();

  for (const u of unitRows) {
    const nodeRows = db
      .select({
        id: tables.nodes.id,
        status: tables.nodes.status,
        nodeType: tables.nodes.nodeType,
      })
      .from(tables.nodes)
      .where(eq(tables.nodes.unitId, u.id))
      .orderBy(asc(tables.nodes.position))
      .all();
    for (const n of nodeRows) {
      if (n.nodeType !== "main") continue;
      if (n.status !== "completed") return n.id;
    }
  }
  return null;
}
