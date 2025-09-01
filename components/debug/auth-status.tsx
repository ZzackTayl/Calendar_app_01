'use client';

import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function AuthStatus() {
  const { user, loading, demoMode, enableDemoMode, disableDemoMode, signOut } = useAuth();

  if (loading) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="p-4">
          <p>Loading auth status...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Auth Status
          {demoMode && <Badge variant="secondary">DEMO MODE</Badge>}
          {user && user.email_confirmed_at && <Badge variant="default">VERIFIED</Badge>}
          {user && !user.email_confirmed_at && <Badge variant="destructive">UNVERIFIED</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p><strong>User:</strong> {user?.email || 'Not signed in'}</p>
          <p><strong>Demo Mode:</strong> {demoMode ? 'YES' : 'NO'}</p>
          <p><strong>Email Verified:</strong> {user?.email_confirmed_at ? 'YES' : 'NO'}</p>
          <p><strong>User ID:</strong> {user?.id || 'None'}</p>
        </div>
        
        <div className="space-y-2">
          <h4 className="font-semibold">localStorage:</h4>
          <p className="text-sm">
            <strong>ph_demo_enabled:</strong> {typeof window !== 'undefined' ? localStorage.getItem('ph_demo_enabled') || 'null' : 'N/A'}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {demoMode ? (
            <Button onClick={disableDemoMode} variant="destructive">
              Disable Demo Mode
            </Button>
          ) : (
            <Button onClick={enableDemoMode} variant="outline">
              Enable Demo Mode
            </Button>
          )}
          
          {user && (
            <Button onClick={signOut} variant="outline">
              Sign Out
            </Button>
          )}
          
          <Button 
            onClick={() => window.location.reload()} 
            variant="ghost"
            size="sm"
          >
            Reload Page
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
