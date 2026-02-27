/**
 * VentureMap — re-exports from platform-specific files.
 * .native.tsx is used on iOS/Android, .web.tsx is used on web.
 * This file is a shared type export only — no native imports here.
 */
export type { VentureMapHandle } from "./venture-map.web";
export { VentureMap } from "./venture-map.web";
