---
id: T-063
title: Connection status card + "your bridge is down" error routing
status: done
priority: p3
effort: S
confidence: high
depends: [T-060]
created: 2026-07-27
---
Visibility AFTER connecting is zero today: "what am I connected to, which model is running, is my bridge up" shows up nowhere; when the bridge goes down the user only finds out when lesson generation blows up.

## Scope
- A status card in Settings: "Connected: DeepSeek - Balanced profile (V3 / R1)" - using T-057 catalog names; in the local door, a live status ("bridge: up / unreachable", the T-059 /health probe, only while settings is open).
- Instant diagnosis on a generation error: if a fetch error comes from a local provider, fire a probe and disambiguate - "your bridge looks down, restart it: `npx okumo-bridge`" versus a genuine generation error. Don't leak a cryptic fetch error to the user.
- The existing unconfigured nudge in the header stays as is; extending it (a provider badge while connected) is optional, don't bloat scope.

Fence: settings components + error-handling call sites (LessonPlayer/ChatPanel error paths); doesn't touch the provider seam.
