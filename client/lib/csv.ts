export function downloadCSV(filename: string, rows: any[], headers?: string[]) {
  if (!rows || !rows.length) {
    const empty = 'data:text/csv;charset=utf-8,\uFEFF';
    const u = encodeURI(empty);
    const a = document.createElement('a');
    a.href = u;
    a.download = filename;
    a.click();
    return;
  }
  const cols = headers || Object.keys(rows[0]);
  const escape = (v: any) => {
    const s = (v ?? '').toString().replace(/"/g, '""');
    if (/[,"\n]/.test(s)) return `"${s}"`;
    return s;
  };
  const csv = [cols.join(',')].concat(
    rows.map(r => cols.map(c => escape(r[c])).join(','))
  ).join('\n');

  const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
