import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // scripts/build-static.mjs sets STATIC_EXPORT=1 → sunucusuz site (out/).
  ...(process.env.STATIC_EXPORT === "1" ? { output: "export" as const } : {}),
  serverExternalPackages: ["better-sqlite3"],
  // Worktree'lerde ana repo lockfile'ı görülüp kök yanlış tahmin ediliyor —
  // kökü her zaman çalışılan proje dizinine sabitle.
  turbopack: { root: process.cwd() },
};

export default nextConfig;
