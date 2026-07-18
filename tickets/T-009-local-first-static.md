---
id: T-009
title: Faz 2b — local-first statik build (tarayıcı SQLite + GitHub Pages)
status: done
priority: p1
effort: XL
confidence: medium
depends: []
created: 2026-07-17
---
Faz 1 (BYO provider seam) + Faz 2a (llm-bridge) bitti — bu worktree/branch:
`worktree-byo-llm-provider`. Kalan büyük parça: uygulamayı statik build'e
taşıyıp tüm veriyi tarayıcıya almak, böylece GitHub Pages'ten deploy edilen
sayfa kullanıcının localhost köprüsüne / kendi API key'ine tarayıcıdan
erişebilsin (sunucudan localhost'a erişilemez — köprünün deploy'da
çalışmasının tek yolu bu).

Keşif verdicti (2026-07-17, ayrıntı konuşma geçmişinde):
- 29 API route (~1.8k LOC) client modüle taşınacak; 13 fetch("/api/...")
  çağrı noktası doğal seam.
- better-sqlite3 → wasm SQLite (OPFS): mimari blocker yok ama TÜM
  .sync()/.run() çağrıları async'e dönecek — en büyük mekanik maliyet.
- İş mantığı (SRS, answersMatch, conjugation, grammar-index...) zaten pure —
  bedava taşınır. jobs.ts çoklu-süreç recovery'si tek-tab modelinde
  basitleşir.
- Save formatı raw SQLite imajı → tarayıcı export/import birebir uyumlu.
- Strokes 31MB node_modules'ten public/'e build-step kopya + on-demand fetch;
  JMdict 1.75MB fetch-on-demand.
- LLM: mevcut http-provider tarayıcıda da çalışır (fetch tabanlı); Anthropic
  direkt çağrı için `anthropic-dangerous-direct-browser-access` header
  eklenecek; key localStorage'a taşınır (config dosyası server'sız yok).
- Bridge CORS'u hazır: `--origin https://<user>.github.io` + PNA header.

Öneri: dikey dilim POC ile başla (review/SRS akışı uçtan uca wasm SQLite),
sonra kalan route'ları aynı kalıpla taşı.

---
KAPANIŞ (2026-07-18): Tamamlandı. sql.js SENKRON çıktı (async dönüşüm
gerekmedi); tüm yüzeyler src/core/* üzerinden tarayıcı DB'sinde; chapter
üretimi dahil LLM döngüsünün tamamı statikte; GitHub Pages canlı:
https://burakbilgehan.github.io/language-tutor/ (workflow: pages.yml,
NEXT_PUBLIC_BASE_PATH=/language-tutor). Kurulum sihirbazı T-010'da.
Kalan karar: main'e merge + statik-default konumlandırma (T-008).
