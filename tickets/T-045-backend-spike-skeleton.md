---
id: T-045
title: Backend spike + iskelet (Cloudflare Worker + R2 + D1 + auth uçtan uca)
status: backlog
priority: p1
effort: M
confidence: medium
depends: []
created: 2026-07-26
---
Backend/kimlik işinin İLK adımı — infra değil **spike** (Burak + advisor,
2026-07-26). Amaç: üç load-bearing varsayımı kod değil kanıtla doğrulamak,
4 downstream ticket'ı de-risk etmek. Başarısızsa mimariyi burada değiştir,
üç ticket yazıldıktan sonra değil.

**Uçtan uca hedef (yarım-gün):** "Google ile login ol → session al → R2'ye
1 byte yaz → geri oku." Bu çalışıyorsa stack doğrulanmış demektir.

Doğrulanacak varsayımlar:
1. **better-auth Cloudflare Workers runtime'da + D1 adapter** ile çalışıyor mu?
   Workers düz Node değil; adapter desteği kırılan yer burası. Güncel
   better-auth dokümanına karşı doğrula (Cloudflare skill'leri: `wrangler`,
   `durable-objects`, `agents-sdk`).
2. **Magic-link SENDER** var mı? Cloudflare Email Routing **inbound-only** —
   giden email için Cloudflare Email Sending (`cloudflare-email-service`
   skill) ya da Resend/Postmark gerekir. Sender kurulmadan magic-link yok.
3. **Cookie/domain hikayesi** (bkz. T-046 kararı): site GitHub Pages'te,
   Worker `*.workers.dev`'de olursa session cookie'si **third-party** →
   Safari ITP bloklar. Spike'ta same-origin/custom-domain kurulumunu dene,
   bearer-token-in-localStorage'a düşmeden çözülüyor mu gör (o yol XSS-okunur,
   dalga 5'te doğruladığımız "XSS yok" özelliğine bağımlı hale getirir).

Çıktı: çalışan minimal Worker + `wrangler.toml` + D1 şema iskeleti + R2
bucket + "hangi varsayım tuttu/tutmadı" raporu. Kod prod-kalite olmak
zorunda değil (spike); T-046 bunu sertleştirir. **Kapsam dışı:** save-sync
mantığı, seed-strip, UI — sonraki ticket'lar.
