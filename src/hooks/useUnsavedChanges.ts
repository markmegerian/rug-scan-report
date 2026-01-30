import { useEffect, useCallback, useState } from 'react';
import { useBlocker } from 'react-router-dom';

/**
 * Hook to track and warn about unsaved changes
 * Handles both browser navigation (beforeunload) and in-app navigation (React Router)
 */
export const useUnsavedChanges = (hasChanges: boolean) => {
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

  // Handle in-app navigation with React Router
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasChanges && currentLocation.pathname !== nextLocation.pathname
  );

  return {
    blocker,
    isBlocked: blocker.state === 'blocked',
  };
};

/**
 * Hook to track form dirty state
 * Compare initial values with current values
 */
export const useFormDirtyState = <T extends Record<string, any>>(
  initialValues: T,
  currentValues: T
): boolean => {
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const dirty = Object.keys(initialValues).some(
      (key) => initialValues[key] !== currentValues[key]
    );
    setIsDirty(dirty);
  }, [initialValues, currentValues]);

  return isDirty;
};

export default useUnsavedChanges;
