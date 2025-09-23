import { headers } from 'next/headers';

export async function getNonceFromHeaders(): Promise<string> {
  const headersList = await headers();
  return headersList.get('x-nonce') || '';
}