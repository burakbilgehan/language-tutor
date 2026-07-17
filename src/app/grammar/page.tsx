"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { GrammarTopicView } from "@/components/grammar/GrammarTopicView";
import { useStrings } from "@/lib/i18n/use-strings";

const S = {
  tr: { hint: "Soldan bir konu seç — içerik burada açılacak." },
  en: { hint: "Pick a topic on the left — its content will open here." },
};

function GrammarInner() {
  const t = useStrings(S);
  const topic = useSearchParams().get("topic");
  if (topic) return <GrammarTopicView key={topic} slug={topic} />;
  return (
    <div className="flex flex-col items-center gap-3 py-24 text-center text-ink-soft">
      <div className="text-4xl">🌿</div>
      <p>{t.hint}</p>
    </div>
  );
}

// Konu URL'i ?topic=<slug> query'sinde — içerik client-side, tarayıcı
// DB'sinden gelir; konu başına statik sayfa üretilmez.
export default function GrammarIndexPage() {
  return (
    <Suspense fallback={null}>
      <GrammarInner />
    </Suspense>
  );
}
