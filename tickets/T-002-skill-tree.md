---
id: T-002
title: Lineer path yerine skill-tree (dallı ders grafiği)
status: backlog
priority: p3
effort: XL
confidence: low
depends: []
created: 2026-07-17
---
Bugünkü model tek zincir (nodes.prereqNodeId). Fikir: oyunlardaki skill
tree — bazı dersler paralel/bağımsız, bir ders birden fazlasını açabilir,
bir dersi açmak birden fazla dersin bitmesini isteyebilir (n-of-m).

Öneri (tam serbest DAG değil): seviye içinde 2-3 paralel dal, seviye
sonunda birleşme (elmas). Gerekenler: node_prereqs join tablosu (+SAVE
bump), unlock kuralı, curriculum promptuna dal yapısı, RoadmapView'a
dallı çizim (asıl efor), auto-extend'in çoklu-uç kavraması.
Burak: "şimdilik kalsın, sadece fikir olarak düşünelim."
