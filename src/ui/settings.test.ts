import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, parseSettings } from "./settings";

describe("parseSettings", () => {
  it("falls back to defaults for missing or invalid data", () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings({ autosaveWeeks: 7, pauseWhenHidden: "yes" })).toEqual(DEFAULT_SETTINGS);
  });

  it("keeps valid values", () => {
    expect(parseSettings({ autosaveWeeks: 0, pauseWhenHidden: false })).toEqual({
      autosaveWeeks: 0,
      pauseWhenHidden: false,
    });
  });
});
