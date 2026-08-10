import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // T-069: static export is the ONLY build mode (next dev still serves it
  // dynamically). NEXT_PUBLIC_BASE_PATH: sub-path support for a
  // path-prefixed host; hand-written fetches go through src/lib/base-path.ts.
  output: "export",
  ...(process.env.NEXT_PUBLIC_BASE_PATH
    ? { basePath: process.env.NEXT_PUBLIC_BASE_PATH }
    : {}),
  // Fixture bayrağı HER build'de tanımlı olmalı: tanımsız kalırsa bundler
  // process.env okumasını inline edemez, browser-fixture dalını ölü kod
  // olarak düşüremez ve fixture chunk'ı (bundle.json içeriğiyle) prod
  // çıktısına sızar (build sonrası grep ile doğrulandı, 2026-08-10).
  env: {
    NEXT_PUBLIC_LLM_FIXTURE: process.env.NEXT_PUBLIC_LLM_FIXTURE ?? "",
  },
  // Sol alt köşe feedback butonunun (FeedbackButton) — dev indicator'ı oradan çek.
  devIndicators: { position: "bottom-right" },
  // Worktree'lerde ana repo lockfile'ı görülüp kök yanlış tahmin ediliyor —
  // kökü her zaman çalışılan proje dizinine sabitle.
  turbopack: { root: process.cwd() },
};

export default nextConfig;
