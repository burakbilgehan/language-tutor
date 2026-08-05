---
id: T-085
title: "Google Cloud TTS as optional BYO-key quality upgrade"
status: backlog
priority: p3
effort: M
confidence: medium
depends: [T-081]
created: 2026-08-05
---

## Problem

Web Speech API (T-081) quality depends on the OS voices and can be flat or
robotic for nl/fr. Google Cloud TTS (or any hosted TTS) offers better
voices but needs a per-user API key; per the LLM BYO pattern, the owner's
credentials are never used for guests.

## Direction

A TTS provider seam mirroring the LLM provider seam: default = Web Speech,
optional = user-supplied Google TTS key stored alongside the LLM config
(NOT in the DB / save export, same rationale as `data/llm-config.json`).
Only worth opening if T-081's voices prove inadequate in practice.
