"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { QuestPlayer } from "@/components/quest/QuestPlayer";

function QuestInner() {
  const params = useSearchParams();
  const router = useRouter();
  const nodeId = params.get("node");
  if (!nodeId) {
    router.replace("/map");
    return null;
  }
  return <QuestPlayer nodeId={nodeId} />;
}

export default function QuestPage() {
  return (
    <Suspense fallback={null}>
      <QuestInner />
    </Suspense>
  );
}
