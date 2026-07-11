// Serializes CLI calls: Max usage limits are shared with interactive Claude
// Code sessions, so at most LLM_CONCURRENCY (default 1) subprocess at a time.

const limit = Math.max(1, Number(process.env.LLM_CONCURRENCY) || 1);

let active = 0;
const waiters: Array<() => void> = [];

export async function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= limit) {
    await new Promise<void>((resolve) => waiters.push(resolve));
  }
  active++;
  try {
    return await fn();
  } finally {
    active--;
    waiters.shift()?.();
  }
}
