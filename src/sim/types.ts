// Core game state types. This folder must stay free of React and browser APIs
// (README §5, rule 3) so it can run in the browser, in Electron and in
// headless balance tests.

export type CeoArchetypeId = "research" | "technical" | "business" | "marketing";

export type LogoShape = "circle" | "square" | "diamond" | "hexagon" | "triangle";
export type LogoFont = "sans" | "serif" | "mono";

export interface Logo {
  shape: LogoShape;
  /** Fill colour of the shape, as a #rrggbb hex string. */
  primaryColor: string;
  /** Colour of the text, as a #rrggbb hex string. */
  secondaryColor: string;
  font: LogoFont;
  /** 1–3 characters shown on the logo, usually the company initials. */
  text: string;
}

export interface Company {
  name: string;
  logo: Logo;
  /** Cash on hand in US dollars. */
  cash: number;
}

export interface Ceo {
  name: string;
  archetype: CeoArchetypeId;
}

export interface GameEvent {
  /** In-game week the event happened. */
  week: number;
  message: string;
}

export interface GameState {
  /** Unique id of this playthrough; used to name save slots. */
  id: string;
  /** Seed the game was started with (kept for bug reports). */
  seed: number;
  /** Current state of the seeded random number generator (D-009). */
  rngState: number;
  /** Weeks elapsed since the start date (week 0 = 1 Jan 1975). */
  week: number;
  company: Company;
  ceo: Ceo;
  /** Newest last. Capped at MAX_EVENTS entries. */
  events: GameEvent[];
}
