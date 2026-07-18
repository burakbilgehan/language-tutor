"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { StatsHeader } from "@/components/shared/StatsHeader";
import { VocabSidebar } from "@/components/vocab/VocabSidebar";
import { useStrings } from "@/lib/i18n/use-strings";

const S = {
  tr: { title: "Sözlük" },
  en: { title: "Dictionary" },
};

function VocabShell({ children }: { children: React.ReactNode }) {
  // Kelime seçimi ?word= query'sinde (statik export: kelime başına sayfa yok).
  const onDetail = useSearchParams().has("word");
  return (
    <div className="mx-auto flex max-w-6xl items-start gap-6 px-4">
      <aside
        className={`w-full shrink-0 lg:block lg:w-80 lg:sticky lg:top-(--header-h) lg:h-[calc(100dvh-var(--header-h))] lg:overflow-y-auto ${
          onDetail ? "hidden" : ""
        }`}
      >
        <VocabSidebar />
      </aside>
      <main
        className={`min-w-0 flex-1 py-8 lg:block ${onDetail ? "" : "hidden"}`}
      >
        {children}
      </main>
    </div>
  );
}

/**
 * Master-detail shell, same shape as /grammar: the word list lives here so it
 * survives word navigation — scroll position, search and open levels are
 * preserved. On mobile the index route shows the list full-width and a word
 * selection shows only content.
 */
export default function VocabLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useStrings(S);
  return (
    <div className="min-h-dvh pb-16">
      <StatsHeader title={t.title} />
      <Suspense fallback={null}>
        <VocabShell>{children}</VocabShell>
      </Suspense>
    </div>
  );
}
