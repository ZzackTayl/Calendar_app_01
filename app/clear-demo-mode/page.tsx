'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle } from 'lucide-react';

export default function ClearDemoModePage() {
  const [status, setStatus] = useState<'checking' | 'demo-enabled' | 'demo-disabled' | 'cleared'>('checking');
  const [isClearing, setIsClearing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if demo mode is enabled
    const demoEnabled = localStorage.getItem('ph_demo_enabled') === '1';
    setStatus(demoEnabled ? 'demo-enabled' : 'demo-disabled');
  }, []);

  const clearDemoMode = () => {
    setIsClearing(true);
    
    // Clear all demo-related localStorage items
    localStorage.removeItem('ph_demo_enabled');
    localStorage.removeItem('ph_demo_version');
    localStorage.removeItem('ph_demo_events');
    localStorage.removeItem('ph_demo_relationships');
    localStorage.removeItem('ph_demo_contacts');
    localStorage.removeItem('ph_demo_groups');
    
    setStatus('cleared');
    setIsClearing(false);
    
    // Redirect to sign in after a short delay
    setTimeout(() => {
      router.push('/auth/signin');
    }, 2000);
  };

  const goToSignIn = () => {
    router.push('/auth/signin');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status === 'demo-enabled' && <AlertTriangle className="h-5 w-5 text-orange-500" />}
            {status === 'demo-disabled' && <CheckCircle className="h-5 w-5 text-green-500" />}
            {status === 'cleared' && <CheckCircle className="h-5 w-5 text-green-500" />}
            Demo Mode Status
          </CardTitle>
          <CardDescription>
            {status === 'checking' && 'Checking demo mode status...'}
            {status === 'demo-enabled' && 'Demo mode is currently enabled'}
            {status === 'demo-disabled' && 'Demo mode is not enabled'}
            {status === 'cleared' && 'Demo mode has been cleared successfully'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {status === 'demo-enabled' && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
                             <AlertDescription>
                 Demo mode is currently enabled, which means you&apos;re using a fake user account. 
                 To use the real application, you need to clear demo mode and sign in with your actual account.
               </AlertDescription>
            </Alert>
          )}
          
          {status === 'demo-disabled' && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Demo mode is not enabled. You should be able to sign in normally.
              </AlertDescription>
            </Alert>
          )}
          
          {status === 'cleared' && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Demo mode has been cleared successfully! You will be redirected to the sign-in page.
              </AlertDescription>
            </Alert>
          )}
          
          <div className="flex flex-col gap-2">
            {status === 'demo-enabled' && (
              <Button 
                onClick={clearDemoMode} 
                disabled={isClearing}
                className="w-full"
              >
                {isClearing ? 'Clearing...' : 'Clear Demo Mode'}
              </Button>
            )}
            
            {status === 'demo-disabled' && (
              <Button onClick={goToSignIn} className="w-full">
                Go to Sign In
              </Button>
            )}
            
            <Button 
              variant="outline" 
              onClick={() => router.push('/')}
              className="w-full"
            >
              Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
