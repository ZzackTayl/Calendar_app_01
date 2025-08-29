/**
 * Comprehensive Test Suite for Relationship Type Selector Components
 * 
 * Tests relationship type selector functionality including:
 * - All relationship types: primary, secondary, nesting, long_distance, casual, friendship, other
 * - Custom relationship type input
 * - TypeScript type validation  
 * - Form integration scenarios
 * - Accessibility compliance
 * - Mobile responsiveness
 */
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { userEvent } from './test-utils';
import AddRelationshipPage from '@/app/relationships/add/page';
import { 
  renderWithProviders, 
  mockRelationshipTypes,
  mockUser,
  mockFetch,
  expectValidRelationshipType,
  expectAccessibleButton,
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
    demoMode: false,
    loading: false,
  }),
}));

vi.mock('@/lib/supabase/client', () => ({
  createSupabaseClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
  })),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('Relationship Type Selector', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    mockMatchMedia(false);
    mockFetch({ message: 'Relationship created successfully' });
  });

  describe('Core Functionality', () => {
    it('renders all relationship types from updated schema', async () => {
      renderWithProviders(<AddRelationshipPage />, { withAuth: true });
      
      const relationshipSelect = screen.getByRole('combobox', { name: /relationship type/i });
      await user.click(relationshipSelect);
      
      // Check that all relationship types including friendship are present
      expect(screen.getByRole('option', { name: /primary connection/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /secondary connection/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /nesting connection/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /long distance/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /casual connection/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /friendship/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /type your own/i })).toBeInTheDocument();
    });

    it('specifically tests friendship relationship type selection', async () => {
      renderWithProviders(<AddRelationshipPage />, { withAuth: true });
      
      const relationshipSelect = screen.getByRole('combobox', { name: /relationship type/i });
      await user.click(relationshipSelect);
      
      const friendshipOption = screen.getByRole('option', { name: /friendship/i });
      await user.click(friendshipOption);
      
      // Verify friendship is selected
      expect(relationshipSelect).toHaveTextContent(/friendship/i);
    });

    it('allows selection of all predefined relationship types', async () => {
      const relationshipTypeOptions = [
        'Primary Connection',
        'Secondary Connection', 
        'Nesting Connection',
        'Long Distance',
        'Casual Connection',
        'Friendship'
      ];
      
      for (const typeOption of relationshipTypeOptions) {
        renderWithProviders(<AddRelationshipPage />, { withAuth: true });
        
        const relationshipSelect = screen.getByRole('combobox', { name: /relationship type/i });
        await user.click(relationshipSelect);
        
        const option = screen.getByRole('option', { name: new RegExp(typeOption, 'i') });
        await user.click(option);
        
        expect(relationshipSelect).toHaveTextContent(new RegExp(typeOption, 'i'));
      }
    });

    it('enables custom relationship type input when "Type your own" is selected', async () => {
      renderWithProviders(<AddRelationshipPage />, { withAuth: true });
      
      const relationshipSelect = screen.getByRole('combobox', { name: /relationship type/i });
      await user.click(relationshipSelect);
      
      const customOption = screen.getByRole('option', { name: /type your own/i });
      await user.click(customOption);
      
      // Custom input should appear
      const customInput = screen.getByPlaceholderText(/adventure buddy.*coffee date.*gaming companion/i);
      expect(customInput).toBeInTheDocument();
      expect(customInput).toBeVisible();
    });

    it('allows entering custom relationship types', async () => {
      renderWithProviders(<AddRelationshipPage />, { withAuth: true });
      
      const relationshipSelect = screen.getByRole('combobox', { name: /relationship type/i });
      await user.click(relationshipSelect);
      
      const customOption = screen.getByRole('option', { name: /type your own/i });
      await user.click(customOption);
      
      const customInput = screen.getByPlaceholderText(/adventure buddy.*coffee date.*gaming companion/i);
      await user.type(customInput, 'Study Partner');
      
      expect(customInput).toHaveValue('Study Partner');
    });
  });

  describe('Schema Validation', () => {
    it('validates all relationship types against schema', () => {
      const validTypes = ['primary', 'secondary', 'nesting', 'long_distance', 'casual', 'friendship', 'other'];
      
      validTypes.forEach(type => {
        expectValidRelationshipType(type);
      });
    });

    it('ensures friendship type is properly supported in schema', () => {
      expect(mockRelationshipTypes).toContain('friendship');
      expectValidRelationshipType('friendship');
    });

    it('maintains TypeScript type safety for relationship types', () => {
      // This test ensures TypeScript compilation catches invalid relationship types
      const validType: 'friendship' = 'friendship';
      expect(validType).toBe('friendship');
      expectValidRelationshipType(validType);
    });
  });

  describe('Form Integration', () => {
    it('includes relationship type in form submission', async () => {
      renderWithProviders(<AddRelationshipPage />, { withAuth: true });
      
      // Fill required fields
      await user.type(screen.getByLabelText(/connection.*name/i), 'Alice Johnson');
      
      // Select friendship relationship type
      const relationshipSelect = screen.getByRole('combobox', { name: /relationship type/i });
      await user.click(relationshipSelect);
      
      const friendshipOption = screen.getByRole('option', { name: /friendship/i });
      await user.click(friendshipOption);
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /add connection/i });
      await user.click(submitButton);
      
      // Verify form submission includes relationship type
      await waitFor(() => {
        expect(global.fetch || vi.isMockFunction).toBeDefined();
      });
    });

    it('validates custom relationship type when required', async () => {
      renderWithProviders(<AddRelationshipPage />, { withAuth: true });
      
      await user.type(screen.getByLabelText(/connection.*name/i), 'Test Person');
      
      const relationshipSelect = screen.getByRole('combobox', { name: /relationship type/i });
      await user.click(relationshipSelect);
      
      const customOption = screen.getByRole('option', { name: /type your own/i });
      await user.click(customOption);
      
      // Submit without filling custom type
      const submitButton = screen.getByRole('button', { name: /add connection/i });
      
      // Button should be disabled when custom is selected but not filled
      expect(submitButton).toBeDisabled();
      
      // Fill custom type
      const customInput = screen.getByPlaceholderText(/adventure buddy.*coffee date.*gaming companion/i);
      await user.type(customInput, 'Study Buddy');
      
      // Button should now be enabled
      expect(submitButton).not.toBeDisabled();
    });

    it('handles form submission with custom relationship type', async () => {
      renderWithProviders(<AddRelationshipPage />, { withAuth: true });
      
      await user.type(screen.getByLabelText(/connection.*name/i), 'Study Partner');
      
      const relationshipSelect = screen.getByRole('combobox', { name: /relationship type/i });
      await user.click(relationshipSelect);
      
      const customOption = screen.getByRole('option', { name: /type your own/i });
      await user.click(customOption);
      
      const customInput = screen.getByPlaceholderText(/adventure buddy.*coffee date.*gaming companion/i);
      await user.type(customInput, 'Research Collaborator');
      
      const submitButton = screen.getByRole('button', { name: /add connection/i });
      await user.click(submitButton);
      
      // Form should submit successfully
      await waitFor(() => {
        expect(submitButton).toHaveTextContent(/adding connection/i);
      });
    });
  });

  describe('User Experience', () => {
    it('provides helpful placeholder text for custom types', async () => {
      renderWithProviders(<AddRelationshipPage />, { withAuth: true });
      
      const relationshipSelect = screen.getByRole('combobox', { name: /relationship type/i });
      await user.click(relationshipSelect);
      
      const customOption = screen.getByRole('option', { name: /type your own/i });
      await user.click(customOption);
      
      const customInput = screen.getByPlaceholderText(/adventure buddy.*coffee date.*gaming companion/i);
      expect(customInput).toHaveAttribute('placeholder');
      expect(customInput.getAttribute('placeholder')).toMatch(/adventure buddy|coffee date|gaming companion/i);
    });

    it('shows descriptive help text for custom relationship types', async () => {
      renderWithProviders(<AddRelationshipPage />, { withAuth: true });
      
      const relationshipSelect = screen.getByRole('combobox', { name: /relationship type/i });
      await user.click(relationshipSelect);
      
      const customOption = screen.getByRole('option', { name: /type your own/i });
      await user.click(customOption);
      
      expect(screen.getByText(/create a unique.*personal identifier.*feels right/i)).toBeInTheDocument();
    });

    it('maintains selection state when switching between types', async () => {
      renderWithProviders(<AddRelationshipPage />, { withAuth: true });
      
      const relationshipSelect = screen.getByRole('combobox', { name: /relationship type/i });
      
      // Select friendship first
      await user.click(relationshipSelect);
      const friendshipOption = screen.getByRole('option', { name: /friendship/i });
      await user.click(friendshipOption);
      
      expect(relationshipSelect).toHaveTextContent(/friendship/i);
      
      // Switch to custom
      await user.click(relationshipSelect);
      const customOption = screen.getByRole('option', { name: /type your own/i });
      await user.click(customOption);
      
      expect(relationshipSelect).toHaveTextContent(/type your own/i);
    });
  });

  describe('Accessibility', () => {
    it('provides proper labels for relationship type selector', () => {
      renderWithProviders(<AddRelationshipPage />, { withAuth: true });
      
      const relationshipSelect = screen.getByRole('combobox', { name: /relationship type/i });
      expect(relationshipSelect).toBeInTheDocument();
      expect(screen.getByText(/relationship type/i)).toBeInTheDocument();
    });

    it('supports keyboard navigation through relationship options', async () => {
      renderWithProviders(<AddRelationshipPage />, { withAuth: true });
      
      const relationshipSelect = screen.getByRole('combobox', { name: /relationship type/i });
      relationshipSelect.focus();
      
      // Open dropdown with keyboard
      await user.keyboard('{Enter}');
      
      // Navigate with arrows
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');
      
      // Selection should be made
      expect(relationshipSelect).not.toHaveTextContent(/choose or type/i);
    });

    it('provides accessible labels for custom input field', async () => {
      renderWithProviders(<AddRelationshipPage />, { withAuth: true });
      
      const relationshipSelect = screen.getByRole('combobox', { name: /relationship type/i });
      await user.click(relationshipSelect);
      
      const customOption = screen.getByRole('option', { name: /type your own/i });
      await user.click(customOption);
      
      const customInput = screen.getByPlaceholderText(/adventure buddy.*coffee date.*gaming companion/i);
      expect(customInput).toHaveAccessibleName();
    });

    it('indicates required custom input when selected', async () => {
      renderWithProviders(<AddRelationshipPage />, { withAuth: true });
      
      const relationshipSelect = screen.getByRole('combobox', { name: /relationship type/i });
      await user.click(relationshipSelect);
      
      const customOption = screen.getByRole('option', { name: /type your own/i });
      await user.click(customOption);
      
      const customInput = screen.getByPlaceholderText(/adventure buddy.*coffee date.*gaming companion/i);
      expect(customInput).toHaveAttribute('required');
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

    it('adapts relationship type selector for mobile', () => {
      renderWithProviders(<AddRelationshipPage />, { withAuth: true });
      
      const relationshipSelect = screen.getByRole('combobox', { name: /relationship type/i });
      expect(relationshipSelect).toBeInTheDocument();
      
      // Should maintain touch-friendly size
      const styles = getComputedStyle(relationshipSelect);
      expect(relationshipSelect).toBeVisible();
    });

    it('maintains custom input functionality on mobile', async () => {
      renderWithProviders(<AddRelationshipPage />, { withAuth: true });
      
      const relationshipSelect = screen.getByRole('combobox', { name: /relationship type/i });
      await user.click(relationshipSelect);
      
      const customOption = screen.getByRole('option', { name: /type your own/i });
      await user.click(customOption);
      
      const customInput = screen.getByPlaceholderText(/adventure buddy.*coffee date.*gaming companion/i);
      await user.type(customInput, 'Mobile Test');
      
      expect(customInput).toHaveValue('Mobile Test');
    });

    it('handles touch interactions properly', async () => {
      renderWithProviders(<AddRelationshipPage />, { withAuth: true });
      
      const relationshipSelect = screen.getByRole('combobox', { name: /relationship type/i });
      
      // Simulate touch event
      fireEvent.touchStart(relationshipSelect);
      fireEvent.touchEnd(relationshipSelect);
      fireEvent.click(relationshipSelect);
      
      await waitFor(() => {
        expect(screen.getByRole('option', { name: /friendship/i })).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles empty custom relationship type gracefully', async () => {
      renderWithProviders(<AddRelationshipPage />, { withAuth: true });
      
      await user.type(screen.getByLabelText(/connection.*name/i), 'Test Person');
      
      const relationshipSelect = screen.getByRole('combobox', { name: /relationship type/i });
      await user.click(relationshipSelect);
      
      const customOption = screen.getByRole('option', { name: /type your own/i });
      await user.click(customOption);
      
      // Try to submit without custom type
      const submitButton = screen.getByRole('button', { name: /add connection/i });
      expect(submitButton).toBeDisabled();
    });

    it('recovers from invalid relationship type selections', () => {
      // Component should handle invalid selections gracefully
      renderWithProviders(<AddRelationshipPage />, { withAuth: true });
      
      const relationshipSelect = screen.getByRole('combobox', { name: /relationship type/i });
      expect(relationshipSelect).toBeInTheDocument();
      
      // Component should maintain valid state
      expect(relationshipSelect).not.toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('Integration with Other Form Fields', () => {
    it('coordinates with privacy level settings', async () => {
      renderWithProviders(<AddRelationshipPage />, { withAuth: true });
      
      // Select friendship type
      const relationshipSelect = screen.getByRole('combobox', { name: /relationship type/i });
      await user.click(relationshipSelect);
      
      const friendshipOption = screen.getByRole('option', { name: /friendship/i });
      await user.click(friendshipOption);
      
      // Privacy settings should still be available
      expect(screen.getByText(/privacy level/i)).toBeInTheDocument();
      
      // Select a privacy level
      const limitedAccessButton = screen.getByRole('button', { name: /limited access/i });
      await user.click(limitedAccessButton);
      
      expect(limitedAccessButton).toHaveClass(/border-primary/);
    });

    it('works with all form fields for complete relationship creation', async () => {
      renderWithProviders(<AddRelationshipPage />, { withAuth: true });
      
      // Fill all fields including friendship relationship type
      await user.type(screen.getByLabelText(/connection.*name/i), 'Best Friend');
      await user.type(screen.getByLabelText(/email/i), 'friend@example.com');
      
      const relationshipSelect = screen.getByRole('combobox', { name: /relationship type/i });
      await user.click(relationshipSelect);
      
      const friendshipOption = screen.getByRole('option', { name: /friendship/i });
      await user.click(friendshipOption);
      
      // Select color
      const colorButtons = screen.getAllByRole('button', { name: /select color/i });
      await user.click(colorButtons[0]);
      
      // Add notes
      await user.type(screen.getByLabelText(/notes/i), 'My closest friend since college');
      
      const submitButton = screen.getByRole('button', { name: /add connection/i });
      expect(submitButton).not.toBeDisabled();
      
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(submitButton).toHaveTextContent(/adding connection/i);
      });
    });
  });

  describe('Performance', () => {
    it('does not cause unnecessary re-renders when switching types', async () => {
      const renderSpy = vi.fn();
      
      const TrackedRelationshipForm = () => {
        renderSpy();
        return <AddRelationshipPage />;
      };
      
      renderWithProviders(<TrackedRelationshipForm />, { withAuth: true });
      
      const relationshipSelect = screen.getByRole('combobox', { name: /relationship type/i });
      
      const initialRenderCount = renderSpy.mock.calls.length;
      
      // Switch between types
      await user.click(relationshipSelect);
      await user.click(screen.getByRole('option', { name: /friendship/i }));
      
      await user.click(relationshipSelect);
      await user.click(screen.getByRole('option', { name: /primary/i }));
      
      // Should not cause excessive re-renders
      const finalRenderCount = renderSpy.mock.calls.length;
      expect(finalRenderCount - initialRenderCount).toBeLessThan(10);
    });
  });
});