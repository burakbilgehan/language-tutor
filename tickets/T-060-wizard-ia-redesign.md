---
id: T-060
title: LLM sihirbazı IA redesign — 3 kapı, canlı algılama, kalite profili, dürüst copy
status: backlog
priority: p2
effort: L
confidence: medium
depends: [T-057, T-059]
created: 2026-07-27
---
Dalganın kalbi. Burak kararları (2026-07-27 tartışması):

## 1. Üç kapı
- **"Bağlamadan devam" (No-LLM)** — birinci sınıf kapı, "atla" linki değil.
  Copy: statik kütüphane (grammar/kanji/vocab seed) ANINDA açık, dersler/chat
  LLM bağlanınca kilidi açılır. Arka yüzü T-056 Faz 2 (ayrı ticket; bu kapı
  onun çıktısına yaslanır ama ona hard-bağımlı değil — kapı önce gelirse
  mevcut no-LLM degrade davranışına düşer).
- **"Bilgisayarımdaki AI" (lokal)** — Ollama + abonelik köprüsü TEK kapıda
  (ikisi de "tarayıcın localhost'taki OpenAI-uyumlu sunucuya bağlanır");
  içeride iki şerit: "mevcut aboneliğim (Claude/ChatGPT/Copilot/Gemini)" ve
  "ücretsiz yerel model (Ollama)". Teknik seam birleşmez (Ollama kendi
  endpoint'i, bridge kendi portu) — yalnız UX birleşir.
- **"API anahtarı"** — bugünkü key yolu; sağlayıcı seçimi + kalite profili.

## 2. Canlı algılama checklist'i (statik talimat yerine)
Lokal kapıda sihirbaz kendi ilerler: kısa-timeout probe ile bridge
`GET :8484/health` (T-059) ve Ollama `GET :11434/api/tags` yoklanır →
"köprü bekleniyor… → köprü bulundu ✓ (claude) → test et". Komut satırı yine
gösterilir (`npx okumo-bridge`, T-059) ama kullanıcı "test"e körlemesine
basmaz; site durumu görür. Safari uyarısı ve `--origin` mantığı korunur.
Probe yalnız bu kapı açıkken ve interval'li — arka planda sürekli polling yok
(OnboardingWizard.tsx:346'daki "probe pahalı" dersi geçerli).

## 3. Kalite profili + bütçe ipucu (model muallaklığının çözümü)
- Sağlayıcı seçildikten sonra TEK seçim: **Eko / Denge / En iyi** — arkada
  T-057 kataloğundan somut fast/balanced/deep üçlüsü dolar.
- Seçimin altında görünürlük satırı: "Kullanılacak: DeepSeek V3 (hızlı işler)
  · DeepSeek R1 (dersler)" — hangi modelin çalışacağı ASLA gizli kalmaz
  (bugünkü ekran görüntüsü şikâyeti: DeepSeek seçince hangi model, belirsiz).
- Bütçe ipucu: katalog fiyat metadata'sından kaba aylık tahmin
  ("tipik kullanımda ~$X/ay"; yerel/abonelikte "ek ücret yok").
- fast/balanced/deep ÜÇLÜSÜ casual akıştan tamamen çıkar.

## 4. Gelişmiş panel — LlmProviderSection erir
Nokta atışı model id'leri, custom base URL, tier override, jsonMode,
opencode gibi ekstra backend'ler → tek "Gelişmiş" accordion'ı.
`LlmProviderSection` ayrı yüzey olmaktan çıkar (masking/save mantığı
client-api'de zaten ortak); CLI modu (server-mode, Burak'ın kullanımı)
gelişmişte aynen kalır. İki yüzeyin duplike Anthropic sabitleri T-057 ile
zaten ölmüş olacak.

## 5. Dürüst-friction copy (Burak, karar 4)
Lokal kapının tonu: "evet, bu adım biraz tekniktir — yıl 2026, AI literacy
artık bir beceri; öğrenmeye değer. Daha kolayını istersen: No-LLM ile hemen
başla (statik içerik her geçen gün büyüyor) ya da 5 dakikalık API anahtarı
yolu." Friction'ı gizleme, gerekçelendir. tr canonical + en ayna
(`useStrings` düzeni).

Fence: `components/settings/LlmSetupWizard.tsx` + `LlmProviderSection.tsx`
(+ onboarding'deki embed noktası `OnboardingWizard.tsx:1037` civarı — yalnız
embed, wizard'ın kendisi), `lib/llm-status.ts` gerekiyorsa. `src/lib/llm/*`
T-057'de bitmiş olmalı — bu ticket oraya DOKUNMAZ. Model: opus (IA + copy +
state machine, mekanik değil).
