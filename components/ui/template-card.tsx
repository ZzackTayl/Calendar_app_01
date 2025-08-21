'use client';

import { useState } from 'react';
import { Clock, MapPin, Edit, Trash2, Play, MoreVertical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { EventTemplateFormValues } from '@/lib/validation/enhanced-schemas';

interface TemplateCardProps {
  template: EventTemplateFormValues;
  viewMode: 'grid' | 'list';
  onEdit: () => void;
  onDelete: () => void;
  onUse: () => void;
}

export function TemplateCard({ template, viewMode, onEdit, onDelete, onUse }: TemplateCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${remainingMinutes}m`;
  };

  const getPrivacyBadgeVariant = (privacy: string) => {
    switch (privacy) {
      case 'public':
        return 'default';
      case 'private':
        return 'secondary';
      case 'custom':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getPrivacyLabel = (privacy: string) => {
    switch (privacy) {
      case 'public':
        return 'Public';
      case 'private':
        return 'Private';
      case 'custom':
        return 'Custom';
      default:
        return 'Private';
    }
  };

  if (viewMode === 'list') {
    return (
      <>
        <Card className="flex items-center justify-between p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center space-x-4 flex-1">
            <div 
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: template.color || '#3b82f6' }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <CardTitle className="text-lg truncate">{template.name}</CardTitle>
                <Badge variant={getPrivacyBadgeVariant(template.privacy_level)}>
                  {getPrivacyLabel(template.privacy_level)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{template.title}</p>
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>{formatDuration(template.duration)}</span>
                </div>
                {template.location && (
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate">{template.location}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button size="sm" onClick={onUse}>
              <Play className="w-4 h-4 mr-1" />
              Use
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </Card>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Template</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{template.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // Grid view
  return (
    <>
      <Card className="hover:shadow-md transition-shadow group">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate mb-1">{template.name}</CardTitle>
              <Badge variant={getPrivacyBadgeVariant(template.privacy_level)} className="text-xs">
                {getPrivacyLabel(template.privacy_level)}
              </Badge>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {template.description || template.title}
          </p>
          
          <div className="space-y-2 mb-4">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{formatDuration(template.duration)}</span>
            </div>
            {template.location && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span className="truncate">{template.location}</span>
              </div>
            )}
          </div>

          <div 
            className="w-full h-2 rounded-full mb-4"
            style={{ backgroundColor: template.color || '#3b82f6' }}
          />

          <Button 
            onClick={onUse} 
            className="w-full"
            size="sm"
          >
            <Play className="w-4 h-4 mr-2" />
            Use Template
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{template.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
