"use client";

import { StatsHeader } from "./StatsHeader";

/**
 * Full-page centered state (loading / error / empty / done) that keeps the
 * site chrome: the StatsHeader (title row + section tabs) always renders, only
 * the content area below it is centered. Never render a full-viewport state
 * without this — a page with no header reads as a crashed app.
 */
export function CenteredPage({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh">
      <StatsHeader title={title} />
      <div className="mx-auto flex min-h-[calc(100dvh-var(--header-h))] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        {children}
      </div>
    </div>
  );
}
