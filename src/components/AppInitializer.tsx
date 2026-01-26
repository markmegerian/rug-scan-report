import { useEffect } from 'react';
import { useCapacitor, StatusBarStyle } from '@/hooks/useCapacitor';
import { usePushToken } from '@/hooks/usePushToken';
import { useAuth } from '@/hooks/useAuth';

interface AppInitializerProps {
  children: React.ReactNode;
}

/**
 * AppInitializer handles native app setup:
 * - Status bar styling
 * - Push notification registration
 * - Deep link handling (future)
 */
export function AppInitializer({ children }: AppInitializerProps) {
  const { isNative, platform, setStatusBarStyle, setStatusBarColor } = useCapacitor();
  const { registerAndSaveToken } = usePushToken();
  const { user } = useAuth();

  // Set up status bar on mount
  useEffect(() => {
    if (!isNative) return;

    // Use light content for the status bar (white text)
    setStatusBarStyle(StatusBarStyle.Light);
    
    // Set Android status bar color to match app header
    if (platform === 'android') {
      setStatusBarColor('#1a1a2e'); // Dark color matching app theme
    }
  }, [isNative, platform, setStatusBarStyle, setStatusBarColor]);

  // Register for push notifications when user logs in
  useEffect(() => {
    if (user && isNative) {
      // Small delay to ensure app is fully initialized
      const timer = setTimeout(() => {
        registerAndSaveToken();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [user, isNative, registerAndSaveToken]);

  return <>{children}</>;
}
