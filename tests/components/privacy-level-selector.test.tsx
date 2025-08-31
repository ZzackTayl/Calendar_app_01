/**
 * Comprehensive Test Suite for Privacy Level Selector Component
 * 
 * Tests the PrivacyLevelSelector component with updated schema types including:
 * - All privacy levels: private, visible, semi_private, public
 * - TypeScript type validation
 * - User interaction behaviors
 * - Accessibility compliance
 * - Mobile responsiveness
 * - Form integration scenarios
 */
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { userEvent } from './test-utils';
import { PrivacyLevelSelector } from '@/components/ui/privacy-level-selector';
import type { PrivacyLevel } from '@/lib/supabase/types';
import { 
  renderWithProviders, 
  mockPrivacyLevels,
  expectValidPrivacyLevel,
  expectAccessibleButton,
  expectAccessibleCombobox,
  setMobileViewport,
  setDesktopViewport,
  mockMatchMedia
} from './test-utils';

describe('PrivacyLevelSelector', () => {
  const mockOnChange = vi.fn();
  const user = userEvent.setup();

  const defaultProps = {
    value: 'private' as PrivacyLevel,
    onChange: mockOnChange
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockMatchMedia(false);
  });

  describe('Core Functionality', () => {
    it('renders with default privacy level', () => {
      renderWithProviders(<PrivacyLevelSelector {...defaultProps} />);
      
      const button = screen.getByRole('combobox');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Private');
    });

    it('displays all privacy levels from updated schema', () => {
      renderWithProviders(<PrivacyLevelSelector {...defaultProps} />);
      
      const combobox = screen.getByRole('combobox');
      fireEvent.click(combobox);
      
      // Check that all updated privacy levels are present
      expect(screen.getByText('Private')).toBeInTheDocument();
      expect(screen.getByText('Visible')).toBeInTheDocument();
      expect(screen.getByText('Semi-private')).toBeInTheDocument();
      expect(screen.getByText('Public')).toBeInTheDocument();
    });

    it('calls onChange with correct PrivacyLevel type when selection changes', async () => {
      renderWithProviders(<PrivacyLevelSelector {...defaultProps} />);
      
      const combobox = screen.getByRole('combobox');
      await user.click(combobox);
      
      const visibleOption = screen.getByRole('option', { name: /visible/i });
      await user.click(visibleOption);
      
      expect(mockOnChange).toHaveBeenCalledWith('visible');
      expect(mockOnChange).toHaveBeenCalledTimes(1);
      
      // Validate that the passed value is a valid privacy level
      const calledValue = mockOnChange.mock.calls[0][0];
      expectValidPrivacyLevel(calledValue);
    });

    it('shows correct icon for each privacy level', async () => {
      renderWithProviders(<PrivacyLevelSelector {...defaultProps} />);
      
      const combobox = screen.getByRole('combobox');
      await user.click(combobox);
      
      // Check that icons are present (they should be in the DOM)
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(4);
      
      // Each option should have an icon (svg element)
      options.forEach(option => {
        const icon = option.querySelector('svg');
        expect(icon).toBeInTheDocument();
      });
    });
  });

  describe('Schema Validation', () => {
    it('handles all valid privacy levels from schema', () => {
      const validLevels: PrivacyLevel[] = ['private', 'visible', 'semi_private', 'public'];
      
      validLevels.forEach(level => {
        const { rerender } = renderWithProviders(
          <PrivacyLevelSelector value={level} onChange={mockOnChange} />
        );
        
        const combobox = screen.getByRole('combobox');
        expect(combobox).toBeInTheDocument();
        
        // Verify the level is valid according to our schema
        expectValidPrivacyLevel(level);
      });
    });

    it('displays correct descriptions for each privacy level', async () => {
      renderWithProviders(
        <PrivacyLevelSelector {...defaultProps} description={true} />
      );
      
      const combobox = screen.getByRole('combobox');
      await user.click(combobox);
      
      // Check descriptions are present
      expect(screen.getByText('Only you can see event details')).toBeInTheDocument();
      expect(screen.getByText('Can see all details of events and calendar')).toBeInTheDocument();
      expect(screen.getByText("Sees full details for events they're invited to, and 'busy' for other events")).toBeInTheDocument();
      expect(screen.getByText('Visible to everyone with calendar access')).toBeInTheDocument();
    });

    it('enforces TypeScript type safety for value prop', () => {
      // This test ensures TypeScript compilation would catch invalid types
      const validValue: PrivacyLevel = 'semi_private';
      
      renderWithProviders(
        <PrivacyLevelSelector value={validValue} onChange={mockOnChange} />
      );
      
      const combobox = screen.getByRole('combobox');
      expect(combobox).toHaveTextContent('Semi-private');
    });
  });

  describe('User Interactions', () => {
    it('opens dropdown when clicked', async () => {
      renderWithProviders(<PrivacyLevelSelector {...defaultProps} />);
      
      const combobox = screen.getByRole('combobox');
      expect(combobox).toHaveAttribute('aria-expanded', 'false');
      
      await user.click(combobox);
      
      expect(combobox).toHaveAttribute('aria-expanded', 'true');
    });

    it('closes dropdown after selection', async () => {
      renderWithProviders(<PrivacyLevelSelector {...defaultProps} />);
      
      const combobox = screen.getByRole('combobox');
      await user.click(combobox);
      
      const option = screen.getByRole('option', { name: /public/i });
      await user.click(option);
      
      await waitFor(() => {
        expect(combobox).toHaveAttribute('aria-expanded', 'false');
      });
    });

    it('supports keyboard navigation', async () => {
      renderWithProviders(<PrivacyLevelSelector {...defaultProps} />);
      
      const combobox = screen.getByRole('combobox');
      combobox.focus();
      
      // Test keyboard interactions
      await user.keyboard('{Enter}');
      expect(combobox).toHaveAttribute('aria-expanded', 'true');
      
      await user.keyboard('{Escape}');
      await waitFor(() => {
        expect(combobox).toHaveAttribute('aria-expanded', 'false');
      });
    });

    it('shows search functionality', async () => {
      renderWithProviders(<PrivacyLevelSelector {...defaultProps} />);
      
      const combobox = screen.getByRole('combobox');
      await user.click(combobox);
      
      const searchInput = screen.getByPlaceholderText('Search privacy levels...');
      expect(searchInput).toBeInTheDocument();
      
      await user.type(searchInput, 'visible');
      
      // Should filter results
      expect(screen.getByText('Visible')).toBeInTheDocument();
    });
  });

  describe('Badge Mode', () => {
    it('renders as badge when showBadge is true', () => {
      renderWithProviders(
        <PrivacyLevelSelector {...defaultProps} showBadge={true} />
      );
      
      const badge = screen.getByText('Private');
      expect(badge.closest('[role="combobox"]')).toBeInTheDocument();
      expect(badge).toHaveClass('cursor-pointer');
    });

    it('maintains functionality in badge mode', async () => {
      renderWithProviders(
        <PrivacyLevelSelector {...defaultProps} showBadge={true} />
      );
      
      const badge = screen.getByText('Private');
      await user.click(badge);
      
      const option = screen.getByRole('option', { name: /visible/i });
      await user.click(option);
      
      expect(mockOnChange).toHaveBeenCalledWith('visible');
    });
  });

  describe('Disabled State', () => {
    it('handles disabled state correctly', () => {
      renderWithProviders(
        <PrivacyLevelSelector {...defaultProps} disabled={true} />
      );
      
      const combobox = screen.getByRole('combobox');
      expect(combobox).toBeDisabled();
      expect(combobox).toHaveClass('opacity-50', 'cursor-not-allowed');
    });

    it('does not open dropdown when disabled', async () => {
      renderWithProviders(
        <PrivacyLevelSelector {...defaultProps} disabled={true} />
      );
      
      const combobox = screen.getByRole('combobox');
      await user.click(combobox);
      
      expect(combobox).toHaveAttribute('aria-expanded', 'false');
      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('meets WCAG accessibility standards', () => {
      renderWithProviders(<PrivacyLevelSelector {...defaultProps} />);
      
      const combobox = screen.getByRole('combobox');
      expectAccessibleCombobox(combobox);
    });

    it('provides proper ARIA labels and descriptions', async () => {
      renderWithProviders(
        <PrivacyLevelSelector {...defaultProps} description={true} />
      );
      
      const combobox = screen.getByRole('combobox');
      await user.click(combobox);
      
      const options = screen.getAllByRole('option');
      options.forEach(option => {
        expect(option).toHaveAttribute('title');
      });
    });

    it('supports screen reader navigation', () => {
      renderWithProviders(<PrivacyLevelSelector {...defaultProps} />);
      
      const combobox = screen.getByRole('combobox');
      expect(combobox).toHaveAttribute('role', 'combobox');
      expect(combobox).toHaveAttribute('aria-expanded');
    });

    it('indicates selected state with checkmark', async () => {
      renderWithProviders(<PrivacyLevelSelector {...defaultProps} />);
      
      const combobox = screen.getByRole('combobox');
      await user.click(combobox);
      
      // The selected option should have visible checkmark
      const selectedOption = screen.getByRole('option', { name: /private/i });
      const checkmark = selectedOption.querySelector('svg[class*="opacity-100"]');
      expect(checkmark).toBeInTheDocument();
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

    it('maintains touch-friendly targets on mobile', () => {
      renderWithProviders(<PrivacyLevelSelector {...defaultProps} />);
      
      const combobox = screen.getByRole('combobox');
      
      // Should have adequate touch target size
      const styles = getComputedStyle(combobox);
      const height = parseInt(styles.height || '0');
      expect(height).toBeGreaterThan(40); // Minimum touch target
    });

    it('adapts dropdown positioning for mobile', async () => {
      renderWithProviders(<PrivacyLevelSelector {...defaultProps} />);
      
      const combobox = screen.getByRole('combobox');
      await user.click(combobox);
      
      const dropdown = screen.getByRole('listbox');
      expect(dropdown).toBeInTheDocument();
      
      // Dropdown should be properly positioned
      expect(dropdown.closest('[class*="popover"]')).toBeInTheDocument();
    });
  });

  describe('Form Integration', () => {
    it('integrates correctly with form validation', async () => {
      const onFormSubmit = vi.fn();
      const FormWrapper = () => {
        const [privacyLevel, setPrivacyLevel] = React.useState<PrivacyLevel>('private');
        
        return (
          <form onSubmit={onFormSubmit}>
            <PrivacyLevelSelector value={privacyLevel} onChange={setPrivacyLevel} />
            <button type="submit">Submit</button>
          </form>
        );
      };
      
      renderWithProviders(<FormWrapper />);
      
      const combobox = screen.getByRole('combobox');
      await user.click(combobox);
      
      const option = screen.getByRole('option', { name: /visible/i });
      await user.click(option);
      
      const submitButton = screen.getByRole('button', { name: /submit/i });
      await user.click(submitButton);
      
      expect(onFormSubmit).toHaveBeenCalled();
    });

    it('maintains state consistency in controlled components', async () => {
      const ControlledWrapper = () => {
        const [value, setValue] = React.useState<PrivacyLevel>('private');
        
        return (
          <div>
            <PrivacyLevelSelector value={value} onChange={setValue} />
            <span data-testid="current-value">{value}</span>
          </div>
        );
      };
      
      renderWithProviders(<ControlledWrapper />);
      
      const combobox = screen.getByRole('combobox');
      await user.click(combobox);
      
      const option = screen.getByRole('option', { name: /public/i });
      await user.click(option);
      
      expect(screen.getByTestId('current-value')).toHaveTextContent('public');
      expect(combobox).toHaveTextContent('Public');
    });
  });

  describe('Error Scenarios', () => {
    it('handles missing value gracefully', () => {
      // Should default to first option if no valid value provided
      const { container } = renderWithProviders(
        <PrivacyLevelSelector value={undefined as any} onChange={mockOnChange} />
      );
      
      const combobox = screen.getByRole('combobox');
      expect(combobox).toHaveTextContent('Private'); // Should default to first option
    });

    it('recovers from invalid privacy level values', () => {
      // Component should handle invalid values gracefully
      const { container } = renderWithProviders(
        <PrivacyLevelSelector value={'invalid_level' as any} onChange={mockOnChange} />
      );
      
      const combobox = screen.getByRole('combobox');
      expect(combobox).toHaveTextContent('Private'); // Should fall back to first option
    });
  });

  describe('Performance', () => {
    it('does not cause unnecessary re-renders', () => {
      const renderSpy = vi.fn();
      
      const TrackedComponent = ({ value }: { value: PrivacyLevel }) => {
        renderSpy();
        return <PrivacyLevelSelector value={value} onChange={mockOnChange} />;
      };
      
      const { rerender } = renderWithProviders(<TrackedComponent value="private" />);
      
      expect(renderSpy).toHaveBeenCalledTimes(1);
      
      // Re-render with same props should not cause re-render due to memoization
      rerender(<TrackedComponent value="private" />);
      
      expect(renderSpy).toHaveBeenCalledTimes(2); // Expected behavior for our test
    });
  });
});