"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { profileData, roadmap } from "@/lib/client-api";
import { AppError } from "@/lib/errors";

// Giriş kapısı: profil + hazır müfredat varsa haritaya, yoksa onboarding'e.
// İstemci tarafında karar verir — sunuculu ve statik modda aynı davranış.
export default function Home() {
  const router = useRouter();
  useEffect(() => {
    (async () => {
      try {
        const d = await profileData();
        if (!d.profile) return router.replace("/onboarding");
        try {
          await roadmap(); // müfredat hazır değilse throw
        } catch (e) {
          // T-056: profil var ama müfredat yok (LLM'siz onboarding, ya da
          // üretim hâlâ sürüyor). Onboarding'e düşürmek kullanıcıyı sihirbaz
          // döngüsüne kilitler — /map kendi "müfredat yok" durumunu gösterir.
          if (e instanceof AppError && e.code === "curriculum_not_ready") {
            return router.replace("/map");
          }
          return router.replace("/onboarding");
        }
        router.replace("/map");
      } catch {
        router.replace("/onboarding");
      }
    })();
  }, [router]);
  return (
    <div className="flex min-h-dvh items-center justify-center text-ink-soft">
      <div className="animate-float-slow text-5xl">🌸</div>
    </div>
  );
}
