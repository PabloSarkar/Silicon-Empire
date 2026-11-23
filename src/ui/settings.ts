// Player settings. Stored through the platform SettingsStorage adapter.

export type AutosaveInterval = 0 | 4 | 13 | 52;

export interface Settings {
  /** Weeks between autosaves; 0 turns autosave off. */
  autosaveWeeks: AutosaveInterval;
  /** Pause the clock automatically when the browser tab is hidden. */
  pauseWhenHidden: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  autosaveWeeks: 4,
  pauseWhenHidden: true,
};

export const AUTOSAVE_OPTIONS: { value: AutosaveInterval; label: string }[] = [
  { value: 0, label: "Off" },
  { value: 4, label: "Every 4 weeks" },
  { value: 13, label: "Every quarter (13 weeks)" },
  { value: 52, label: "Every year (52 weeks)" },
];

/** Reads stored settings, falling back to defaults for anything missing or invalid. */
export function parseSettings(raw: unknown): Settings {
  const s = { ...DEFAULT_SETTINGS };
  if (typeof raw !== "object" || raw === null) return s;
  const r = raw as Record<string, unknown>;
  if (AUTOSAVE_OPTIONS.some((o) => o.value === r.autosaveWeeks)) {
    s.autosaveWeeks = r.autosaveWeeks as AutosaveInterval;
  }
  if (typeof r.pauseWhenHidden === "boolean") s.pauseWhenHidden = r.pauseWhenHidden;
  return s;
}
