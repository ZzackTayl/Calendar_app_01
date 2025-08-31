/**
 * Test Utilities for Component Testing
 * 
 * Provides shared utilities for testing React components with the updated schema types.
 * Includes mock data generators, render helpers, and validation utilities.
 */
import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, expect } from 'vitest';
import { createSupabaseClient } from '@/lib/supabase/client';
import type { 
  PrivacyLevel, 
  RelationshipType, 
  EventStatus,
  Database 
} from '@/lib/supabase/types';

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createSupabaseClient: vi.fn(() => ({
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
      onAuthStateChange: vi.fn()
    }
  }))
}));

// Mock Auth Context
const MockAuthProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <div data-testid="mock-auth-provider">
      {children}
    </div>
  );
};

// Mock user data
export const mockUser = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  full_name: 'Test User'
};

// Mock privacy levels (updated schema)
export const mockPrivacyLevels: PrivacyLevel[] = [
  'private',
  'visible', 
  'semi_private',
  'public'
];

// Mock relationship types (including friendship)
export const mockRelationshipTypes: RelationshipType[] = [
  'primary',
  'secondary', 
  'nesting',
  'long_distance',
  'casual',
  'friendship',
  'other'
];

// Mock event statuses
export const mockEventStatuses: EventStatus[] = [
  'confirmed',
  'tentative',
  'cancelled'
];

// Mock relationship data
export const mockRelationships = [
  {
    id: 'rel-1',
    user_id: mockUser.id,
    partner_name: 'Alice Johnson',
    partner_email: 'alice@example.com',
    relationship_type: 'primary' as RelationshipType,
    color: '#FF5500',
    default_privacy_level: 'visible' as PrivacyLevel,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'rel-2', 
    user_id: mockUser.id,
    partner_name: 'Bob Smith',
    partner_email: 'bob@example.com',
    relationship_type: 'friendship' as RelationshipType,
    color: '#00AA55',
    default_privacy_level: 'semi_private' as PrivacyLevel,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
];

// Mock event data
export const mockEvents = [
  {
    id: 'evt-1',
    user_id: mockUser.id,
    title: 'Test Event',
    description: 'Test event description',
    start_time: '2024-12-01T14:00:00Z',
    end_time: '2024-12-01T15:00:00Z',
    location: 'Test Location',
    privacy_level: 'visible' as PrivacyLevel,
    status: 'confirmed' as EventStatus,
    is_all_day: false,
    time_zone: 'UTC',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
];

// Privacy level validation helper
export const validatePrivacyLevel = (level: string): boolean => {
  return mockPrivacyLevels.includes(level as PrivacyLevel);
};

// Relationship type validation helper  
export const validateRelationshipType = (type: string): boolean => {
  return mockRelationshipTypes.includes(type as RelationshipType);
};

// Event status validation helper
export const validateEventStatus = (status: string): boolean => {
  return mockEventStatuses.includes(status as EventStatus);
};

// Custom render with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  withAuth?: boolean;
  initialUser?: typeof mockUser | null;
}

export const renderWithProviders = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { withAuth = false, initialUser = mockUser, ...renderOptions } = options;

  const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
    if (withAuth) {
      return (
        <MockAuthProvider>
          {children}
        </MockAuthProvider>
      );
    }
    return <>{children}</>;
  };

  return render(ui, { wrapper: AllTheProviders, ...renderOptions });
};

// Mock API responses
export const mockApiResponses = {
  events: {
    create: {
      event: mockEvents[0],
      message: 'Event created successfully'
    },
    update: {
      event: { ...mockEvents[0], title: 'Updated Event' },
      message: 'Event updated successfully'
    },
    delete: {
      message: 'Event deleted successfully'
    }
  },
  relationships: {
    create: {
      relationship: mockRelationships[0],
      message: 'Relationship created successfully'
    },
    list: {
      relationships: mockRelationships
    }
  }
};

// Mock fetch for API calls
export const mockFetch = (response: any, ok: boolean = true, status: number = 200) => {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok,
      status,
      json: () => Promise.resolve(response),
    }) as Promise<Response>
  );
};

// Helper to simulate user interactions
export const userInteractions = {
  clickButton: async (getByRole: any, name: string | RegExp) => {
    const button = getByRole('button', { name });
    await userEvent.click(button);
    return button;
  },
  
  selectOption: async (getByRole: any, comboboxName: string | RegExp, optionName: string | RegExp) => {
    const combobox = getByRole('combobox', { name: comboboxName });
    await userEvent.click(combobox);
    const option = getByRole('option', { name: optionName });
    await userEvent.click(option);
    return { combobox, option };
  },
  
  fillInput: async (getByLabelText: any, label: string | RegExp, value: string) => {
    const input = getByLabelText(label);
    await userEvent.clear(input);
    await userEvent.type(input, value);
    return input;
  }
};

// Mock window.matchMedia for responsive tests
export const mockMatchMedia = (matches: boolean = false, query?: string) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((mediaQuery: string) => ({
      matches: query ? mediaQuery === query && matches : matches,
      media: mediaQuery,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated  
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

// Schema validation test helpers
export const expectValidPrivacyLevel = (level: unknown) => {
  expect(typeof level).toBe('string');
  expect(mockPrivacyLevels).toContain(level);
};

export const expectValidRelationshipType = (type: unknown) => {
  expect(typeof type).toBe('string');
  expect(mockRelationshipTypes).toContain(type);
};

export const expectValidEventStatus = (status: unknown) => {
  expect(typeof status).toBe('string'); 
  expect(mockEventStatuses).toContain(status);
};

// Accessibility test helpers
export const expectAccessibleButton = (element: HTMLElement) => {
  expect(element).toHaveAttribute('role', 'button');
  expect(element).toHaveAttribute('aria-expanded');
  expect(element).not.toHaveAttribute('aria-disabled', 'true');
};

export const expectAccessibleCombobox = (element: HTMLElement) => {
  expect(element).toHaveAttribute('role', 'combobox');
  expect(element).toHaveAttribute('aria-expanded');
  expect(element).toHaveAttribute('aria-haspopup');
};

// Mobile responsiveness helpers
export const setMobileViewport = () => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 375,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: 812,
  });
  window.dispatchEvent(new Event('resize'));
};

export const setDesktopViewport = () => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 1024,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: 768,
  });
  window.dispatchEvent(new Event('resize'));
};

export * from '@testing-library/react';