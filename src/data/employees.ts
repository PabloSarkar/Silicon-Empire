// Employee types and stats (README §2.5, D-012).

import type { CeoArchetypeId } from "../sim/types";

export type StatId =
  | "engineering"
  | "design"
  | "production"
  | "research"
  | "marketing"
  | "finance"
  | "business"
  | "charisma";

export const STATS: { id: StatId; name: string; short: string; effect: string }[] = [
  { id: "engineering", name: "Engineering", short: "Eng", effect: "Helps design, production and research" },
  { id: "design", name: "Design", short: "Des", effect: "Speeds up chip design" },
  { id: "production", name: "Production", short: "Prod", effect: "Fewer defects, faster manufacturing" },
  { id: "research", name: "Research", short: "Res", effect: "Speeds up research" },
  { id: "marketing", name: "Marketing", short: "Mkt", effect: "Makes chips more popular" },
  { id: "finance", name: "Finance", short: "Fin", effect: "Better credit score and contract margins" },
  { id: "business", name: "Business", short: "Bus", effect: "Better contract negotiation and happiness" },
  { id: "charisma", name: "Charisma", short: "Cha", effect: "Happier colleagues in the same department" },
];

export type EmployeeType =
  | "researcher"
  | "engineer"
  | "designer"
  | "hr"
  | "negotiator"
  | "sales"
  | "tax";

export interface EmployeeTypeDef {
  id: EmployeeType;
  name: string;
  role: string;
  /** Main stats (high), then secondary stats (medium). */
  primary: StatId[];
  secondary: StatId[];
}

export const EMPLOYEE_TYPES: readonly EmployeeTypeDef[] = [
  { id: "researcher", name: "Researcher", role: "Research (R&D)", primary: ["research"], secondary: ["engineering"] },
  { id: "engineer", name: "Engineer", role: "Jack of all trades", primary: ["engineering"], secondary: ["design", "production", "research"] },
  { id: "designer", name: "Designer", role: "Chip design", primary: ["design"], secondary: ["engineering"] },
  { id: "hr", name: "HR", role: "Employee happiness", primary: ["charisma"], secondary: ["business"] },
  { id: "negotiator", name: "Negotiator", role: "Contracts", primary: ["business"], secondary: ["charisma", "finance"] },
  { id: "sales", name: "Sales Expert", role: "Profit margins", primary: ["marketing"], secondary: ["business"] },
  { id: "tax", name: "Tax Specialist", role: "Tax reduction", primary: ["finance"], secondary: ["business"] },
];

export function getEmployeeType(id: EmployeeType): EmployeeTypeDef {
  const t = EMPLOYEE_TYPES.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown employee type: ${id}`);
  return t;
}

/**
 * Employee types each CEO archetype attracts (D-011). Attracted types show up
 * more often among candidates and with better stats.
 * Business → "MBAs" is read as the business-side roles (Q-8, D-026).
 * Marketing → Sales Experts is a proposal (Q-9, D-026).
 */
export const ATTRACTS: Record<CeoArchetypeId, EmployeeType[]> = {
  research: ["researcher"],
  technical: ["engineer", "designer"],
  business: ["negotiator", "sales", "tax", "hr"],
  marketing: ["sales"],
};

/** The CEO works too. Their stats depend on the archetype. */
export const CEO_STATS: Record<CeoArchetypeId, Partial<Record<StatId, number>>> = {
  research: { research: 60, engineering: 40 },
  technical: { engineering: 60, design: 50, production: 40 },
  business: { business: 60, charisma: 45, finance: 40 },
  marketing: { marketing: 60, charisma: 45, business: 40 },
};
export const CEO_BASE_STAT = 30;

export const FIRST_NAMES = [
  "Alex", "Sam", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Jamie", "Avery", "Quinn",
  "Dana", "Robin", "Kim", "Lee", "Noor", "Priya", "Chen", "Mateo", "Lucia", "Kofi",
  "Amara", "Yuki", "Hana", "Omar", "Lena", "Ivan", "Sofia", "Ravi", "Mina", "Tomas",
  "Elena", "Marcus", "Grace", "Felix", "Aisha", "Diego", "Nadia", "Oscar", "Ingrid", "Kenji",
];

export const LAST_NAMES = [
  "Adams", "Baker", "Carter", "Diaz", "Evans", "Fischer", "Garcia", "Hughes", "Ito", "Jensen",
  "Khan", "Lopez", "Moreau", "Nakamura", "Okafor", "Patel", "Quist", "Rossi", "Silva", "Tanaka",
  "Underwood", "Vargas", "Walsh", "Xu", "Young", "Zhang", "Novak", "Haddad", "Larsen", "Mensah",
];
