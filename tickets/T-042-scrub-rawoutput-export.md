---
id: T-042
title: Save export'tan provider hata gövdesini (raw_output) scrub'la
status: backlog
priority: p3
effort: S
confidence: high
depends: []
created: 2026-07-22
---
T-026 dalga 5 bulgusu (K1). **Tehdit çerçevesi A/B — LOW, PLAUSIBLE.**
Bulgu fable-verifier'dan geçti; üç load-bearing halka da doğrulandı.

Zincir: `src/lib/jobs.ts:473-478` provider'ın ham HTTP hata gövdesini
(`err.rawOutput`, 20k cap) `generation_jobs.raw_output`'a yazıyor
(`http-provider.ts:78-86` / `anthropic-http-provider.ts` full response body'yi
`rawOutput`'a geçiriyor). `src/lib/save/export.ts:30-34`
`snapshotWithoutJobQueue` yalnız `queued`/`running` satırlarını siliyor;
`error` satırları rawOutput'uyla paylaşılabilir save snapshot'ına GİRİYOR.
Bu, `config.ts:5-9`'ın tasarım niyetini (key'i DB dışında tut ki paylaşılan
save'e sızmasın) delip geçiyor.

Neden LOW: sızma için kullanıcının *custom/bridge* endpoint'inin
`Authorization` header'ını hata gövdesine yansıtması gerekir. Mainstream
sağlayıcılar (OpenAI/Anthropic/DeepSeek) yapılandırılmış hata JSON'u döner,
gönderilen key'i echo'lamaz — precondition yalnız naif self-hosted bridge /
yanlış yapılandırılmış proxy'de tutar. Ayrıca rawOutput client'a CANLI
ulaşmıyor (`jobs/[id]/route.ts:16-20` yalnız id/status/error döner) — yalnız
save export yoluyla kaçıyor.

Önerilen fix (ucuz): export snapshot'ında mevcut job-queue scrub'ının yanına
`error` satırlarının `raw_output`'unu da NULL'la (veya `error` satırlarını da
export'tan çıkar). Alternatif: rawOutput'u en baştan persist ederken
`Authorization`/`Bearer` desenlerini redact et.
