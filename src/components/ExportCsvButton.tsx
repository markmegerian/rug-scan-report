import React from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { arrayToCsv, downloadCsv } from '@/lib/csvExport';
import { toast } from 'sonner';

interface Column<T> {
  key: keyof T;
  label: string;
  formatter?: (value: unknown) => string;
}

interface ExportCsvButtonProps<T> {
  data: T[];
  columns: Column<T>[];
  filename: string;
  disabled?: boolean;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

function ExportCsvButton<T>({
  data,
  columns,
  filename,
  disabled = false,
  variant = 'outline',
  size = 'sm',
}: ExportCsvButtonProps<T>): React.ReactElement {
  const handleExport = () => {
    try {
      // Cast to Record<string, unknown> for the CSV function
      const csvData = data as unknown as Record<string, unknown>[];
      const csvColumns = columns as { key: string; label: string; formatter?: (value: unknown) => string }[];
      const csv = arrayToCsv(csvData, csvColumns as any);
      const timestampedFilename = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
      downloadCsv(csv, timestampedFilename);
      toast.success(`Exported ${data.length} records to CSV`);
    } catch (error) {
      console.error('CSV export error:', error);
      toast.error('Failed to export CSV');
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleExport}
      disabled={disabled || data.length === 0}
      className="gap-2"
    >
      <Download className="h-4 w-4" />
      Export CSV
    </Button>
  );
}

export default ExportCsvButton;