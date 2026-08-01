---
id: T-010
title: LLM connection wizard (setup flow for non-technical users)
status: done
priority: p1
effort: M
confidence: high
depends: []
created: 2026-07-18
---
In the static product, the LLM connection is the user's own responsibility;
the current Settings section targets a technical user. Guided flow for a
non-technical user:

1. Question: "How do you want to connect to an LLM?"
   - I have a Claude subscription -> walks through checking whether the claude
     CLI is installed; install link; then a one-line bridge command per OS
     (macOS/Linux: curl|node pipe; Windows: PowerShell equivalent). A Claude
     web subscription without the CLI CANNOT be used programmatically, stated
     honestly, with a key alternative offered.
   - I have a ChatGPT subscription -> codex CLI + bridge --backend codex
   - I have a Copilot subscription -> copilot CLI + bridge --backend copilot
   - I'll get an API key (recommended, no setup) -> DeepSeek/OpenAI/Anthropic
     links + paste the key -> ready
   - A model on my computer (Ollama, recommended 2nd option) -> Ollama
     installer link + OLLAMA_ORIGINS instructions + model recommendation
2. "Test connection" validation on each choice; auto-saves on success.
3. The bridge is served from the site (out/llm-bridge.mjs, copied by
   build-static); commands auto-fill the origin.
4. Advanced stage: compile the bridge as a single binary (bun compile,
   mac/win/linux), a download-and-run option that doesn't need Node. The
   wizard would detect the OS and offer the right binary.

Positioning: the default recommendation is key/Ollama (frictionless); the
bridge is the advanced option for the "I have a subscription" audience. No
"default to claude" assumption.

---
CLOSING (2026-07-18): LlmSetupWizard.tsx: 3 paths (API key recommended /
Ollama recommended-2nd / subscription+bridge: claude-codex-copilot-gemini),
OS-aware one-line commands (bridge served from the site, origin auto-filled),
an honest warning about claude.ai without the CLI, a Safari warning,
test-then-save. Opens automatically when there's no config in static mode;
reachable from the form via "Setup wizard". The bun single-binary bridge
remains open as a future stage.
