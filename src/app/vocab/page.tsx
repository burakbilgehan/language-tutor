"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { VocabEntryView } from "@/components/vocab/VocabEntryView";
import { useStrings } from "@/lib/i18n/use-strings";

const S = {
  tr: { hint: "Soldan bir kelime seç — detayı burada açılacak." },
  en: { hint: "Pick a word on the left — its details will open here." },
};

function VocabInner() {
  const t = useStrings(S);
  const word = useSearchParams().get("word");
  if (word) return <VocabEntryView key={word} word={word} />;
  return (
    <div className="flex flex-col items-center gap-3 py-24 text-center text-ink-soft">
      <div className="text-4xl">📚</div>
      <p>{t.hint}</p>
    </div>
  );
}

// Kelime URL'i ?word=<kelime> query'sinde — içerik client-side, tarayıcı
// DB'sinden gelir; kelime başına statik sayfa üretilmez.
export default function VocabIndexPage() {
  return (
    <Suspense fallback={null}>
      <VocabInner />
    </Suspense>
  );
}
