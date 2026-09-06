import { Coordinates, CalculationMethod, PrayerTimes, Madhab } from 'adhan';

export interface PrayerTimeItem {
  key: string;
  nameDv: string;
  time: string;
  isNext: boolean;
  date: Date;
}

export interface PrayerSchedule {
  dateStr: string;
  locationName: string;
  isAutoLocation: boolean;
  coordinates: { latitude: number; longitude: number };
  prayers: PrayerTimeItem[];
  nextPrayer: PrayerTimeItem;
}

export const DHIVEHI_DAYS = [
  'އާދީއްތަ',  // Sunday
  'ހޯމަ',       // Monday
  'އަންގާރަ',    // Tuesday
  'ބުދަ',       // Wednesday
  'ބުރާސްފަތި',  // Thursday
  'ހުކުރު',      // Friday
  'ހޮނިހިރު'    // Saturday
];

export const DHIVEHI_MONTHS = [
  'ޖެނުއަރީ',
  'ފެބްރުއަރީ',
  'މާރިޗު',
  'އޭޕްރީލް',
  'މެއި',
  'ޖޫން',
  'ޖުލައި',
  'އޯގަސްޓް',
  'ސެޕްޓެމްބަރ',
  'އޮކްޓޯބަރ',
  'ނޮވެމްބަރ',
  'ޑިސެމްބަރ'
];

/**
 * Format today's date in Dhivehi, e.g. "ހުކުރު، 4 ސެޕްޓެމްބަރ 2026"
 */
export function formatDhivehiDate(date: Date = new Date()): string {
  const dayName = DHIVEHI_DAYS[date.getDay()] || '';
  const dayNum = date.getDate();
  const monthName = DHIVEHI_MONTHS[date.getMonth()] || '';
  const year = date.getFullYear();
  return `${dayName}، ${dayNum} ${monthName} ${year}`;
}

/**
 * Detect regional location name within Maldives or worldwide from coordinates
 */
export function getLocationNameFromCoords(lat: number, lng: number): string {
  // Check if within Maldives geographic boundary
  if (lat >= -1.5 && lat <= 7.5 && lng >= 72.0 && lng <= 74.5) {
    if (lat > 6.0) return 'ހއ. / ހދ. ސަރަޙައްދު';
    if (lat > 4.8) return 'ށ. / ނ. / ރ. / ބ. ސަރަޙައްދު';
    if (lat > 3.8 && lat <= 4.8) return 'މާލެ އަދި ކައިރި ސަރަޙައްދު';
    if (lat > 2.5 && lat <= 3.8) return 'ވ. / މ. / ފ. / ދ. ސަރަޙައްދު';
    if (lat > 1.0 && lat <= 2.5) return 'ތ. / ލ. ސަރަޙައްދު';
    if (lat > -0.2 && lat <= 1.0) return 'ގއ. / ގދ. ސަރަޙައްދު';
    return 'ޏ. ފުވައްމުލައް / ސ. އައްޑޫ';
  }
  return `${lat.toFixed(2)}°, ${lng.toFixed(2)}°`;
}

/**
 * Default coordinates for Maldives (Male')
 */
export const DEFAULT_COORDINATES = {
  latitude: 4.1755,
  longitude: 73.5093,
  locationName: 'މާލެ އަދި ކައިރި ސަރަޙައްދު'
};

/**
 * Format a Date to 24-hour HH:mm
 */
export function formatTime24(date: Date): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);
  } catch {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }
}

/**
 * Calculate prayer times for auto device coordinates on today's date
 */
export function computePrayerSchedule(
  latitude: number = DEFAULT_COORDINATES.latitude,
  longitude: number = DEFAULT_COORDINATES.longitude,
  date: Date = new Date(),
  isAutoLocation: boolean = false,
  customLocationName?: string
): PrayerSchedule {
  const coordinates = new Coordinates(latitude, longitude);

  // Calculation parameters: Muslim World League standard with Shafi'i madhab for Asr
  const params = CalculationMethod.MuslimWorldLeague();
  params.madhab = Madhab.Shafi;

  const pt = new PrayerTimes(coordinates, date, params);

  const rawPrayers = [
    { key: 'fajr', nameDv: 'ފަތިސް', date: pt.fajr },
    { key: 'sunrise', nameDv: 'އިރުއަރާ', date: pt.sunrise },
    { key: 'dhuhr', nameDv: 'މެންދުރު', date: pt.dhuhr },
    { key: 'asr', nameDv: 'ޢަޞްރު', date: pt.asr },
    { key: 'maghrib', nameDv: 'މަޣްރިބް', date: pt.maghrib },
    { key: 'isha', nameDv: 'ޢިޝާ', date: pt.isha }
  ];

  // Determine which prayer is next relative to current time
  const now = new Date();
  let nextKey = 'fajr';
  
  if (now < pt.fajr) {
    nextKey = 'fajr';
  } else if (now < pt.sunrise) {
    nextKey = 'sunrise';
  } else if (now < pt.dhuhr) {
    nextKey = 'dhuhr';
  } else if (now < pt.asr) {
    nextKey = 'asr';
  } else if (now < pt.maghrib) {
    nextKey = 'maghrib';
  } else if (now < pt.isha) {
    nextKey = 'isha';
  } else {
    // Tomorrow's Fajr
    nextKey = 'fajr';
  }

  const prayers: PrayerTimeItem[] = rawPrayers.map((p) => ({
    key: p.key,
    nameDv: p.nameDv,
    time: formatTime24(p.date),
    isNext: p.key === nextKey,
    date: p.date
  }));

  const nextPrayer = prayers.find((p) => p.key === nextKey) || prayers[0];

  const locationName = customLocationName || getLocationNameFromCoords(latitude, longitude);

  return {
    dateStr: formatDhivehiDate(date),
    locationName,
    isAutoLocation,
    coordinates: { latitude, longitude },
    prayers,
    nextPrayer
  };
}
