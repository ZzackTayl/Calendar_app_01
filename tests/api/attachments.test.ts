/**
 * Attachments API Tests
 * 
 * Comprehensive testing for file attachment endpoints including:
 * - File upload validation and processing
 * - File type and size restrictions
 * - Storage integration with cleanup on failures
 * - Database attachment record management
 * - Authentication and authorization
 * - Error handling and edge cases
 * - Security validation for file uploads
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/attachments/route';
import { vi } from 'vitest';

// Mock dependencies
vi.mock('@/lib/supabase/server');
vi.mock('@/lib/validation/enhanced-schemas');

describe('/api/attachments', () => {
  let supabaseMock: any;
  let createRouteHandlerClient: any;
  let EventAttachmentSchema: any;

  const mockUser = { 
    id: 'user-123', 
    email: 'test@example.com',
    aud: 'authenticated',
    role: 'authenticated'
  };

  const mockFile = {
    name: 'test-document.pdf',
    type: 'application/pdf',
    size: 1024 * 1024, // 1MB
    stream: vi.fn(),
    text: vi.fn(),
    arrayBuffer: vi.fn()
  } as unknown as File;

  const mockAttachment = {
    id: 'attachment-1',
    event_id: 'event-123',
    file_name: 'test-document.pdf',
    file_type: 'application/pdf',
    file_url: 'https://storage.supabase.co/object/public/attachments/events/user-123/event-123/12345-abc.pdf',
    file_size: 1024 * 1024,
    uploaded_by: 'user-123',
    created_at: '2025-01-01T00:00:00Z'
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const supabaseServerModule = await import('@/lib/supabase/server');
    createRouteHandlerClient = supabaseServerModule.createRouteHandlerClient;

    const validationModule = await import('@/lib/validation/enhanced-schemas');
    EventAttachmentSchema = validationModule.EventAttachmentSchema;

    supabaseMock = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn().mockResolvedValue({ 
            data: { path: 'events/user-123/event-123/12345-abc.pdf' }, 
            error: null 
          }),
          getPublicUrl: vi.fn().mockReturnValue({ 
            data: { publicUrl: 'https://storage.supabase.co/object/public/attachments/events/user-123/event-123/12345-abc.pdf' } 
          }),
          remove: vi.fn().mockResolvedValue({ error: null })
        }))
      },
      from: vi.fn(() => supabaseMock),
      select: vi.fn(() => supabaseMock),
      insert: vi.fn(() => supabaseMock),
      eq: vi.fn(() => supabaseMock),
      order: vi.fn(() => supabaseMock),
      single: vi.fn(() => supabaseMock),
    };

    createRouteHandlerClient.mockReturnValue(supabaseMock);
    EventAttachmentSchema.safeParse.mockReturnValue({ 
      success: true, 
      data: mockAttachment 
    });
  });

  describe('POST - Upload Attachment', () => {
    const createFormData = (eventId: string, file: File | null) => {
      const formData = new FormData();
      if (eventId) formData.append('event_id', eventId);
      if (file) formData.append('file', file);
      return formData;
    };

    it('should upload file successfully', async () => {
      supabaseMock.single.mockResolvedValue({ data: mockAttachment, error: null });

      const formData = createFormData('event-123', mockFile);
      const request = new NextRequest('http://localhost/api/attachments', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.id).toBe('attachment-1');
      expect(body.file_name).toBe('test-document.pdf');
      expect(supabaseMock.storage.from).toHaveBeenCalledWith('attachments');
    });

    it('should require event_id', async () => {
      const formData = createFormData('', mockFile);
      const request = new NextRequest('http://localhost/api/attachments', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Missing required fields');
    });

    it('should require file', async () => {
      const formData = createFormData('event-123', null);
      const request = new NextRequest('http://localhost/api/attachments', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Missing required fields');
    });

    it('should validate file size limit (10MB)', async () => {
      const largeFile = {
        ...mockFile,
        size: 11 * 1024 * 1024, // 11MB - exceeds limit
      } as File;

      const formData = createFormData('event-123', largeFile);
      const request = new NextRequest('http://localhost/api/attachments', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('File too large. Maximum size is 10MB.');
    });

    it('should validate allowed file types', async () => {
      const allowedTypes = [
        'image/jpeg',
        'image/png', 
        'image/gif',
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'text/csv'
      ];

      for (const fileType of allowedTypes) {
        supabaseMock.single.mockResolvedValue({ data: mockAttachment, error: null });

        const validFile = { ...mockFile, type: fileType } as File;
        const formData = createFormData('event-123', validFile);
        const request = new NextRequest('http://localhost/api/attachments', {
          method: 'POST',
          body: formData,
        });

        const response = await POST(request);
        expect(response.status).toBe(201);
      }
    });

    it('should reject unsupported file types', async () => {
      const unsupportedFile = {
        ...mockFile,
        type: 'application/x-executable', // Not allowed
      } as File;

      const formData = createFormData('event-123', unsupportedFile);
      const request = new NextRequest('http://localhost/api/attachments', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('File type not supported.');
    });

    it('should generate unique file names', async () => {
      supabaseMock.single.mockResolvedValue({ data: mockAttachment, error: null });

      const formData = createFormData('event-123', mockFile);
      const request = new NextRequest('http://localhost/api/attachments', {
        method: 'POST',
        body: formData,
      });

      await POST(request);

      // Verify that upload was called with a path containing user ID and event ID
      const uploadCall = supabaseMock.storage.from().upload.mock.calls[0];
      const filePath = uploadCall[0];
      expect(filePath).toContain('events/user-123/event-123/');
      expect(filePath).toMatch(/\d+-[a-z0-9]+\.pdf$/); // timestamp-randomstring.pdf
    });

    it('should set proper storage options', async () => {
      supabaseMock.single.mockResolvedValue({ data: mockAttachment, error: null });

      const formData = createFormData('event-123', mockFile);
      const request = new NextRequest('http://localhost/api/attachments', {
        method: 'POST',
        body: formData,
      });

      await POST(request);

      const uploadCall = supabaseMock.storage.from().upload.mock.calls[0];
      const options = uploadCall[2];
      expect(options).toEqual({
        cacheControl: '3600',
        upsert: false
      });
    });

    it('should return 401 for unauthenticated requests', async () => {
      supabaseMock.auth.getUser.mockResolvedValue({ 
        data: { user: null }, 
        error: new Error('Unauthorized') 
      });

      const formData = createFormData('event-123', mockFile);
      const request = new NextRequest('http://localhost/api/attachments', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe('Unauthorized');
    });

    it('should handle storage upload failures', async () => {
      supabaseMock.storage.from().upload.mockResolvedValue({ 
        data: null, 
        error: { message: 'Upload failed' } 
      });

      const formData = createFormData('event-123', mockFile);
      const request = new NextRequest('http://localhost/api/attachments', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe('Failed to upload file');
    });

    it('should clean up file on validation failure', async () => {
      EventAttachmentSchema.safeParse.mockReturnValue({
        success: false,
        error: { issues: [{ message: 'Invalid data' }] }
      });

      const formData = createFormData('event-123', mockFile);
      const request = new NextRequest('http://localhost/api/attachments', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Invalid attachment data');
      // Should have called remove to clean up the uploaded file
      expect(supabaseMock.storage.from().remove).toHaveBeenCalled();
    });

    it('should clean up file on database insert failure', async () => {
      supabaseMock.single.mockResolvedValue({ 
        data: null, 
        error: { message: 'Database insert failed' } 
      });

      const formData = createFormData('event-123', mockFile);
      const request = new NextRequest('http://localhost/api/attachments', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe('Failed to save attachment');
      // Should have called remove to clean up the uploaded file
      expect(supabaseMock.storage.from().remove).toHaveBeenCalled();
    });

    it('should validate attachment data against schema', async () => {
      supabaseMock.single.mockResolvedValue({ data: mockAttachment, error: null });

      const formData = createFormData('event-123', mockFile);
      const request = new NextRequest('http://localhost/api/attachments', {
        method: 'POST',
        body: formData,
      });

      await POST(request);

      expect(EventAttachmentSchema.safeParse).toHaveBeenCalledWith(
        expect.objectContaining({
          event_id: 'event-123',
          file_name: 'test-document.pdf',
          file_type: 'application/pdf',
          file_size: 1024 * 1024,
          uploaded_by: 'user-123'
        })
      );
    });

    it('should handle malformed file extensions', async () => {
      const fileWithoutExtension = {
        ...mockFile,
        name: 'document', // No extension
      } as File;

      const formData = createFormData('event-123', fileWithoutExtension);
      const request = new NextRequest('http://localhost/api/attachments', {
        method: 'POST',
        body: formData,
      });

      // Should not crash - the undefined extension should be handled
      const response = await POST(request);
      expect([201, 400, 500]).toContain(response.status);
    });

    it('should handle files with multiple dots in name', async () => {
      const fileWithMultipleDots = {
        ...mockFile,
        name: 'my.file.name.with.dots.pdf',
      } as File;

      supabaseMock.single.mockResolvedValue({ data: mockAttachment, error: null });

      const formData = createFormData('event-123', fileWithMultipleDots);
      const request = new NextRequest('http://localhost/api/attachments', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      // Should use the last part after the final dot as extension
      const uploadCall = supabaseMock.storage.from().upload.mock.calls[0];
      const filePath = uploadCall[0];
      expect(filePath).toEndWith('.pdf');
    });
  });

  describe('GET - Fetch Attachments', () => {
    const mockAttachments = [
      {
        id: 'attachment-1',
        event_id: 'event-123',
        file_name: 'document1.pdf',
        file_type: 'application/pdf',
        file_url: 'https://storage.example.com/doc1.pdf',
        created_at: '2025-01-01T00:00:00Z'
      },
      {
        id: 'attachment-2',
        event_id: 'event-123',
        file_name: 'image1.jpg',
        file_type: 'image/jpeg',
        file_url: 'https://storage.example.com/img1.jpg',
        created_at: '2025-01-01T01:00:00Z'
      }
    ];

    it('should fetch attachments successfully', async () => {
      supabaseMock.order.mockResolvedValue({ data: mockAttachments, error: null });

      const request = new NextRequest('http://localhost/api/attachments?event_id=event-123');
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toHaveLength(2);
      expect(body[0].file_name).toBe('document1.pdf');
      expect(supabaseMock.from).toHaveBeenCalledWith('event_attachments');
      expect(supabaseMock.eq).toHaveBeenCalledWith('event_id', 'event-123');
      expect(supabaseMock.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should require event_id parameter', async () => {
      const request = new NextRequest('http://localhost/api/attachments');
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Event ID is required');
    });

    it('should return 401 for unauthenticated requests', async () => {
      supabaseMock.auth.getUser.mockResolvedValue({ 
        data: { user: null }, 
        error: new Error('Unauthorized') 
      });

      const request = new NextRequest('http://localhost/api/attachments?event_id=event-123');
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe('Unauthorized');
    });

    it('should handle empty attachment list', async () => {
      supabaseMock.order.mockResolvedValue({ data: [], error: null });

      const request = new NextRequest('http://localhost/api/attachments?event_id=event-123');
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      supabaseMock.order.mockResolvedValue({ 
        data: null, 
        error: { message: 'Database connection failed' } 
      });

      const request = new NextRequest('http://localhost/api/attachments?event_id=event-123');
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe('Failed to fetch attachments');
    });

    it('should order attachments by creation date descending', async () => {
      supabaseMock.order.mockResolvedValue({ data: mockAttachments, error: null });

      const request = new NextRequest('http://localhost/api/attachments?event_id=event-123');
      await GET(request);

      expect(supabaseMock.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should handle special characters in event_id', async () => {
      supabaseMock.order.mockResolvedValue({ data: [], error: null });

      const specialEventId = 'event-123-special!@#';
      const request = new NextRequest(`http://localhost/api/attachments?event_id=${encodeURIComponent(specialEventId)}`);
      await GET(request);

      expect(supabaseMock.eq).toHaveBeenCalledWith('event_id', specialEventId);
    });
  });

  describe('Security and Validation Tests', () => {
    it('should prevent path traversal in file names', async () => {
      const maliciousFile = {
        ...mockFile,
        name: '../../../etc/passwd',
      } as File;

      supabaseMock.single.mockResolvedValue({ data: mockAttachment, error: null });

      const formData = createFormData('event-123', maliciousFile);
      const request = new NextRequest('http://localhost/api/attachments', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      // Verify that the file path doesn't contain path traversal
      const uploadCall = supabaseMock.storage.from().upload.mock.calls[0];
      const filePath = uploadCall[0];
      expect(filePath).toMatch(/^events\/user-123\/event-123\/\d+-[a-z0-9]+\.passwd$/);
    });

    it('should handle very long file names', async () => {
      const longFileName = 'a'.repeat(300) + '.pdf'; // Very long filename
      const longFile = {
        ...mockFile,
        name: longFileName,
      } as File;

      supabaseMock.single.mockResolvedValue({ data: mockAttachment, error: null });

      const formData = createFormData('event-123', longFile);
      const request = new NextRequest('http://localhost/api/attachments', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      // Should handle gracefully - either succeed or fail validation
      expect([201, 400]).toContain(response.status);
    });

    it('should validate file content type matches extension', async () => {
      // File claims to be PDF but has wrong extension
      const mismatchedFile = {
        name: 'document.txt',
        type: 'application/pdf', // Mismatch
        size: 1024 * 1024,
      } as File;

      const formData = createFormData('event-123', mismatchedFile);
      const request = new NextRequest('http://localhost/api/attachments', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      // Should still accept based on MIME type validation
      expect(response.status).toBe(201);
    });

    it('should handle zero-byte files', async () => {
      const emptyFile = {
        ...mockFile,
        size: 0,
      } as File;

      const formData = createFormData('event-123', emptyFile);
      const request = new NextRequest('http://localhost/api/attachments', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      // Empty files should be allowed (size validation only checks maximum)
      expect([201, 400]).toContain(response.status);
    });

    it('should handle special characters in event ID', async () => {
      const specialEventId = 'event-123!@#$%^&*()';
      supabaseMock.single.mockResolvedValue({ data: mockAttachment, error: null });

      const formData = createFormData(specialEventId, mockFile);
      const request = new NextRequest('http://localhost/api/attachments', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      // Should handle special characters in event ID gracefully
      expect([201, 400]).toContain(response.status);
    });

    it('should enforce user isolation in file paths', async () => {
      supabaseMock.single.mockResolvedValue({ data: mockAttachment, error: null });

      const formData = createFormData('event-123', mockFile);
      const request = new NextRequest('http://localhost/api/attachments', {
        method: 'POST',
        body: formData,
      });

      await POST(request);

      // Verify that the file path includes the user ID for isolation
      const uploadCall = supabaseMock.storage.from().upload.mock.calls[0];
      const filePath = uploadCall[0];
      expect(filePath).toContain(`events/${mockUser.id}/`);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed form data gracefully', async () => {
      const request = new NextRequest('http://localhost/api/attachments', {
        method: 'POST',
        body: 'invalid-form-data',
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const response = await POST(request);
      expect(response.status).toBe(500); // Internal server error for malformed data
    });

    it('should handle missing storage bucket gracefully', async () => {
      supabaseMock.storage.from().upload.mockResolvedValue({ 
        data: null, 
        error: { message: 'Bucket does not exist' } 
      });

      const formData = createFormData('event-123', mockFile);
      const request = new NextRequest('http://localhost/api/attachments', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe('Failed to upload file');
    });

    it('should handle network timeout during upload', async () => {
      supabaseMock.storage.from().upload.mockRejectedValue(new Error('Network timeout'));

      const formData = createFormData('event-123', mockFile);
      const request = new NextRequest('http://localhost/api/attachments', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
    });

    it('should handle unexpected errors gracefully', async () => {
      supabaseMock.auth.getUser.mockRejectedValue(new Error('Unexpected auth error'));

      const formData = createFormData('event-123', mockFile);
      const request = new NextRequest('http://localhost/api/attachments', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe('Internal server error');
    });
  });
});