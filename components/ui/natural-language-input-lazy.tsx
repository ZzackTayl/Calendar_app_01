'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from './skeleton';

// Dynamic import of NaturalLanguageInput with loading skeleton
const NaturalLanguageInput = dynamic(
  () => import('./natural-language-input').then(mod => ({ default: mod.NaturalLanguageInput })),
  {
    loading: () => (
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-4 w-48" />
      </div>
    ),
    ssr: false
  }
);

export { NaturalLanguageInput };