/**
 * useUnsavedChanges Hook - v3.0.0 CACHE BUSTER
 * 
 * Custom navigation blocking for BrowserRouter (NO useBlocker - works without data router)
 * Build ID: ${Date.now()}
 */
import { useEffect, useCallback, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Runtime version check - confirms fresh bundle is loaded
const HOOK_BUILD_ID = 'v3_' + Math.random().toString(36).slice(2, 8);
if (typeof window !== 'undefined') {
  console.debug(`[useUnsavedChanges] Loaded: ${HOOK_BUILD_ID}`);
}

/**
 * Hook to track and warn about unsaved changes
 * Works with BrowserRouter - NO data router required
 * Does NOT use useBlocker
 */
export function useUnsavedChanges(hasChanges: boolean) {
  const navigate = useNavigate();
  const location = useLocation();
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const hasChangesRef = useRef(hasChanges);

  // Log on first render for debugging
  useEffect(() => {
    console.debug(`[useUnsavedChanges] Mounted with hasChanges=${hasChanges}, build=${HOOK_BUILD_ID}`);
  }, []);

  // Keep ref in sync
  useEffect(() => {
    hasChangesRef.current = hasChanges;
  }, [hasChanges]);

  // Handle browser refresh/close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  // Intercept pushState/replaceState for in-app navigation
  useEffect(() => {
    const originalPushState = window.history.pushState.bind(window.history);
    const originalReplaceState = window.history.replaceState.bind(window.history);

    const interceptNavigation = (url: string | URL | null | undefined): boolean => {
      if (!hasChangesRef.current) return false;
      
      const targetPath = typeof url === 'string' ? url : url?.toString() || '';
      // Only intercept if navigating to a different path
      if (targetPath && targetPath !== location.pathname && !targetPath.startsWith('#')) {
        setPendingPath(targetPath);
        return true; // Block navigation
      }
      return false;
    };

    window.history.pushState = function (data, unused, url) {
      if (interceptNavigation(url)) {
        return; // Block the navigation
      }
      return originalPushState(data, unused, url);
    };

    window.history.replaceState = function (data, unused, url) {
      if (interceptNavigation(url)) {
        return; // Block the navigation
      }
      return originalReplaceState(data, unused, url);
    };

    // Handle popstate (back/forward buttons)
    const handlePopState = () => {
      if (hasChangesRef.current) {
        // Push current state back to prevent navigation
        window.history.pushState(null, '', location.pathname);
        setPendingPath('__back__');
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener('popstate', handlePopState);
    };
  }, [location.pathname]);

  const confirmNavigation = useCallback(() => {
    if (pendingPath) {
      const path = pendingPath;
      setPendingPath(null);
      if (path === '__back__') {
        window.history.back();
      } else {
        navigate(path);
      }
    }
  }, [pendingPath, navigate]);

  const cancelNavigation = useCallback(() => {
    setPendingPath(null);
  }, []);

  return {
    isBlocked: pendingPath !== null,
    pendingPath,
    confirmNavigation,
    cancelNavigation,
  };
}

/**
 * Hook to track form dirty state
 * Compare initial values with current values
 */
export function useFormDirtyState<T extends Record<string, unknown>>(
  initialValues: T,
  currentValues: T
): boolean {
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const dirty = Object.keys(initialValues).some(
      (key) => initialValues[key] !== currentValues[key]
    );
    setIsDirty(dirty);
  }, [initialValues, currentValues]);

  return isDirty;
}

export default useUnsavedChanges;
