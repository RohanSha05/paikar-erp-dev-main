export function dhakaDate(date: Date = new Date()): string {
  const df = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return df.format(date);
}

export function dhakaIso(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;

  // Return a ISO-like local timestamp without timezone designator
  return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:${map.second}`;
}

export function dhakaYmdCompact(date: Date = new Date()): string {
  return dhakaDate(date).replace(/-/g, '');
}
