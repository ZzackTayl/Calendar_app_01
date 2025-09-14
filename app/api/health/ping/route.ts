import { NextResponse } from 'next/server'
import { createApiResponse, ErrorCode } from '@/lib/api/response-handler';
import { requireAuthentication } from '@/lib/auth/session-manager'
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const api = createApiResponse();

  return api.success({ status: 'ok', timestamp: new Date().toISOString() });
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
