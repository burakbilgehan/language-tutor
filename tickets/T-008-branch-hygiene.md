---
id: T-008
title: Branch push / PR kararı
status: done
priority: p2
effort: S
confidence: high
depends: []
created: 2026-07-17
---
feat/extendable-curriculum-full-grammar-save branch'inde ~20 lokal
commit birikti (bugünün tamamı dahil). Push/PR hiç konuşulmadı.
Karar Burak'ın: main'e merge mi, PR mi, böyle mi kalsın?
Tek kullanıcılı kişisel proje — PR ritüeli şart değil ama yedek için
push değerli (`gh` ile).

Kapanış (18 Tem 2026): karar = doğrudan main'e push, PR yok. Ayrıca iki
altyapı düzeltmesi: (1) package-lock üçüncü kez cross-platform optional
deps kaybıyla bozulmuştu — son yeşil CI lock'u geri alındı; lock'a dokunan
her commit öncesi `npm ci --dry-run` çalıştır. (2) github-pages
environment'ının branch policy'si yalnız worktree-byo-llm-provider'a izin
veriyordu — main'den HİÇBİR deploy başarılı olmamıştı (canlı site eski
branch'i servis ediyordu); policy'ye main eklendi, main deploy'u yeşil.
