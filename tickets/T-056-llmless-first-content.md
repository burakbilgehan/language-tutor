---
id: T-056
title: LLM'siz akış bozuk + ilk açılışta anında statik içerik (augmentation modeli)
status: done
priority: p1
effort: M
confidence: high
depends: []
created: 2026-07-27
---
★ ACİL. İki fazlı — Faz 1 canlı bug (hemen), Faz 2 mimari düzeltme.

**Durum güncellemesi (2026-07-27):** Faz 1 MERGE EDİLDİ (`d791e63` +
`53c65da` — onboarding `llm_unconfigured`'ı yakalayıp /map'e düşüyor,
RoadmapView boş-harita durumunu gösteriyor). Kalan kapsam = yalnız Faz 2.
İlişki: T-060 (sihirbaz redesign) "Bağlamadan devam"ı birinci sınıf kapı
yapıyor; o kapının arka yüzü bu ticket'ın Faz 2'si.

**Kapanış (2026-07-27, solo wave):** Faz 2 de merge edildi (`b330e6c` /
merge `2cf0ae6`). Ruling'ler (Burak): **B — cheatsheet hub'ı** (iskele
curriculum reddedildi; flip: ders içeriği için paketlenmiş seed shiplenirse
A yeniden masaya gelir). `/map` müfredatsız durumu artık dil-farkındalıklı
kütüphane hub'ı (kartlar `visibleNavItems`'tan; lessons/review/chat hariç) +
LLM varsa "Müfredatı oluştur", yoksa "LLM bağla". Kapı ekranı dörtlü ve
yeniden sıralandı: rehberli kurulum (birincil) / kayıt yükle / bulut girişi /
**anonim başlangıç** (tek soru: hedef dil — immutable olduğu için
default'lanamaz; kalan her şey default, Ayarlar'dan özelleştirilir; anonim
yol curriculum'u LLM bağlıyken bile otomatik üretmez — tetik hub'da).
Ek düzeltme `40250c0`: grammar/vocab sidebar'ları yükleme hatasını boş
listeye maskeliyordu ("müfredat oluşunca..." yanıltıcı kopyasıyla) — hata
artık retry'lı görünür durum. en-native seed boşluğu → **T-064**.

**Temel ilke (Burak):** LLM bağlama + kişiselleştirme bir **augmentation**'dır,
ön-koşul DEĞİL. Statik content her an hazır (grammar/kanji/vocab seed CDN'de +
packaged seed, `applyGrammarSeed`/`applyKanjiSeed`/`applyVocabSeed`). Kullanıcı
siteyi ilk açtığında VE setup bitince ANINDA içerik görmeli; LLM sonradan
gelip dersleri/kişisel müfredatı ekler.

## Faz 1 — "Continue without LLM" bozuk (canlı bug, acil)
Onboarding son adımı koşulsuz `curriculumGenerate(profile.id)` çağırıyor
(`src/components/onboarding/OnboardingWizard.tsx:531`) — bu LLM-gated. LLM
bağlı değilken "continue without LLM" dendiğinde bu çağrı "LLM bağlayın"
hatası verip akışı KİLİTLİYOR. "Continue without LLM" çok önemli ve düzgün
çalışmalı: LLM yoksa curriculum generate ATLANMALI, kullanıcı stuck olmadan
statik-içerikli bir başlangıca (aşağıda Faz 2) götürülmeli. Doğrulama: temiz
tarayıcı → siteyi aç → "LLM'siz devam" → hatasız içerik gelmeli.

## Faz 2 — İlk açılışta + setup sonrası anında statik içerik
LLM'siz kullanıcı için değerli bir başlangıç durumu:
- **Grammar cheatsheet** (dil-geneli index + packaged seed — LLM'siz tam hazır),
  **sözlük/vocab** (zh), **kanji** (ja) — hepsi anında gezilebilir.
- `/map` (roadmap) LLM'siz ne gösterecek? Curriculum LLM-üretimi → ya statik
  bir "iskele" curriculum (seed'lenebilir mi?) ya da açık "dersler için LLM
  bağla" durumu + bu arada cheatsheet/sözlüğe yönlendiren canlı içerik. Kör
  boş /map GÖSTERME.
- İlk açılış: onboarding'e girmeden bile (ya da anonim başlayınca hemen)
  statik kütüphaneye erişim hissi.
- LLM bağlanınca kişiselleştirme (curriculum + dersler) augmentation olarak
  eklenir — mevcut curriculumGenerate/ensureLesson akışı LLM gelince devreye.

Karar noktası (fix session'ında netleşir): LLM'siz "roadmap" nasıl görünür —
statik iskele curriculum mu, yoksa cheatsheet-merkezli bir giriş mi? Mevcut
`llmConfigured()` / `useLlmStatus` gate'leri (`src/lib/llm/config.ts`,
`src/lib/llm-status.ts`) zaten "no-LLM degrade" için var — bu akışı onların
üstüne kur, yeni gate icat etme.

Fence: `OnboardingWizard.tsx` sonu + `/map` (roadmap) ilk-render + muhtemelen
`client-api.ts` curriculum yolu. Model: **opus** (Faz 2 mimari yargı —
LLM'siz başlangıç durumunun tasarımı, kör find-replace değil).
