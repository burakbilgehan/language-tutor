import type { Metadata } from "next";
import { Fraunces, Nunito_Sans } from "next/font/google";
import { SelectionTooltip } from "@/components/shared/SelectionTooltip";
import { FloatingOverview } from "@/components/shared/FloatingOverview";
import { CommandPalette } from "@/components/shared/CommandPalette";
import { FeedbackButton } from "@/components/shared/FeedbackButton";
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
  title: "Kumo — Dil Yolculuğun",
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
        <SelectionTooltip />
        <FloatingOverview />
        <CommandPalette />
        <FeedbackButton />
      </body>
    </html>
  );
}
