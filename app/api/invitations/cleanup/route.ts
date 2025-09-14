import { NextRequest } from 'next/server'
import { createApiResponse, ErrorCode } from '@/lib/api/response-handler';
import { requireAuthentication } from '@/lib/auth/session-manager'
import { validateCSRFProtection } from '@/lib/security/csrf'
import { cleanupExpiredInvites } from '@/lib/invitations/token-utils';
import { NextResponse } from 'next/server';

interface CleanupResponse {
  success: boolean;
  deletedCount?: number;
  message?: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    // For security, you might want to add authentication here
    // or call this from a cron job with a secret key
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
    
    if (authHeader !== expectedAuth) {
      return NextResponse.json<CleanupResponse>({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const result = await cleanupExpiredInvites();

    if (!result.success) {
      return NextResponse.json<CleanupResponse>({
        success: false,
        error: result.error || 'Cleanup failed'
      }, { status: 500 });
    }

    return NextResponse.json<CleanupResponse>({
      success: true,
      deletedCount: result.deletedCount,
      message: `Successfully cleaned up ${result.deletedCount || 0} expired invitation tokens`
    });

  } catch (error) {
    console.error('Error in cleanup endpoint:', error);
    return NextResponse.json<CleanupResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// Also allow GET for manual testing (remove in production)
export async function GET(request: NextRequest) {
  const api = createApiResponse();

  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return api.error(ErrorCode.FORBIDDEN);
  }

  try {
    const result = await cleanupExpiredInvites();
    return api.success({
      success: result.success,
      deletedCount: result.deletedCount,
      error: result.error
    });
  } catch (error) {
    console.error('Error in cleanup endpoint:', error);
    return api.error(ErrorCode.INTERNAL_ERROR);
  }
}