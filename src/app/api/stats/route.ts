import { NextResponse } from "next/server";
import { count, desc, gte, sum } from "drizzle-orm";
import { db, tables } from "@/db";

export const runtime = "nodejs";

export async function GET() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const total = db
    .select({ usd: sum(tables.llmCalls.costUsd), n: count() })
    .from(tables.llmCalls)
    .get();
  const today = db
    .select({ usd: sum(tables.llmCalls.costUsd), n: count() })
    .from(tables.llmCalls)
    .where(gte(tables.llmCalls.createdAt, startOfDay))
    .get();

  // Per-purpose call counts — visibility into WHERE the LLM budget goes.
  const byPurpose = db
    .select({
      purpose: tables.llmCalls.purpose,
      n: count(),
      usd: sum(tables.llmCalls.costUsd),
    })
    .from(tables.llmCalls)
    .groupBy(tables.llmCalls.purpose)
    .orderBy(desc(count()))
    .all()
    .map((r) => ({
      purpose: r.purpose,
      calls: r.n,
      usd: Number(r.usd ?? 0),
    }));

  return NextResponse.json({
    llm: {
      todayUsd: Number(today?.usd ?? 0),
      todayCalls: today?.n ?? 0,
      totalUsd: Number(total?.usd ?? 0),
      totalCalls: total?.n ?? 0,
      byPurpose,
    },
  });
}
