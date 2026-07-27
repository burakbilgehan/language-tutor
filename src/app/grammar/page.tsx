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
    <div className="flex flex-col items-center gap-4 py-24 text-center text-ink-soft">
      {/* Empty state = Kumo cloud in the calm sky tint (okumo-sky). */}
      <svg
        viewBox="0 0 128 86"
        className="h-14 w-21 animate-float-slow"
        aria-hidden="true"
      >
        <g fill="var(--sky-soft)">
          <circle cx="40" cy="44" r="22" />
          <circle cx="68" cy="34" r="27" />
          <circle cx="94" cy="47" r="18" />
          <rect x="18" y="44" width="94" height="22" rx="11" />
        </g>
      </svg>
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
