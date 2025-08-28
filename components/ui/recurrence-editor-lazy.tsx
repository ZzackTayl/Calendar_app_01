'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from './skeleton';

// Dynamic import of RecurrenceEditor with loading skeleton
const RecurrenceEditor = dynamic(
  () => import('./recurrence-editor').then(mod => ({ default: mod.RecurrenceEditor })),
  {
    loading: () => (
      <div className="space-y-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-8 w-2/3" />
      </div>
    ),
    ssr: false
  }
);

export { RecurrenceEditor };