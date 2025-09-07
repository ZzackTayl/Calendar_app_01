'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Smartphone, 
  UserPlus, 
  Search, 
  Check, 
  X, 
  AlertTriangle, 
  Shield, 
  Users,
  Phone,
  Mail,
  User,
  Plus,
  Import,
  BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types for device contacts
interface DeviceContact {
  id?: string;
  name: string[];
  tel?: string[];
  email?: string[];
  icon?: Blob[];
  address?: string[];
}

interface ProcessedContact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  source: 'device' | 'manual' | 'existing';
}

interface ContactPickerProps {
  selectedContacts?: ProcessedContact[];
  onContactsChange?: (contacts: ProcessedContact[]) => void;
  maxContacts?: number;
  showExistingContacts?: boolean;
  existingContacts?: ProcessedContact[];
  placeholder?: string;
  className?: string;
  variant?: 'dialog' | 'inline';
}

// Web Contacts API detection and permission checking
const checkContactsAPISupport = (): boolean => {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') {
    return false;
  }
  return 'contacts' in navigator && 'ContactsManager' in window;
};

const requestContactsPermission = async (): Promise<boolean> => {
  try {
    if (!checkContactsAPISupport()) return false;
    
    // Check if permission is already granted
    const permission = typeof navigator !== 'undefined' ? await navigator.permissions?.query({ name: 'contacts' as any }) : undefined;
    if (permission?.state === 'granted') return true;
    
    // Request permission by attempting to select contacts
    return true; // Permission will be requested when user interacts
  } catch (error) {
    console.warn('Contacts permission check failed:', error);
    return false;
  }
};

const selectDeviceContacts = async (): Promise<DeviceContact[]> => {
  try {
    if (!checkContactsAPISupport()) {
      throw new Error('Contacts API not supported');
    }

    const contacts = await (navigator as any).contacts.select(
      ['name', 'email', 'tel', 'icon', 'address'],
      { multiple: true }
    );
    
    return contacts || [];
  } catch (error) {
    console.error('Error selecting device contacts:', error);
    throw error;
  }
};

// Process device contacts into standard format
const processDeviceContacts = async (contacts: DeviceContact[]): Promise<ProcessedContact[]> => {
  const processed: ProcessedContact[] = [];
  
  for (const contact of contacts) {
    const name = contact.name?.[0] || 'Unknown';
    const email = contact.email?.[0];
    const phone = contact.tel?.[0];
    
    // Create avatar URL from blob if available
    let avatar: string | undefined;
    if (contact.icon?.[0]) {
      try {
        avatar = URL.createObjectURL(contact.icon[0]);
      } catch (error) {
        console.warn('Failed to create avatar URL:', error);
      }
    }
    
    processed.push({
      id: `device-${Date.now()}-${Math.random()}`,
      name,
      email,
      phone,
      avatar,
      source: 'device'
    });
  }
  
  return processed;
};

// Generate initials for avatar fallback
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export function ContactPicker({
  selectedContacts = [],
  onContactsChange,
  maxContacts = 10,
  showExistingContacts = true,
  existingContacts = [],
  placeholder = "Add attendees...",
  className,
  variant = 'dialog'
}: ContactPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('device');
  const [deviceContacts, setDeviceContacts] = useState<ProcessedContact[]>([]);
  const [filteredDeviceContacts, setFilteredDeviceContacts] = useState<ProcessedContact[]>([]);
  const [filteredExistingContacts, setFilteredExistingContacts] = useState<ProcessedContact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingDeviceContacts, setIsLoadingDeviceContacts] = useState(false);
  const [contactsPermissionGranted, setContactsPermissionGranted] = useState(false);
  const [contactsApiSupported, setContactsApiSupported] = useState(false);
  const [manualContactName, setManualContactName] = useState('');
  const [manualContactEmail, setManualContactEmail] = useState('');
  const [manualContactPhone, setManualContactPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Manual contact form ref for auto-focus
  const manualNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check API support on mount
    const supported = checkContactsAPISupport();
    setContactsApiSupported(supported);
    
    if (supported) {
      requestContactsPermission().then(setContactsPermissionGranted);
    }
  }, []);

  useEffect(() => {
    // Filter device contacts based on search query
    const filtered = deviceContacts.filter(contact =>
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phone?.includes(searchQuery)
    );
    setFilteredDeviceContacts(filtered);
  }, [deviceContacts, searchQuery]);

  useEffect(() => {
    // Filter existing contacts based on search query
    const filtered = existingContacts.filter(contact =>
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phone?.includes(searchQuery)
    );
    setFilteredExistingContacts(filtered);
  }, [existingContacts, searchQuery]);

  const handleDeviceContactsAccess = async () => {
    setIsLoadingDeviceContacts(true);
    setError(null);
    
    try {
      const contacts = await selectDeviceContacts();
      const processed = await processDeviceContacts(contacts);
      setDeviceContacts(processed);
      setContactsPermissionGranted(true);
    } catch (error) {
      console.error('Failed to access device contacts:', error);
      setError('Failed to access device contacts. Please try manual entry.');
      setActiveTab('manual');
    } finally {
      setIsLoadingDeviceContacts(false);
    }
  };

  const handleContactSelect = (contact: ProcessedContact) => {
    if (selectedContacts.find(c => c.id === contact.id)) {
      // Remove contact
      const updated = selectedContacts.filter(c => c.id !== contact.id);
      onContactsChange?.(updated);
    } else {
      // Add contact (check max limit)
      if (selectedContacts.length < maxContacts) {
        const updated = [...selectedContacts, contact];
        onContactsChange?.(updated);
      }
    }
  };

  const handleManualContactAdd = () => {
    if (!manualContactName.trim()) return;
    
    const newContact: ProcessedContact = {
      id: `manual-${Date.now()}-${Math.random()}`,
      name: manualContactName.trim(),
      email: manualContactEmail.trim() || undefined,
      phone: manualContactPhone.trim() || undefined,
      source: 'manual'
    };
    
    const updated = [...selectedContacts, newContact];
    onContactsChange?.(updated);
    
    // Clear form
    setManualContactName('');
    setManualContactEmail('');
    setManualContactPhone('');
  };

  const handleRemoveContact = (contactId: string) => {
    const updated = selectedContacts.filter(c => c.id !== contactId);
    onContactsChange?.(updated);
  };

  const isContactSelected = (contactId: string) => {
    return selectedContacts.some(c => c.id === contactId);
  };

  const ContactCard = ({ contact }: { contact: ProcessedContact }) => (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        isContactSelected(contact.id) 
          ? "ring-2 ring-blue-500 bg-blue-50" 
          : "hover:bg-gray-50"
      )}
      onClick={() => handleContactSelect(contact)}
    >
      <CardContent className="p-4">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={contact.avatar} alt={contact.name} />
            <AvatarFallback className="bg-blue-100 text-blue-700">
              {getInitials(contact.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">{contact.name}</p>
            {contact.email && (
              <p className="text-sm text-gray-500 truncate flex items-center">
                <Mail className="w-3 h-3 mr-1" />
                {contact.email}
              </p>
            )}
            {contact.phone && (
              <p className="text-sm text-gray-500 truncate flex items-center">
                <Phone className="w-3 h-3 mr-1" />
                {contact.phone}
              </p>
            )}
          </div>
          <div className="flex items-center">
            {isContactSelected(contact.id) && (
              <div className="text-blue-600">
                <Check className="w-5 h-5" />
              </div>
            )}
            <Badge variant="outline" className="ml-2 text-xs">
              {contact.source}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const DeviceContactsTab = () => (
    <div className="space-y-4">
      {!contactsApiSupported ? (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-orange-700">
              <AlertTriangle className="w-5 h-5" />
              <div>
                <p className="font-medium">Device contacts not supported</p>
                <p className="text-sm">Your browser doesn&apos;t support the Contacts API. Please use manual entry.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : !contactsPermissionGranted && deviceContacts.length === 0 ? (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-6 text-center">
            <Smartphone className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h3 className="font-medium text-gray-900 mb-2">Access Your Contacts</h3>
            <p className="text-sm text-gray-600 mb-4">
              Import contacts from your device to quickly add attendees to your event.
            </p>
            <div className="flex items-center justify-center space-x-2 text-xs text-gray-500 mb-4">
              <Shield className="w-4 h-4" />
              <span>Your privacy is protected - contacts are only accessed when you give permission</span>
            </div>
            <Button 
              onClick={handleDeviceContactsAccess}
              disabled={isLoadingDeviceContacts}
              className="w-full"
            >
              {isLoadingDeviceContacts ? (
                <>Loading contacts...</>
              ) : (
                <>
                  <Import className="w-4 h-4 mr-2" />
                  Access Device Contacts
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 text-red-700">
                  <AlertTriangle className="w-5 h-5" />
                  <p className="text-sm">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}
          
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {filteredDeviceContacts.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">
                    {deviceContacts.length === 0 
                      ? "No contacts found. Try accessing your device contacts or add manually." 
                      : "No contacts match your search."
                    }
                  </p>
                  {deviceContacts.length === 0 && contactsApiSupported && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleDeviceContactsAccess}
                      className="mt-2"
                    >
                      <Import className="w-4 h-4 mr-2" />
                      Try Again
                    </Button>
                  )}
                </div>
              ) : (
                filteredDeviceContacts.map((contact) => (
                  <ContactCard key={contact.id} contact={contact} />
                ))
              )}
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  );

  const ExistingContactsTab = () => (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search existing contacts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>
      
      <ScrollArea className="h-64">
        <div className="space-y-2">
          {filteredExistingContacts.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                {existingContacts.length === 0 
                  ? "No existing contacts found. Add your first contact manually." 
                  : "No contacts match your search."
                }
              </p>
            </div>
          ) : (
            filteredExistingContacts.map((contact) => (
              <ContactCard key={contact.id} contact={contact} />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );

  const ManualEntryTab = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <UserPlus className="w-5 h-5 mr-2" />
            Add Contact Manually
          </CardTitle>
          <CardDescription>
            Enter contact details to add them to your event attendees.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <Input
              ref={manualNameRef}
              placeholder="Enter full name"
              value={manualContactName}
              onChange={(e) => setManualContactName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleManualContactAdd()}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email (optional)
            </label>
            <Input
              type="email"
              placeholder="email@example.com"
              value={manualContactEmail}
              onChange={(e) => setManualContactEmail(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleManualContactAdd()}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone (optional)
            </label>
            <Input
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={manualContactPhone}
              onChange={(e) => setManualContactPhone(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleManualContactAdd()}
            />
          </div>
          
          <Button 
            onClick={handleManualContactAdd}
            disabled={!manualContactName.trim()}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Contact
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const SelectedContactsList = () => (
    selectedContacts.length > 0 && (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-700">
            Selected Attendees ({selectedContacts.length}/{maxContacts})
          </h4>
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedContacts.map((contact) => (
            <Badge 
              key={contact.id} 
              variant="secondary" 
              className="flex items-center space-x-1 pr-1"
            >
              <Avatar className="w-5 h-5">
                <AvatarImage src={contact.avatar} alt={contact.name} />
                <AvatarFallback className="text-xs bg-gray-200">
                  {getInitials(contact.name)}
                </AvatarFallback>
              </Avatar>
              <span className="max-w-24 truncate">{contact.name}</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-4 w-4 p-0 hover:bg-red-100"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveContact(contact.id);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      </div>
    )
  );

  const ContactPickerContent = () => (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="device" disabled={!contactsApiSupported}>
            <Smartphone className="w-4 h-4 mr-2" />
            Device
          </TabsTrigger>
          {showExistingContacts && (
            <TabsTrigger value="existing">
              <Users className="w-4 h-4 mr-2" />
              Existing
            </TabsTrigger>
          )}
          <TabsTrigger value="manual">
            <User className="w-4 h-4 mr-2" />
            Manual
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="device" className="mt-4">
          <DeviceContactsTab />
        </TabsContent>
        
        {showExistingContacts && (
          <TabsContent value="existing" className="mt-4">
            <ExistingContactsTab />
          </TabsContent>
        )}
        
        <TabsContent value="manual" className="mt-4">
          <ManualEntryTab />
        </TabsContent>
      </Tabs>
      
      <SelectedContactsList />
    </div>
  );

  if (variant === 'inline') {
    return (
      <div className={cn("space-y-4", className)}>
        <ContactPickerContent />
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={cn("w-full justify-start", className)}>
          <Users className="w-4 h-4 mr-2" />
          {selectedContacts.length === 0 
            ? placeholder 
            : `${selectedContacts.length} attendee${selectedContacts.length === 1 ? '' : 's'} selected`
          }
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Attendees</DialogTitle>
          <DialogDescription>
            Select contacts from your device or add them manually to invite to your event.
          </DialogDescription>
        </DialogHeader>
        <ContactPickerContent />
      </DialogContent>
    </Dialog>
  );
}

export default ContactPicker;