import { NextResponse } from "next/server";
import { cancelJob } from "@/lib/jobs";

export const runtime = "nodejs";

/** Cancel one job: queued/pending → deleted, running → marked cancelled. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = cancelJob(id);
  if (result === null) {
    return NextResponse.json({ error: "Job bulunamadı" }, { status: 404 });
  }
  return NextResponse.json({ result });
}
