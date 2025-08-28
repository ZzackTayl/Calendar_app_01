'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from './skeleton';

// Dynamic import of ConflictResolver with loading skeleton
const ConflictResolver = dynamic(
  () => import('./conflict-resolver').then(mod => ({ 
    default: mod.ConflictResolver,
    ConflictResolution: mod.ConflictResolution 
  })),
  {
    loading: () => (
      <div className="space-y-4 p-4 border rounded-lg">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    ),
    ssr: false
  }
);

// Re-export types
export type { ConflictResolution } from './conflict-resolver';
export { ConflictResolver };