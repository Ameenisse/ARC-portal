/**
 * Date and Time Formatting Helpers (Maldives Time Zone: Indian/Maldives - GMT+05:00)
 * Date format: DD/MM/YYYY
 * Time format: 24h (HH:mm / HH:mm:ss)
 */

export const MALDIVES_TZ = 'Indian/Maldives';

let activeSystemTimezone = 'Indian/Maldives';

export function setSystemTimezone(tzString?: string) {
  if (!tzString) return;
  // Extract clean IANA timezone prefix e.g., "Indian/Maldives (GMT+05:00)" -> "Indian/Maldives"
  const cleanTz = tzString.split(' ')[0].trim();
  if (cleanTz) {
    activeSystemTimezone = cleanTz;
  }
}

export function getSystemTimezone(): string {
  return activeSystemTimezone;
}

export function parseDate(dateVal: string | number | Date | null | undefined): Date | null {
  if (!dateVal) return null;
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return null;
  return d;
}

/**
 * Formats a date into DD/MM/YYYY in System Timezone (Default: GMT+05:00)
 */
export function formatDate(dateVal: string | number | Date | null | undefined, fallback = 'N/A'): string {
  const d = parseDate(dateVal);
  if (!d) return fallback;
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: activeSystemTimezone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).formatToParts(d);
    
    const day = parts.find(p => p.type === 'day')?.value || String(d.getDate()).padStart(2, '0');
    const month = parts.find(p => p.type === 'month')?.value || String(d.getMonth() + 1).padStart(2, '0');
    const year = parts.find(p => p.type === 'year')?.value || String(d.getFullYear());
    
    return `${day}/${month}/${year}`;
  } catch {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
}

/**
 * Formats time into 24-hour clock (HH:mm or HH:mm:ss) in System Timezone (Default: GMT+05:00)
 */
export function formatTime(dateVal: string | number | Date | null | undefined, includeSeconds = false, fallback = 'N/A'): string {
  const d = parseDate(dateVal);
  if (!d) return fallback;
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: activeSystemTimezone,
      hour: '2-digit',
      minute: '2-digit',
      second: includeSeconds ? '2-digit' : undefined,
      hour12: false
    }).formatToParts(d);

    const hours = parts.find(p => p.type === 'hour')?.value || String(d.getHours()).padStart(2, '0');
    const minutes = parts.find(p => p.type === 'minute')?.value || String(d.getMinutes()).padStart(2, '0');
    
    if (includeSeconds) {
      const seconds = parts.find(p => p.type === 'second')?.value || String(d.getSeconds()).padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    }
    return `${hours}:${minutes}`;
  } catch {
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    if (includeSeconds) {
      const seconds = String(d.getSeconds()).padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    }
    return `${hours}:${minutes}`;
  }
}

/**
 * Formats date and time into DD/MM/YYYY HH:mm or DD/MM/YYYY HH:mm:ss (Maldives Time)
 */
export function formatDateTime(dateVal: string | number | Date | null | undefined, includeSeconds = false, fallback = 'N/A'): string {
  const d = parseDate(dateVal);
  if (!d) return fallback;
  const dateStr = formatDate(d);
  const timeStr = formatTime(d, includeSeconds);
  return `${dateStr} ${timeStr}`;
}

export const THAANA_LABELS = ['ހ', 'ށ', 'ނ', 'ރ', 'ބ', 'ޅ', 'ކ', 'އ', 'ވ', 'މ', 'ފ', 'ދ'];

/**
 * Returns Dhivehi Thaana Option Label (ހ, ށ, ނ, ރ...) instead of A, B, C, D
 */
export function getThaanaOptionLabel(label?: string, idx: number = 0): string {
  if (label) {
    const clean = label.trim().toUpperCase();
    if (clean === 'A' || clean === '1') return 'ހ';
    if (clean === 'B' || clean === '2') return 'ށ';
    if (clean === 'C' || clean === '3') return 'ނ';
    if (clean === 'D' || clean === '4') return 'ރ';
    if (clean === 'E' || clean === '5') return 'ބ';
    if (clean === 'F' || clean === '6') return 'ޅ';
    if (THAANA_LABELS.includes(clean)) return clean;
  }
  return THAANA_LABELS[idx] || 'ހ';
}
