import test from "node:test";
import assert from "node:assert/strict";
import {
  startLessonGen,
  lessonGenState,
  cancelLessonGen,
  clearLessonGen,
  runningLessonGens,
  subscribeLessonGen,
  __resetLessonGenStore,
} from "./lesson-gen-store";

// T-070-B/C. Bu store'un tek işi: üretim sonucunun bileşen ömrüne bağlı
// OLMAMASI. Testler o yüzden "bileşen unmount oldu" senaryosunu (kimse
// promise'i beklemiyor) ve iptal/hata ayrımını kilitliyor.

const deferred = () => {
  let resolve!: () => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const diagnose = async (err: unknown) =>
  `teşhis: ${err instanceof Error ? err.message : String(err)}`;

test("üretim hatası, kimse beklemese bile store'a yazılır (drawer kapalıyken yutulan hata)", async () => {
  __resetLessonGenStore();
  const d = deferred();
  // Çağıran promise'i BEKLEMİYOR: bileşen unmount olmuş gibi.
  void startLessonGen("n1", {
    urgent: false,
    run: () => d.promise,
    diagnose,
  }).catch(() => {});
  assert.equal(lessonGenState("n1")?.kind, "running");

  d.reject(new Error("köprü öldü"));
  await new Promise((r) => setTimeout(r, 0));

  const state = lessonGenState("n1");
  assert.equal(state?.kind, "error");
  assert.equal(
    state?.kind === "error" ? state.message : null,
    "teşhis: köprü öldü"
  );
});

test("başarı ready olarak kaydedilir ve dinleyiciler uyarılır", async () => {
  __resetLessonGenStore();
  let notified = 0;
  const unsub = subscribeLessonGen(() => notified++);
  const d = deferred();
  const p = startLessonGen("n2", { urgent: true, run: () => d.promise, diagnose });
  assert.ok(notified > 0, "running kaydı yayınlanmalı");

  d.resolve();
  await p;
  assert.equal(lessonGenState("n2")?.kind, "ready");
  unsub();
});

test("aynı node için ikinci çağrı yeni üretim başlatmaz (tekilleştirme)", async () => {
  __resetLessonGenStore();
  let runs = 0;
  const d = deferred();
  const run = () => {
    runs++;
    return d.promise;
  };
  const p1 = startLessonGen("n3", { urgent: false, run, diagnose });
  const p2 = startLessonGen("n3", { urgent: true, run, diagnose });
  assert.equal(runs, 1);
  assert.equal(p1, p2, "aynı promise paylaşılmalı");
  // urgent yükseltmesi görünürlüğe yansır
  const s = lessonGenState("n3");
  assert.equal(s?.kind === "running" && s.urgent, true);
  d.resolve();
  await p1;
});

test("iptal: signal abort edilir, kayıt cancelled olur, geç gelen başarı onu diriltmez", async () => {
  __resetLessonGenStore();
  const d = deferred();
  let seenSignal: AbortSignal | null = null;
  const p = startLessonGen("n4", {
    urgent: true,
    run: (signal) => {
      seenSignal = signal;
      return d.promise;
    },
    diagnose,
  });
  p.catch(() => {});

  cancelLessonGen("n4");
  assert.equal((seenSignal as unknown as AbortSignal).aborted, true);
  assert.equal(lessonGenState("n4")?.kind, "cancelled");

  // Üretim iptalden sonra "başarılı" biterse kayıt cancelled kalmalı.
  d.resolve();
  await p;
  assert.equal(lessonGenState("n4")?.kind, "cancelled");
});

test("iptal edilen üretim hata ile bitse bile hata ekranı için error yazılmaz", async () => {
  __resetLessonGenStore();
  const d = deferred();
  const p = startLessonGen("n5", { urgent: true, run: () => d.promise, diagnose });
  p.catch(() => {});
  cancelLessonGen("n5");
  d.reject(new Error("abort"));
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(lessonGenState("n5")?.kind, "cancelled");
});

test("iptalin reddi ÇAĞIRANA yayılmaz (kendi 'Vazgeç'i hata ekranı olarak dönmesin)", async () => {
  __resetLessonGenStore();
  const d = deferred();
  const p = startLessonGen("n6", { urgent: true, run: () => d.promise, diagnose });
  cancelLessonGen("n6");
  // Sağlayıcı abort'u LlmCancelledError olarak reddeder. Bu reddin çağırana
  // ulaşması, drawer kapanma animasyonu boyunca hâlâ mount olan LessonPlayer'a
  // (ve tam sayfa modunda route değişene kadar) "Ders hazırlanamadı" ekranı
  // bastırırdı.
  d.reject(new Error("Üretim iptal edildi"));
  await p; // reject ETMEMELİ
  assert.equal(lessonGenState("n6")?.kind, "cancelled");
});

test("runningLessonGens yalnız çalışanları listeler; clearLessonGen çalışana dokunmaz", async () => {
  __resetLessonGenStore();
  const a = deferred();
  const b = deferred();
  void startLessonGen("a", { urgent: false, run: () => a.promise, diagnose }).catch(
    () => {}
  );
  const pb = startLessonGen("b", { urgent: false, run: () => b.promise, diagnose });
  assert.deepEqual(
    runningLessonGens().map((r) => r.nodeId).sort(),
    ["a", "b"]
  );

  clearLessonGen("a");
  assert.equal(lessonGenState("a")?.kind, "running", "çalışan kayıt silinmemeli");

  b.resolve();
  await pb;
  assert.deepEqual(runningLessonGens().map((r) => r.nodeId), ["a"]);
  clearLessonGen("b");
  assert.equal(lessonGenState("b"), null);
  a.resolve();
});
