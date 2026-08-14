import type { Metadata } from "next";
import { Fraunces, Nunito_Sans } from "next/font/google";
import { AppChrome } from "@/components/shared/AppChrome";
import { SwRegister } from "@/components/shared/SwRegister";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin", "latin-ext"],
});

const nunito = Nunito_Sans({
  variable: "--font-nunito",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "okumo — Dil Yolculuğun",
  description: "Kişisel dil öğretmenin",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{const t=localStorage.getItem("theme");if(t)document.documentElement.classList.add(t)}catch(e){}`,
          }}
        />
      </head>
      <body
        className={`${fraunces.variable} ${nunito.variable} antialiased min-h-dvh`}
      >
        {children}
        {/* T-054: global app-chrome — landing (`/`) rotasında mount edilmez,
            bkz. AppChrome. */}
        <AppChrome />
        {/* T-095: offline shell; prod'da SW'yi kurar, landing dahil tüm
            sayfalarda mount edilir ki ilk ziyaret de precache'i başlatsın. */}
        <SwRegister />
      </body>
    </html>
  );
}
