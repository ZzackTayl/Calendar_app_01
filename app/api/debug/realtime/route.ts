import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase/client';
import { enhancedRealtimeManager } from '@/lib/supabase/enhanced-realtime-manager';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseClient();

    // Test basic database connection
    const { data: dbData, error: dbError } = await supabase
      .from('relationships')
      .select('count', { count: 'exact', head: true });

    // Get realtime manager stats
    const realtimeStats = enhancedRealtimeManager.getConnectionStats();

    // Test realtime subscription (temporary)
    let realtimeTestResult = null;
    try {
      const testChannel = supabase
        .channel('debug-test-' + Date.now())
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'relationships'
        }, () => {
          // This callback won't be called in this context, but subscription will be established
        })
        .subscribe((status: any) => {
          realtimeTestResult = {
            status,
            timestamp: new Date().toISOString()
          };

          // Clean up test subscription after 2 seconds
          setTimeout(() => {
            supabase.removeChannel(testChannel);
          }, 2000);
        });

      // Wait a moment for subscription to establish
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      realtimeTestResult = {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      database: {
        connected: !dbError,
        error: dbError?.message || null,
        count: dbData?.length || 0
      },
      realtime: {
        manager: realtimeStats,
        test: realtimeTestResult
      },
      environment: {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'missing',
        supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'configured' : 'missing'
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
