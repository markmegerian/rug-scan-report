import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface RateLimitFeedbackProps {
  remainingSeconds: number;
  failedAttempts: number;
  onComplete?: () => void;
  className?: string;
}

const RateLimitFeedback: React.FC<RateLimitFeedbackProps> = ({
  remainingSeconds: initialSeconds,
  failedAttempts,
  onComplete,
  className,
}) => {
  const [remainingSeconds, setRemainingSeconds] = useState(initialSeconds);

  useEffect(() => {
    setRemainingSeconds(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (remainingSeconds <= 0) {
      onComplete?.();
      return;
    }

    const timer = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [remainingSeconds, onComplete]);

  if (remainingSeconds <= 0) return null;

  const progress = ((initialSeconds - remainingSeconds) / initialSeconds) * 100;

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  };

  const getSeverity = () => {
    if (failedAttempts >= 7) return 'critical';
    if (failedAttempts >= 5) return 'warning';
    return 'info';
  };

  const severity = getSeverity();

  return (
    <Alert 
      variant={severity === 'critical' ? 'destructive' : 'default'}
      className={cn(
        "animate-in fade-in slide-in-from-top-2",
        severity === 'warning' && "border-amber-500 text-amber-900 dark:text-amber-100 [&>svg]:text-amber-500",
        className
      )}
    >
      {severity === 'critical' ? (
        <AlertTriangle className="h-4 w-4" />
      ) : (
        <Clock className="h-4 w-4" />
      )}
      <AlertTitle>
        {severity === 'critical' 
          ? 'Too Many Failed Attempts' 
          : 'Please Wait'}
      </AlertTitle>
      <AlertDescription className="space-y-3">
        <p>
          {severity === 'critical' 
            ? `For your security, please wait ${formatTime(remainingSeconds)} before trying again.`
            : `Please wait ${formatTime(remainingSeconds)} before attempting to sign in again.`
          }
        </p>
        <Progress value={progress} className="h-2" />
        {failedAttempts >= 5 && (
          <p className="text-xs opacity-75">
            {failedAttempts} failed attempts. If you've forgotten your password, use the "Forgot Password" link.
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
};

export default RateLimitFeedback;
