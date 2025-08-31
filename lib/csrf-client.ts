'use client'

/**
 * Client-side CSRF token management
 * Handles fetching and caching CSRF tokens for API requests
 */

interface CSRFTokenResponse {
  csrf_token: string
  expires: number
}

class CSRFTokenManager {
  private token: string | null = null
  private expires: number = 0
  private fetchPromise: Promise<string> | null = null

  /**
   * Get a valid CSRF token, fetching if necessary
   */
  async getToken(): Promise<string> {
    // Return cached token if still valid (with 5 minute buffer)
    if (this.token && this.expires > Date.now() + 5 * 60 * 1000) {
      return this.token
    }

    // If already fetching, wait for existing request
    if (this.fetchPromise) {
      return this.fetchPromise
    }

    // Fetch new token
    this.fetchPromise = this.fetchNewToken()
    
    try {
      const token = await this.fetchPromise
      return token
    } finally {
      this.fetchPromise = null
    }
  }

  /**
   * Fetch a new CSRF token from the server
   */
  private async fetchNewToken(): Promise<string> {
    const response = await fetch('/api/auth/csrf-token', {
      method: 'GET',
      credentials: 'include',
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch CSRF token`)
    }

    const data: CSRFTokenResponse = await response.json()
    
    // Cache the token
    this.token = data.csrf_token
    this.expires = data.expires

    return this.token
  }

  /**
   * Clear cached token (useful when token becomes invalid)
   */
  clearToken(): void {
    this.token = null
    this.expires = 0
    this.fetchPromise = null
  }

  /**
   * Make an authenticated API request with CSRF token
   */
  async fetchWithCSRF(url: string, options: RequestInit = {}): Promise<Response> {
    const token = await this.getToken()

    const headers = new Headers(options.headers)
    headers.set('X-CSRF-Token', token)
    headers.set('Content-Type', 'application/json')

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    })

    // If we get a CSRF error, clear the token and retry once
    const headersObj = options.headers instanceof Headers ? 
      Object.fromEntries(options.headers.entries()) : 
      (options.headers as Record<string, string> || {});
    
    if (response.status === 403 && !headersObj['X-CSRF-Retry']) {
      const errorData = await response.json().catch(() => ({}))
      if (errorData.error?.includes('CSRF')) {
        this.clearToken()
        
        // Retry with fresh token
        const retryHeaders = new Headers(options.headers)
        retryHeaders.set('X-CSRF-Token', await this.getToken())
        retryHeaders.set('Content-Type', 'application/json')
        retryHeaders.set('X-CSRF-Retry', '1') // Prevent infinite retry
        
        return fetch(url, {
          ...options,
          headers: retryHeaders,
          credentials: 'include',
        })
      }
    }

    return response
  }
}

// Export singleton instance
export const csrfTokenManager = new CSRFTokenManager()

/**
 * Hook for using CSRF tokens in React components
 */
export function useCSRFToken() {
  return {
    getToken: () => csrfTokenManager.getToken(),
    fetchWithCSRF: (url: string, options?: RequestInit) => 
      csrfTokenManager.fetchWithCSRF(url, options),
    clearToken: () => csrfTokenManager.clearToken(),
  }
}