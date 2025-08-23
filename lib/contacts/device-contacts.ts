/**
 * Device Contacts Integration Library
 * Provides Web Contacts API integration with fallback strategies
 */

import { z } from 'zod';

// Contact validation schemas
export const DeviceContactSchema = z.object({
  id: z.string().optional(),
  name: z.array(z.string()).optional(),
  email: z.array(z.string().email()).optional(),
  tel: z.array(z.string()).optional(),
  icon: z.array(z.instanceof(Blob)).optional(),
  address: z.array(z.string()).optional(),
});

export const ProcessedContactSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  avatar: z.string().optional(),
  source: z.enum(['device', 'manual', 'existing']),
  metadata: z.record(z.any()).optional(),
});

export type DeviceContact = z.infer<typeof DeviceContactSchema>;
export type ProcessedContact = z.infer<typeof ProcessedContactSchema>;

// Contact selection options
export interface ContactSelectionOptions {
  properties: ('name' | 'email' | 'tel' | 'icon' | 'address')[];
  multiple: boolean;
}

// Default selection properties
export const DEFAULT_CONTACT_PROPERTIES: ContactSelectionOptions = {
  properties: ['name', 'email', 'tel', 'icon'],
  multiple: true,
};

/**
 * Contact API Support Detection
 */
export class ContactAPISupport {
  static isSupported(): boolean {
    try {
      return 'contacts' in navigator && 'ContactsManager' in window;
    } catch {
      return false;
    }
  }

  static async checkPermission(): Promise<PermissionState | 'unsupported'> {
    try {
      if (!this.isSupported()) return 'unsupported';
      
      const permission = await navigator.permissions?.query({ name: 'contacts' as any });
      return permission?.state || 'prompt';
    } catch {
      return 'prompt';
    }
  }

  static async requestPermission(): Promise<boolean> {
    try {
      const permission = await this.checkPermission();
      return permission === 'granted';
    } catch {
      return false;
    }
  }
}

/**
 * Device Contact Selection Service
 */
export class DeviceContactService {
  private static instance: DeviceContactService;
  private cachedContacts: Map<string, ProcessedContact[]> = new Map();
  private lastCacheTime: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static getInstance(): DeviceContactService {
    if (!DeviceContactService.instance) {
      DeviceContactService.instance = new DeviceContactService();
    }
    return DeviceContactService.instance;
  }

  /**
   * Select contacts from device with error handling
   */
  async selectContacts(options: Partial<ContactSelectionOptions> = {}): Promise<ProcessedContact[]> {
    try {
      if (!ContactAPISupport.isSupported()) {
        throw new DeviceContactError(
          'Contacts API not supported',
          'UNSUPPORTED_API',
          'Your browser does not support the Contacts API. Please use manual entry.'
        );
      }

      const selectionOptions = {
        ...DEFAULT_CONTACT_PROPERTIES,
        ...options,
      };

      // Check cache first
      const cacheKey = this.getCacheKey(selectionOptions);
      const cached = this.getCachedContacts(cacheKey);
      if (cached) {
        return cached;
      }

      // Request contacts from device
      const deviceContacts = await this.requestDeviceContacts(selectionOptions);
      const processed = await this.processContacts(deviceContacts);

      // Cache results
      this.cacheContacts(cacheKey, processed);

      return processed;
    } catch (error) {
      if (error instanceof DeviceContactError) {
        throw error;
      }
      
      // Handle specific error types
      if (error instanceof DOMException) {
        switch (error.name) {
          case 'NotAllowedError':
            throw new DeviceContactError(
              'Permission denied',
              'PERMISSION_DENIED',
              'Please allow access to contacts and try again.'
            );
          case 'NotSupportedError':
            throw new DeviceContactError(
              'Contacts API not supported',
              'UNSUPPORTED_API',
              'Your device or browser does not support contact selection.'
            );
          default:
            throw new DeviceContactError(
              'Contact selection failed',
              'SELECTION_FAILED',
              'An error occurred while selecting contacts. Please try again.'
            );
        }
      }

      throw new DeviceContactError(
        'Unknown error',
        'UNKNOWN_ERROR',
        'An unexpected error occurred. Please try manual entry instead.'
      );
    }
  }

  /**
   * Process raw device contacts into standardized format
   */
  private async processContacts(contacts: DeviceContact[]): Promise<ProcessedContact[]> {
    const processed: ProcessedContact[] = [];

    for (const contact of contacts) {
      try {
        const processedContact = await this.processContact(contact);
        if (processedContact) {
          processed.push(processedContact);
        }
      } catch (error) {
        console.warn('Failed to process contact:', error);
        // Continue processing other contacts
      }
    }

    return processed;
  }

  /**
   * Process a single device contact
   */
  private async processContact(contact: DeviceContact): Promise<ProcessedContact | null> {
    // Validate contact has required data
    const name = contact.name?.[0];
    if (!name?.trim()) {
      return null; // Skip contacts without names
    }

    // Extract contact information
    const email = contact.email?.[0];
    const phone = contact.tel?.[0];
    
    // Process avatar if available
    let avatar: string | undefined;
    if (contact.icon?.[0]) {
      try {
        avatar = await this.processContactIcon(contact.icon[0]);
      } catch (error) {
        console.warn('Failed to process contact icon:', error);
      }
    }

    // Create processed contact
    const processed: ProcessedContact = {
      id: this.generateContactId(contact),
      name: name.trim(),
      email: email && this.isValidEmail(email) ? email : undefined,
      phone: phone ? this.formatPhoneNumber(phone) : undefined,
      avatar,
      source: 'device' as const,
      metadata: {
        originalData: {
          nameCount: contact.name?.length || 0,
          emailCount: contact.email?.length || 0,
          phoneCount: contact.tel?.length || 0,
          hasIcon: !!contact.icon?.[0],
        },
        processedAt: new Date().toISOString(),
      },
    };

    // Validate the processed contact
    return ProcessedContactSchema.parse(processed);
  }

  /**
   * Request contacts from device using Web Contacts API
   */
  private async requestDeviceContacts(options: ContactSelectionOptions): Promise<DeviceContact[]> {
    const contacts = await (navigator as any).contacts.select(
      options.properties,
      { multiple: options.multiple }
    );

    return Array.isArray(contacts) ? contacts : [contacts];
  }

  /**
   * Process contact icon blob into usable URL
   */
  private async processContactIcon(blob: Blob): Promise<string> {
    // Validate blob type
    if (!blob.type.startsWith('image/')) {
      throw new Error('Invalid image type');
    }

    // Check file size (limit to 1MB)
    if (blob.size > 1024 * 1024) {
      throw new Error('Image too large');
    }

    // Create object URL
    return URL.createObjectURL(blob);
  }

  /**
   * Generate unique contact ID
   */
  private generateContactId(contact: DeviceContact): string {
    const name = contact.name?.[0] || '';
    const email = contact.email?.[0] || '';
    const phone = contact.tel?.[0] || '';
    
    // Create hash from contact data
    const data = `${name}-${email}-${phone}`;
    const hash = btoa(data).replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
    
    return `device-${hash}-${Date.now()}`;
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    try {
      z.string().email().parse(email);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Format phone number for consistency
   */
  private formatPhoneNumber(phone: string): string {
    // Remove non-numeric characters except + and -
    return phone.replace(/[^\d+\-\s()]/g, '').trim();
  }

  /**
   * Cache management
   */
  private getCacheKey(options: ContactSelectionOptions): string {
    return JSON.stringify(options);
  }

  private getCachedContacts(key: string): ProcessedContact[] | null {
    const now = Date.now();
    if (now - this.lastCacheTime > this.CACHE_DURATION) {
      this.cachedContacts.clear();
      return null;
    }

    return this.cachedContacts.get(key) || null;
  }

  private cacheContacts(key: string, contacts: ProcessedContact[]): void {
    this.cachedContacts.set(key, contacts);
    this.lastCacheTime = Date.now();
  }

  /**
   * Clear cache manually
   */
  clearCache(): void {
    this.cachedContacts.clear();
    this.lastCacheTime = 0;
  }
}

/**
 * Custom error class for device contact operations
 */
export class DeviceContactError extends Error {
  constructor(
    message: string,
    public code: string,
    public userMessage: string
  ) {
    super(message);
    this.name = 'DeviceContactError';
  }
}

/**
 * Contact import utilities
 */
export class ContactImportService {
  /**
   * Convert processed contacts to import format
   */
  static prepareForImport(contacts: ProcessedContact[]): any[] {
    return contacts.map(contact => ({
      name: contact.name,
      email: contact.email || null,
      phone: contact.phone || null,
      tags: ['imported', 'device-contact'],
      address: null,
      birthday: null,
      notes: `Imported from device contacts on ${new Date().toLocaleDateString()}`,
    }));
  }

  /**
   * Import contacts to backend
   */
  static async importContacts(contacts: ProcessedContact[]): Promise<{
    success: number;
    failed: number;
    contacts: any[];
  }> {
    const importData = this.prepareForImport(contacts);
    
    const response = await fetch('/api/contacts/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contacts: importData }),
    });

    if (!response.ok) {
      throw new Error('Failed to import contacts');
    }

    return response.json();
  }
}

/**
 * Privacy and permission utilities
 */
export class ContactPrivacyService {
  /**
   * Get privacy notice text
   */
  static getPrivacyNotice(): string {
    return `
Your privacy is important to us. When you grant access to your contacts:

• Contact information is only accessed when you explicitly select contacts
• No contact data is stored on our servers without your permission
• Contact data is used only to help you add attendees to your events
• You can revoke access at any time through your browser settings
• We follow industry-standard security practices to protect your data

Contact access is handled by your browser's secure Contacts API.
    `.trim();
  }

  /**
   * Check if permission explanation should be shown
   */
  static shouldShowPermissionExplanation(): boolean {
    const shown = localStorage.getItem('contacts-permission-explained');
    return !shown;
  }

  /**
   * Mark permission explanation as shown
   */
  static markPermissionExplanationShown(): void {
    localStorage.setItem('contacts-permission-explained', 'true');
  }

  /**
   * Get user-friendly error messages
   */
  static getErrorMessage(error: DeviceContactError): string {
    switch (error.code) {
      case 'PERMISSION_DENIED':
        return 'To add contacts from your device, please allow access when prompted and try again.';
      case 'UNSUPPORTED_API':
        return 'Your browser doesn\'t support device contact access. You can still add attendees manually.';
      case 'SELECTION_FAILED':
        return 'Unable to access contacts. Please try again or add attendees manually.';
      default:
        return 'Something went wrong. Please try adding attendees manually.';
    }
  }
}

// Export main service instance
export const deviceContactService = DeviceContactService.getInstance();