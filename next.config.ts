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
  serverExternalPackages: ["better-sqlite3"],
  // Sol alt köşe feedback butonunun (FeedbackButton) — dev indicator'ı oradan çek.
  devIndicators: { position: "bottom-right" },
  // Worktree'lerde ana repo lockfile'ı görülüp kök yanlış tahmin ediliyor —
  // kökü her zaman çalışılan proje dizinine sabitle.
  turbopack: { root: process.cwd() },
};

export default nextConfig;
