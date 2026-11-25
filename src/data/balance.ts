// Balance constants. All values are first guesses and will be tuned with
// headless balance tests (README §4.1). Change them here, not inline.

/** Starting cash for a new company, in US dollars. Placeholder. */
export const STARTING_CASH = 250_000;

/** Size of a "major" archetype boost (Q-10, placeholder: +25%). */
export const MAJOR_BOOST = 0.25;

/** Size of a "minor" archetype boost (Q-10, placeholder: +10%). */
export const MINOR_BOOST = 0.1;

/** Maximum number of entries kept in the event log. */
export const MAX_EVENTS = 200;

// --- Company -----------------------------------------------------------------

export const STARTING_REPUTATION = 30;
/** Office rent per week (×wage index), plus per-employee cost. */
export const OFFICE_BASE_WEEKLY = 500;
export const OFFICE_PER_EMPLOYEE_WEEKLY = 100;

// --- Chips -------------------------------------------------------------------

/** Above this temperature a chip is unstable: big sales and review penalty. */
export const MAX_SAFE_TEMP_C = 95;
/** Above this temperature reviewers complain about heat. */
export const HOT_TEMP_C = 85;
export const AMBIENT_TEMP_C = 25;
/** Defects per cm² of die (before fab and QC adjustments). */
export const DEFECT_DENSITY = 0.3;
/** Testing and handling cost per chip. */
export const TEST_COST_PER_UNIT = 2;

// --- Sales -------------------------------------------------------------------

/** Share of retail revenue kept by distributors, before Sales Experts. */
export const RETAIL_CUT = 0.25;
/** Lowest retail cut Sales Experts can negotiate. */
export const MIN_RETAIL_CUT = 0.1;

// --- Employees ---------------------------------------------------------------

export const CANDIDATE_COUNT = 6;
export const CANDIDATE_REFRESH_WEEKS = 4;
/** One-off cost of hiring, in weeks of salary. */
export const HIRING_FEE_WEEKS = 4;
/** One-off cost of firing, in weeks of salary. */
export const SEVERANCE_WEEKS = 4;
export const BASE_HAPPINESS = 60;
/** Weekly chance an unhappy employee (below QUIT_HAPPINESS) quits. */
export const QUIT_CHANCE = 0.03;
export const QUIT_HAPPINESS = 35;

// --- Contracts ---------------------------------------------------------------

export const MAX_OPEN_OFFERS = 4;

// --- Investors ---------------------------------------------------------------

export const STARTING_GOODWILL = 60;
/** Profit (loss) the board accepts in the first year. */
export const FIRST_YEAR_EXPECTATION = -200_000;
export const TOTAL_SHARES = 1_000_000;
export const FOUNDER_SHARE_FRACTION = 0.7;
/** Fraction of the company sold in one share issue. */
export const SHARE_ISSUE_FRACTION = 0.05;

// --- Bank --------------------------------------------------------------------

export const STARTING_CREDIT_SCORE = 620;
export const MAX_LOANS = 3;
export const LOAN_TERMS_YEARS = [1, 2, 5, 10] as const;
/** Consecutive weeks with negative cash before bankruptcy. */
export const BANKRUPTCY_WEEKS = 12;

// --- Tax ---------------------------------------------------------------------

export const BASE_TAX_RATE = 0.4;
/** Most Tax Specialists can take off the tax rate. */
export const MAX_TAX_REDUCTION = 0.15;
