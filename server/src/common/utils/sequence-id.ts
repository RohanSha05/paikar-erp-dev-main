function datePartFrom(date: Date) {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

function nextSequenceFrom(latest: string | null | undefined) {
  if (!latest) return 1;
  const match = latest.match(/-(\d+)$/);
  if (!match) return 1;
  return Number(match[1]) + 1;
}

export async function nextDailySequenceIdForDelegate(
  delegate: {
    findFirst: (args: {
      where: Record<string, unknown>;
      orderBy: Record<string, 'asc' | 'desc'>;
      select: Record<string, boolean>;
    }) => Promise<any>;
  },
  field: string,
  prefix: string,
  date: Date = new Date(),
  pad: number = 3,
): Promise<string> {
  const datePart = datePartFrom(date);
  const startsWith = `${prefix}-${datePart}-`;

  const latest = await delegate.findFirst({
    where: {
      [field]: {
        startsWith,
      },
    },
    orderBy: {
      [field]: 'desc',
    },
    select: {
      [field]: true,
    },
  });

  const latestValue = latest ? (latest[field] as string | undefined) : undefined;
  const next = nextSequenceFrom(latestValue);
  return `${prefix}-${datePart}-${String(next).padStart(pad, '0')}`;
}
