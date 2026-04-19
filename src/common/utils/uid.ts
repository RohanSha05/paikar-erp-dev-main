let uidCounter = 0;

function yyyymmdd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

export function uid(prefix: string): string {
  uidCounter = (uidCounter % 999) + 1;
  return `${prefix}-${yyyymmdd(new Date())}-${String(uidCounter).padStart(3, '0')}`;
}