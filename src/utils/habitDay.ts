// 4:00 JST boundary logic for habit days

/**
 * Get the habit day (YYYY-MM-DD) for a given date
 * Uses 4:00 JST as the day boundary
 */
export function getHabitDay(date: Date = new Date()): string {
  // Convert to JST
  const jstOffset = 9 * 60; // JST is UTC+9
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const jst = new Date(utc + jstOffset * 60000);

  // Subtract 4 hours to account for 4:00 boundary
  const adjusted = new Date(jst.getTime() - 4 * 60 * 60 * 1000);

  return formatDate(adjusted);
}

/**
 * Format date as YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD to Date
 */
export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Get day of week from date string (0 = Sunday, 6 = Saturday)
 */
export function getDayOfWeek(dateStr: string): number {
  return parseDate(dateStr).getDay();
}

/**
 * Get day of month from date string (1-31)
 */
export function getDayOfMonth(dateStr: string): number {
  return parseDate(dateStr).getDate();
}

/**
 * Check if a habit should be active on a given day
 */
export function isHabitActiveOnDay(
  type: 'daily' | 'weekdays' | 'monthdays',
  weekdaysMask: number | null,
  monthdaysJson: string | null,
  dateStr: string
): boolean {
  if (type === 'daily') {
    return true;
  }

  if (type === 'weekdays' && weekdaysMask !== null) {
    const dayOfWeek = getDayOfWeek(dateStr);
    const bit = 1 << dayOfWeek; // Sun=1, Mon=2, Tue=4, etc.
    return (weekdaysMask & bit) !== 0;
  }

  if (type === 'monthdays' && monthdaysJson) {
    try {
      const days: number[] = JSON.parse(monthdaysJson);
      const dayOfMonth = getDayOfMonth(dateStr);
      return days.includes(dayOfMonth);
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Get all dates in a year for the grass calendar
 */
export function getYearDates(year: number): string[] {
  const dates: string[] = [];
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(formatDate(new Date(d)));
  }

  return dates;
}

/**
 * Check if date is in the future (compared to today's habit day)
 */
export function isFutureDay(dateStr: string): boolean {
  const today = getHabitDay();
  return dateStr > today;
}
