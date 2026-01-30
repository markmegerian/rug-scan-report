import React from 'react';
import { X, CheckCircle, XCircle, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BatchActionBarProps {
  selectedCount: number;
  onClear: () => void;
  actions: {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    className?: string;
    disabled?: boolean;
    loading?: boolean;
  }[];
  className?: string;
}

const BatchActionBar: React.FC<BatchActionBarProps> = ({
  selectedCount,
  onClear,
  actions,
  className,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div 
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-50",
        "bg-card border border-border rounded-lg shadow-lg",
        "flex items-center gap-3 px-4 py-3",
        "animate-in slide-in-from-bottom-4 fade-in duration-200",
        className
      )}
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs">
          {selectedCount}
        </div>
        <span className="text-muted-foreground">selected</span>
      </div>

      <div className="h-6 w-px bg-border" />

      <div className="flex items-center gap-2">
        {actions.map((action, index) => (
          <Button
            key={index}
            size="sm"
            variant={action.variant || 'outline'}
            onClick={action.onClick}
            disabled={action.disabled || action.loading}
            className={cn("gap-1.5", action.className)}
          >
            {action.loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              action.icon
            )}
            {action.label}
          </Button>
        ))}
      </div>

      <div className="h-6 w-px bg-border" />

      <Button
        size="sm"
        variant="ghost"
        onClick={onClear}
        className="gap-1.5 text-muted-foreground"
      >
        <X className="h-4 w-4" />
        Clear
      </Button>
    </div>
  );
};

export default BatchActionBar;
