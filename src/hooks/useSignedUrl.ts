import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseSignedUrlOptions {
  expiresIn?: number; // seconds, default 1 hour
  bucket?: string;
}

/**
 * Hook to generate and manage signed URLs for Supabase storage
 * Automatically regenerates URLs before they expire
 */
export const useSignedUrl = (
  filePath: string | null | undefined,
  options: UseSignedUrlOptions = {}
) => {
  const { expiresIn = 3600, bucket = 'rug-photos' } = options;
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const generateUrl = useCallback(async () => {
    if (!filePath) {
      setSignedUrl(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: urlError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, expiresIn);

      if (urlError) throw urlError;

      setSignedUrl(data.signedUrl);
    } catch (err) {
      console.error('Error generating signed URL:', err);
      setError(err instanceof Error ? err : new Error('Failed to generate URL'));
      setSignedUrl(null);
    } finally {
      setLoading(false);
    }
  }, [filePath, bucket, expiresIn]);

  useEffect(() => {
    generateUrl();

    // Set up refresh interval (refresh 5 minutes before expiry)
    const refreshInterval = Math.max((expiresIn - 300) * 1000, 60000); // minimum 1 minute
    const interval = setInterval(generateUrl, refreshInterval);

    return () => clearInterval(interval);
  }, [generateUrl, expiresIn]);

  return {
    signedUrl,
    loading,
    error,
    refresh: generateUrl,
  };
};

/**
 * Generate a one-time signed URL (not reactive)
 */
export const getSignedUrl = async (
  filePath: string,
  options: UseSignedUrlOptions = {}
): Promise<string | null> => {
  const { expiresIn = 3600, bucket = 'rug-photos' } = options;

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);

    if (error) throw error;
    return data.signedUrl;
  } catch (err) {
    console.error('Error generating signed URL:', err);
    return null;
  }
};

export default useSignedUrl;
