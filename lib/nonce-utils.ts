import { headers } from 'next/headers';

export async function getNonceFromHeaders(): Promise<string> {
  try {
    // Only try to get headers in server-side context
    if (typeof window === 'undefined') {
      const headersList = await headers();
      return headersList.get('x-nonce') || '';
    }
    return '';
  } catch (error) {
    // Fallback for any header access issues
    console.warn('Failed to get nonce from headers:', error);
    return '';
  }
}