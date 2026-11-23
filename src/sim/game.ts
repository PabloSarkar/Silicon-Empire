// Creating a new game and advancing time. All functions are pure: they take
// a state and return a new one without mutating the input.

import { MAX_EVENTS, STARTING_CASH } from "../data/balance";
import { formatDate, weekToDate } from "./calendar";
import { seedToState } from "./rng";
import type { CeoArchetypeId, GameEvent, GameState, Logo } from "./types";

export const NAME_MAX_LENGTH = 32;
export const LOGO_TEXT_MAX_LENGTH = 3;

export interface NewGameParams {
  archetype: CeoArchetypeId;
  logo: Logo;
  companyName: string;
  ceoName: string;
}

export type NewGameErrors = Partial<Record<"companyName" | "ceoName" | "logoText", string>>;

export function validateNewGame(params: NewGameParams): NewGameErrors {
  const errors: NewGameErrors = {};
  const company = params.companyName.trim();
  const ceo = params.ceoName.trim();
  const logoText = params.logo.text.trim();

  if (!company) errors.companyName = "Enter a company name.";
  else if (company.length > NAME_MAX_LENGTH)
    errors.companyName = `Company name must be ${NAME_MAX_LENGTH} characters or fewer.`;

  if (!ceo) errors.ceoName = "Enter a CEO name.";
  else if (ceo.length > NAME_MAX_LENGTH)
    errors.ceoName = `CEO name must be ${NAME_MAX_LENGTH} characters or fewer.`;

  if (!logoText) errors.logoText = "Enter 1–3 characters for the logo.";
  else if (logoText.length > LOGO_TEXT_MAX_LENGTH)
    errors.logoText = `Logo text must be ${LOGO_TEXT_MAX_LENGTH} characters or fewer.`;

  return errors;
}

/** Up to three initials from a company name, e.g. "Silicon Valley Works" → "SVW". */
export function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words
    .slice(0, LOGO_TEXT_MAX_LENGTH)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/**
 * Creates a new game. `id` and `seed` are passed in rather than generated
 * here so the sim stays deterministic and free of platform APIs.
 */
export function createNewGame(
  params: NewGameParams,
  options: { id: string; seed: number },
): GameState {
  const errors = validateNewGame(params);
  if (Object.keys(errors).length > 0) {
    throw new Error(`Invalid new game parameters: ${Object.values(errors).join(" ")}`);
  }
  const companyName = params.companyName.trim();
  return {
    id: options.id,
    seed: options.seed,
    rngState: seedToState(options.seed),
    week: 0,
    company: {
      name: companyName,
      logo: { ...params.logo, text: params.logo.text.trim().toUpperCase() },
      cash: STARTING_CASH,
    },
    ceo: { name: params.ceoName.trim(), archetype: params.archetype },
    events: [{ week: 0, message: `${companyName} is founded on ${formatDate(0)}.` }],
  };
}

export function addEvent(state: GameState, message: string): GameState {
  const event: GameEvent = { week: state.week, message };
  const events = [...state.events, event].slice(-MAX_EVENTS);
  return { ...state, events };
}

/** Advances the game by one week. */
export function tick(state: GameState): GameState {
  let next: GameState = { ...state, week: state.week + 1 };

  const prevYear = weekToDate(state.week).year;
  const year = weekToDate(next.week).year;
  if (year !== prevYear) {
    next = addEvent(next, `The year ${year} begins.`);
  }

  // Later phases add research, production, sales, contracts, investors
  // and bank updates here.
  return next;
}
