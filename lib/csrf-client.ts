/**
 * Client-side CSRF token management
 */

import * as React from 'react';

let csrfToken: string | null = null;

/**
 * Fetch CSRF token from the server
 */
export async function getCsrfToken(): Promise<string> {
  if (csrfToken) {
    return csrfToken;
  }

  try {
    const response = await fetch('/api/auth/csrf-token', {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch CSRF token');
    }

    const data = await response.json();
    csrfToken = data.token;
    return csrfToken!;
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
    throw error;
  }
}

/**
 * Clear cached CSRF token
 */
export function clearCsrfToken(): void {
  csrfToken = null;
}

/**
 * Add CSRF token to request headers
 */
export async function addCsrfHeader(headers: HeadersInit = {}): Promise<HeadersInit> {
  const token = await getCsrfToken();
  
  return {
    ...headers,
    'X-CSRF-Token': token,
  };
}

/**
 * React hook for using CSRF token
 */
export function useCSRFToken() {
  const [token, setToken] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    const fetchToken = async () => {
      try {
        const csrfToken = await getCsrfToken();
        if (!cancelled) {
          setToken(csrfToken);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
          setLoading(false);
        }
      }
    };

    fetchToken();

    return () => {
      cancelled = true;
    };
  }, []);

  const fetchWithCSRF = React.useCallback(async (url: string, options: RequestInit = {}) => {
    if (loading || error) {
      throw new Error('CSRF token not ready');
    }

    if (!token) {
      throw new Error('CSRF token not available');
    }

    const headers = await addCsrfHeader(options.headers || {});
    
    return fetch(url, {
      ...options,
      headers,
    });
  }, [token, loading, error]);

  return { token, loading, error, fetchWithCSRF };
}
