// Tarayıcı LLM kuyruğu: aynı anda TEK çağrı (köprü/abonelik limitleri;
// köprünün kendisi de tek CLI süreci serialize eder). Kullanıcının beklediği
// çağrı (`urgent`) kuyruktaki arka plan üretimlerinin önüne geçer.
//
// browser-provider.ts'ten AYRI dosya: orası "use client" + localStorage/fetch
// bağımlı, yani birim testinden import edilemiyordu. Kuyruk saf ve
// zamanlamaya duyarlı olduğu için (T-070-D'deki slot devri yarışı) test
// edilebilir olması şart.

interface Waiter {
  resolve: () => void;
  /** Abort edilmiş waiter'ı slotu tutmadan düşürmek için. */
  reject: (err: unknown) => void;
  urgent: boolean;
  /** Kuyruktayken iptal edilirse anında düşer (bkz. dropAborted). */
  signal?: AbortSignal;
  /** Sonradan urgent'a yükseltmek için kimlik (promoteUrgentCall). */
  key?: string;
}

let active = 0;
const waiters: Waiter[] = [];

/** Kuyruktan çıkarılacak sıradaki waiter: önce urgent, sonra FIFO. */
function takeNext(): Waiter | undefined {
  const i = waiters.findIndex((w) => w.urgent);
  return i >= 0 ? waiters.splice(i, 1)[0] : waiters.shift();
}

/**
 * Slotu devret. Abort edilmiş waiter'lar ATLANIR: iptal edilen bir üretim
 * kuyrukta sırasını beklerken slotu devralırsa, hemen abort'a düşene kadar
 * geçen sürede arkasındaki gerçek üretimler bekler. Kötü senaryoda iptal
 * edilmiş bir zincir kuyruğu dakikalarca rehin alır.
 */
function handOffSlot(): void {
  for (;;) {
    const next = takeNext();
    if (!next) {
      active--;
      return;
    }
    if (next.signal?.aborted) {
      // Slotu tutmadan düş: bir sonraki adaya geç.
      next.reject(next.signal.reason ?? new Error("aborted"));
      continue;
    }
    next.resolve();
    return;
  }
}

/**
 * `fn`'i kuyruk sırası gelince çalıştırır.
 *
 * Slot DEVREDİLİR, sıfıra düşürülmez. Eskiden `active--` ile bekleyenin
 * uyandırılması arasında bir mikrotask vardı; o aralıkta gelen yeni bir çağrı
 * `active === 0` görüp kuyruğu atlıyordu. Sonuç: köprüye aynı anda iki istek,
 * köprü onları kendi içinde sıraya diziyor ve KAYBEDEN istek istemci zaman
 * aşımını köprünün kuyruğunda bekleyerek yakıyordu (bu ticket'ın kapattığı
 * hatanın bir kopyası). T-068 aynı anda 2-3 prefetch tetiklediği için bu
 * aralık gerçekten ulaşılabilir hale geldi.
 */
export async function enqueueLlmCall<T>(
  fn: () => Promise<T>,
  urgent?: boolean,
  opts?: { signal?: AbortSignal; key?: string }
): Promise<T> {
  if (active >= 1) {
    // Zaten iptal edilmiş bir çağrı kuyruğa hiç girmesin.
    if (opts?.signal?.aborted) {
      throw opts.signal.reason ?? new Error("aborted");
    }
    let waiter!: Waiter;
    try {
      await new Promise<void>((resolve, reject) => {
        waiter = {
          resolve,
          reject,
          urgent: urgent ?? false,
          signal: opts?.signal,
          key: opts?.key,
        };
        waiters.push(waiter);
      });
    } catch (err) {
      // Kuyrukta iptal edildik: slot bize DEVREDİLMEDİ, bu yüzden serbest
      // bırakılacak bir şey yok.
      throw err;
    }
    // Slot bize devredildi: `active` zaten bizim adımıza ayrılmış, tekrar
    // artırılmaz.
  } else {
    active++;
  }
  try {
    return await fn();
  } finally {
    handOffSlot();
  }
}

/**
 * Kuyrukta BEKLEYEN bir çağrıyı urgent'a yükselt (T-070-D).
 *
 * Kullanıcı, arka planda prefetch olarak kuyruğa girmiş bir dersi açtığında
 * gerekiyor: öncelik çağrı anında belirlendiği için o kayıt aksi halde
 * önündeki tüm prefetch'leri bekler. Zaten çalışan çağrı için anlamsızdır
 * (geri alınamaz), o yüzden yalnız bekleyenleri etkiler.
 *
 * Döner: yükseltilen waiter var mıydı.
 */
export function promoteUrgentCall(key: string): boolean {
  let promoted = false;
  for (const w of waiters) {
    if (w.key === key && !w.urgent) {
      w.urgent = true;
      promoted = true;
    }
  }
  return promoted;
}

/** Görünürlük yüzeyi (T-070-E): kuyrukta bekleyen çağrı sayısı. */
export function llmQueueDepth(): number {
  return waiters.length;
}

/** Test kancası. */
export function __resetLlmQueue(): void {
  active = 0;
  waiters.length = 0;
}
