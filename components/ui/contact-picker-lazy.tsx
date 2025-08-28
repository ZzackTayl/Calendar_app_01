'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from './skeleton';

// Dynamic import of ContactPicker with loading skeleton
const ContactPicker = dynamic(
  () => import('./contact-picker').then(mod => ({ default: mod.ContactPicker })),
  {
    loading: () => (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    ),
    ssr: false
  }
);

export { ContactPicker };