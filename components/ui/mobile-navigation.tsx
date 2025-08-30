'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  Users, 
  Plus, 
  Settings, 
  Home,
  Heart,
  Sun,
  Moon,
  Monitor
} from 'lucide-react';

interface MobileNavigationProps {
  className?: string;
}

const navigationItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    shortcut: 'Alt/Cmd + H',
  },
  {
    name: 'Calendar',
    href: '/calendar',
    icon: Calendar,
    shortcut: 'Alt/Cmd + C',
  },
  {
    name: 'Relationships',
    href: '/relationships',
    icon: Heart,
    shortcut: 'Alt/Cmd + R',
  },
  {
    name: 'Groups',
    href: '/groups',
    icon: Users,
    shortcut: 'Alt/Cmd + G',
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    shortcut: 'Alt/Cmd + S',
  },
];

export function MobileNavigation({ className }: MobileNavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  const handleKeyDown = (event: React.KeyboardEvent, href: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      router.push(href);
    }
  };

  const toggleTheme = () => {
    if (theme === 'dark') {
      setTheme('light');
    } else if (theme === 'light') {
      setTheme('system');
    } else {
      setTheme('dark');
    }
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return Sun;
      case 'dark':
        return Moon;
      case 'system':
      default:
        return Monitor;
    }
  };

  const getThemeLabel = () => {
    switch (theme) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'system':
      default:
        return 'System';
    }
  };

  return (
    <nav 
      className={cn(
        "fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border z-50",
        "sm:hidden", // Hide on desktop
        className
      )}
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex justify-around items-center py-2 px-2">
        {/* First row - main navigation items (4 items) */}
        <div className="flex justify-around items-center flex-1">
          {navigationItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <button
                key={item.name}
                onClick={() => router.push(item.href)}
                onKeyDown={(e) => handleKeyDown(e, item.href)}
                className={cn(
                  "flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200",
                  "min-h-[44px] min-w-[44px] touch-manipulation",
                  "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
                aria-label={`${item.name}${item.shortcut ? ` (${item.shortcut})` : ''}`}
                aria-current={isActive ? 'page' : undefined}
                title={`${item.name}${item.shortcut ? ` - ${item.shortcut}` : ''}`}
              >
                <Icon className="w-5 h-5 mb-1" aria-hidden="true" />
                <span className="text-xs font-medium">{item.name}</span>
              </button>
            );
          })}
        </div>
        
        {/* Second section - Settings and theme toggle */}
        <div className="flex items-center space-x-1">
          {navigationItems.slice(4).map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <button
                key={item.name}
                onClick={() => router.push(item.href)}
                onKeyDown={(e) => handleKeyDown(e, item.href)}
                className={cn(
                  "flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200",
                  "min-h-[44px] min-w-[44px] touch-manipulation",
                  "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
                aria-label={`${item.name}${item.shortcut ? ` (${item.shortcut})` : ''}`}
                aria-current={isActive ? 'page' : undefined}
                title={`${item.name}${item.shortcut ? ` - ${item.shortcut}` : ''}`}
              >
                <Icon className="w-5 h-5 mb-1" aria-hidden="true" />
                <span className="text-xs font-medium">{item.name}</span>
              </button>
            );
          })}
          
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={cn(
              "flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200",
              "min-h-[44px] min-w-[44px] touch-manipulation",
              "text-muted-foreground hover:text-foreground hover:bg-accent/50",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            )}
            aria-label={`Switch to next theme (current: ${getThemeLabel()})`}
            title={`Theme: ${getThemeLabel()} - tap to change`}
          >
            {React.createElement(getThemeIcon(), { 
              className: "w-5 h-5 mb-1", 
              "aria-hidden": "true" 
            })}
            <span className="text-xs font-medium">{getThemeLabel()}</span>
          </button>
        </div>
        
        {/* Quick Add Button */}
        <button
          onClick={() => router.push('/events/create')}
          onKeyDown={(e) => handleKeyDown(e, '/events/create')}
          className={cn(
            "flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200",
            "min-h-[44px] min-w-[44px] touch-manipulation",
            "bg-primary text-primary-foreground hover:bg-primary/90",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
            "shadow-lg ml-2"
          )}
          aria-label="Create Event (Alt/Cmd + N)"
          title="Create Event - Alt/Cmd + N"
        >
          <Plus className="w-5 h-5 mb-1" aria-hidden="true" />
          <span className="text-xs font-medium">Add</span>
        </button>
      </div>
    </nav>
  );
}

export default MobileNavigation;
