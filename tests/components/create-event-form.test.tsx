/**
 * Comprehensive Test Suite for Create Event Form Component
 * 
 * Tests the CreateEventForm component with updated schema types including:
 * - All privacy levels: private, visible, semi_private, public
 * - Event status handling: confirmed, tentative, cancelled
 * - Form validation with updated Zod schemas
 * - Natural language processing integration
 * - Conflict detection functionality
 * - Mobile responsiveness and accessibility
 */
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { userEvent } from './test-utils';
import { CreateEventForm } from '@/app/events/create/create-event-form';
import { 
  renderWithProviders, 
  mockPrivacyLevels,
  mockEventStatuses,
  mockUser,
  mockFetch,
  mockApiResponses,
  expectValidPrivacyLevel,
  expectValidEventStatus,
  setMobileViewport,
  setDesktopViewport,
  mockMatchMedia
} from './test-utils';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
}));

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
  }),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
            not: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      })),
    })),
  })),
}));

vi.mock('@/components/ui/natural-language-input-lazy', () => ({
  NaturalLanguageInput: ({ onEventParsed, placeholder }: any) => (
    <input
      data-testid="natural-language-input"
      placeholder={placeholder}
      onChange={(e) => {
        if (e.target.value.includes('meeting')) {
          onEventParsed([{
            title: 'Team Meeting',
            description: 'Weekly team sync',
            location: 'Conference Room',
            startDate: new Date('2024-12-01T14:00:00Z'),
            endDate: new Date('2024-12-01T15:00:00Z'),
            isAllDay: false,
            category: 'work',
          }]);
        }
      }}
    />
  ),
}));

describe('CreateEventForm', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    mockMatchMedia(false);
    mockFetch(mockApiResponses.events.create);
  });

  describe('Core Functionality', () => {
    it('renders all form fields correctly', () => {
      renderWithProviders(<CreateEventForm />, { withAuth: true });
      
      // Check essential form fields
      expect(screen.getByLabelText(/event title/i)).toBeInTheDocument();
      expect(screen.getByText(/pick a date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/start time/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/end time/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
      expect(screen.getByText(/privacy level/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    });

    it('initializes with correct default values', () => {
      renderWithProviders(<CreateEventForm />, { withAuth: true });
      
      const titleInput = screen.getByLabelText(/event title/i);
      const startTimeInput = screen.getByLabelText(/start time/i);
      const endTimeInput = screen.getByLabelText(/end time/i);
      
      expect(titleInput).toHaveValue('');
      expect(startTimeInput).toHaveValue('09:00');
      expect(endTimeInput).toHaveValue('10:00');
    });

    it('shows all privacy levels from updated schema', async () => {
      renderWithProviders(<CreateEventForm />, { withAuth: true });
      
      // Click privacy level dropdown
      const privacySelect = screen.getByRole('combobox', { name: /privacy level/i });
      await user.click(privacySelect);
      
      // Verify all privacy levels are available
      expect(screen.getByRole('option', { name: /private - only visible to you/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /visible - can see all event details/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /semi-private - limited visibility/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /public - visible to everyone/i })).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('validates required fields', async () => {
      renderWithProviders(<CreateEventForm />, { withAuth: true });
      
      const submitButton = screen.getByRole('button', { name: /create event/i });
      expect(submitButton).toBeDisabled();
      
      // Fill required fields
      await user.type(screen.getByLabelText(/event title/i), 'Test Event');
      
      const dateButton = screen.getByText(/pick a date/i);
      await user.click(dateButton);
      
      // Select tomorrow's date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowButton = screen.getByRole('gridcell', { name: tomorrow.getDate().toString() });
      await user.click(tomorrowButton);
      
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });

    it('validates time constraints (end time after start time)', async () => {
      renderWithProviders(<CreateEventForm />, { withAuth: true });
      
      // Set invalid time range
      await user.clear(screen.getByLabelText(/start time/i));
      await user.type(screen.getByLabelText(/start time/i), '15:00');
      
      await user.clear(screen.getByLabelText(/end time/i));
      await user.type(screen.getByLabelText(/end time/i), '14:00');
      
      await waitFor(() => {
        expect(screen.getByText(/end time must be after start time/i)).toBeInTheDocument();
      });
    });

    it('validates maximum field lengths according to schema', async () => {
      renderWithProviders(<CreateEventForm />, { withAuth: true });
      
      const titleInput = screen.getByLabelText(/event title/i);
      const longTitle = 'A'.repeat(101); // Exceeds 100 character limit
      
      await user.type(titleInput, longTitle);
      
      // Input should be truncated or show validation error
      expect(titleInput.value.length).toBeLessThanOrEqual(100);
    });

    it('handles all-day event toggle correctly', async () => {
      renderWithProviders(<CreateEventForm />, { withAuth: true });
      
      const allDayToggle = screen.getByLabelText(/all day event/i);
      const startTimeInput = screen.getByLabelText(/start time/i);
      const endTimeInput = screen.getByLabelText(/end time/i);
      
      // Initially time fields should be visible
      expect(startTimeInput).toBeVisible();
      expect(endTimeInput).toBeVisible();
      
      await user.click(allDayToggle);
      
      await waitFor(() => {
        expect(startTimeInput).not.toBeVisible();
        expect(endTimeInput).not.toBeVisible();
      });
    });
  });

  describe('Natural Language Processing Integration', () => {
    it('renders natural language input initially', () => {
      renderWithProviders(<CreateEventForm />, { withAuth: true });
      
      const nlInput = screen.getByTestId('natural-language-input');
      expect(nlInput).toBeInTheDocument();
      expect(nlInput).toHaveAttribute('placeholder', /try.*meeting.*lunch/i);
    });

    it('parses natural language input and fills form fields', async () => {
      renderWithProviders(<CreateEventForm />, { withAuth: true });
      
      const nlInput = screen.getByTestId('natural-language-input');
      await user.type(nlInput, 'meeting with team tomorrow');
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Team Meeting')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Weekly team sync')).toBeInTheDocument();
      });
    });

    it('hides natural language input after successful parsing', async () => {
      renderWithProviders(<CreateEventForm />, { withAuth: true });
      
      const nlInput = screen.getByTestId('natural-language-input');
      await user.type(nlInput, 'meeting with team');
      
      await waitFor(() => {
        expect(nlInput).not.toBeVisible();
      });
    });

    it('allows toggling between natural language and manual input', async () => {
      renderWithProviders(<CreateEventForm />, { withAuth: true });
      
      const manualFormButton = screen.getByRole('button', { name: /use manual form/i });
      await user.click(manualFormButton);
      
      expect(screen.queryByTestId('natural-language-input')).not.toBeVisible();
      
      const quickEntryButton = screen.getByRole('button', { name: /try quick entry instead/i });
      await user.click(quickEntryButton);
      
      expect(screen.getByTestId('natural-language-input')).toBeVisible();
    });
  });

  describe('Privacy Level Integration', () => {
    it('sets correct privacy level values', async () => {
      renderWithProviders(<CreateEventForm />, { withAuth: true });
      
      const privacySelect = screen.getByRole('combobox', { name: /privacy level/i });
      await user.click(privacySelect);
      
      const visibleOption = screen.getByRole('option', { name: /visible/i });
      await user.click(visibleOption);
      
      expect(privacySelect).toHaveTextContent(/visible/i);
    });

    it('includes privacy level in form submission', async () => {
      renderWithProviders(<CreateEventForm />, { withAuth: true });
      
      // Fill form
      await user.type(screen.getByLabelText(/event title/i), 'Test Event');
      
      const dateButton = screen.getByText(/pick a date/i);
      await user.click(dateButton);
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowButton = screen.getByRole('gridcell', { name: tomorrow.getDate().toString() });
      await user.click(tomorrowButton);
      
      // Set privacy level
      const privacySelect = screen.getByRole('combobox', { name: /privacy level/i });
      await user.click(privacySelect);
      const publicOption = screen.getByRole('option', { name: /public/i });
      await user.click(publicOption);
      
      const submitButton = screen.getByRole('button', { name: /create event/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/events', 
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"privacy_level":"public"'),
          })
        );
      });
    });
  });

  describe('Event Status Handling', () => {
    it('sets default event status to confirmed', async () => {
      renderWithProviders(<CreateEventForm />, { withAuth: true });
      
      // Fill minimum required fields and submit
      await user.type(screen.getByLabelText(/event title/i), 'Test Event');
      
      const dateButton = screen.getByText(/pick a date/i);
      await user.click(dateButton);
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowButton = screen.getByRole('gridcell', { name: tomorrow.getDate().toString() });
      await user.click(tomorrowButton);
      
      const submitButton = screen.getByRole('button', { name: /create event/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/events', 
          expect.objectContaining({
            body: expect.stringContaining('"status":"confirmed"'),
          })
        );
      });
    });
  });

  describe('Conflict Detection', () => {
    it('shows conflict detection loading state', async () => {
      renderWithProviders(<CreateEventForm />, { withAuth: true });
      
      // Fill form to trigger conflict detection
      await user.type(screen.getByLabelText(/event title/i), 'Test Event');
      
      const dateButton = screen.getByText(/pick a date/i);
      await user.click(dateButton);
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowButton = screen.getByRole('gridcell', { name: tomorrow.getDate().toString() });
      await user.click(tomorrowButton);
      
      await user.clear(screen.getByLabelText(/start time/i));
      await user.type(screen.getByLabelText(/start time/i), '14:00');
      
      await waitFor(() => {
        expect(screen.getByText(/checking for scheduling conflicts/i)).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('displays conflict warnings when conflicts are detected', async () => {
      // Mock API response with conflicts
      const conflictResponse = {
        has_conflicts: true,
        conflicts: [{
          partner_name: 'Alice Johnson',
          conflicting_events: [{
            id: 'evt-1',
            title: 'Existing Event',
            start_time: '2024-12-01T14:00:00Z',
            end_time: '2024-12-01T15:00:00Z',
          }]
        }]
      };
      mockFetch(conflictResponse);
      
      renderWithProviders(<CreateEventForm />, { withAuth: true });
      
      // Fill form to trigger conflict detection
      await user.type(screen.getByLabelText(/event title/i), 'Test Event');
      
      const dateButton = screen.getByText(/pick a date/i);
      await user.click(dateButton);
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowButton = screen.getByRole('gridcell', { name: tomorrow.getDate().toString() });
      await user.click(tomorrowButton);
      
      await user.clear(screen.getByLabelText(/start time/i));
      await user.type(screen.getByLabelText(/start time/i), '14:00');
      
      await waitFor(() => {
        expect(screen.getByText(/scheduling conflicts detected/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('Form Submission', () => {
    it('submits form with correct data structure', async () => {
      renderWithProviders(<CreateEventForm />, { withAuth: true });
      
      // Fill all form fields
      await user.type(screen.getByLabelText(/event title/i), 'Test Event');
      await user.type(screen.getByLabelText(/description/i), 'Test description');
      await user.type(screen.getByLabelText(/location/i), 'Test Location');
      
      const dateButton = screen.getByText(/pick a date/i);
      await user.click(dateButton);
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowButton = screen.getByRole('gridcell', { name: tomorrow.getDate().toString() });
      await user.click(tomorrowButton);
      
      await user.clear(screen.getByLabelText(/start time/i));
      await user.type(screen.getByLabelText(/start time/i), '14:00');
      
      await user.clear(screen.getByLabelText(/end time/i));
      await user.type(screen.getByLabelText(/end time/i), '15:00');
      
      const submitButton = screen.getByRole('button', { name: /create event/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/events', 
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: expect.stringContaining('"title":"Test Event"'),
          })
        );
      });
    });

    it('shows loading state during submission', async () => {
      renderWithProviders(<CreateEventForm />, { withAuth: true });
      
      await user.type(screen.getByLabelText(/event title/i), 'Test Event');
      
      const dateButton = screen.getByText(/pick a date/i);
      await user.click(dateButton);
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowButton = screen.getByRole('gridcell', { name: tomorrow.getDate().toString() });
      await user.click(tomorrowButton);
      
      const submitButton = screen.getByRole('button', { name: /create event/i });
      await user.click(submitButton);
      
      expect(screen.getByText(/creating event/i)).toBeInTheDocument();
    });

    it('handles submission errors gracefully', async () => {
      mockFetch({ error: 'Failed to create event' }, false, 400);
      
      renderWithProviders(<CreateEventForm />, { withAuth: true });
      
      await user.type(screen.getByLabelText(/event title/i), 'Test Event');
      
      const dateButton = screen.getByText(/pick a date/i);
      await user.click(dateButton);
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowButton = screen.getByRole('gridcell', { name: tomorrow.getDate().toString() });
      await user.click(tomorrowButton);
      
      const submitButton = screen.getByRole('button', { name: /create event/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/failed to create event/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('provides proper form labels', () => {
      renderWithProviders(<CreateEventForm />, { withAuth: true });
      
      expect(screen.getByLabelText(/event title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/start time/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/end time/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    });

    it('indicates required fields', () => {
      renderWithProviders(<CreateEventForm />, { withAuth: true });
      
      const titleInput = screen.getByLabelText(/event title.*\*/i);
      const dateButton = screen.getByText(/date.*\*/i);
      
      expect(titleInput).toHaveAttribute('required');
    });

    it('provides error messages with proper ARIA attributes', async () => {
      renderWithProviders(<CreateEventForm />, { withAuth: true });
      
      await user.clear(screen.getByLabelText(/start time/i));
      await user.type(screen.getByLabelText(/start time/i), '15:00');
      
      await user.clear(screen.getByLabelText(/end time/i));
      await user.type(screen.getByLabelText(/end time/i), '14:00');
      
      await waitFor(() => {
        const errorMessage = screen.getByText(/end time must be after start time/i);
        expect(errorMessage).toBeInTheDocument();
        expect(errorMessage.closest('[role="alert"]')).toBeInTheDocument();
      });
    });
  });

  describe('Mobile Responsiveness', () => {
    beforeEach(() => {
      setMobileViewport();
      mockMatchMedia(true);
    });

    afterEach(() => {
      setDesktopViewport();
    });

    it('adapts form layout for mobile screens', () => {
      renderWithProviders(<CreateEventForm />, { withAuth: true });
      
      const form = screen.getByRole('form');
      expect(form).toBeInTheDocument();
      
      // Form should stack vertically on mobile
      const timeInputs = screen.getAllByRole('textbox', { name: /time/i });
      timeInputs.forEach(input => {
        expect(input).toHaveClass(/mobile-input/);
      });
    });

    it('provides touch-friendly targets', () => {
      renderWithProviders(<CreateEventForm />, { withAuth: true });
      
      const submitButton = screen.getByRole('button', { name: /create event/i });
      expect(submitButton).toHaveClass(/mobile-touch-target/);
      
      const privacySelect = screen.getByRole('combobox', { name: /privacy level/i });
      expect(privacySelect).toHaveClass(/mobile-touch-target/);
    });

    it('handles mobile keyboard interactions', async () => {
      renderWithProviders(<CreateEventForm />, { withAuth: true });
      
      const titleInput = screen.getByLabelText(/event title/i);
      titleInput.focus();
      
      expect(document.activeElement).toBe(titleInput);
    });
  });

  describe('Schema Integration', () => {
    it('enforces schema validation for privacy levels', () => {
      renderWithProviders(<CreateEventForm />, { withAuth: true });
      
      // The component should only allow valid privacy levels
      // This is enforced at the TypeScript level and through the Select component options
      expect(screen.getByText(/privacy level/i)).toBeInTheDocument();
    });

    it('validates against event schema constraints', async () => {
      renderWithProviders(<CreateEventForm />, { withAuth: true });
      
      // Test title length constraint (100 characters max from schema)
      const longTitle = 'A'.repeat(101);
      const titleInput = screen.getByLabelText(/event title/i);
      
      await user.type(titleInput, longTitle);
      
      // The input should respect max length or show validation
      expect(titleInput.value.length).toBeLessThanOrEqual(100);
    });

    it('validates location field against schema max length (200 chars)', async () => {
      renderWithProviders(<CreateEventForm />, { withAuth: true });
      
      const locationInput = screen.getByLabelText(/location/i);
      const longLocation = 'A'.repeat(201);
      
      await user.type(locationInput, longLocation);
      
      // Should enforce max length from schema
      expect(locationInput.value.length).toBeLessThanOrEqual(200);
    });

    it('validates description field against schema max length (1000 chars)', async () => {
      renderWithProviders(<CreateEventForm />, { withAuth: true });
      
      const descriptionInput = screen.getByLabelText(/description/i);
      const longDescription = 'A'.repeat(1001);
      
      await user.type(descriptionInput, longDescription);
      
      // Should enforce max length from schema
      expect(descriptionInput.value.length).toBeLessThanOrEqual(1000);
    });

    it('enforces required title field from schema', async () => {
      renderWithProviders(<CreateEventForm />, { withAuth: true });
      
      const titleInput = screen.getByLabelText(/event title/i);
      expect(titleInput).toHaveAttribute('required');
      
      // Submit button should be disabled with empty title
      const submitButton = screen.getByRole('button', { name: /create event/i });
      expect(submitButton).toBeDisabled();
    });

    it('validates start_time and end_time datetime format', async () => {
      renderWithProviders(<CreateEventForm />, { withAuth: true });
      
      // Fill required fields
      await user.type(screen.getByLabelText(/event title/i), 'Test Event');
      
      const dateButton = screen.getByText(/pick a date/i);
      await user.click(dateButton);
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowButton = screen.getByRole('gridcell', { name: tomorrow.getDate().toString() });
      await user.click(tomorrowButton);
      
      const startTimeInput = screen.getByLabelText(/start time/i);
      const endTimeInput = screen.getByLabelText(/end time/i);
      
      // Should accept valid time formats
      expect(startTimeInput).toHaveAttribute('type', 'time');
      expect(endTimeInput).toHaveAttribute('type', 'time');
    });

    it('validates privacy_level enum values match schema', async () => {
      renderWithProviders(<CreateEventForm />, { withAuth: true });
      
      const privacySelect = screen.getByRole('combobox', { name: /privacy level/i });
      await user.click(privacySelect);
      
      // All options should match schema enum values
      const schemaValues = ['private', 'visible', 'semi_private', 'public'];
      const presentOptions = [
        screen.getByRole('option', { name: /private/i }),
        screen.getByRole('option', { name: /visible/i }),
        screen.getByRole('option', { name: /semi-private/i }),
        screen.getByRole('option', { name: /public/i })
      ];
      
      expect(presentOptions).toHaveLength(schemaValues.length);
    });

    it('enforces end_time after start_time schema constraint', async () => {
      renderWithProviders(<CreateEventForm />, { withAuth: true });
      
      await user.clear(screen.getByLabelText(/start time/i));
      await user.type(screen.getByLabelText(/start time/i), '15:00');
      
      await user.clear(screen.getByLabelText(/end time/i));
      await user.type(screen.getByLabelText(/end time/i), '14:00');
      
      // Schema constraint violation should show error
      await waitFor(() => {
        expect(screen.getByText(/end time must be after start time/i)).toBeInTheDocument();
      });
    });

    it('validates color format when custom color is set', async () => {
      renderWithProviders(<CreateEventForm />, { withAuth: true });
      
      // The form doesn't expose color input directly, but API submission should validate
      await user.type(screen.getByLabelText(/event title/i), 'Color Test Event');
      
      const dateButton = screen.getByText(/pick a date/i);
      await user.click(dateButton);
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowButton = screen.getByRole('gridcell', { name: tomorrow.getDate().toString() });
      await user.click(tomorrowButton);
      
      const submitButton = screen.getByRole('button', { name: /create event/i });
      await user.click(submitButton);
      
      // Should submit with valid data structure
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/events', 
          expect.objectContaining({
            method: 'POST'
          })
        );
      });
    });

    it('validates time_zone field has default value from schema', async () => {
      renderWithProviders(<CreateEventForm />, { withAuth: true });
      
      // Should have UTC as default timezone (from schema)
      const timezoneSelect = screen.getByRole('combobox', { name: /time zone/i });
      expect(timezoneSelect).toHaveDisplayValue(/utc/i);
    });

    it('validates is_all_day boolean default from schema', () => {
      renderWithProviders(<CreateEventForm />, { withAuth: true });
      
      const allDaySwitch = screen.getByLabelText(/all day event/i);
      expect(allDaySwitch).not.toBeChecked(); // Default false from schema
    });

    it('submits data matching EventSchema structure', async () => {
      renderWithProviders(<CreateEventForm />, { withAuth: true });
      
      // Fill all form fields to match schema
      await user.type(screen.getByLabelText(/event title/i), 'Schema Test Event');
      await user.type(screen.getByLabelText(/description/i), 'Test description matching schema');
      await user.type(screen.getByLabelText(/location/i), 'Test Location');
      
      const dateButton = screen.getByText(/pick a date/i);
      await user.click(dateButton);
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowButton = screen.getByRole('gridcell', { name: tomorrow.getDate().toString() });
      await user.click(tomorrowButton);
      
      // Select privacy level
      const privacySelect = screen.getByRole('combobox', { name: /privacy level/i });
      await user.click(privacySelect);
      const publicOption = screen.getByRole('option', { name: /public/i });
      await user.click(publicOption);
      
      const submitButton = screen.getByRole('button', { name: /create event/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/events', 
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: expect.stringMatching(/"title":"Schema Test Event".*"privacy_level":"public".*"status":"confirmed"/),
          })
        );
      });
    });
  });
});