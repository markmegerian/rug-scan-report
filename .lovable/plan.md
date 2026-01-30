
# Fix: useBlocker Router Compatibility Error

## Problem
The app crashes with the error: **"useBlocker must be used within a data router"**

This happens because:
- `useBlocker` from React Router v6 requires a **data router** (`createBrowserRouter`)
- The app uses the simpler **component-based router** (`BrowserRouter`)
- The `useUnsavedChanges` hook tries to use `useBlocker` which isn't supported

## Solution
Replace `useBlocker` with a custom implementation that works with `BrowserRouter`. This approach:
- Keeps the existing routing structure intact (no app-wide migration)
- Maintains the same user experience for unsaved changes warnings
- Uses `useNavigate` and `useLocation` which work with any router

## Files to Change

### 1. Update useUnsavedChanges Hook
**File:** `src/hooks/useUnsavedChanges.ts`

Replace the `useBlocker` implementation with a custom navigation interception:
- Track attempted navigation via a state variable
- Intercept navigation by storing the target path
- Show confirmation dialog before allowing navigation
- Provide `confirmNavigation()` and `cancelNavigation()` functions

### 2. Update JobForm Component
**File:** `src/components/JobForm.tsx`

- Update the dialog callbacks to use the new hook API
- Replace `blocker.proceed?.()` with `confirmNavigation()`
- Replace `blocker.reset?.()` with `cancelNavigation()`

### 3. Update RugForm Component  
**File:** `src/components/RugForm.tsx`

- Same updates as JobForm for the new hook API

---

## Technical Details

### New Hook API

The updated `useUnsavedChanges` hook will return:
- `isBlocked: boolean` - Whether navigation is blocked
- `pendingPath: string | null` - Where user tried to navigate
- `confirmNavigation: () => void` - Proceed with blocked navigation
- `cancelNavigation: () => void` - Cancel and stay on page

### How It Works

```text
User clicks link → Hook intercepts → Shows dialog → User confirms/cancels
         ↓                 ↓                              ↓
    Check hasChanges    Store path               Navigate or stay
```

The hook will use `window.history.pushState` interception to detect navigation attempts, store the intended destination, and only navigate when the user confirms.

## Benefits
1. Fixes the crash immediately
2. No changes to app routing structure
3. Same UX for users (dialog still appears)
4. Browser refresh/close warning still works (beforeunload)
