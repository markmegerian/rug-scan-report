/**
 * Convert array of objects to CSV string
 */
export function arrayToCsv<T extends Record<string, unknown>>(
  data: T[],
  columns: { key: keyof T; label: string; formatter?: (value: unknown) => string }[]
): string {
  if (data.length === 0) return '';

  // Header row
  const header = columns.map((col) => `"${col.label}"`).join(',');

  // Data rows
  const rows = data.map((item) =>
    columns
      .map((col) => {
        const value = item[col.key];
        const formatted = col.formatter ? col.formatter(value) : String(value ?? '');
        // Escape quotes and wrap in quotes
        return `"${formatted.replace(/"/g, '""')}"`;
      })
      .join(',')
  );

  return [header, ...rows].join('\n');
}

/**
 * Download CSV string as file
 */
export function downloadCsv(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

/**
 * Format currency for CSV
 */
export function formatCurrencyCsv(amount: number | null | undefined): string {
  if (amount == null) return '$0';
  return `$${Number(amount).toFixed(2)}`;
}

/**
 * Format date for CSV
 */
export function formatDateCsv(date: string | null | undefined): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}