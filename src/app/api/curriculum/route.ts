import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { recoverStaleJobs } from "@/lib/jobs";
import { deleteCurriculum } from "@/core/curriculum-delete";
import { AppError } from "@/lib/errors";

export const runtime = "nodejs";

/**
 * T-082. Throw the profile's whole curriculum away so it can be regenerated
 * (optionally from a different starting level, via POST /api/curriculum/generate
 * with a `level`). Thin shell: all logic, including in-flight job handling and
 * the FK-ordered delete, lives in src/core/curriculum-delete so static mode
 * runs exactly the same code.
 *
 * No `requireLlm` gate: deleting is precisely what a user with a broken or
 * unconfigured provider needs to be able to do.
 *
 * `recoverStaleJobs` runs first so a job left "running" by a dead process is
 * reclassified before the core refuses the delete on its account; otherwise a
 * crashed generation would block deletion until the stale window elapsed on
 * some other route.
 */
export async function DELETE(req: Request) {
  const denied = requireAuth(req);
  if (denied) return denied;

  recoverStaleJobs();
  const parsed = z
    .object({ profileId: z.string() })
    .safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "profileId gerekli" }, { status: 400 });
  }

  try {
    const result = deleteCurriculum(db, parsed.data.profileId);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { error: err.code, params: err.params },
        {
          status:
            err.code === "curriculum_missing"
              ? 404
              : err.code === "curriculum_job_running"
                ? 409
                : 400,
        }
      );
    }
    throw err;
  }
}
