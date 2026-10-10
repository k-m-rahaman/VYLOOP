export function escapeCsvCell(value: string | number): string {
  let cell = String(value);
  // Spreadsheet programs may ignore leading whitespace before a formula.
  if (/^[\s\p{Cc}]*[=+@-]/u.test(cell) || /^[\t\r\n]/.test(cell)) {
    cell = `'${cell}`;
  }
  return `"${cell.replaceAll('"', '""')}"`;
}
