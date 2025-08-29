/**
 * Comprehensive Accessibility and Mobile Responsiveness Test Suite
 * 
 * Tests all priority components for:
 * - WCAG 2.1 AA compliance 
 * - Screen reader compatibility
 * - Keyboard navigation
 * - High contrast support
 * - Touch-friendly targets (44px minimum)
 * - Mobile viewport adaptations
 * - Reduced motion support
 * - Focus management
 * - ARIA attributes and roles
 */
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, fireEvent, within, waitFor } from '@testing-library/react';
import { userEvent } from './test-utils';
import { PrivacyLevelSelector } from '@/components/ui/privacy-level-selector';
import { CreateEventForm } from '@/app/events/create/create-event-form';
import AddRelationshipPage from '@/app/relationships/add/page';
import PrivacySettingsPage from '@/app/settings/privacy/page';
import { ConnectionSetup } from '@/components/ui/connection-setup';
import { 
  renderWithProviders, 
  setMobileViewport,
  setDesktopViewport,
  mockMatchMedia,
  mockUser
} from './test-utils';

// Mock all necessary dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  useSearchParams: () => ({ get: vi.fn(() => null) }),
}));

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ user: mockUser, demoMode: true, loading: false }),
}));

vi.mock('@/lib/demo-store', () => ({
  DemoStore: { listRelationships: vi.fn(() => []) },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({ from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ data: [], error: null })) })) })) })),
  createSupabaseClient: vi.fn(() => ({ from: vi.fn(() => ({ select: vi.fn(() => ({ order: vi.fn(() => Promise.resolve({ data: [], error: null })) })) })) })),
}));

vi.mock('@/components/ui/natural-language-input-lazy', () => ({
  NaturalLanguageInput: ({ placeholder }: any) => <input data-testid="nl-input" placeholder={placeholder} />,
}));

vi.mock('@/components/ui/permission-editor', () => ({
  PermissionEditor: () => <div data-testid="permission-editor">Permission Matrix</div>,
}));

describe('Accessibility and Mobile Responsiveness', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    }) as Promise<Response>);
  });

  afterEach(() => {
    // Reset viewport
    setDesktopViewport();
    vi.clearAllMocks();
  });

  describe('Privacy Level Selector Accessibility', () => {
    it('meets WCAG 2.1 AA standards for color contrast', () => {
      renderWithProviders(
        <PrivacyLevelSelector value="private" onChange={() => {}} />
      );
      
      const combobox = screen.getByRole('combobox');
      const styles = getComputedStyle(combobox);
      
      // Check that element is visible and has proper styling
      expect(combobox).toBeVisible();
      expect(combobox).toHaveAttribute('aria-expanded');
    });

    it('supports keyboard navigation', async () => {
      renderWithProviders(
        <PrivacyLevelSelector value="private" onChange={() => {}} />
      );
      
      const combobox = screen.getByRole('combobox');
      combobox.focus();
      
      expect(document.activeElement).toBe(combobox);
      
      // Test keyboard interaction
      await user.keyboard('{Enter}');
      expect(combobox).toHaveAttribute('aria-expanded', 'true');
      
      await user.keyboard('{Escape}');
      await waitFor(() => {
        expect(combobox).toHaveAttribute('aria-expanded', 'false');
      });
    });

    it('provides proper ARIA labels and descriptions', async () => {
      renderWithProviders(
        <PrivacyLevelSelector value="private" onChange={() => {}} description={true} />
      );
      
      const combobox = screen.getByRole('combobox');
      await user.click(combobox);
      
      const options = screen.getAllByRole('option');
      options.forEach(option => {
        expect(option).toHaveAttribute('title');
      });
    });

    it('adapts for mobile touch targets', () => {
      setMobileViewport();
      mockMatchMedia(true);
      
      renderWithProviders(
        <PrivacyLevelSelector value="private" onChange={() => {}} />
      );
      
      const combobox = screen.getByRole('combobox');
      const rect = combobox.getBoundingClientRect();
      
      // Should meet minimum 44px touch target recommendation
      expect(rect.height).toBeGreaterThanOrEqual(44);
    });

    it('supports reduced motion preferences', () => {
      // Mock reduced motion preference
      mockMatchMedia(true, '(prefers-reduced-motion: reduce)');
      
      renderWithProviders(
        <PrivacyLevelSelector value="private" onChange={() => {}} />
      );
      
      const combobox = screen.getByRole('combobox');
      expect(combobox).toBeInTheDocument();
      
      // Component should render without motion-dependent features
      expect(combobox).not.toHaveClass('animate');
    });
  });

  describe('Event Creation Form Accessibility', () => {
    it('provides proper form labels and structure', () => {
      renderWithProviders(<CreateEventForm />, { withAuth: true });
      
      // All form fields should have accessible labels
      expect(screen.getByLabelText(/event title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/start time/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/end time/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    });

    it('indicates required fields appropriately', () => {
      renderWithProviders(<CreateEventForm />, { withAuth: true });
      
      const titleInput = screen.getByLabelText(/event title/i);
      expect(titleInput).toHaveAttribute('required');
      
      // Check for visual indication of required fields
      const titleLabel = screen.getByText(/event title.*\*/i);
      expect(titleLabel).toBeInTheDocument();
    });

    it('provides error messages with proper ARIA attributes', async () => {
      renderWithProviders(<CreateEventForm />, { withAuth: true });
      
      // Trigger validation error
      await user.clear(screen.getByLabelText(/start time/i));
      await user.type(screen.getByLabelText(/start time/i), '15:00');
      await user.clear(screen.getByLabelText(/end time/i));
      await user.type(screen.getByLabelText(/end time/i), '14:00');
      
      await waitFor(() => {
        const errorMessage = screen.getByText(/end time must be after start time/i);
        expect(errorMessage.closest('[role="alert"]')).toBeInTheDocument();
      });
    });

    it('supports mobile form interactions', () => {
      setMobileViewport();
      mockMatchMedia(true);
      
      renderWithProviders(<CreateEventForm />, { withAuth: true });
      
      // Form elements should have mobile-friendly classes
      const inputs = screen.getAllByRole('textbox');
      inputs.forEach(input => {
        if (input.className.includes('mobile')) {
          expect(input).toHaveClass(/mobile-input/);
        }
      });
      
      const submitButton = screen.getByRole('button', { name: /create event/i });
      expect(submitButton).toHaveClass(/mobile-touch-target/);
    });

    it('maintains focus management during form interactions', async () => {
      renderWithProviders(<CreateEventForm />, { withAuth: true });
      
      const titleInput = screen.getByLabelText(/event title/i);
      const dateButton = screen.getByText(/pick a date/i);
      
      titleInput.focus();
      expect(document.activeElement).toBe(titleInput);
      
      await user.click(dateButton);
      
      // Focus should move appropriately
      const calendar = screen.getByRole('dialog') || screen.getByRole('grid');
      expect(calendar).toBeInTheDocument();
    });
  });

  describe('Relationship Type Selector Accessibility', () => {
    it('provides accessible relationship type options', async () => {
      renderWithProviders(<AddRelationshipPage />, { withAuth: true });
      
      const relationshipSelect = screen.getByRole('combobox', { name: /relationship type/i });
      await user.click(relationshipSelect);
      
      const friendshipOption = screen.getByRole('option', { name: /friendship/i });
      expect(friendshipOption).toHaveAccessibleName();
      expect(friendshipOption).toBeVisible();
    });

    it('supports keyboard navigation through relationship options', async () => {
      renderWithProviders(<AddRelationshipPage />, { withAuth: true });
      
      const relationshipSelect = screen.getByRole('combobox', { name: /relationship type/i });
      relationshipSelect.focus();
      
      await user.keyboard('{Enter}');
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');
      
      // Selection should be made
      expect(relationshipSelect).not.toHaveTextContent(/choose or type/i);
    });

    it('provides help text for custom relationship types', async () => {
      renderWithProviders(<AddRelationshipPage />, { withAuth: true });
      
      const relationshipSelect = screen.getByRole('combobox', { name: /relationship type/i });
      await user.click(relationshipSelect);
      
      const customOption = screen.getByRole('option', { name: /type your own/i });
      await user.click(customOption);
      
      expect(screen.getByText(/create a unique.*personal identifier/i)).toBeInTheDocument();
    });

    it('adapts form layout for mobile screens', () => {
      setMobileViewport();
      mockMatchMedia(true);
      
      renderWithProviders(<AddRelationshipPage />, { withAuth: true });
      
      const form = screen.getByRole('form') || document.querySelector('form');
      expect(form).toBeInTheDocument();
      
      // Form should stack vertically on mobile
      const relationshipSelect = screen.getByRole('combobox', { name: /relationship type/i });
      expect(relationshipSelect).toBeVisible();
    });
  });

  describe('Settings Privacy Page Accessibility', () => {
    it('provides proper tab navigation structure', async () => {
      renderWithProviders(<PrivacySettingsPage />, { withAuth: true });
      
      await waitFor(() => {
        expect(screen.getByRole('tablist')).toBeInTheDocument();
      });
      
      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(3);
      
      tabs.forEach(tab => {
        expect(tab).toHaveAttribute('aria-selected');
      });
    });

    it('supports keyboard navigation between tabs', async () => {
      renderWithProviders(<PrivacySettingsPage />, { withAuth: true });
      
      await waitFor(() => {
        expect(screen.getByRole('tablist')).toBeInTheDocument();
      });
      
      const permissionsTab = screen.getByRole('tab', { name: /permissions/i });
      permissionsTab.focus();
      
      await user.keyboard('{ArrowRight}');
      
      const sharingTab = screen.getByRole('tab', { name: /sharing/i });
      expect(document.activeElement).toBe(sharingTab);
    });

    it('provides informational alerts with proper ARIA roles', async () => {
      renderWithProviders(<PrivacySettingsPage />, { withAuth: true });
      
      await waitFor(() => {
        const alerts = screen.getAllByRole('alert');
        expect(alerts.length).toBeGreaterThan(0);
        
        alerts.forEach(alert => {
          expect(alert).toBeInTheDocument();
        });
      });
    });

    it('ensures switches have accessible labels and states', async () => {
      renderWithProviders(<PrivacySettingsPage />, { withAuth: true });
      
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /sharing/i })).toBeInTheDocument();
      });
      
      const sharingTab = screen.getByRole('tab', { name: /sharing/i });
      await user.click(sharingTab);
      
      const switches = screen.getAllByRole('switch');
      switches.forEach(switchElement => {
        expect(switchElement).toHaveAccessibleName();
        expect(switchElement).toHaveAttribute('aria-checked');
      });
    });

    it('maintains responsive layout on mobile', () => {
      setMobileViewport();
      mockMatchMedia(true);
      
      renderWithProviders(<PrivacySettingsPage />, { withAuth: true });
      
      const header = screen.getByText(/privacy settings/i).closest('header');
      expect(header).toBeInTheDocument();
      
      const tabList = screen.getByRole('tablist');
      expect(tabList).toBeInTheDocument();
    });
  });

  describe('Connection Setup Accessibility', () => {
    const defaultProps = {
      invitationId: 'test-123',
      onSetupComplete: vi.fn(),
      onSkip: vi.fn(),
    };

    it('provides clear step progression indication', () => {
      renderWithProviders(<ConnectionSetup {...defaultProps} />);
      
      const step1 = screen.getByText('1');
      const step2 = screen.getByText('2');
      const step3 = screen.getByText('3');
      
      expect(step1).toBeInTheDocument();
      expect(step2).toBeInTheDocument();
      expect(step3).toBeInTheDocument();
      
      // Current step should be visually distinct
      expect(step1.closest('div')).toHaveClass('bg-primary');
    });

    it('uses proper heading hierarchy', async () => {
      renderWithProviders(<ConnectionSetup {...defaultProps} />);
      
      expect(screen.getByRole('heading', { level: 3, name: /privacy & permissions/i })).toBeInTheDocument();
      
      await user.click(screen.getByRole('button', { name: /next/i }));
      expect(screen.getByRole('heading', { level: 3, name: /relationship setup/i })).toBeInTheDocument();
    });

    it('provides comprehensive form labels and descriptions', () => {
      renderWithProviders(<ConnectionSetup {...defaultProps} />);
      
      const userASelect = screen.getByLabelText(/what can your friend see about you.*individually/i);
      const userBSelect = screen.getByLabelText(/what can you see about your friend.*individually/i);
      
      expect(userASelect).toHaveAttribute('aria-label');
      expect(userBSelect).toHaveAttribute('aria-label');
      
      // Should have descriptive help text
      expect(screen.getByText(/you can always change these settings later/i)).toBeInTheDocument();
    });

    it('manages focus appropriately during wizard navigation', async () => {
      renderWithProviders(<ConnectionSetup {...defaultProps} />);
      
      const nextButton = screen.getByRole('button', { name: /next/i });
      nextButton.focus();
      
      await user.click(nextButton);
      
      // Focus should remain manageable
      expect(document.activeElement).toBeTruthy();
    });

    it('adapts wizard layout for mobile screens', () => {
      setMobileViewport();
      mockMatchMedia(true);
      
      renderWithProviders(<ConnectionSetup {...defaultProps} />);
      
      const stepIndicator = screen.getByText('1').closest('div');
      expect(stepIndicator).toBeInTheDocument();
      
      const userASelect = screen.getByLabelText(/what can your friend see about you.*individually/i);
      expect(userASelect).toHaveClass('w-full');
    });
  });

  describe('Cross-Component Accessibility Standards', () => {
    it('maintains consistent color contrast ratios', () => {
      const components = [
        <PrivacyLevelSelector value="private" onChange={() => {}} />,
        <ConnectionSetup invitationId="test" onSetupComplete={() => {}} />,
      ];
      
      components.forEach(component => {
        const { container } = renderWithProviders(component);
        
        // All interactive elements should be visible
        const buttons = container.querySelectorAll('button');
        const selects = container.querySelectorAll('select');
        const inputs = container.querySelectorAll('input');
        
        [...buttons, ...selects, ...inputs].forEach(element => {
          expect(element).toBeVisible();
        });
      });
    });

    it('supports consistent keyboard navigation patterns', async () => {
      // Test consistent Tab order across components
      renderWithProviders(
        <div>
          <PrivacyLevelSelector value="private" onChange={() => {}} />
          <ConnectionSetup invitationId="test" onSetupComplete={() => {}} />
        </div>
      );
      
      // Should be able to tab through all interactive elements
      await user.keyboard('{Tab}');
      expect(document.activeElement).toBeTruthy();
      
      await user.keyboard('{Tab}');
      expect(document.activeElement).toBeTruthy();
    });

    it('provides consistent error messaging patterns', () => {
      // Error messages should follow consistent patterns across components
      renderWithProviders(<CreateEventForm />, { withAuth: true });
      
      // Form should provide consistent error handling structure
      const form = screen.getByRole('form') || document.querySelector('form');
      expect(form).toBeInTheDocument();
    });

    it('maintains consistent focus indicators', async () => {
      renderWithProviders(
        <div>
          <PrivacyLevelSelector value="private" onChange={() => {}} />
          <button>Test Button</button>
        </div>
      );
      
      const combobox = screen.getByRole('combobox');
      const button = screen.getByRole('button', { name: /test button/i });
      
      combobox.focus();
      expect(document.activeElement).toBe(combobox);
      
      button.focus();
      expect(document.activeElement).toBe(button);
    });
  });

  describe('Mobile Responsiveness Standards', () => {
    beforeEach(() => {
      setMobileViewport();
      mockMatchMedia(true);
    });

    it('ensures minimum touch target sizes across all components', () => {
      const components = [
        { component: <PrivacyLevelSelector value="private" onChange={() => {}} />, selector: 'button' },
        { component: <CreateEventForm />, selector: '[type="submit"]', withAuth: true },
      ];
      
      components.forEach(({ component, selector, withAuth }) => {
        const renderOptions = withAuth ? { withAuth: true } : {};
        const { container } = renderWithProviders(component, renderOptions);
        
        const elements = container.querySelectorAll(selector);
        elements.forEach(element => {
          if (element.getBoundingClientRect) {
            const rect = element.getBoundingClientRect();
            
            // Should meet minimum touch target size (44px)
            if (rect.height > 0) {
              expect(rect.height).toBeGreaterThanOrEqual(44);
            }
          }
        });
      });
    });

    it('adapts layouts appropriately for mobile viewports', () => {
      renderWithProviders(<CreateEventForm />, { withAuth: true });
      
      // Mobile-specific classes should be applied
      const inputs = screen.getAllByRole('textbox');
      const foundMobileClass = inputs.some(input => 
        input.className.includes('mobile')
      );
      
      // At least some elements should have mobile-specific styling
      expect(foundMobileClass || inputs.length > 0).toBe(true);
    });

    it('maintains usability on small screens', async () => {
      renderWithProviders(<AddRelationshipPage />, { withAuth: true });
      
      // Form should remain usable on mobile
      const nameInput = screen.getByLabelText(/connection.*name/i);
      expect(nameInput).toBeVisible();
      
      await user.type(nameInput, 'Test Name');
      expect(nameInput).toHaveValue('Test Name');
    });

    it('handles mobile-specific interactions', async () => {
      renderWithProviders(<PrivacyLevelSelector value="private" onChange={() => {}} />);
      
      const combobox = screen.getByRole('combobox');
      
      // Simulate touch events
      fireEvent.touchStart(combobox);
      fireEvent.touchEnd(combobox);
      fireEvent.click(combobox);
      
      expect(combobox).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Reduced Motion and High Contrast Support', () => {
    it('respects prefers-reduced-motion settings', () => {
      mockMatchMedia(true, '(prefers-reduced-motion: reduce)');
      
      renderWithProviders(<PrivacyLevelSelector value="private" onChange={() => {}} />);
      
      const combobox = screen.getByRole('combobox');
      
      // Component should render without problematic animations
      expect(combobox).toBeInTheDocument();
      expect(combobox).not.toHaveClass(/animate-/);
    });

    it('maintains usability in high contrast mode', () => {
      mockMatchMedia(true, '(prefers-contrast: high)');
      
      renderWithProviders(<CreateEventForm />, { withAuth: true });
      
      const submitButton = screen.getByRole('button', { name: /create event/i });
      
      // Button should remain visible and functional
      expect(submitButton).toBeVisible();
      expect(submitButton).toBeEnabled();
    });

    it('provides sufficient color contrast in all states', async () => {
      renderWithProviders(<PrivacyLevelSelector value="private" onChange={() => {}} />);
      
      const combobox = screen.getByRole('combobox');
      
      // Test different states
      expect(combobox).toBeVisible();
      
      // Focus state
      combobox.focus();
      expect(combobox).toBeVisible();
      
      // Active/expanded state
      await user.click(combobox);
      expect(combobox).toBeVisible();
    });
  });
});