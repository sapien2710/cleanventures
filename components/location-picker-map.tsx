/**
 * LocationPickerMap — platform-specific re-export.
 * .native.tsx → react-native-maps (iOS/Android)
 * .web.tsx → Leaflet iframe (Web)
 */
export type { LocationPickerHandle } from "./location-picker-map.web";
export { LocationPickerMap } from "./location-picker-map.web";
