const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
const WEEKDAY_FORMATTER = new Intl.DateTimeFormat('en-US', { weekday: 'long' });
const MONTH_NAME_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'short' });
const MONTH_LONG_NAME_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'long' });

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** 'YYYY-MM-DD' -> local Date at midnight. */
export function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Date -> 'YYYY-MM-DD'. */
export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** 'YYYY-MM-DD', shifted by N days (N may be negative). */
export function shiftISODate(iso: string, days: number): string {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

/** Today as 'YYYY-MM-DD', local time. */
export function todayISO(): string {
  return toISODate(new Date());
}

/** 'YYYY-MM-DD' -> the Monday of the ISO week containing it. */
export function getWeekStart(iso: string): string {
  const day = parseISODate(iso).getDay(); // 0=Sun..6=Sat
  const offset = day === 0 ? -6 : 1 - day;
  return shiftISODate(iso, offset);
}

/** 5 -> "5th", 12 -> "12th", 22 -> "22nd" — 11-13 are always "th". */
function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/** "July 2026" for the given 0-indexed month. */
export function formatMonthYear(year: number, month: number): string {
  return MONTH_LABEL_FORMATTER.format(new Date(year, month, 1));
}

/** 'YYYY-MM-DD' -> "Tuesday, Jun 5th". */
export function formatFriendlyDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return `${WEEKDAY_FORMATTER.format(date)}, ${MONTH_NAME_FORMATTER.format(date)} ${ordinal(day)}`;
}

/** 'YYYY-MM-DD' -> "Monday, July 13th", for the Log modal's date heading. */
export function formatFullFriendlyDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return `${WEEKDAY_FORMATTER.format(date)}, ${MONTH_LONG_NAME_FORMATTER.format(date)} ${ordinal(day)}`;
}

/** 'YYYY-MM-DD' -> "April 12", for calendar cell accessibility labels. */
export function formatAccessibleDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return `${MONTH_LONG_NAME_FORMATTER.format(date)} ${day}`;
}

/** 'YYYY-MM-DD' -> "July 14th", for the photo detail viewer's date tag. */
export function formatLongDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return `${MONTH_LONG_NAME_FORMATTER.format(date)} ${ordinal(day)}`;
}

/** Adjacent month, handling year rollover in both directions. */
export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const total = year * 12 + month + delta;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
}

/** ['YYYY-MM-01', 'YYYY-MM-lastDay'] for the given 0-indexed month. */
export function monthBounds(year: number, month: number): [string, string] {
  const lastDay = new Date(year, month + 1, 0).getDate();
  const prefix = `${year}-${pad(month + 1)}`;
  return [`${prefix}-01`, `${prefix}-${pad(lastDay)}`];
}

export interface CalendarCell {
  day: number;
  iso: string;
}

/** Single-letter weekday header, Sunday-first to match getMonthGrid's column order. */
export const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

const WEEKS_PER_GRID = 6;
const CELLS_PER_GRID = WEEKS_PER_GRID * 7;

/**
 * Always a fixed 6-week x 7 grid, front/back padded with null, so the grid's
 * overall size never changes between months — only which cells hold a day
 * number changes. Without this, months with fewer weeks (e.g. a 4-week
 * February) would render a shorter grid than a 6-week month, shifting
 * everything below the calendar up or down as you page between months.
 */
export function getMonthGrid(year: number, month: number): (CalendarCell | null)[][] {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prefix = `${year}-${pad(month + 1)}`;

  const cells: (CalendarCell | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, iso: `${prefix}-${pad(i + 1)}` })),
  ];
  while (cells.length < CELLS_PER_GRID) cells.push(null);

  const weeks: (CalendarCell | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}
