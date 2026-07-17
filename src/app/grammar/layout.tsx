"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { StatsHeader } from "@/components/shared/StatsHeader";
import { GrammarSidebar } from "@/components/grammar/GrammarSidebar";
import { useStrings } from "@/lib/i18n/use-strings";

const S = {
  tr: { title: "Gramer Kütüphanesi" },
  en: { title: "Grammar Library" },
};

function GrammarShell({ children }: { children: React.ReactNode }) {
  // Konu seçimi ?topic= query'sinde (statik export: konu başına sayfa yok).
  const onDetail = useSearchParams().has("topic");
  return (
    <div className="mx-auto flex max-w-6xl items-start gap-6 px-4">
      <aside
        className={`w-full shrink-0 lg:block lg:w-80 lg:sticky lg:top-(--header-h) lg:h-[calc(100dvh-var(--header-h))] lg:overflow-y-auto ${
          onDetail ? "hidden" : ""
        }`}
      >
        <GrammarSidebar />
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
 * Master-detail shell: the topic list lives here (left sidebar) so it survives
 * topic navigation — scroll position and filters are preserved. On mobile the
 * index route shows the list full-width and a topic selection shows only
 * content.
 */
export default function GrammarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useStrings(S);
  return (
    <div className="min-h-dvh pb-16">
      <StatsHeader title={t.title} />
      <Suspense fallback={null}>
        <GrammarShell>{children}</GrammarShell>
      </Suspense>
    </div>
  );
}
