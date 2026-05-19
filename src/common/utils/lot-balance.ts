import type { Prisma } from '@prisma/client';

export type LotMetaLike = {
  kgPerBag?: unknown;
  bagCount?: unknown;
  initialBagCount?: unknown;
  remainingBagCount?: unknown;
  [key: string]: unknown;
};

function toFiniteNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  if (value && typeof value === 'object') {
    const maybe = value as { toNumber?: () => number; toString?: () => string };
    if (typeof maybe.toNumber === 'function') {
      const parsed = maybe.toNumber();
      return Number.isFinite(parsed) ? parsed : fallback;
    }
    if (typeof maybe.toString === 'function') {
      const text = maybe.toString();
      if (text !== '[object Object]') {
        const parsed = Number(text);
        return Number.isFinite(parsed) ? parsed : fallback;
      }
    }
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getKgPerBag(meta?: LotMetaLike | null): number {
  return Math.max(0, toFiniteNumber(meta?.kgPerBag, 0));
}

export function getInitialBagCount(meta?: LotMetaLike | null): number {
  const initial = toFiniteNumber(meta?.initialBagCount, NaN);
  if (Number.isFinite(initial) && initial >= 0) return initial;

  const count = toFiniteNumber(meta?.bagCount, NaN);
  if (Number.isFinite(count) && count >= 0) return count;

  const remaining = toFiniteNumber(meta?.remainingBagCount, NaN);
  if (Number.isFinite(remaining) && remaining >= 0) return remaining;

  return 0;
}

export function getRemainingBagCount(availableKg: unknown, meta?: LotMetaLike | null): number {
  const kgPerBag = getKgPerBag(meta);
  if (kgPerBag > 0) {
    return Math.max(0, Math.ceil(toFiniteNumber(availableKg, 0) / kgPerBag));
  }

  const remaining = toFiniteNumber(meta?.remainingBagCount, NaN);
  if (Number.isFinite(remaining) && remaining >= 0) return Math.max(0, Math.ceil(remaining));

  return Math.max(0, Math.ceil(toFiniteNumber(meta?.bagCount, 0)));
}

export function syncLotMetaBagBalance(
  meta: LotMetaLike | null | undefined,
  availableKg: unknown,
  fallbackKgPerBag?: unknown,
  fallbackInitialBagCount?: unknown,
) {
  const currentMeta = { ...(meta || {}) } as Record<string, Prisma.InputJsonValue>;
  const kgPerBag = Math.max(
    0,
    toFiniteNumber(currentMeta.kgPerBag, 0) || toFiniteNumber(fallbackKgPerBag, 0),
  );
  const initialBagCount = Number.isFinite(toFiniteNumber(currentMeta.initialBagCount, NaN))
    ? toFiniteNumber(currentMeta.initialBagCount, 0)
    : Number.isFinite(toFiniteNumber(currentMeta.bagCount, NaN))
      ? toFiniteNumber(currentMeta.bagCount, 0)
      : Number.isFinite(toFiniteNumber(fallbackInitialBagCount, NaN))
        ? toFiniteNumber(fallbackInitialBagCount, 0)
        : toFiniteNumber(currentMeta.remainingBagCount, 0);
  const remainingBagCount = getRemainingBagCount(availableKg, {
    ...currentMeta,
    kgPerBag,
  });

  return {
    ...currentMeta,
    kgPerBag,
    initialBagCount,
    bagCount: Math.max(0, Math.ceil(remainingBagCount)),
    remainingBagCount: Math.max(0, Math.ceil(remainingBagCount)),
  } as Prisma.InputJsonObject;
}
