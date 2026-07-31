---
id: T-054
title: okumo.dev landing sayfası (design handoff — ayrı scope)
status: done
priority: p3
effort: M
confidence: low
depends: [T-052]
created: 2026-07-27
---

## Karar + uygulama (2026-07-31)

**Landing `/` KÖKÜNDE.** Gerekçe: pazarlama yüzeyinin taranabilir/unfurl
edilebilir olması gerekiyor; eski `/` bir client redirect kapısıydı (🌸
spinner) ve crawler'a hiçbir şey göstermiyordu. Ayrı yol (`/welcome`) çıplak
`okumo.dev` ziyaretçisini yine spinner'a düşürürdü.

Dönen kullanıcı iki katmanlı çözülüyor:
- `src/lib/visited-flag-key.ts` + `visited-flag.ts` — profil oluşturan her UI
  yolu senkron localStorage bayrağı yazar (6 nokta).
- `ReturningUserGate` — boyama ÖNCESİ inline script (tema script'inin eşi);
  bayrak varsa landing hiç görünmeden `location.replace("/map")`.
- IndexedDB tek gerçek kaynak KALIR; bayrak sadece kestirme.

**Bilinen takas:** verisi olup bayrağı olmayan kullanıcı (bayrak öncesi
profiller, localStorage temizliği) landing'i bir kez görür. Çıkış yolu
hero altındaki "kayıtlı ilerlemeni sürdür" linki — tam `profileData()`
yolunu TIKLAMADA koşturur ve bayrağı geri doldurur. Mount'ta değil:
pazarlama ziyaretçisine sql.js boot'u ödetmemek için.

**AppChrome:** `SelectionTooltip`/`CommandPalette`/`FeedbackButton` üçü de
`useProfileMeta()` → `profileData()` → ~645KB sql.js WASM + IndexedDB boot
tetikliyordu ve RootLayout'ta KOŞULSUZ mount ediliyordu — yani maliyet
rotadan bağımsızdı, landing'i ayrı yola taşımak bile çözmezdi. Artık
`usePathname()` ile landing'de mount edilmiyorlar.

Kapsam dışı bırakılanlar (ayrı iş): favicon/OG görseli/robots.txt/sitemap
asset üretimi, ekran görüntüsü pipeline'ı (önizleme DS desenlerinden CSS ile
kuruldu), fiyatlandırma/monetize mesajı.
Handoff'ta ayrı scope: okumo.dev için landing sayfası.
Referans: v1 mock `design/okumo-sky/Okumo Landing.dc.html` idi — v1 handoff
GEÇERSİZ ve silindi (git geçmişinde: `5ad0c88`). Bu iş çekildiğinde v2
Yūyake sistemi (`design/okumo-yuyake/`) baz alınır; landing mock'u v2'de
yok, DS v2 token/bileşen rolleriyle sıfırdan kurgulanır.

Şu an okumo.dev = uygulamanın kendisi (Worker static assets, anonim başlangıç
+ login). Landing = ürünü tanıtan, "başla" ile app'e geçiren pazarlama yüzeyi.
Açık kararlar (Burak):
- Landing app'in KÖKÜ mü (`/` landing → `/onboarding` app), yoksa ayrı yol mu?
- Statik export'a nasıl oturur (mevcut root pages kalıbı, `<Suspense>` kuralı)?
- Kapsam pazarlama-only mu (özellikler, ekran görüntüleri, "başla" CTA) yoksa
  fiyatlandırma/monetize mesajı da mı (monetize modeli henüz kararlaşmadı →
  şimdilik pazarlama-only tut).

Sky ailesi + Kumo mark (T-052) landing'de de kullanılır → depends T-052.
confidence low: landing içeriği/yapısı Burak'ın ürün mesajına bağlı, mock
başlangıç noktası. Tasarım + kopya ağırlıklı. Diğer içerik/güvenlik işlerine
göre düşük öncelik — okumo kamuya duyurulmadan önce çekilir.
