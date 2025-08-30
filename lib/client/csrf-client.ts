'use client';

/**
 * Client-side CSRF token management
 * This handles fetching and including CSRF tokens in client requests
 */

interface CSRFTokenResponse {
  csrf_token: string;
  expires: number;
}

class CSRFTokenManager {
  private token: string | null = null;
  private expires: number = 0;
  private fetchPromise: Promise<string> | null = null;

  /**
   * Get a valid CSRF token, fetching a new one if needed
   */
  async getToken(): Promise<string> {
    // Return cached token if still valid (with 5 minute buffer)
    if (this.token && Date.now() < (this.expires - 5 * 60 * 1000)) {
      return this.token;
    }

    // If we're already fetching a token, return that promise
    if (this.fetchPromise) {
      return this.fetchPromise;
    }

    // Fetch a new token
    this.fetchPromise = this.fetchNewToken();
    
    try {
      const token = await this.fetchPromise;
      return token;
    } finally {
      this.fetchPromise = null;
    }
  }

  /**
   * Fetch a new CSRF token from the server
   */
  private async fetchNewToken(): Promise<string> {
    try {
      const response = await fetch('/api/auth/csrf-token', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch CSRF token: ${response.status} ${response.statusText}`);
      }

      const data: CSRFTokenResponse = await response.json();
      
      if (!data.csrf_token || !data.expires) {
        throw new Error('Invalid CSRF token response format');
      }

      // Cache the token
      this.token = data.csrf_token;
      this.expires = data.expires;

      return this.token;
    } catch (error) {
      console.error('Error fetching CSRF token:', error);
      throw error;
    }
  }

  /**
   * Clear cached token (force refresh on next request)
   */
  clearToken(): void {
    this.token = null;
    this.expires = 0;
  }

  /**
   * Check if we have a valid cached token
   */
  hasValidToken(): boolean {
    return this.token !== null && Date.now() < (this.expires - 5 * 60 * 1000);
  }
}

// Global instance
const csrfManager = new CSRFTokenManager();

/**
 * Get CSRF token for including in requests
 */
export async function getCSRFToken(): Promise<string> {
  return csrfManager.getToken();
}

/**
 * Create headers object with CSRF token
 */
export async function getCSRFHeaders(): Promise<HeadersInit> {
  const token = await getCSRFToken();
  return {
    'X-CSRF-Token': token
  };
}

/**
 * Enhanced fetch function that automatically includes CSRF token
 */
export async function fetchWithCSRF(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const method = options.method || 'GET';
  
  // Only add CSRF token for state-changing operations
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase())) {
    const csrfHeaders = await getCSRFHeaders();
    
    options.headers = {
      ...options.headers,
      ...csrfHeaders
    };
  }

  // Ensure credentials are included
  options.credentials = options.credentials || 'include';

  const response = await fetch(url, options);

  // If we get a 403 CSRF error, clear the token and retry once
  if (response.status === 403) {
    const responseText = await response.text();
    
    if (responseText.includes('CSRF') || responseText.includes('csrf')) {
      console.warn('CSRF token invalid, retrying with fresh token');
      csrfManager.clearToken();
      
      // Retry once with fresh token
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase())) {
        const freshCsrfHeaders = await getCSRFHeaders();
        options.headers = {
          ...options.headers,
          ...freshCsrfHeaders
        };
        
        return fetch(url, options);
      }
    }
  }

  return response;
}

/**
 * Clear CSRF token cache (useful for logout or token errors)
 */
export function clearCSRFToken(): void {
  csrfManager.clearToken();
}

/**
 * Check if CSRF token is cached and valid
 */
export function hasValidCSRFToken(): boolean {
  return csrfManager.hasValidToken();
}