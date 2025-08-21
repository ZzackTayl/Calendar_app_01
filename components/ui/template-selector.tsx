'use client';

import { useState, useEffect } from 'react';
import { Search, Clock, MapPin, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EventTemplateFormValues } from '@/lib/validation/enhanced-schemas';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';

interface TemplateSelectorProps {
  onTemplateSelect: (template: EventTemplateFormValues) => void;
  className?: string;
}

export function TemplateSelector({ onTemplateSelect, className }: TemplateSelectorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<EventTemplateFormValues[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<EventTemplateFormValues[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Fetch templates when dialog opens
  useEffect(() => {
    if (isOpen && user) {
      fetchTemplates();
    }
  }, [isOpen, user]);

  // Filter templates based on search
  useEffect(() => {
    if (searchTerm) {
      const filtered = templates.filter(template =>
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredTemplates(filtered);
    } else {
      setFilteredTemplates(templates);
    }
  }, [templates, searchTerm]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/templates');
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }
      const data = await response.json();
      setTemplates(data);
      setFilteredTemplates(data);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load templates. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (template: EventTemplateFormValues) => {
    onTemplateSelect(template);
    setIsOpen(false);
    setSearchTerm('');
    toast({
      title: 'Template Applied',
      description: `"${template.name}" template has been applied to your event.`,
    });
  };

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

  if (!user) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={className}>
          <Play className="w-4 h-4 mr-2" />
          Use Template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Select a Template</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Templates List */}
          <ScrollArea className="h-[400px]">
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader className="pb-3">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-3 bg-muted rounded w-full mb-2"></div>
                      <div className="h-3 bg-muted rounded w-2/3"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-muted-foreground mb-4">
                  {searchTerm ? (
                    <>
                      <p className="text-lg font-medium mb-2">No templates found</p>
                      <p>Try adjusting your search</p>
                    </>
                  ) : (
                    <>
                      <p className="text-lg font-medium mb-2">No templates yet</p>
                      <p>Create templates to speed up event creation</p>
                    </>
                  )}
                </div>
                {!searchTerm && (
                  <Button onClick={() => window.location.href = '/templates'}>
                    Create Templates
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTemplates.map((template) => (
                  <Card 
                    key={template.id} 
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg truncate mb-1">{template.name}</CardTitle>
                          <Badge variant={getPrivacyBadgeVariant(template.privacy_level)} className="text-xs">
                            {getPrivacyLabel(template.privacy_level)}
                          </Badge>
                        </div>
                        <Button size="sm" variant="ghost">
                          <Play className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {template.description || template.title}
                      </p>
                      
                      <div className="space-y-2">
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
                        className="w-full h-1 rounded-full mt-3"
                        style={{ backgroundColor: template.color || '#3b82f6' }}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
