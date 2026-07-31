"use client";

// T-070-B/C/E: ders üretiminin oturum-ömürlü durumu, BİLEŞEN ömründen
// bağımsız.
//
// Neden var: statik modda üretim tarayıcıda inline koşuyor ve sonucu
// bekleyen tek şey LessonPlayer'ın promise'iydi. Kullanıcı "Kapat (üretim
// arkada sürer)" deyince bileşen 500ms sonra unmount oluyor, üretim 2 dakika
// sonra hata ile bitiyor ve o hata HİÇBİR yüzeye çıkmıyordu: harita ders
// statüsünü okumuyor, toast yok, statikte job tablosu yok. Kullanıcının
// gördüğü tek şey sonsuz "hazırlanıyor" oluyordu.
//
// Buradaki store modül seviyesinde yaşar (sekme ömrü): in-flight üretimler +
// son biten sonuç (ready/error+mesaj). LessonPlayer mount olduğunda son
// durumu OKUR, harita da rozet basabilir. Kalıcı kayıt/resume T-069'un işi;
// bellek-içi burada yeterli (sekme kapanınca zaten üretim de ölüyor).
//
// `lessonGenInFlight` haritası buraya taşındı: iki ayrı harita tutmak
// (client-api + store) birbirine düşen iki gerçek demekti.

export type LessonGenState =
  | { kind: "running"; startedAt: number; urgent: boolean }
  /** Üretim bitti ve içerik yazıldı. */
  | { kind: "ready"; finishedAt: number }
  /** Üretim başarısız oldu. `message` teşhis edilmiş, kullanıcıya
   * gösterilebilir metin (llm-diagnosis çıktısı); ham sağlayıcı metni değil. */
  | { kind: "error"; finishedAt: number; message: string }
  /** Kullanıcı iptal etti. Hatadan AYRI: kendi eylemi, hata ekranı gösterilmez
   * ve kayıt bir sonraki açılışta sessizce temizlenir. */
  | { kind: "cancelled"; finishedAt: number };

interface Entry {
  state: LessonGenState;
  /** Çalışan üretimin iptal kolu (yalnız kind === "running" iken anlamlı). */
  controller?: AbortController;
  /** In-flight promise: aynı node için ikinci bir üretim başlamasın. */
  promise?: Promise<void>;
}

const entries = new Map<string, Entry>();
const listeners = new Set<() => void>();
// useSyncExternalStore kararlı bir snapshot DEĞERİ ister; harita gibi tüm
// tabloya bakan tüketiciler her render'da yeni bir nesne üretemez (sonsuz
// döngü). Sürüm sayacı o yüzden var: her mutasyonda artar.
let version = 0;

function emit() {
  version++;
  for (const l of listeners) l();
}

/** Store'un mutasyon sayacı (useSyncExternalStore snapshot'ı). */
export function lessonGenVersion(): number {
  return version;
}

/** React `useSyncExternalStore` aboneliği. */
export function subscribeLessonGen(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function lessonGenState(nodeId: string): LessonGenState | null {
  return entries.get(nodeId)?.state ?? null;
}

/** Şu an üretimde olan node id'leri; görünürlük yüzeyi (T-070-E). */
export function runningLessonGens(): { nodeId: string; startedAt: number }[] {
  const out: { nodeId: string; startedAt: number }[] = [];
  for (const [nodeId, e] of entries) {
    if (e.state.kind === "running") {
      out.push({ nodeId, startedAt: e.state.startedAt });
    }
  }
  return out.sort((a, b) => a.startedAt - b.startedAt);
}

/** Biten (hata/iptal) kayıtları temizler: kullanıcı "tekrar dene" dediğinde
 * ya da hata ekranını kapattığında. Çalışan üretime dokunmaz. */
export function clearLessonGen(nodeId: string): void {
  const e = entries.get(nodeId);
  if (!e || e.state.kind === "running") return;
  entries.delete(nodeId);
  emit();
}

/** Kullanıcının iptali. Çalışan fetch abort edilir; kayıt "cancelled" olur.
 * DB tarafı da ayrışır: `generateLessonContent` iptalde satırı "error"
 * DEĞİL "pending" damgalar (llm-gen.ts), yani kullanıcının kendi durdurduğu
 * ders ne haritada "başarısız" görünür ne de T-068 penceresinden kalıcı
 * olarak düşer. "error" yalnız LLM'in gerçekten başarısız olduğu hal. */
export function cancelLessonGen(nodeId: string): void {
  const e = entries.get(nodeId);
  if (!e || e.state.kind !== "running") return;
  e.controller?.abort();
  entries.set(nodeId, { state: { kind: "cancelled", finishedAt: Date.now() } });
  emit();
}

/**
 * Üretimi tekilleştirerek çalıştırır ve sonucunu (bileşen yaşasa da ölse de)
 * store'a yazar. `run` gerçek üretimi yapan fonksiyon; `signal` iptal için
 * sağlayıcıya sızdırılır.
 *
 * `diagnose` hatayı kullanıcıya gösterilebilir metne çevirir (llm-diagnosis);
 * store'a HAM sağlayıcı metni yazılmaz.
 *
 * Döndürdüğü promise gerçek hatalarda REJECT eder (çağıranın akışı sessizce
 * "başarılı" sanmasın), ama İPTALDE reject ETMEZ: iptal kullanıcının kendi
 * eylemi ve hata yüzeyine çıkmamalı.
 */
export function startLessonGen(
  nodeId: string,
  opts: {
    urgent: boolean;
    run: (signal: AbortSignal) => Promise<void>;
    diagnose: (err: unknown) => Promise<string>;
  }
): Promise<void> {
  const existing = entries.get(nodeId);
  // Koşul YALNIZ state üstünde: "running" kaydı promise'ten önce yazılıyor,
  // yani `existing.promise` şartı aranırsa o pencereye denk gelen ikinci
  // çağrı İKİNCİ bir üretim başlatır ve ilkinin controller'ını öksüz bırakır.
  // (Kayıt "running" iken promise'in eksik olması pratikte imkânsız: ikisi de
  // AYNI senkron blokta yazılıyor, araya await girmiyor. Yine de tip
  // güvenliği için boş promise'e düşülüyor.)
  if (existing?.state.kind === "running") {
    // Zaten üretimde. Kullanıcı açtıysa (urgent) kaydı yükselt: kuyruk
    // önceliği çağrı anında belirlendiği için geçmişi değiştiremeyiz, ama
    // görünürlük yüzeyi doğru şeyi göstersin.
    if (opts.urgent && !existing.state.urgent) {
      entries.set(nodeId, {
        ...existing,
        state: { ...existing.state, urgent: true },
      });
      emit();
    }
    return existing.promise ?? Promise.resolve();
  }

  const controller = new AbortController();
  // "running" kaydı promise'ten ÖNCE yazılır: async gövde ilk await'e kadar
  // senkron koşar, yani sıra ters olsaydı erken bir hata "error" kaydını
  // yazar, hemen ardından buradaki "running" onun üstüne biner ve kayıt
  // sonsuza dek çalışıyor görünürdü.
  entries.set(nodeId, {
    state: { kind: "running", startedAt: Date.now(), urgent: opts.urgent },
    controller,
  });
  emit();

  const promise = (async () => {
    try {
      await opts.run(controller.signal);
      // İptal yarışı: kullanıcı iptal ettikten sonra gelen "başarılı" sonuç
      // kaydı geri diriltmesin.
      if (entries.get(nodeId)?.state.kind === "cancelled") return;
      entries.set(nodeId, { state: { kind: "ready", finishedAt: Date.now() } });
      emit();
    } catch (err) {
      // İPTAL edilen üretimin reddi çağırana YAYILMAZ. Yayılsaydı
      // openNodeApi'nin await'i üstünden LessonPlayer'ın catch'ine düşer ve
      // kullanıcının kendi durdurduğu şey için "Ders hazırlanamadı" ekranı
      // basılırdı (drawer kapanma animasyonu boyunca bileşen hâlâ mount, tam
      // sayfa modunda ise route değişene kadar). Store zaten "cancelled"
      // olduğu için durum kaybolmuyor; sadece hata yüzeyine çıkmıyor.
      if (entries.get(nodeId)?.state.kind === "cancelled") return;
      const message = await opts.diagnose(err);
      entries.set(nodeId, {
        state: { kind: "error", finishedAt: Date.now(), message },
      });
      emit();
      throw err;
    }
  })();

  // Promise’i kayda ekle (tekilleştirme kolu): yalnız kayıt hâlâ BİZİM
  // başlattığımız çalışan kayıtsa; üretim ilk await'e varmadan bitip
  // ready/error yazdıysa üstüne yazmayalım.
  const current = entries.get(nodeId);
  if (current?.state.kind === "running" && current.controller === controller) {
    entries.set(nodeId, { ...current, promise });
  }
  // Kimse beklemezse (prefetch) unhandled rejection olmasın; gerçek çağıran
  // yine de kendi kopyasında hatayı görür.
  promise.catch(() => {});
  return promise;
}

/** Test/isolation kancası. */
export function __resetLessonGenStore(): void {
  entries.clear();
  emit();
}
