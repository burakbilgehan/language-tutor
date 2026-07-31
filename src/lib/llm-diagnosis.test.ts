import test from "node:test";
import assert from "node:assert/strict";
import { classifyGenerationFailure, localTargetFor } from "./llm-diagnosis";
import { AppError } from "./errors";
import { LlmAuthError, LlmError, LlmTimeoutError } from "./llm/provider-types";
import { CATALOG } from "./llm/catalog";

// T-063. Two entry points to lock:
//  - localTargetFor / isLocalBaseUrl: which baseUrl is "one of our known
//    local providers" (only these get a probe-based diagnosis).
//  - classifyGenerationFailure: the pure decision table (fetch already run,
//    result passed in) that turns {err, probeState} into a message kind.
// diagnoseGenerationFailure (the async wrapper that actually calls fetch via
// probeBridge/probeOllama) is exercised manually — see the ticket's manual
// test list — since mocking global fetch here would just re-assert that
// probeBridge/probeOllama work, which useLocalLlmProbe.ts already covers by
// construction (same functions, exported unchanged).

// --------------------------------------------------------------- baseUrl
test("localTargetFor: matches the catalog's bridge/ollama entries, ignores trailing slash, unknown localhost -> null", () => {
  assert.equal(localTargetFor(CATALOG.bridge.baseUrl), "bridge");
  assert.equal(localTargetFor(CATALOG.ollama.baseUrl), "ollama");
  assert.equal(localTargetFor(`${CATALOG.bridge.baseUrl}/`), "bridge");
  // Custom localhost port the user typed in the advanced panel — not one of
  // the two we know how to health-check.
  assert.equal(localTargetFor("http://localhost:9999/v1"), null);
  assert.equal(localTargetFor(CATALOG.deepseek.baseUrl), null);
  assert.equal(localTargetFor(undefined), null);
});

// ---------------------------------------------------------- classify: gates
test("classifyGenerationFailure: known AppError codes pass through untouched, never reinterpreted as bridge-down", () => {
  const err = new AppError("llm_unconfigured");
  const result = classifyGenerationFailure({
    err,
    probeTarget: "bridge",
    probeState: "absent", // even if a probe somehow ran and found nothing
    uiLang: "en",
    isLocalOrigin: true,
    origin: "http://localhost:3000",
  });
  assert.equal(result.kind, "pass_through");
});

test("classifyGenerationFailure: LlmAuthError passes through — the endpoint answered and rejected, not 'down'", () => {
  const err = new LlmAuthError("kimlik reddedildi");
  const result = classifyGenerationFailure({
    err,
    probeTarget: "bridge",
    probeState: "absent",
    uiLang: "en",
    isLocalOrigin: true,
    origin: "http://localhost:3000",
  });
  assert.equal(result.kind, "pass_through");
});

test("classifyGenerationFailure: no local target (remote API, or probe skipped) passes through", () => {
  const err = new LlmError("fetch failed");
  const result = classifyGenerationFailure({
    err,
    probeTarget: null,
    probeState: "skipped",
    uiLang: "en",
    isLocalOrigin: true,
    origin: "http://localhost:3000",
  });
  assert.equal(result.kind, "pass_through");
});

// -------------------------------------------------------- classify: local
test("classifyGenerationFailure: probe absent + bridge -> local_down naming the restart command", () => {
  const err = new LlmError("fetch failed");
  const result = classifyGenerationFailure({
    err,
    probeTarget: "bridge",
    probeState: "absent",
    uiLang: "en",
    isLocalOrigin: true,
    origin: "http://localhost:3000",
  });
  assert.equal(result.kind, "local_down");
  assert.equal((result as { target: string }).target, "bridge");
  assert.match(result.message, /llm-bridge\.mjs/);
});

test("classifyGenerationFailure: probe absent + ollama -> local_down naming Ollama, not the bridge command", () => {
  const err = new LlmError("fetch failed");
  const result = classifyGenerationFailure({
    err,
    probeTarget: "ollama",
    probeState: "absent",
    uiLang: "tr",
    isLocalOrigin: true,
    origin: "http://localhost:3000",
  });
  assert.equal(result.kind, "local_down");
  assert.match(result.message, /Ollama/);
  assert.doesNotMatch(result.message, /okumo-bridge/);
});

test("classifyGenerationFailure: non-local origin appends the origin-permission caveat (useLocalLlmProbe.ts's documented ambiguity)", () => {
  const err = new LlmError("fetch failed");
  const withOrigin = classifyGenerationFailure({
    err,
    probeTarget: "bridge",
    probeState: "absent",
    uiLang: "en",
    isLocalOrigin: false,
    origin: "https://okumo.dev",
  });
  assert.match(withOrigin.message, /--origin https:\/\/okumo\.dev/);

  const local = classifyGenerationFailure({
    err,
    probeTarget: "bridge",
    probeState: "absent",
    uiLang: "en",
    isLocalOrigin: true,
    origin: "http://localhost:3000",
  });
  assert.doesNotMatch(local.message, /--origin/);
});

test("classifyGenerationFailure: probe stale -> local_stale, distinct copy from local_down", () => {
  const err = new LlmError("fetch failed");
  const result = classifyGenerationFailure({
    err,
    probeTarget: "bridge",
    probeState: "stale",
    uiLang: "en",
    isLocalOrigin: true,
    origin: "http://localhost:3000",
  });
  assert.equal(result.kind, "local_stale");
});

test("classifyGenerationFailure: probe found -> local_up_other_cause, generic message, never the raw LlmError text", () => {
  const err = new LlmError("some cryptic transport detail nobody should see");
  const result = classifyGenerationFailure({
    err,
    probeTarget: "bridge",
    probeState: "found",
    uiLang: "en",
    isLocalOrigin: true,
    origin: "http://localhost:3000",
  });
  assert.equal(result.kind, "local_up_other_cause");
  assert.doesNotMatch(result.message, /cryptic transport detail/);
});

// ------------------------------------------------------- classify: timeout
// T-070-A. A timeout is self-diagnosing: the endpoint answered (the bridge's
// structured 504) or we cut the request ourselves, so "your bridge is down"
// would be actively wrong. It must not collapse into the generic message
// either: its advice (raise --timeout / pick a faster model) is the only
// actionable thing the user has.
test("classifyGenerationFailure: LlmTimeoutError -> timeout kind even when the probe found the bridge up", () => {
  const err = new LlmTimeoutError("raw provider timeout text");
  const result = classifyGenerationFailure({
    err,
    probeTarget: "bridge",
    probeState: "found",
    uiLang: "en",
    isLocalOrigin: true,
    origin: "http://localhost:3000",
  });
  assert.equal(result.kind, "timeout");
  assert.match(result.message, /--timeout/);
  assert.doesNotMatch(result.message, /raw provider timeout text/);
});

test("classifyGenerationFailure: LlmTimeoutError wins over an 'absent' probe: never 'restart your bridge'", () => {
  const result = classifyGenerationFailure({
    err: new LlmTimeoutError("timed out"),
    probeTarget: "bridge",
    probeState: "absent",
    uiLang: "tr",
    isLocalOrigin: true,
    origin: "http://localhost:3000",
  });
  assert.equal(result.kind, "timeout");
  assert.doesNotMatch(result.message, /kapalı görünüyor/);
});

test("classifyGenerationFailure: timeout against a remote API (no local target) still gets timeout copy, without the bridge flag hint", () => {
  const result = classifyGenerationFailure({
    err: new LlmTimeoutError("timed out"),
    probeTarget: null,
    probeState: "skipped",
    uiLang: "en",
    isLocalOrigin: false,
    origin: "https://okumo.dev",
  });
  assert.equal(result.kind, "timeout");
  assert.doesNotMatch(result.message, /llm-bridge/);
});
