// GitHub Pages proje sitesi alt yolda servis eder (/<repo>/). Next kendi
// asset'lerini ve <Link>'leri basePath'le çözer ama elle yazılmış fetch'ler
// çözmez — public/ altındaki dosyalara erişen her fetch bu helper'dan geçer.
// Build-time inlined: workflow NEXT_PUBLIC_BASE_PATH="/language-tutor" verir,
// lokal build'de boş kalır (kök).
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function withBase(path: string): string {
  return `${BASE_PATH}${path}`;
}
