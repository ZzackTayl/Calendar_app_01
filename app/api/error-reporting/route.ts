import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';

interface ErrorReport {
  error: string;
  stack?: string;
  componentStack?: string;
  errorId: string;
  timestamp: string;
  userAgent: string;
  url: string;
  userId?: string;
  errorType?: string;
  metadata?: Record<string, any>;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient();
    
    // Get user if authenticated
    const { data: { user } } = await supabase.auth.getUser();
    
    // Parse error report
    const errorReport: ErrorReport = await request.json();
    
    // Validate required fields
    if (!errorReport.error || !errorReport.errorId || !errorReport.timestamp) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Add user information if available
    const enrichedReport = {
      ...errorReport,
      userId: user?.id || null,
      userEmail: user?.email || null,
    };

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Report:', enrichedReport);
    }

    // Store error in database (if you have an errors table)
    try {
      const { error: dbError } = await supabase
        .from('error_logs')
        .insert({
          error_id: errorReport.errorId,
          error_message: errorReport.error,
          error_stack: errorReport.stack,
          component_stack: errorReport.componentStack,
          user_id: user?.id,
          user_agent: errorReport.userAgent,
          url: errorReport.url,
          error_type: errorReport.errorType,
          metadata: errorReport.metadata,
          created_at: new Date().toISOString(),
        });

      if (dbError) {
        console.error('Failed to store error in database:', dbError);
      }
    } catch (dbError) {
      // Silently fail if database storage fails
      console.warn('Error logging to database failed:', dbError);
    }

    // Send to external error reporting service (optional)
    if (process.env.ERROR_REPORTING_WEBHOOK_URL) {
      try {
        await fetch(process.env.ERROR_REPORTING_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(enrichedReport),
        });
      } catch (webhookError) {
        console.warn('Failed to send error to webhook:', webhookError);
      }
    }

    // Return success response
    return NextResponse.json({ 
      success: true, 
      errorId: errorReport.errorId,
      logged: true 
    });

  } catch (error) {
    console.error('Error in error reporting endpoint:', error);
    
    // Return error response
    return NextResponse.json(
      { error: 'Failed to process error report' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
