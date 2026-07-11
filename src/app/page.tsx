import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, tables } from "@/db";

export const dynamic = "force-dynamic";

export default function Home() {
  const profile = db.query.profiles.findFirst().sync();
  if (!profile) redirect("/onboarding");

  const curriculum = db.query.curricula
    .findFirst({ where: eq(tables.curricula.profileId, profile.id) })
    .sync();
  if (!curriculum || curriculum.status !== "ready") redirect("/onboarding");

  redirect("/map");
}
