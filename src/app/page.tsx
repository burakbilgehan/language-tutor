import type { Metadata } from "next";
import { Landing } from "@/components/landing/Landing";
import { ReturningUserGate } from "@/components/landing/ReturningUserGate";

// T-054: `/` artık pazarlama yüzeyi (landing), eski yönlendirme kapısı değil.
//
// Neden server component: `export const metadata` "use client" altında mümkün
// değil, ve landing'in bütün varlık sebebi taranabilir/unfurl edilebilir bir
// kök sayfa olması. Statik export bunu out/index.html'e prerender eder.
//
// Dönen kullanıcı: <ReturningUserGate/> boyama öncesi inline script'tir —
// localStorage bayrağı varsa landing hiç görünmeden /map'e gider. Eski
// profileData() tabanlı kapı kaldırıldı: statik modda sql.js WASM + IndexedDB
// boot'u demekti ve pazarlama ziyaretçisine bedelini ödetiyordu.
export const metadata: Metadata = {
  title: "okumo — dil yolculuğun",
  description:
    "Kendi hızında, kendi ilgi alanlarınla dil öğren. Sana göre müfredat, zamanında tekrar, hazır dilbilgisi ve kelime kütüphanesi. Hesap yok — ilerlemen tarayıcında kalır.",
  openGraph: {
    title: "okumo — dil yolculuğun",
    description:
      "Kendi hızında, kendi ilgi alanlarınla dil öğren. Hesap yok, abonelik yok — ilerlemen tarayıcında kalır.",
    type: "website",
    siteName: "okumo",
  },
};

export default function Home() {
  return (
    <>
      <ReturningUserGate />
      <Landing />
    </>
  );
}
