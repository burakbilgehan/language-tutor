import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  // Worktree'lerde ana repo lockfile'ı görülüp kök yanlış tahmin ediliyor —
  // kökü her zaman çalışılan proje dizinine sabitle.
  turbopack: { root: process.cwd() },
};

export default nextConfig;
