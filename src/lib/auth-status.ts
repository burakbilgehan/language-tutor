"use client";

import { useCallback, useEffect, useState } from "react";
import { IS_STATIC } from "@/lib/client-api";
import { readCloudApiBase } from "@/lib/backup/cloud";

// T-048: shared client-side auth state for the cloud backend (T-046 better-auth
// on the Worker, Google-only). Shaped after src/lib/llm-status.ts — module-level
// cache, an invalidator, a hook — with ONE deliberate inversion:
//
//   useLlmStatus defaults OPTIMISTIC (configured: true) to avoid gating flicker.
//   This one defaults PESSIMISTIC (user: null, loading: true). Rendering
//   "signed in as …" before the server confirms would be a lie, and every
//   affordance behind it (push/pull) would fail on the first click.
//
// Anonymous local-first is untouched by all of this: `backendAvailable: false`
// (the shipped state of the GitHub Pages mirror and of server mode) means the
// login/cloud UI never renders at all, and the app behaves exactly as before.

export interface AuthUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export interface AuthStatus {
  /** Resolved session user, or null when signed out / unknown. */
  user: AuthUser | null;
  /** True until the first probe settles. */
  loading: boolean;
  /**
   * Is there a cloud backend reachable at all from this deployment?
   *
   * NOT `cloudAvailable()` from client-api: that one is `IS_STATIC &&
   * isSignedIn()`, which is false precisely when we need to render the sign-in
   * button — it would deadlock the entry UI (you can never sign in because the
   * button only appears once you are signed in). The right discriminator is
   * "does a backend exist at this origin", answered by the Worker's open
   * `GET /api/health` route: 200 on the Worker, 404 on the anonymous-only
   * Pages mirror (which sets no API-base override). No origin is hardcoded.
   */
  backendAvailable: boolean;
}

const SIGNED_OUT: AuthStatus = {
  user: null,
  loading: false,
  backendAvailable: false,
};

let cached: AuthStatus | null = null;
let inflight: Promise<AuthStatus> | null = null;
/**
 * Bumped by every invalidation. A probe records the generation it started in
 * and refuses to write `cached` if that generation is stale.
 *
 * Not paranoia — a measured bug: saving a new API base calls
 * invalidateAuthStatus() while the FIRST probe (against the old, empty base) is
 * still in flight. Clearing only `cached` let that stale promise be handed back
 * and then write its old result into `cached` permanently, so the account UI
 * stayed hidden until a full page reload. That is the primary first-run path
 * for the dev topology (:3000 → :8787), which is exactly what the field is for.
 */
let generation = 0;

function apiUrl(path: string): string {
  return `${readCloudApiBase()}${path}`;
}

async function probeBackend(): Promise<boolean> {
  try {
    const res = await fetch(apiUrl("/api/health"), {
      headers: { accept: "application/json" },
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function probeSession(): Promise<AuthUser | null> {
  try {
    // credentials: "include" is mandatory — the session is an HttpOnly cookie,
    // and the dev topology (:3000 → :8787) is cross-origin, which would
    // otherwise send nothing.
    const res = await fetch(apiUrl("/api/auth/get-session"), {
      credentials: "include",
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    const body = (await res.json().catch(() => null)) as {
      user?: AuthUser | null;
    } | null;
    return body?.user ?? null;
  } catch {
    return null;
  }
}

async function fetchStatus(): Promise<AuthStatus> {
  if (cached) return cached;
  // Server mode has no cloud backend by design (the save is already on disk,
  // with its own .bak) — skip both probes entirely.
  if (!IS_STATIC) {
    cached = SIGNED_OUT;
    return cached;
  }
  if (!inflight) {
    const startedAt = generation;
    inflight = (async () => {
      const backendAvailable = await probeBackend();
      const user = backendAvailable ? await probeSession() : null;
      const result: AuthStatus = { user, loading: false, backendAvailable };
      // Stale probe (an invalidation landed mid-flight, e.g. the API base
      // changed under it): return the result to whoever is awaiting, but do
      // NOT let it become the cache — the next call must re-probe.
      if (startedAt === generation) {
        cached = result;
        inflight = null;
      }
      return result;
    })();
  }
  return inflight;
}

/**
 * Drop the cached session. Call after the OAuth return leg, after sign-out, and
 * whenever a cloud call throws NotSignedInError (the cookie expired under us).
 */
export function invalidateAuthStatus(): void {
  cached = null;
  // Dropping the in-flight promise too is the other half of the fix: without
  // it the next fetchStatus() would be handed a probe started against the old
  // configuration.
  inflight = null;
  generation += 1;
}

/** Start the Google sign-in flow. Navigates away on success. */
export async function startGoogleSignIn(callbackURL: string): Promise<void> {
  // Hand-rolled rather than better-auth's client package: this is one POST
  // whose response shape (`{ url }`) is already pinned by a Worker test
  // (worker/test/session.test.ts), and adding a client dep would pull an auth
  // library into a static bundle that mostly runs anonymously.
  const res = await fetch(apiUrl("/api/auth/sign-in/social"), {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ provider: "google", callbackURL }),
  });
  if (!res.ok) throw new Error("sign_in_failed");
  const body = (await res.json()) as { url?: string };
  if (!body.url) throw new Error("sign_in_failed");
  window.location.href = body.url;
}

/** End the session. The Worker requires an Origin header here (the sign-out
 * route is NOT exempt from the origin allowlist — a cross-site forced sign-out
 * was a fixed bug in T-046); the browser supplies it automatically. */
export async function signOut(): Promise<void> {
  try {
    await fetch(apiUrl("/api/auth/sign-out"), {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
  } finally {
    invalidateAuthStatus();
  }
}

export function useAuthStatus(): AuthStatus & { reload: () => void } {
  const [status, setStatus] = useState<AuthStatus>(
    cached ?? { user: null, loading: true, backendAvailable: false }
  );
  // Bumping this re-runs the effect — the way Settings re-reads the session
  // after a sign-out without a full page reload.
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    fetchStatus().then((s) => {
      if (alive) setStatus(s);
    });
    return () => {
      alive = false;
    };
  }, [tick]);

  const reload = useCallback(() => {
    invalidateAuthStatus();
    setStatus({ user: null, loading: true, backendAvailable: false });
    setTick((n) => n + 1);
  }, []);

  return { ...status, reload };
}
