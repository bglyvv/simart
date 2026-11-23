/** Shared between AddChildPage (building an ISO date to send) and LoginPage
 * (parsing one back out of a fetched child record) — kept in one place so the
 * month-name <-> index mapping can't drift between the two directions. */
export const MONTHS_AZ = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun',
  'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr',
];

export function toIsoDate(day: string, monthName: string, year: string): string {
  const monthNumber = MONTHS_AZ.indexOf(monthName) + 1;
  return `${year}-${String(monthNumber).padStart(2, '0')}-${String(Number(day)).padStart(2, '0')}`;
}

export function fromIsoDate(iso: string): { day: string; month: string; year: string } {
  const [year, month, day] = iso.split('-');
  return { day: String(Number(day)), month: MONTHS_AZ[Number(month) - 1], year };
}

export function ageFromYear(year: string): number {
  return Math.max(0, new Date().getFullYear() - Number(year));
}

/** Today as 'YYYY-MM-DD' in the browser's local timezone (not UTC — toISOString()
 * would roll over a day early/late near midnight for timezones behind/ahead of
 * UTC). Used as the habit-completion logDate — see habitsService.ts. */
export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
