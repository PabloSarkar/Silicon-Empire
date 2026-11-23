// In-game calendar. 1 tick = 1 week (D-010); week 0 is the start date (D-014).

export const START_YEAR = 1975;
const START_UTC_MS = Date.UTC(START_YEAR, 0, 1);
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export interface CalendarDate {
  year: number;
  /** 1–12 */
  month: number;
  /** 1–31 */
  day: number;
}

export function weekToDate(week: number): CalendarDate {
  // UTC arithmetic only, so the result never depends on the player's time zone.
  const d = new Date(START_UTC_MS + week * 7 * MS_PER_DAY);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/** e.g. "8 Jan 1975" */
export function formatDate(week: number): string {
  const { year, month, day } = weekToDate(week);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}
