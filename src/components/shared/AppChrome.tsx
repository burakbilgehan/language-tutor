"use client";

import { usePathname } from "next/navigation";
import { SelectionTooltip } from "@/components/shared/SelectionTooltip";
import { FloatingOverview } from "@/components/shared/FloatingOverview";
import { JobQueuePop } from "@/components/shared/JobQueuePop";
import { CommandPalette } from "@/components/shared/CommandPalette";
import { FeedbackButton } from "@/components/shared/FeedbackButton";
import { BackupBar } from "@/components/shared/BackupBar";

// T-054: layout seviyesindeki global "app chrome"u landing'de mount etmez.
//
// Sebep: SelectionTooltip, CommandPalette ve FeedbackButton üçü de
// useProfileMeta() çağırıyor -> profileData() -> statik modda ~645KB sql.js
// WASM fetch+compile + IndexedDB açılışı + ddl.ts self-heal replay'i. Bunlar
// RootLayout'ta koşulsuz mount edildiği için maliyet ROTA'dan bağımsızdı;
// landing'i ayrı bir yola taşımak bile çözmezdi (her şey aynı layout altında).
// Zaten üçü de profil gerektiren app-chrome'u — pazarlama sayfasında işlevsiz.
//
// BackupBar (IS_STATIC gate + yalnız localStorage) ve JobQueuePop (DB'siz
// store) ucuz; yine de landing'de görsel olarak anlamsız oldukları için
// aynı kapının arkasındalar.
const LANDING_PATHS = new Set(["/", ""]);

export function AppChrome() {
  const pathname = usePathname();
  // next.config.ts trailingSlash ayarlamıyor; yine de "/" ve "" ikisini de
  // eleyerek olası varyanta karşı savunmalı davranıyoruz.
  if (LANDING_PATHS.has(pathname)) return null;

  return (
    <>
      <SelectionTooltip />
      <JobQueuePop />
      <FloatingOverview />
      <CommandPalette />
      <FeedbackButton />
      <BackupBar />
    </>
  );
}
