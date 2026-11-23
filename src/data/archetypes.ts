// CEO archetypes (D-011, README §2.2.1).
// Modifiers are fractional bonuses (0.25 = +25%). They are not applied yet;
// the systems that read them (research, design, contracts, …) arrive in
// later phases.

import type { CeoArchetypeId } from "../sim/types";
import { MAJOR_BOOST, MINOR_BOOST } from "./balance";

export interface ArchetypeModifiers {
  researchSpeed?: number;
  designSpeed?: number;
  productionSpeed?: number;
  contractChance?: number;
  investorReputation?: number;
  companyReputation?: number;
  employeeHappiness?: number;
  analystReputation?: number;
  /** Product popularity with mainstream consumers only. */
  mainstreamPopularity?: number;
}

export interface CeoArchetype {
  id: CeoArchetypeId;
  name: string;
  /** Human-readable list of effects shown on the New Game screen. */
  effects: string[];
  /** Which employees find a company with this CEO more appealing. */
  attracts: string;
  modifiers: ArchetypeModifiers;
}

export const ARCHETYPES: readonly CeoArchetype[] = [
  {
    id: "research",
    name: "Research CEO",
    effects: ["Tech tree progress: major boost"],
    attracts: "Employees who like research",
    modifiers: { researchSpeed: MAJOR_BOOST },
  },
  {
    id: "technical",
    name: "Technical CEO",
    effects: [
      "Tech tree progress: minor boost",
      "Design and production speed: major boost",
    ],
    attracts: "Employees who like engineering and production",
    modifiers: {
      researchSpeed: MINOR_BOOST,
      designSpeed: MAJOR_BOOST,
      productionSpeed: MAJOR_BOOST,
    },
  },
  {
    id: "business",
    name: "Business CEO",
    effects: [
      "Better contract chances",
      "Investor reputation boost",
      "Company reputation boost",
      "Better employee happiness",
    ],
    // Q-8: whether "MBA" is its own employee type is still open.
    attracts: "MBAs",
    modifiers: {
      contractChance: MINOR_BOOST,
      investorReputation: MINOR_BOOST,
      companyReputation: MINOR_BOOST,
      employeeHappiness: MINOR_BOOST,
    },
  },
  {
    id: "marketing",
    name: "Marketing CEO",
    effects: [
      "Better contract chances",
      "Better analyst reputation",
      "Product popularity with mainstream consumers",
    ],
    // Q-9: not specified by the owner yet.
    attracts: "Not decided yet (Q-9)",
    modifiers: {
      contractChance: MINOR_BOOST,
      analystReputation: MINOR_BOOST,
      mainstreamPopularity: MINOR_BOOST,
    },
  },
];

export function getArchetype(id: CeoArchetypeId): CeoArchetype {
  const found = ARCHETYPES.find((a) => a.id === id);
  if (!found) throw new Error(`Unknown CEO archetype: ${id}`);
  return found;
}
