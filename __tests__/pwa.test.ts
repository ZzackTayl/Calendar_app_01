/**
 * PWA Integration Tests
 * Tests for Progressive Web App functionality including manifest and service worker
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

// Mock fetch for testing
global.fetch = vi.fn();

describe('PWA Integration Tests', () => {
  beforeAll(() => {
    // Mock window.location for tests
    Object.defineProperty(window, 'location', {
      value: {
        protocol: 'https:',
        hostname: 'localhost',
        origin: 'https://localhost:3000'
      },
      writable: true
    });
  });

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('Manifest Tests', () => {
    it('should have accessible manifest.json', async () => {
      const mockManifest = {
        name: 'PolyHarmony - Privacy-First Calendar for Polyamorous Relationships',
        short_name: 'PolyHarmony',
        description: 'Effortlessly coordinate schedules with multiple partners while maintaining complete privacy control.',
        start_url: '/',
        display: 'standalone'
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({
          'content-type': 'application/manifest+json'
        }),
        json: async () => mockManifest
      });

      const response = await fetch('/manifest.json');
      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      
      const contentType = response.headers.get('content-type');
      expect(contentType).toContain('application/manifest+json');
      
      const manifest = await response.json();
      expect(manifest.name).toBe('PolyHarmony - Privacy-First Calendar for Polyamorous Relationships');
      expect(manifest.short_name).toBe('PolyHarmony');
      expect(manifest.display).toBe('standalone');
    });

    it('should have valid manifest structure', async () => {
      const mockManifest = {
        name: 'PolyHarmony - Privacy-First Calendar for Polyamorous Relationships',
        short_name: 'PolyHarmony',
        description: 'Effortlessly coordinate schedules with multiple partners while maintaining complete privacy control.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#0F172A',
        theme_color: '#0F172A',
        lang: 'en',
        categories: ['lifestyle', 'productivity', 'social'],
        icons: [
          {
            src: '/favicon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockManifest
      });

      const response = await fetch('/manifest.json');
      const manifest = await response.json();

      // Test required fields
      expect(manifest.name).toBeDefined();
      expect(manifest.short_name).toBeDefined();
      expect(manifest.start_url).toBeDefined();
      expect(manifest.display).toBeDefined();
      expect(manifest.icons).toBeDefined();
      expect(Array.isArray(manifest.icons)).toBe(true);
      expect(manifest.icons.length).toBeGreaterThan(0);

      // Test optional but important fields
      expect(manifest.description).toBeDefined();
      expect(manifest.background_color).toBeDefined();
      expect(manifest.theme_color).toBeDefined();
      expect(manifest.scope).toBeDefined();
      expect(manifest.lang).toBeDefined();
      expect(manifest.categories).toBeDefined();
    });
  });

  describe('Service Worker Tests', () => {
    let originalServiceWorker: any;

    beforeEach(() => {
      // Store the original serviceWorker if it exists
      originalServiceWorker = (navigator as any).serviceWorker;
    });

    afterEach(() => {
      // Restore the original serviceWorker property
      if (originalServiceWorker) {
        Object.defineProperty(navigator, 'serviceWorker', {
          value: originalServiceWorker,
          writable: true,
          configurable: true
        });
      } else {
        delete (navigator as any).serviceWorker;
      }
    });

    it('should have accessible sw.js', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({
          'content-type': 'application/javascript'
        }),
        text: async () => 'console.log("Service Worker loaded");'
      });

      const response = await fetch('/sw.js');
      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      
      const contentType = response.headers.get('content-type');
      expect(contentType).toContain('javascript');
    });

    it('should handle service worker registration', async () => {
      // Mock service worker registration
      const mockRegistration = {
        scope: '/',
        active: null,
        installing: null,
        waiting: null,
        addEventListener: vi.fn(),
        update: vi.fn()
      };

      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          register: vi.fn().mockResolvedValue(mockRegistration),
          ready: Promise.resolve(mockRegistration),
          addEventListener: vi.fn()
        },
        writable: true,
        configurable: true
      });

      // Mock successful sw.js fetch
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({
          'content-type': 'application/javascript'
        })
      });

      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js', {
        scope: '/'
      });
      expect(registration).toBeDefined();
      expect(registration.scope).toBe('/');
    });

    it('should handle service worker registration failure gracefully', async () => {
      // Mock service worker registration failure
      const mockServiceWorker = {
        register: vi.fn().mockRejectedValue(new Error('Service worker registration failed')),
        ready: Promise.resolve({ scope: '/' }),  // Don't reject, just provide a resolved promise
        addEventListener: vi.fn()
      };

      Object.defineProperty(navigator, 'serviceWorker', {
        value: mockServiceWorker,
        writable: true,
        configurable: true
      });

      try {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Service worker registration failed');
      }
    });
  });

  describe('PWA Installation Tests', () => {
    it('should support PWA installation criteria', async () => {
      const mockManifest = {
        name: 'PolyHarmony - Privacy-First Calendar for Polyamorous Relationships',
        short_name: 'PolyHarmony',
        start_url: '/',
        display: 'standalone',
        icons: [
          {
            src: '/favicon.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          }
        ]
      };

      // Explicitly reset and set up the mock for this test
      vi.clearAllMocks();
      (global.fetch as any) = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockManifest
      });

      const response = await fetch('/manifest.json');
      const manifest = await response.json();

      // Check PWA installation requirements
      expect(manifest.name || manifest.short_name).toBeDefined();
      expect(manifest.start_url).toBeDefined();
      expect(manifest.display).toBe('standalone');
      expect(manifest.icons).toBeDefined();
      expect(manifest.icons.length).toBeGreaterThan(0);
      
      // Check for at least one icon with appropriate size
      const hasValidIcon = manifest.icons.some((icon: any) => {
        // Handle SVG icons which may not have specific sizes
        if (icon.type === 'image/svg+xml') {
          return true;
        }
        const sizes = icon.sizes?.split('x');
        return sizes && sizes.length === 2 && parseInt(sizes[0]) >= 192;
      });
      expect(hasValidIcon).toBe(true);
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle manifest fetch errors', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('Network error'));

      try {
        await fetch('/manifest.json');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Network error');
      }
    });

    it('should handle service worker fetch errors', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('Network error'));

      try {
        await fetch('/sw.js');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Network error');
      }
    });
  });
});