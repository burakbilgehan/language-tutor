"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { profileData, roadmap } from "@/lib/client-api";

// Giriş kapısı: profil + hazır müfredat varsa haritaya, yoksa onboarding'e.
// İstemci tarafında karar verir — sunuculu ve statik modda aynı davranış.
export default function Home() {
  const router = useRouter();
  useEffect(() => {
    (async () => {
      try {
        const d = await profileData();
        if (!d.profile) return router.replace("/onboarding");
        await roadmap(); // müfredat hazır değilse throw
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
