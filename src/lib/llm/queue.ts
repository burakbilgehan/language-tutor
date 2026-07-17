// Serializes LLM calls: with the local CLI, Max usage limits are shared with
// interactive Claude Code sessions, so at most `limit()` subprocess at a time.
// Interactive calls (exercise grading) can jump the queue with urgent: true —
// they must not sit behind minutes-long background generations.
//
// The limit is resolved per call (not frozen at module load) so a config change
// via /api/llm-config takes effect without a restart. Precedence:
// config.concurrency → LLM_CONCURRENCY env → 1.

import { readLlmConfig } from "./config";

function limit(): number {
  const config = readLlmConfig();
  const fromConfig = config?.concurrency;
  const fromEnv = Number(process.env.LLM_CONCURRENCY);
  return Math.max(1, fromConfig || fromEnv || 1);
}

let active = 0;
const waiters: Array<{ resolve: () => void; urgent: boolean }> = [];

function releaseNext() {
  const i = waiters.findIndex((w) => w.urgent);
  const next = i >= 0 ? waiters.splice(i, 1)[0] : waiters.shift();
  next?.resolve();
}

export async function enqueue<T>(
  fn: () => Promise<T>,
  opts?: { urgent?: boolean }
): Promise<T> {
  if (active >= limit()) {
    await new Promise<void>((resolve) =>
      waiters.push({ resolve, urgent: opts?.urgent ?? false })
    );
  }
  active++;
  try {
    return await fn();
  } finally {
    active--;
    releaseNext();
  }
}
