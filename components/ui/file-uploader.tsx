'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, X, File, Image, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface FileUploaderProps {
  onFileSelect: (files: File[]) => void;
  onUploadComplete: (uploadedFiles: UploadedFile[]) => void;
  maxFiles?: number;
  maxFileSize?: number; // in bytes
  acceptedTypes?: string[];
  className?: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedAt: Date;
}

// Size limits will be passed as props based on user tier
const DEFAULT_MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB for free users
const ACCEPTED_TYPES = [
  'image/*',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];

export function FileUploader({ 
  onFileSelect, 
  onUploadComplete, 
  maxFiles = 10, 
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  acceptedTypes = ACCEPTED_TYPES,
  className 
}: FileUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize) {
      return `File "${file.name}" is too large. Maximum size is ${formatFileSize(maxFileSize)}.`;
    }

    // Check file type
    const isAccepted = acceptedTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.slice(0, -1));
      }
      return file.type === type;
    });

    if (!isAccepted) {
      return `File type "${file.type}" is not supported.`;
    }

    return null;
  }, [maxFileSize, acceptedTypes]);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const errors: string[] = [];
    const validFiles: File[] = [];

    // Validate files
    fileArray.forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      setErrors(errors);
      return;
    }

    if (validFiles.length === 0) {
      return;
    }

    // Check max files limit
    if (validFiles.length > maxFiles) {
      setErrors([`Maximum ${maxFiles} files allowed.`]);
      return;
    }

    setErrors([]);
    setUploading(true);

    try {
      const uploadedFiles: UploadedFile[] = [];
      
      for (const file of validFiles) {
        const fileId = `${Date.now()}-${Math.random()}`;
        setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));

        // Simulate upload progress
        const uploadedFile = await uploadFile(file, fileId, (progress) => {
          setUploadProgress(prev => ({ ...prev, [fileId]: progress }));
        });

        uploadedFiles.push(uploadedFile);
      }

      onUploadComplete(uploadedFiles);
      onFileSelect(validFiles);
    } catch (error) {
      console.error('Upload error:', error);
      setErrors(['Failed to upload files. Please try again.']);
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  }, [maxFiles, validateFile, onUploadComplete, onFileSelect]);

  const uploadFile = async (
    file: File, 
    fileId: string, 
    onProgress: (progress: number) => void
  ): Promise<UploadedFile> => {
    // Simulate upload with progress
    return new Promise((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 20;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          
          // Simulate successful upload
          const uploadedFile: UploadedFile = {
            id: fileId,
            name: file.name,
            type: file.type,
            size: file.size,
            url: URL.createObjectURL(file), // In real app, this would be the uploaded URL
            uploadedAt: new Date(),
          };
          
          resolve(uploadedFile);
        }
        onProgress(progress);
      }, 200);
    });
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return Image;
    if (type === 'application/pdf') return FileText;
    return File;
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Upload Area */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          isDragOver 
            ? 'border-primary bg-primary/5' 
            : 'border-muted-foreground/25 hover:border-muted-foreground/50',
          uploading && 'pointer-events-none opacity-50'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">
          {uploading ? 'Uploading files...' : 'Drop files here or click to upload'}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Supports images, PDFs, documents, and spreadsheets up to {formatFileSize(maxFileSize)}
        </p>
        <Button onClick={handleClick} disabled={uploading}>
          <Upload className="w-4 h-4 mr-2" />
          Choose Files
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
          aria-label="Choose files to upload"
          title="Choose files to upload"
        />
      </div>

      {/* Upload Progress */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium">Uploading files...</h4>
          {Object.entries(uploadProgress).map(([fileId, progress]) => (
            <div key={fileId} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>File {fileId}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          ))}
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
