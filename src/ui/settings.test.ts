import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, parseSettings } from "./settings";

describe("parseSettings", () => {
  it("falls back to defaults for missing or invalid data", () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings({ autosaveWeeks: 7, pauseWhenHidden: "yes", pauseOnImportant: 1 })).toEqual(DEFAULT_SETTINGS);
  });

  it("keeps valid values", () => {
    expect(parseSettings({ autosaveWeeks: 0, pauseWhenHidden: false, pauseOnImportant: false })).toEqual({
      autosaveWeeks: 0,
      pauseWhenHidden: false,
      pauseOnImportant: false,
    });
  });
});
