import { env } from '../../config/env';
import { HttpError } from '../httpError';

const DHAKA_TIME_ZONE = env.TIMEZONE || 'Asia/Dhaka';
const DHAKA_OFFSET = '+06:00';

function isDateOnly(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toDate(value: Date | string | number | null | undefined): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'number') {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) throw new HttpError(400, 'Invalid date format');
    return d;
  }
  if (typeof value === 'string') {
    // treat date-only strings as Dhaka-local dates
    if (isDateOnly(value)) return parseDhakaDate(value);
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) throw new HttpError(400, 'Invalid date format');
    return d;
  }
  throw new HttpError(400, 'Invalid date format');
}

export function tzDate(date: Date | string | number): string {
  const d = toDate(date as Date | string | number);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: DHAKA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function tzDateTime(date: Date | string | number): string {
  const d = toDate(date as Date | string | number);
  const datePart = tzDate(d);
  const timePart = new Intl.DateTimeFormat('en-GB', {
    timeZone: DHAKA_TIME_ZONE,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(d);
  return `${datePart}T${timePart}`;
}

export function tzDateForId(date: Date | string | number): string {
  return tzDate(date).replace(/-/g, '');
}

export function parseDhakaDate(value: string): Date {
  const parsed = isDateOnly(value)
    ? new Date(`${value}T00:00:00${DHAKA_OFFSET}`)
    : new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError(400, 'Invalid date format');
  }

  return parsed;
}

export function dhakaDayStart(value: string): Date {
  const parsed = new Date(`${value}T00:00:00${DHAKA_OFFSET}`);
  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError(400, 'Invalid date format');
  }
  return parsed;
}

export function dhakaDayEnd(value: string): Date {
  const parsed = new Date(`${value}T23:59:59.999${DHAKA_OFFSET}`);
  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError(400, 'Invalid date format');
  }
  return parsed;
}
