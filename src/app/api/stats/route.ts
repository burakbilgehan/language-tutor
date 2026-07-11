import { NextResponse } from "next/server";
import { count, gte, sum } from "drizzle-orm";
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

  return NextResponse.json({
    llm: {
      todayUsd: Number(today?.usd ?? 0),
      todayCalls: today?.n ?? 0,
      totalUsd: Number(total?.usd ?? 0),
      totalCalls: total?.n ?? 0,
    },
  });
}
