// The active platform. The Steam build will choose its Electron platform here.
import { createBrowserPlatform } from "./browser";

export const platform = createBrowserPlatform();
export type { Platform } from "./types";
