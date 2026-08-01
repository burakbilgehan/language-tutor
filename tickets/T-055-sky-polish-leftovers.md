---
id: T-055
title: Sky leftovers - small touches outside T-053's fence
status: wontfix
priority: p3
effort: S
confidence: high
depends: [T-053]
created: 2026-07-27
---
Small leftovers that T-053 didn't touch due to fence, but that the mock shows
or the rule set requires (from the T-053 agent report):

1. **StatsHeader search pill**: gets a sky tint in the mock; the file was in
   T-052's fence, T-053 didn't touch it. A single class change.
2. **BackupBar "Backup" button**: layout-level global chrome, terracotta on
   every page; competes with the one-dominant-terracotta-per-page rule.
   `bg-accent` -> `bg-sky` (or CozyButton `info`) would suffice.
3. **Out-of-scope screens' focus styles**: chat/vocab/conjugate inputs still
   use `focus:border-accent`; the sky focus rule (1.5px `--sky` border + 4px
   `rgb(79 147 176 / .15)` ring, in practice 2px border + `ring-sky/15`, as in
   T-053) should spread to these screens too.

Rule reference: `design/okumo-sky/README.md` "Color usage rules".
Verification: visual check in both dark/light + `npm run build:static`.

## Wontfix (2026-07-27)
The sky implementation (T-052/T-053) was reverted; these leftovers depended
on the reverted implementation. The new design handoff will bring its own
scope.
