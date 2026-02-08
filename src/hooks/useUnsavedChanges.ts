import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Hook to track and warn about unsaved changes.
 * Uses beforeunload and a lightweight history guard to prevent accidental loss.
 */
export function useUnsavedChanges(hasChanges: boolean) {
  const navigate = useNavigate();
  const [isBlocked, setIsBlocked] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const currentPathRef = useRef<string>(window.location.pathname);

  useEffect(() => {
    currentPathRef.current = window.location.pathname;
  });

  useEffect(() => {
    if (!hasChanges) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    const handlePopState = () => {
      if (!hasChanges) return;
      setIsBlocked(true);
      setPendingPath(window.location.pathname);
      window.history.pushState(null, '', currentPathRef.current);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [hasChanges]);

  const confirmNavigation = () => {
    setIsBlocked(false);
    if (pendingPath) {
      navigate(pendingPath);
    }
    setPendingPath(null);
  };

  const cancelNavigation = () => {
    setIsBlocked(false);
    setPendingPath(null);
  };

  return {
    isBlocked,
    pendingPath,
    confirmNavigation,
    cancelNavigation,
  };
}

/**
 * Hook to track form dirty state.
 */
export function useFormDirtyState<T extends Record<string, unknown>>(
  initialValues: T,
  currentValues: T
): boolean {
  return JSON.stringify(initialValues) !== JSON.stringify(currentValues);
}

export default useUnsavedChanges;
