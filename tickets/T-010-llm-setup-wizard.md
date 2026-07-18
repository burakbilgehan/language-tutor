---
id: T-010
title: LLM bağlantı sihirbazı (kod bilmeyen kullanıcı için kurulum akışı)
status: done
priority: p1
effort: M
confidence: high
depends: []
created: 2026-07-18
---
Statik üründe LLM bağlantısı kullanıcının sorumluluğunda; mevcut Ayarlar
bölümü teknik kullanıcıya göre. Kod bilmeyen kullanıcı için rehberli akış:

1. Soru: "LLM'e nasıl bağlanmak istersin?"
   - Claude aboneliğim var → claude CLI kurulu mu kontrolü anlatılır; kurulum
     linki; sonra OS'e göre tek satır bridge komutu (macOS/Linux: curl|node
     pipe; Windows: PowerShell karşılığı). CLI'sız Claude web aboneliği
     programatik KULLANILAMAZ — dürüstçe söylenir, key alternatifi sunulur.
   - ChatGPT aboneliğim var → codex CLI + bridge --backend codex
   - Copilot aboneliğim var → copilot CLI + bridge --backend copilot
   - API key alacağım (önerilen, kurulumsuz) → DeepSeek/OpenAI/Anthropic
     linkleri + key'i yapıştır → hazır
   - Bilgisayarımda model (Ollama, önerilen 2.) → Ollama installer linki +
     OLLAMA_ORIGINS talimatı + model önerisi
2. Her seçimde "Bağlantıyı test et" ile doğrulama; başarıda otomatik kayıt.
3. bridge sitede servis ediliyor (out/llm-bridge.mjs — build-static kopyalar);
   komutlar origin'i otomatik doldurur.
4. İleri aşama: bridge'i tek binary derle (bun compile, mac/win/linux) —
   Node gerektirmeyen indir-çalıştır. Sihirbaz OS algılayıp doğru binary'yi
   sunar.

Konumlandırma: default öneri key/Ollama (sürtünmesiz); bridge "aboneliğim
var" kitlesi için ileri seçenek. "Default claude" varsayımı yok.

---
KAPANIŞ (2026-07-18): LlmSetupWizard.tsx — 3 yol (API key önerilen /
Ollama önerilen-2 / abonelik+köprü: claude-codex-copilot-gemini), OS'e göre
tek satır komutlar (köprü sitede servis, origin otomatik), CLI'sız claude.ai
dürüst uyarısı, Safari uyarısı, test-et-ve-kaydet. Statikte config yokken
otomatik açılır; formdan "Kurulum sihirbazı" ile erişilir. Bun tek-binary
köprü ileri aşama olarak açık kaldı.
