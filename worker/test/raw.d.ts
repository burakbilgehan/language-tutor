/**
 * Vite's `?raw` suffix — inlines a file's source as a string at build time.
 *
 * Used by the auth gate test to scan `src/index.ts` for routing escape hatches.
 * `node:fs` is not an option there: the suite runs inside workerd, which has no
 * real filesystem.
 *
 * This declaration lives in its own file with NO imports or exports, so it is a
 * global script rather than a module — `declare module` for a wildcard pattern
 * is only ambient when the containing file is not itself a module.
 */
declare module "*?raw" {
  const content: string;
  export default content;
}
