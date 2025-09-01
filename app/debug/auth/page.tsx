'use client';

import { AuthStatus } from '@/components/debug/auth-status';

export default function AuthDebugPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Authentication Debug</h1>
          <p className="text-gray-300">Check your current authentication state and clear demo mode</p>
        </div>
        
        <div className="flex justify-center">
          <AuthStatus />
        </div>
        
        <div className="text-center">
          <p className="text-sm text-gray-400">
            Visit <code>/debug/auth</code> anytime to check your auth status
          </p>
        </div>
      </div>
    </div>
  );
}
