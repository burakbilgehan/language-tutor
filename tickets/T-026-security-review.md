---
id: T-026
title: Kapsamlı security review (public/monetize öncesi)
status: backlog
priority: p1
effort: L
confidence: medium
depends: [T-024, T-025, T-027, T-028, T-029, T-030, T-031, T-032]
created: 2026-07-22
---
Proje bir noktada public'e açılıp monetize edilebilir hale gelmeli (Burak,
2026-07-22). O eşikten önce baştan sona güvenlik taraması. Bu batch'teki
diğer ticket'lar bittikten SONRA koşmalı ki tarama son hali görsün —
depends ondan.

Yöntem: `/security-review` + bulguları fable-verifier'dan geçir
(adversarial doğrulama — plausible-but-wrong bulgu istemiyoruz). Bulgular
severity sıralı; her bulgu için somut saldırı senaryosu şart.

Şimdiden bilinen sıcak noktalar (tarama bunlarla sınırlı kalmasın):
- **Save import**: kullanıcıdan gelen ham SQLite dosyası. Version check
  var, içerik doğrulaması yok. Kötücül şema/tetikleyici/dev boyut/zip-bomb
  benzeri imajlar; better-sqlite3 + sql.js iki ayrı parser yüzeyi.
- **API route'larında auth yok**: tek-kullanıcılı lokal varsayım. Server
  modu internete açılırsa her endpoint (save export dahil!) herkese açık.
  Public deploy senaryosu için en az bir kimlik katmanı tasarımı gerek.
- **LLM config**: `data/llm-config.json` (server, düz dosya) +
  localStorage (statik) API key saklama; GET maskeleme; key'in log/hata
  mesajı/feedback screenshot'ına sızma ihtimali.
- **Bridge** (`scripts/llm-bridge.mjs`): CORS `--origin`, localhost'a
  bağlanan sayfanın kimliği, DNS rebinding, bridge'in Max sub'ı proxy'leme
  yüzeyi (LLM_CLI_DISABLED mantığının tersi).
- **XSS**: LLM üretimi içerik UI'a nasıl giriyor — JpMarkdown/Furigana/
  ruby render'ları, dangerouslySetInnerHTML var mı, bracket-notation
  parser'ları. Fixture'a kötücül payload koyup dene.
- **Feedback mekanizması** (T-017): html2canvas screenshot + GitHub issue
  prefill — ekranda key/kişisel veri varken screenshot'a girer mi?
- **Drive sync (T-032 sonrası)**: OAuth token'ın tutulduğu yer, scope
  genişliği, save imajının üçüncü taraf origin'lere sızmaması.
- **Bağımlılıklar**: `npm audit` + kritik paketlerin (better-sqlite3,
  sql.js, wanakana, html2canvas-pro) supply-chain durumu.
- **Statik deploy**: Pages'e giden `out/` içinde sızıntı (ör. yanlışlıkla
  data/, .env, llm-config) olmadığının build-time garantisi.

Çıktı: severity-sıralı bulgu listesi + her biri için fix ticket'ı ya da
"kabul edilen risk" kaydı. Auth katmanı gibi büyük işler ayrı ticket'a
bölünür.
