import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { getActiveProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

export default function Home() {
  const profile = getActiveProfile();
  if (!profile) redirect("/onboarding");

  const curriculum = db.query.curricula
    .findFirst({ where: eq(tables.curricula.profileId, profile.id) })
    .sync();
  if (!curriculum || curriculum.status !== "ready") redirect("/onboarding");

  redirect("/map");
}
