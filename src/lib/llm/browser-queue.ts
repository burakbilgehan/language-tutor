// Tarayıcı LLM kuyruğu: aynı anda TEK çağrı (köprü/abonelik limitleri;
// köprünün kendisi de tek CLI süreci serialize eder). Kullanıcının beklediği
// çağrı (`urgent`) kuyruktaki arka plan üretimlerinin önüne geçer.
//
// browser-provider.ts'ten AYRI dosya: orası "use client" + localStorage/fetch
// bağımlı, yani birim testinden import edilemiyordu. Kuyruk saf ve
// zamanlamaya duyarlı olduğu için (T-070-D'deki slot devri yarışı) test
// edilebilir olması şart.

let active = 0;
const waiters: Array<{ resolve: () => void; urgent: boolean }> = [];

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
  urgent?: boolean
): Promise<T> {
  if (active >= 1) {
    await new Promise<void>((resolve) =>
      waiters.push({ resolve, urgent: urgent ?? false })
    );
    // Slot bize devredildi: `active` zaten bizim adımıza ayrılmış, tekrar
    // artırılmaz.
  } else {
    active++;
  }
  try {
    return await fn();
  } finally {
    const i = waiters.findIndex((w) => w.urgent);
    const next = i >= 0 ? waiters.splice(i, 1)[0] : waiters.shift();
    if (next) next.resolve();
    else active--;
  }
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
