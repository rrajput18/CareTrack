/**
 * Returns YYYY-MM-DD in the given IANA facility timezone.
 */
export function getFacilityLocalDate(date: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    // Fallback to UTC if an invalid timezone string is ever passed
    return date.toISOString().slice(0, 10);
  }
}

/**
 * Adds (or subtracts) calendar days to a YYYY-MM-DD local date string safely.
 */
export function addDaysToLocalDate(localDate: string, deltaDays: number): string {
  const [y, m, d] = localDate.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + deltaDays));
  return utc.toISOString().slice(0, 10);
}

/**
 * Formats an ISO timestamp in the facility timezone for readable display.
 */
export function formatFacilityDateTime(isoString: string, timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: timezone,
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}

/**
 * Formats a YYYY-MM-DD string cleanly (e.g. "12 Nov 2026").
 */
export function formatLocalDate(localDate: string): string {
  const [y, m, d] = localDate.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(utc);
}
