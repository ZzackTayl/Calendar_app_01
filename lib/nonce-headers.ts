import { headers } from 'next/headers'

export async function getNonceFromHeaders(): Promise<string> {
  const h = await headers()
  return h.get('x-nonce') || ''
}