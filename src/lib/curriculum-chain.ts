// Static-mode curriculum chain flag (2026-08-06 ruling: one "generate"
// produces the whole scheme). Server mode chains inside the job runner
// (src/lib/jobs.ts chainNextChapter); static mode has no background runner,
// so the map drives the chain instead: whoever kicks off an inline first
// chapter (onboarding, settings regenerate, the map's own extend button)
// stamps this flag and RoadmapView keeps extending level by level until the
// scheme's top, clearing the flag when done or on error. sessionStorage on
// purpose: a chain should not survive the tab, only the navigation hop from
// the wizard/settings to the map.
export const CHAIN_KEY = "okumo-curriculum-chain";

/** Ask the map to keep generating levels for this profile after navigation. */
export function requestCurriculumChain(profileId: string) {
  try {
    sessionStorage.setItem(CHAIN_KEY, profileId);
  } catch {
    /* sessionStorage unavailable: the user can extend manually */
  }
}
