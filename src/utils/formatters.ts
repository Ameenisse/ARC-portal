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

/**
 * Universal cross-browser, cross-device date parser supporting ISO strings,
 * timezone offsets (+05:00, Z), and non-standard browser date strings.
 */
export function parseDate(dateVal: string | number | Date | null | undefined): Date | null {
  if (!dateVal) return null;
  if (dateVal instanceof Date) {
    return isNaN(dateVal.getTime()) ? null : dateVal;
  }
  if (typeof dateVal === 'number') {
    const d = new Date(dateVal);
    return isNaN(dateVal) || isNaN(d.getTime()) ? null : d;
  }
  if (typeof dateVal === 'string') {
    const trimmed = dateVal.trim();
    if (!trimmed) return null;

    // Handle DD/MM/YYYY or DD-MM-YYYY formats
    const ddmmyyyy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/;
    const match = trimmed.match(ddmmyyyy);
    if (match) {
      const [_, day, month, year, hour, minute, second] = match;
      const h = hour ? parseInt(hour, 10) : 12;
      const m = minute ? parseInt(minute, 10) : 0;
      const s = second ? parseInt(second, 10) : 0;
      const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}+05:00`;
      const d = new Date(iso);
      if (!isNaN(d.getTime())) return d;
    }

    // Handle standard YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const d = new Date(`${trimmed}T12:00:00+05:00`);
      if (!isNaN(d.getTime())) return d;
    }

    // Handle YYYY-MM-DDTHH:mm or YYYY-MM-DD HH:mm without offset
    if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2})?$/.test(trimmed)) {
      const cleanIso = trimmed.replace(' ', 'T');
      const fullTime = cleanIso.length === 16 ? `${cleanIso}:00` : cleanIso;
      const dWithOffset = new Date(`${fullTime}+05:00`);
      if (!isNaN(dWithOffset.getTime())) return dWithOffset;
    }

    // Direct ISO string parse (e.g. 2026-08-24T09:00:00.000Z or +05:00)
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

/**
 * Formats a date into DD/MM/YYYY strictly in Maldives Timezone (GMT+05:00)
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
 * Formats time into 24-hour clock (HH:mm or HH:mm:ss) in Maldives Timezone (GMT+05:00)
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

/**
 * Formats an ISO or Date value to "YYYY-MM-DDTHH:mm" strictly in Maldives Time (GMT+05:00)
 * for HTML datetime-local inputs, guaranteed identical across any client device/browser.
 */
export function formatToMaldivesInput(dateVal: string | number | Date | null | undefined): string {
  const d = parseDate(dateVal);
  if (!d) return '';
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: activeSystemTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(d);

    const year = parts.find(p => p.type === 'year')?.value || String(d.getFullYear());
    const month = parts.find(p => p.type === 'month')?.value || String(d.getMonth() + 1).padStart(2, '0');
    const day = parts.find(p => p.type === 'day')?.value || String(d.getDate()).padStart(2, '0');
    const hour = parts.find(p => p.type === 'hour')?.value || String(d.getHours()).padStart(2, '0');
    const minute = parts.find(p => p.type === 'minute')?.value || String(d.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hour}:${minute}`;
  } catch {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}

/**
 * Converts a "YYYY-MM-DDTHH:mm" string entered in Maldives Time into a standard ISO 8601 string
 * preserving the exact entered Maldives date and time without local browser timezone distortion.
 */
export function parseMaldivesInputToISO(inputVal: string): string {
  if (!inputVal) return new Date().toISOString();
  const trimmed = inputVal.trim();
  
  if (trimmed.includes('Z') || /[+-]\d{2}:\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }

  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2})?$/.test(trimmed)) {
    const clean = trimmed.replace(' ', 'T');
    const withSec = clean.length === 16 ? `${clean}:00` : clean;
    const d = new Date(`${withSec}+05:00`);
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(`${trimmed}T12:00:00+05:00`);
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }
  }

  const fallback = new Date(trimmed);
  return isNaN(fallback.getTime()) ? new Date().toISOString() : fallback.toISOString();
}

export const THAANA_LABELS = ['ހ', 'ށ', 'ނ', 'ރ', 'ބ', 'ޅ', 'ކ', 'އ', 'ވ', 'މ', 'ފ', 'ދ'];

/**
 * Formats a monetary amount in MVR currency format
 */
export function formatCurrency(amount: number | string | null | undefined, currency = 'MVR'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
  if (isNaN(num)) return `0.00 ${currency}`;
  return `${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

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
