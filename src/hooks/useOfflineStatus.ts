import { useState, useEffect, useCallback } from 'react';

interface OfflineStatusReturn {
  isOnline: boolean;
  isOffline: boolean;
  wasOffline: boolean;
  checkConnection: () => Promise<boolean>;
}

export function useOfflineStatus(): OfflineStatusReturn {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  const handleOnline = useCallback(() => {
    if (!isOnline) {
      setWasOffline(true);
      // Clear the "was offline" flag after 5 seconds
      setTimeout(() => setWasOffline(false), 5000);
    }
    setIsOnline(true);
  }, [isOnline]);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
  }, []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (!navigator.onLine) {
      return false;
    }
    
    try {
      // Try to fetch a small resource to verify actual connectivity
      const response = await fetch('/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache',
      });
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
    wasOffline,
    checkConnection,
  };
}
