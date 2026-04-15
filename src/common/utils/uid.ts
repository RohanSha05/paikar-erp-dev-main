import { randomUUID } from 'crypto';

export function uid(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, '')}`;
}