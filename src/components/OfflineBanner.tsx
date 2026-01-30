import React from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';

interface OfflineBannerProps {
  className?: string;
}

const OfflineBanner: React.FC<OfflineBannerProps> = ({ className }) => {
  const { isOffline, wasOffline, checkConnection } = useOfflineStatus();
  const [isChecking, setIsChecking] = React.useState(false);

  const handleRetry = async () => {
    setIsChecking(true);
    await checkConnection();
    setIsChecking(false);
    if (navigator.onLine) {
      window.location.reload();
    }
  };

  // Show "back online" message briefly
  if (wasOffline && !isOffline) {
    return (
      <div
        className={cn(
          "fixed top-0 left-0 right-0 z-[100]",
          "bg-green-500 text-white py-2 px-4",
          "flex items-center justify-center gap-2 text-sm font-medium",
          "animate-in slide-in-from-top fade-in duration-300",
          className
        )}
      >
        <Wifi className="h-4 w-4" />
        You're back online!
      </div>
    );
  }

  if (!isOffline) return null;

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-[100]",
        "bg-destructive text-destructive-foreground py-2 px-4",
        "flex items-center justify-center gap-3 text-sm",
        "animate-in slide-in-from-top fade-in duration-300",
        className
      )}
    >
      <WifiOff className="h-4 w-4 flex-shrink-0" />
      <span className="font-medium">You're offline</span>
      <span className="hidden sm:inline opacity-90">
        — Some features may not be available
      </span>
      <Button
        size="sm"
        variant="secondary"
        onClick={handleRetry}
        disabled={isChecking}
        className="ml-2 h-7 px-2 text-xs"
      >
        {isChecking ? (
          <RefreshCw className="h-3 w-3 animate-spin" />
        ) : (
          <>
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </>
        )}
      </Button>
    </div>
  );
};

export default OfflineBanner;
