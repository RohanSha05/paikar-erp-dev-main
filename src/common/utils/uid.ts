import { tzDateForId } from './date';

let uidCounter = 0;

export function uid(prefix: string): string {
  uidCounter = (uidCounter % 999) + 1;
  return `${prefix}-${tzDateForId(new Date()).replace(/-/g, '')}-${String(uidCounter).padStart(3, '0')}`;
}