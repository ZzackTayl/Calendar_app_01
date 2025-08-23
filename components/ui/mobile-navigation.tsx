'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  Calendar, 
  Users, 
  Plus, 
  Settings, 
  Home,
  Heart
} from 'lucide-react';

interface MobileNavigationProps {
  className?: string;
}

const navigationItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home,
  },
  {
    name: 'Calendar',
    href: '/calendar',
    icon: Calendar,
  },
  {
    name: 'Relationships',
    href: '/relationships',
    icon: Heart,
  },
  {
    name: 'Groups',
    href: '/groups',
    icon: Users,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
  },
];

export function MobileNavigation({ className }: MobileNavigationProps) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <nav className={cn(
      "fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border z-50",
      "sm:hidden", // Hide on desktop
      className
    )}>
      <div className="flex justify-around items-center py-2 px-4">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <button
              key={item.name}
              onClick={() => router.push(item.href)}
              className={cn(
                "flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200",
                "min-h-[44px] min-w-[44px] touch-manipulation",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
              aria-label={item.name}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">{item.name}</span>
            </button>
          );
        })}
        
        {/* Quick Add Button */}
        <button
          onClick={() => router.push('/events/create')}
          className={cn(
            "flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200",
            "min-h-[44px] min-w-[44px] touch-manipulation",
            "bg-primary text-primary-foreground hover:bg-primary/90",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
            "shadow-lg"
          )}
          aria-label="Create Event"
        >
          <Plus className="w-5 h-5 mb-1" />
          <span className="text-xs font-medium">Add</span>
        </button>
      </div>
    </nav>
  );
}

export default MobileNavigation;
