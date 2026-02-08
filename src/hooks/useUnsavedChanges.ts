/**
 * useUnsavedChanges Hook
 * TEMPORARILY DISABLED - returning no-op to avoid confusion during job creation flow
 * TODO: Re-enable once navigation blocking is properly integrated
 */

/**
 * Hook to track and warn about unsaved changes
 * Currently disabled - returns no-op values
 */
export function useUnsavedChanges(_hasChanges: boolean) {
  return {
    isBlocked: false,
    pendingPath: null,
    confirmNavigation: () => {},
    cancelNavigation: () => {},
  };
}

/**
 * Hook to track form dirty state
 * Currently disabled - always returns false
 */
export function useFormDirtyState<T extends Record<string, unknown>>(
  _initialValues: T,
  _currentValues: T
): boolean {
  return false;
}

export default useUnsavedChanges;
