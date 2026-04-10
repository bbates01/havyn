/** Escape a CSV field (quotes, commas, newlines). */
function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Download a CSV file in the browser (client-side only).
 * Headers are the union of keys from all rows (stable sort for consistency).
 */
export function downloadCsv(filename: string, rows: Record<string, unknown>[]): void {
  if (rows.length === 0) {
    const blob = new Blob([''], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const keySet = new Set<string>();
  for (const row of rows) {
    for (const k of Object.keys(row)) keySet.add(k);
  }
  const headers = [...keySet].sort();

  const lines = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) =>
      headers.map((h) => escapeCell(row[h])).join(',')
    ),
  ];
  const csv = lines.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
