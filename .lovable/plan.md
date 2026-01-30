
# Fix: Photos Not Displaying Due to Expired Signed URLs

## Summary
Rug photos are failing to load because the app stores time-limited signed URLs (7-day expiry) in the database instead of file paths. After 7 days, these URLs expire and photos stop displaying.

## Root Cause
The `usePhotoUpload.ts` hook generates signed URLs immediately after upload and stores those URLs in the database. When the URLs expire after 7 days, the images break.

## Solution Overview
Apply the same fix that was used for business logos: store file paths instead of signed URLs, then generate fresh signed URLs on-demand when displaying images.

---

## Changes Required

### 1. Update Photo Upload Hook
**File:** `src/hooks/usePhotoUpload.ts`

- Modify `uploadSinglePhoto` to return the **storage file path** instead of a signed URL
- Remove the signed URL generation during upload
- The returned path format will be: `{userId}/{timestamp}-{random}-{filename}`

### 2. Create Photo URL Component  
**New File:** `src/components/RugPhoto.tsx`

- Create a reusable component that takes a file path and generates a signed URL on-demand
- Use the existing `useSignedUrl` hook pattern with automatic refresh
- Handle loading states and error fallbacks gracefully

### 3. Update AnalysisReport Photo Display
**File:** `src/components/AnalysisReport.tsx`

- Replace direct `<img src={url}>` with the new `<RugPhoto>` component
- Pass file paths instead of expecting pre-signed URLs

### 4. Update ClientPortal Photo Display  
**File:** `src/pages/ClientPortal.tsx`

- Replace direct `<img src={url}>` with the new `<RugPhoto>` component

### 5. Update JobDetail Photo Count
**File:** `src/pages/JobDetail.tsx`

- The photo count display already works with array length (no change needed)

### 6. Create Migration for Existing Data
**Database Migration**

- Create a migration script to extract file paths from existing signed URLs in the database
- The path can be extracted from the URL between `/rug-photos/` and `?token=`

---

## Technical Details

### New RugPhoto Component Pattern
```text
+------------------+     +----------------+     +-------------+
|  RugPhoto        | --> | useSignedUrl   | --> | Supabase    |
|  (filePath prop) |     | (generates     |     | Storage     |
|                  |     |  fresh URLs)   |     | (rug-photos)|
+------------------+     +----------------+     +-------------+
```

### File Path Format
- **Current (broken):** Full signed URL with expiring token
- **New (correct):** `94db7bee-b556-45c3-81d6-376cc69bcf06/1769536018659-gdpcqvg-image.jpg`

### Backward Compatibility
The migration will convert existing signed URLs to file paths, ensuring all existing photos continue to work after the fix.

---

## Benefits
1. Photos will never expire - URLs are generated fresh on each view
2. Consistent with how business logos already work
3. Reduces database storage (paths are shorter than full URLs)
4. Improves security - tokens aren't stored long-term

## Estimated Impact
- **New uploads:** Will work immediately after the fix
- **Existing photos:** Will work after running the database migration
