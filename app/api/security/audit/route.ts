import { NextRequest } from 'next/server'
import { createApiResponse, ErrorCode } from '@/lib/api/response-handler';
import { requireAuthentication } from '@/lib/auth/session-manager'
import { validateCSRFProtection } from '@/lib/security/csrf'
import { auditLogger } from '@/lib/security/audit-logger';
import { NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const api = createApiResponse();

  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'events';
    const category = searchParams.get('category');
    const userId = searchParams.get('userId');
    const outcome = searchParams.get('outcome');
    const limit = parseInt(searchParams.get('limit') || '100');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    switch (action) {
      case 'events':
        let events;
        
        if (startDate && endDate) {
          events = auditLogger.getAuditEventsInRange(
            new Date(startDate),
            new Date(endDate)
          );
        } else if (category) {
          events = auditLogger.getAuditEventsByCategory(category as any, limit);
        } else if (userId) {
          events = auditLogger.getUserAuditTrail(userId, limit);
        } else {
          // Get recent events from all categories
          const allCategories = [
            'authentication',
            'authorization', 
            'session_management',
            'user_management',
            'security_event',
            'data_access',
            'configuration_change'
          ];
          
          events = [];
          for (const cat of allCategories) {
            const categoryEvents = auditLogger.getAuditEventsByCategory(cat as any, Math.ceil(limit / allCategories.length));
            events.push(...categoryEvents);
          }
          
          // Sort by timestamp and limit
          events = events
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, limit);
        }

        // Apply additional filters
        if (outcome && outcome !== 'all') {
          events = events.filter(event => event.outcome === outcome);
        }

        return api.success({ success: true, data: events });

      case 'user-trail':
        if (!userId) {
          return api.success(
            { success: false, error: 'User ID required for user trail' },
            { status: 400 }
          );
        }
        
        const userTrail = auditLogger.getUserAuditTrail(userId, limit);
        return api.success({ success: true, data: userTrail });

      case 'report':
        if (!startDate || !endDate) {
          return api.success(
            { success: false, error: 'Start date and end date required for report' },
            { status: 400 }
          );
        }

        const reportOptions: any = {
          startDate: new Date(startDate),
          endDate: new Date(endDate)
        };

        if (category && category !== 'all') {
          reportOptions.categories = [category];
        }

        if (userId) {
          reportOptions.userId = userId;
        }

        if (outcome === 'success') {
          reportOptions.includeFailures = false;
        }

        const report = auditLogger.generateAuditReport(reportOptions);
        return api.success({ success: true, data: report });

      case 'stats':
        // Generate basic statistics
        const now = new Date();
        const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const stats = {
          last24Hours: auditLogger.generateAuditReport({
            startDate: last24Hours,
            endDate: now
          }).summary,
          last7Days: auditLogger.generateAuditReport({
            startDate: last7Days,
            endDate: now
          }).summary
        };

        return api.success({ success: true, data: stats });

      default:
        return api.success(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[AUDIT-API] Error in audit endpoint:', error);
    return api.success(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const api = createApiResponse();

  try {
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'log-event':
        const event = auditLogger.logAuditEvent(
          data.category,
          data.action,
          data.outcome,
          data.details || {},
          data.context || {}
        );
        return api.success({ success: true, data: event });

      case 'log-auth-attempt':
        const authEvent = auditLogger.logAuthenticationAttempt(data);
        return api.success({ success: true, data: authEvent });

      case 'log-session-creation':
        const sessionEvent = auditLogger.logSessionCreation(data);
        return api.success({ success: true, data: sessionEvent });

      case 'log-user-change':
        const userEvent = auditLogger.logUserAccountChange(data);
        return api.success({ success: true, data: userEvent });

      default:
        return api.success(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[AUDIT-API] Error in audit POST endpoint:', error);
    return api.success(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}