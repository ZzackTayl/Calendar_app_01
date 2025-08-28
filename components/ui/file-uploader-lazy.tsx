'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from './skeleton';

// Dynamic import of FileUploader with loading skeleton
const FileUploader = dynamic(
  () => import('./file-uploader').then(mod => ({ 
    default: mod.FileUploader,
    UploadedFile: mod.UploadedFile 
  })),
  {
    loading: () => (
      <div className="space-y-4 border-2 border-dashed border-gray-300 rounded-lg p-6">
        <Skeleton className="h-8 w-8 mx-auto" />
        <Skeleton className="h-4 w-48 mx-auto" />
        <Skeleton className="h-8 w-32 mx-auto" />
      </div>
    ),
    ssr: false
  }
);

// Re-export types
export type { UploadedFile } from './file-uploader';
export { FileUploader };