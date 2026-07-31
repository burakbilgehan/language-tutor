import test from "node:test";
import assert from "node:assert/strict";
import {
  enqueueLlmCall,
  llmQueueDepth,
  promoteUrgentCall,
  __resetLlmQueue,
} from "./browser-queue";

// T-070-D. Kilitlenen davranışlar:
//  1. Aynı anda tek çağrı (köprü tek CLI süreci serialize eder; iki paralel
//     istek kaybedeni köprünün kuyruğunda istemci zaman aşımına yakar).
//  2. Slot DEVRİ: `active--` ile bekleyenin uyanması arasındaki mikrotask
//     penceresinde gelen çağrı kuyruğu atlamamalı.
//  3. urgent (kullanıcının açtığı ders) bekleyen prefetch'lerin önüne geçer.

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
};

test("aynı anda yalnız tek çağrı çalışır", async () => {
  __resetLlmQueue();
  let concurrent = 0;
  let peak = 0;
  const gates = [deferred(), deferred(), deferred()];
  const run = (i: number) =>
    enqueueLlmCall(async () => {
      concurrent++;
      peak = Math.max(peak, concurrent);
      await gates[i].promise;
      concurrent--;
    });
  const all = [run(0), run(1), run(2)];
  for (const g of gates) {
    g.resolve();
    await new Promise((r) => setTimeout(r, 0));
  }
  await Promise.all(all);
  assert.equal(peak, 1, "hiçbir an ikinci çağrı paralel koşmamalı");
  assert.equal(llmQueueDepth(), 0);
});

test("slot devri: bekleyen uyanırken araya giren çağrı kuyruğu atlayamaz", async () => {
  __resetLlmQueue();
  let concurrent = 0;
  let peak = 0;
  const track = async (gate: Promise<void>) => {
    concurrent++;
    peak = Math.max(peak, concurrent);
    await gate;
    concurrent--;
  };

  const first = deferred();
  const waiterGate = deferred();
  const intruderGate = deferred();

  const p1 = enqueueLlmCall(() => track(first.promise));
  // Kuyrukta bir bekleyen var.
  const p2 = enqueueLlmCall(() => track(waiterGate.promise));

  // Birinciyi bitir ve slotun boşalıp bekleyene devredildiği ANA kadar
  // mikrotask ilerlet. Eski kodda `finally` önce `active--` yapıyor, uyanan
  // bekleyenin gövdesi ise bir sonraki mikrotaskta koşuyordu; tam o aralıkta
  // `active === 0` ve kuyruk BOŞ görünür, yani araya giren çağrı doğrudan
  // koşardı. (İki tick ölçümle bulundu: t0'da active=1/waiters=1, t1'de
  // active=0/waiters=0, t2'de bekleyen gerçekten başlar.)
  first.resolve();
  await null;
  await null;

  const p3 = enqueueLlmCall(() => track(intruderGate.promise));

  waiterGate.resolve();
  intruderGate.resolve();
  await Promise.all([p1, p2, p3]);
  assert.equal(peak, 1, "devir penceresinde araya giren çağrı sızmamalı");
  assert.equal(llmQueueDepth(), 0, "kuyruk boşalmalı");
});

test("urgent bekleyen prefetch'lerin önüne geçer", async () => {
  __resetLlmQueue();
  const order: string[] = [];
  const gate = deferred();
  const p0 = enqueueLlmCall(async () => {
    order.push("running");
    await gate.promise;
  });
  const pA = enqueueLlmCall(async () => {
    order.push("prefetch-a");
  });
  const pB = enqueueLlmCall(async () => {
    order.push("prefetch-b");
  });
  const pU = enqueueLlmCall(async () => {
    order.push("urgent");
  }, true);

  gate.resolve();
  await Promise.all([p0, pA, pB, pU]);
  assert.deepEqual(order, ["running", "urgent", "prefetch-a", "prefetch-b"]);
});

test("kuyrukta iptal edilen çağrı slotu TUTMADAN düşer", async () => {
  __resetLlmQueue();
  const gate = deferred();
  const order: string[] = [];
  const running = enqueueLlmCall(async () => {
    order.push("running");
    await gate.promise;
  });

  // Sırada iptal edilecek bir çağrı, arkasında gerçek bir üretim.
  const ac = new AbortController();
  const cancelled = enqueueLlmCall(
    async () => {
      order.push("cancelled-body-RAN");
    },
    false,
    { signal: ac.signal }
  );
  cancelled.catch(() => {});
  const real = enqueueLlmCall(async () => {
    order.push("real");
  });

  ac.abort();
  gate.resolve();
  await assert.rejects(cancelled);
  await real;
  await running;
  // İptal edilenin gövdesi hiç koşmamalı ve arkasındaki üretimi
  // bekletmemeli: slot devrinde atlanır.
  assert.deepEqual(order, ["running", "real"]);
  assert.equal(llmQueueDepth(), 0);
});

test("zaten abort edilmiş signal kuyruğa hiç girmez", async () => {
  __resetLlmQueue();
  const gate = deferred();
  const running = enqueueLlmCall(async () => {
    await gate.promise;
  });
  const ac = new AbortController();
  ac.abort();
  await assert.rejects(
    enqueueLlmCall(async () => {}, false, { signal: ac.signal })
  );
  assert.equal(llmQueueDepth(), 0, "abort edilmiş çağrı kuyruğa yazılmamalı");
  gate.resolve();
  await running;
});

test("promoteUrgentCall bekleyen çağrıyı öne alır", async () => {
  __resetLlmQueue();
  const order: string[] = [];
  const gate = deferred();
  const running = enqueueLlmCall(async () => {
    order.push("running");
    await gate.promise;
  });
  const a = enqueueLlmCall(
    async () => {
      order.push("prefetch-a");
    },
    false,
    { key: "lesson:a" }
  );
  const b = enqueueLlmCall(
    async () => {
      order.push("prefetch-b");
    },
    false,
    { key: "lesson:b" }
  );

  // Kullanıcı, kuyrukta ARKADA bekleyen b dersini açtı.
  assert.equal(promoteUrgentCall("lesson:b"), true);
  gate.resolve();
  await Promise.all([running, a, b]);
  assert.deepEqual(order, ["running", "prefetch-b", "prefetch-a"]);
});

test("promoteUrgentCall bilinmeyen key'de false döner ve sırayı bozmaz", async () => {
  __resetLlmQueue();
  const order: string[] = [];
  const gate = deferred();
  const running = enqueueLlmCall(async () => {
    await gate.promise;
  });
  const a = enqueueLlmCall(
    async () => {
      order.push("a");
    },
    false,
    { key: "lesson:a" }
  );
  const b = enqueueLlmCall(
    async () => {
      order.push("b");
    },
    false,
    { key: "lesson:b" }
  );
  assert.equal(promoteUrgentCall("lesson:zzz"), false);
  gate.resolve();
  await Promise.all([running, a, b]);
  assert.deepEqual(order, ["a", "b"]);
});

test("çağrı hata atsa bile slot serbest kalır", async () => {
  __resetLlmQueue();
  await assert.rejects(
    enqueueLlmCall(async () => {
      throw new Error("patladı");
    })
  );
  let ran = false;
  await enqueueLlmCall(async () => {
    ran = true;
  });
  assert.equal(ran, true, "hatadan sonra kuyruk kilitlenmemeli");
});
