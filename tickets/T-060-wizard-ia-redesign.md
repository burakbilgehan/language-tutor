---
id: T-060
title: LLM wizard IA redesign: 3 doors, live detection, quality profile, honest copy
status: done
priority: p2
effort: L
confidence: medium
depends: [T-057, T-059]
created: 2026-07-27
---
The heart of the wave. Burak's decisions (2026-07-27 discussion):

## 1. Three doors
- **"Continue without connecting" (No-LLM)** - a first-class door, not a "skip" link.
  Copy: the static library (grammar/kanji/vocab seed) opens INSTANTLY, lessons/chat unlock once an LLM connects. Backend is T-056 Phase 2 (separate ticket; this door leans on its output but isn't hard-dependent on it: if the door ships first, it falls back to the existing no-LLM degrade behavior).
- **"AI on my computer" (local)** - Ollama and the subscription bridge in ONE door (both are "your browser connects to an OpenAI-compatible server on localhost"); inside, two lanes: "my existing subscription (Claude/ChatGPT/Copilot/Gemini)" and "free local model (Ollama)". The technical seam doesn't merge (Ollama has its own endpoint, the bridge its own port), only the UX merges.
- **"API key"** - today's key path; provider choice plus quality profile.

## 2. Live detection checklist (instead of a static instruction)
In the local door the wizard advances on its own: short-timeout probes hit the bridge `GET :8484/health` (T-059) and Ollama `GET :11434/api/tags` -> "waiting for bridge... -> bridge found (claude) -> test". The command line is still shown (`npx okumo-bridge`, T-059) but the user doesn't blindly click "test"; the site sees the status. The Safari warning and `--origin` logic are preserved. The probe runs only while this door is open and at an interval; no continuous background polling (the "probing is expensive" lesson from OnboardingWizard.tsx:346 still applies).

## 3. Quality profile + budget hint (resolves model ambiguity)
- After a provider is chosen, a SINGLE choice: **Eco / Balanced / Best** - behind the scenes it's filled with a concrete fast/balanced/deep trio from the T-057 catalog.
- A visibility line under the choice: "Will use: DeepSeek V3 (quick tasks) - DeepSeek R1 (lessons)" - which model actually runs is NEVER hidden (today's screenshot complaint: picking DeepSeek doesn't say which model).
- Budget hint: a rough monthly estimate from the catalog's price metadata ("typically ~$X/month at usual usage"; "no extra cost" for local/subscription).
- The fast/balanced/deep TRIO disappears entirely from the casual flow.

## 4. Advanced panel: LlmProviderSection melts away
Exact model ids, custom base URL, tier override, jsonMode, extra backends like opencode -> a single "Advanced" accordion.
`LlmProviderSection` stops being a separate surface (masking/save logic is already shared in client-api); CLI mode (server-mode, Burak's own usage) stays exactly as is under Advanced. The two surfaces' duplicate Anthropic constants will already be dead once T-057 lands.

## 5. Honest-friction copy (Burak, decision 4)
Tone of the local door: "yes, this step is a bit technical; it's 2026, AI literacy is now a skill worth learning. Want something easier? Start right away with No-LLM (the static content keeps growing every day) or the 5-minute API key path." Don't hide the friction, justify it. tr canonical + en mirror (`useStrings` pattern).

Fence: `components/settings/LlmSetupWizard.tsx` + `LlmProviderSection.tsx`
(+ the onboarding embed point around `OnboardingWizard.tsx:1037`; embed only, not the wizard itself), `lib/llm-status.ts` if needed. `src/lib/llm/*` should already be finished by T-057; this ticket does NOT touch that. Model: opus (IA + copy + state machine, not mechanical).
