/** 'HH:mm' (24-hour, stored/scheduled form) <-> "8:00 PM" (displayed form). */

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatLabel(hour: number, minute: number): string {
  const period = hour < 12 ? 'AM' : 'PM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${pad(minute)} ${period}`;
}

export interface TimeOption {
  /** 'HH:mm', what gets stored/scheduled. */
  value: string;
  /** e.g. "8:00 PM", what the picker displays. */
  label: string;
}

/** Every half-hour of the day, midnight to 11:30 PM. */
export function timeOptions(): TimeOption[] {
  const options: TimeOption[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (const minute of [0, 30]) {
      options.push({ value: `${pad(hour)}:${pad(minute)}`, label: formatLabel(hour, minute) });
    }
  }
  return options;
}

/** 'HH:mm' -> "8:00 PM". */
export function formatTime(value: string): string {
  const [hour, minute] = value.split(':').map(Number);
  return formatLabel(hour, minute);
}
