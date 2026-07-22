---
id: T-026
title: Kapsamlı security review (public/monetize öncesi)
status: done
priority: p1
effort: L
confidence: medium
depends: [T-032, T-034, T-035, T-036, T-037]
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

---
## Sonuç (2026-07-22, done)

6 paralel read-only keşif agent'ı + orchestrator'da 2 empirik test +
her actionable bulgu fable-verifier adversarial doğrulaması. Detay:
INDEX "Dalga 5 sonucu". Actionable bulgular → **T-039..T-042**.

### Kabul edilen riskler (ticket açılmadı)

- **Job route IDOR (frame B):** `generation_jobs`'ta `profileId` yok;
  cancel/cancel-all/resume-pending profil scope'suz (`core/jobs.ts:78,128-220`).
  Shipped build'lerde EXPLOIT DEĞİL — statik build hiç route taşımıyor,
  server modu tek-kullanıcı localhost. Bilinçli mimari karar
  (`core/jobs.ts:78` "jobs aren't profile-owned"). Server multi-user
  pivot'unda tenant'laşması gerekir → T-040 kapsamına bırakıldı. Ayrı fix
  ticket'ı açılmadı.
- **Feedback screenshot key uyarısı yalnız /settings'e scoped**
  (`FeedbackButton.tsx:364`): bugün güvenli — key input'ları `type="password"`
  (html2canvas nokta render eder), GET yalnız maskeli key ship'liyor, sihirbaz/
  sağlayıcı bölümü sadece /settings'te render oluyor. Defense-in-depth; başka
  route'a key alanı eklenirse uyarı sessizce fire etmez. Bugün somut sızma yok
  → kabul edilen risk, tiny not.
- **npm audit high/moderate (8):** `drizzle-orm` SQLi (unescaped identifiers)
  ERİŞİLEMEZ — kod hiç `sql.identifier`/`sql.raw` kullanmıyor; tek dinamik
  parça `overview.ts`'teki `${pid}` (parametreli binding, integer profil id,
  kullanıcı-kontrollü identifier değil). `esbuild` dev-server CVE erişilemez
  (Turbopack kullanılıyor, esbuild yalnız transitive TS-compile, `esbuild
  serve` hiç çalışmıyor). `sharp`/`postcss`/`drizzle-kit` build/dev-only,
  shipped statik yüzeyde yok. Hepsi kabul edilen risk; `npm audit fix`
  fırsat oldukça (major bump'sız) uygulanabilir, güvenlik blocker'ı değil.

### Bulgu YOK (doğrulandı, temiz)

- **Statik deploy sızıntısı:** `out/`'ta `.db`/`.env`/`llm-config`/API-key/
  Google-secret yok (bundle grep + import-graph); Pages clean-checkout'tan
  build ediyor → yalnız git-tracked dosyalar ship'leniyor. **Owner-sub wiring
  yok** (en yüksek riskli kontrol): server provider yalnız stash'lenen
  `/api/*` üzerinden `jobs.ts`'e import ediliyor, `core/*` DI kullanıyor,
  statik client yalnız kullanıcının kendi key/bridge'ini çağırıyor
  (`browser-provider.ts`).
- **LLM çıktısı → UI XSS:** her LLM alanı React-escaped ya da react-markdown
  (rehype-raw/allowDangerousHtml YOK). Payload testi empirik: `<img onerror>`,
  `<script>`, `javascript:` link — hepsi entity-escaped/inert. Tek izleme
  noktası: JpMarkdown'a ileride `rehype-raw` eklenirse stored-XSS açılır.
- **Drive OAuth (T-032):** token memory-only (~1h, refresh token yok),
  `drive.appdata` scope, client-id/secret gömülü değil (kullanıcı sağlıyor),
  save image yalnız googleapis.com'a gidiyor, popup/postMessage flow (redirect/
  token-in-URL yok).
