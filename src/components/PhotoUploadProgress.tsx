import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Upload, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadProgress {
  total: number;
  completed: number;
  percentage: number;
  currentBatch: number;
  totalBatches: number;
}

interface PhotoUploadProgressProps {
  progress: UploadProgress | null;
  isUploading: boolean;
  className?: string;
}

const PhotoUploadProgress: React.FC<PhotoUploadProgressProps> = ({
  progress,
  isUploading,
  className,
}) => {
  if (!isUploading && !progress) return null;

  const isComplete = progress?.percentage === 100;

  return (
    <div className={cn("space-y-2 p-4 rounded-lg bg-muted/50 border", className)}>
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {isComplete ? (
            <CheckCircle2 className="h-4 w-4 text-primary animate-in fade-in" />
          ) : (
            <Upload className="h-4 w-4 text-muted-foreground animate-pulse" />
          )}
          <span className={cn(
            "font-medium",
            isComplete ? "text-primary" : "text-foreground"
          )}>
            {isComplete ? 'Upload complete!' : 'Uploading photos...'}
          </span>
        </div>
        {progress && (
          <span className="text-muted-foreground tabular-nums">
            {progress.completed}/{progress.total}
          </span>
        )}
      </div>
      
      <Progress 
        value={progress?.percentage ?? 0} 
        className="h-2"
      />
      
      {progress && !isComplete && (
        <p className="text-xs text-muted-foreground">
          Batch {progress.currentBatch} of {progress.totalBatches} 
          {' • '}
          {progress.percentage}% complete
        </p>
      )}
    </div>
  );
};

export default PhotoUploadProgress;
