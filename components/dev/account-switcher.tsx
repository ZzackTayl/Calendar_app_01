'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  User, 
  Shield, 
  Database, 
  RefreshCw, 
  Settings, 
  Eye, 
  EyeOff,
  UserCircle,
  Crown,
  Key,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Development account types for testing
interface DevAccount {
  id: string;
  name: string;
  email: string;
  type: 'admin' | 'user' | 'guest' | 'demo';
  permissions: string[];
  metadata: Record<string, any>;
  created_at: string;
}

// Pre-defined test accounts
const DEV_ACCOUNTS: DevAccount[] = [
  {
    id: 'admin-1',
    name: 'Admin User',
    email: 'admin@dev.local',
    type: 'admin',
    permissions: ['read', 'write', 'delete', 'admin', 'manage_users'],
    metadata: { role: 'administrator', department: 'IT' },
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'user-1', 
    name: 'Regular User',
    email: 'user@dev.local',
    type: 'user',
    permissions: ['read', 'write'],
    metadata: { role: 'member', department: 'Sales' },
    created_at: '2024-01-15T00:00:00Z'
  },
  {
    id: 'guest-1',
    name: 'Guest User',
    email: 'guest@dev.local', 
    type: 'guest',
    permissions: ['read'],
    metadata: { role: 'guest', temporary: true },
    created_at: '2024-02-01T00:00:00Z'
  },
  {
    id: 'demo-user',
    name: 'Demo User',
    email: 'demo@example.com',
    type: 'demo',
    permissions: ['read', 'write'],
    metadata: { role: 'demo', sample_data: true },
    created_at: '2024-01-01T00:00:00Z'
  }
];

interface AccountSwitcherProps {
  className?: string;
  onAccountChange?: (account: DevAccount) => void;
}

export const AccountSwitcher: React.FC<AccountSwitcherProps> = ({ 
  className,
  onAccountChange 
}) => {
  const { user, demoMode, enableDemoMode, signOut } = useAuth();
  const [selectedAccountId, setSelectedAccountId] = useState<string>(() => {
    // Initialize with current account
    if (demoMode) return 'demo-user';
    if (user) return `user-${user.id}`;
    return '';
  });
  const [isVisible, setIsVisible] = useState(() => {
    // Persist visibility in localStorage
    if (typeof window !== 'undefined') {
      return localStorage.getItem('dev-account-switcher-visible') !== 'false';
    }
    return true;
  });
  const [sessionPersistence, setSessionPersistence] = useState(true);

  // Get current account info
  const currentAccount = useMemo(() => {
    if (demoMode) return DEV_ACCOUNTS.find(acc => acc.id === 'demo-user');
    if (user) {
      return {
        id: user.id,
        name: user.user_metadata?.full_name || 'Current User',
        email: user.email || 'unknown@domain.com',
        type: 'user' as const,
        permissions: ['read', 'write'], // Could be enhanced with actual permissions
        metadata: user.user_metadata || {},
        created_at: user.created_at || new Date().toISOString()
      };
    }
    return null;
  }, [user, demoMode]);

  // Handle account switching
  const handleAccountSwitch = useCallback(async (accountId: string) => {
    try {
      const account = DEV_ACCOUNTS.find(acc => acc.id === accountId);
      if (!account) return;

      setSelectedAccountId(accountId);

      // Store current session if persistence is enabled
      if (sessionPersistence && typeof window !== 'undefined') {
        const sessionData = {
          previousUser: user,
          previousDemoMode: demoMode,
          timestamp: Date.now(),
          accountId
        };
        localStorage.setItem('dev-session-backup', JSON.stringify(sessionData));
      }

      // Switch to selected account
      if (account.type === 'demo' || account.id === 'demo-user') {
        enableDemoMode();
      } else {
        // For development, we'll simulate different user types
        // In production, this would involve actual authentication
        console.warn('[DEV MODE] Simulating account switch to:', account);
        
        // For now, we'll switch to demo mode with different metadata
        enableDemoMode();
      }

      // Notify parent component
      onAccountChange?.(account);

    } catch (error) {
      console.error('Account switching failed:', error);
    }
  }, [user, demoMode, sessionPersistence, enableDemoMode, onAccountChange]);

  // Toggle visibility and persist preference  
  const toggleVisibility = useCallback(() => {
    const newVisibility = !isVisible;
    setIsVisible(newVisibility);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dev-account-switcher-visible', String(newVisibility));
    }
  }, [isVisible]);

  // Restore previous session
  const restorePreviousSession = useCallback(async () => {
    try {
      if (typeof window !== 'undefined') {
        const sessionData = localStorage.getItem('dev-session-backup');
        if (sessionData) {
          const parsed = JSON.parse(sessionData);
          console.log('[DEV MODE] Restoring session:', parsed);
          
          // Clear the backup
          localStorage.removeItem('dev-session-backup');
          
          // Sign out to return to previous state
          await signOut();
        }
      }
    } catch (error) {
      console.error('Session restoration failed:', error);
    }
  }, [signOut]);

  // Get account type icon
  const getAccountIcon = (type: DevAccount['type']) => {
    switch (type) {
      case 'admin': return <Crown className="h-4 w-4" />;
      case 'user': return <User className="h-4 w-4" />;
      case 'guest': return <UserCircle className="h-4 w-4" />;
      case 'demo': return <Key className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  // Get account type color
  const getAccountTypeColor = (type: DevAccount['type']) => {
    switch (type) {
      case 'admin': return 'bg-red-500/10 text-red-700 border-red-200';
      case 'user': return 'bg-blue-500/10 text-blue-700 border-blue-200';
      case 'guest': return 'bg-gray-500/10 text-gray-700 border-gray-200';
      case 'demo': return 'bg-purple-500/10 text-purple-700 border-purple-200';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  // Don't render in production
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <Card className={cn(
      "fixed top-4 right-4 z-50 w-80 shadow-lg border-2 border-orange-200 bg-orange-50/95 backdrop-blur-sm",
      !isVisible && "w-auto",
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-600" />
            <CardTitle className="text-sm font-semibold text-orange-900">
              {isVisible ? 'Dev Account Switcher' : 'Dev'}
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleVisibility}
            className="h-6 w-6 p-0 text-orange-600 hover:bg-orange-100"
            aria-label={isVisible ? 'Hide account switcher' : 'Show account switcher'}
          >
            {isVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </Button>
        </div>
      </CardHeader>

      {isVisible && (
        <CardContent className="space-y-4">
          {/* Current Account Display */}
          {currentAccount && (
            <div className="p-3 rounded-lg bg-white/50 border">
              <div className="flex items-center gap-2 mb-2">
                <Database className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-gray-900">Current Account</span>
              </div>
              <div className="flex items-center gap-2">
                {getAccountIcon(currentAccount.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {currentAccount.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {currentAccount.email}
                  </p>
                </div>
                <Badge 
                  variant="secondary" 
                  className={cn("text-xs", getAccountTypeColor(currentAccount.type))}
                >
                  {currentAccount.type}
                </Badge>
              </div>
              
              {/* Permissions Display */}
              <div className="mt-2 flex flex-wrap gap-1">
                {currentAccount.permissions.map(permission => (
                  <Badge 
                    key={permission}
                    variant="outline" 
                    className="text-xs px-1 py-0"
                  >
                    {permission}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Account Selector */}
          <div className="space-y-2">
            <Label htmlFor="account-select" className="text-sm font-medium">
              Switch to Account
            </Label>
            <Select value={selectedAccountId} onValueChange={handleAccountSwitch}>
              <SelectTrigger id="account-select" className="w-full">
                <SelectValue placeholder="Select test account..." />
              </SelectTrigger>
              <SelectContent>
                {DEV_ACCOUNTS.map(account => (
                  <SelectItem key={account.id} value={account.id}>
                    <div className="flex items-center gap-2">
                      {getAccountIcon(account.type)}
                      <div className="flex-1">
                        <span className="font-medium">{account.name}</span>
                        <span className="text-xs text-gray-500 ml-2">
                          {account.email}
                        </span>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs ml-2", getAccountTypeColor(account.type))}
                      >
                        {account.type}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Session Persistence Toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="session-persistence" className="text-sm">
              Session Persistence
            </Label>
            <Switch 
              id="session-persistence"
              checked={sessionPersistence}
              onCheckedChange={setSessionPersistence}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={restorePreviousSession}
              className="flex-1"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Restore
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.location.reload()}
              className="flex-1"
            >
              <Settings className="h-3 w-3 mr-1" />
              Reset
            </Button>
          </div>

          {/* Development Warning */}
          <div className="flex items-center gap-2 p-2 rounded bg-yellow-50 border border-yellow-200">
            <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
            <p className="text-xs text-yellow-800">
              Development only - not visible in production
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default AccountSwitcher;