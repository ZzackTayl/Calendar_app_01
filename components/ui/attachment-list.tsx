'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Download, Trash2, Eye, File, Image, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { UploadedFile } from './file-uploader';

interface AttachmentListProps {
  attachments: UploadedFile[];
  onDelete?: (attachmentId: string) => void;
  onDownload?: (attachment: UploadedFile) => void;
  className?: string;
}

export function AttachmentList({ 
  attachments, 
  onDelete, 
  onDownload, 
  className 
}: AttachmentListProps) {
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);
  const [deleteFile, setDeleteFile] = useState<UploadedFile | null>(null);

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

  const getFileTypeLabel = (type: string): string => {
    if (type.startsWith('image/')) return 'Image';
    if (type === 'application/pdf') return 'PDF';
    if (type.includes('word')) return 'Document';
    if (type.includes('excel') || type.includes('spreadsheet')) return 'Spreadsheet';
    if (type === 'text/plain') return 'Text';
    if (type === 'text/csv') return 'CSV';
    return 'File';
  };

  const handleDownload = (attachment: UploadedFile) => {
    if (onDownload) {
      onDownload(attachment);
    } else {
      // Default download behavior
      const link = document.createElement('a');
      link.href = attachment.url;
      link.download = attachment.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDelete = (attachment: UploadedFile) => {
    setDeleteFile(attachment);
  };

  const confirmDelete = () => {
    if (deleteFile && onDelete) {
      onDelete(deleteFile.id);
    }
    setDeleteFile(null);
  };

  const canPreview = (type: string): boolean => {
    return type.startsWith('image/') || type === 'application/pdf';
  };

  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <div className="space-y-3">
        {attachments.map((attachment) => {
          const Icon = getFileIcon(attachment.type);
          const typeLabel = getFileTypeLabel(attachment.type);

          return (
            <Card key={attachment.id} className="group hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      <Icon className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{attachment.name}</p>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Badge variant="secondary" className="text-xs">
                          {typeLabel}
                        </Badge>
                        <span>{formatFileSize(attachment.size)}</span>
                        <span>•</span>
                        <span>
                          {attachment.uploadedAt.toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {canPreview(attachment.type) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPreviewFile(attachment)}
                        title="Preview file"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(attachment)}
                      title="Download file"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(attachment)}
                        title="Delete file"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* File Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{previewFile?.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreviewFile(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {previewFile && (
              <div className="space-y-4">
                {previewFile.type.startsWith('image/') ? (
                  <div className="flex justify-center">
                    <Image
                      src={previewFile.url}
                      alt={previewFile.name}
                      width={800}
                      height={600}
                      className="max-w-full max-h-[60vh] object-contain rounded-lg"
                    />
                  </div>
                ) : previewFile.type === 'application/pdf' ? (
                  <div className="w-full h-[60vh]">
                    <iframe
                      src={previewFile.url}
                      title={previewFile.name}
                      className="w-full h-full border rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <File className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Preview not available for this file type.
                    </p>
                    <Button
                      onClick={() => handleDownload(previewFile)}
                      className="mt-4"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download to view
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteFile} onOpenChange={() => setDeleteFile(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attachment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteFile?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
