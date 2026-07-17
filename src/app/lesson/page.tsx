"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { LessonPlayer } from "@/components/lesson/LessonPlayer";

function LessonInner() {
  const params = useSearchParams();
  const router = useRouter();
  const nodeId = params.get("node");
  if (!nodeId) {
    router.replace("/map");
    return null;
  }
  return <LessonPlayer nodeId={nodeId} />;
}

// Statik export ile uyumlu ders sayfası: id path segmenti yerine ?node=
// query'sinde (GitHub Pages'te dinamik segment üretilemez).
export default function LessonPage() {
  return (
    <Suspense fallback={null}>
      <LessonInner />
    </Suspense>
  );
}
