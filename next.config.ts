import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // scripts/build-static.mjs sets STATIC_EXPORT=1 → sunucusuz site (out/).
  // NEXT_PUBLIC_BASE_PATH: GitHub Pages proje sitesi için alt yol
  // (ör. /language-tutor) — elle fetch'ler src/lib/base-path.ts kullanır.
  ...(process.env.STATIC_EXPORT === "1"
    ? {
        output: "export" as const,
        ...(process.env.NEXT_PUBLIC_BASE_PATH
          ? { basePath: process.env.NEXT_PUBLIC_BASE_PATH }
          : {}),
      }
    : {}),
  // Fixture bayrağı HER build'de tanımlı olmalı: tanımsız kalırsa bundler
  // process.env okumasını inline edemez, browser-fixture dalını ölü kod
  // olarak düşüremez ve fixture chunk'ı (bundle.json içeriğiyle) prod
  // çıktısına sızar (build sonrası grep ile doğrulandı, 2026-08-10).
  env: {
    NEXT_PUBLIC_LLM_FIXTURE: process.env.NEXT_PUBLIC_LLM_FIXTURE ?? "",
  },
  serverExternalPackages: ["better-sqlite3"],
  // Sol alt köşe feedback butonunun (FeedbackButton) — dev indicator'ı oradan çek.
  devIndicators: { position: "bottom-right" },
  // Worktree'lerde ana repo lockfile'ı görülüp kök yanlış tahmin ediliyor —
  // kökü her zaman çalışılan proje dizinine sabitle.
  turbopack: { root: process.cwd() },
};

export default nextConfig;
