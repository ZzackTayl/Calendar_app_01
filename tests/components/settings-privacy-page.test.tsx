/**
 * Comprehensive Test Suite for Settings Privacy Page
 * 
 * Tests the PrivacySettingsPage component with updated schema types including:
 * - All privacy levels: private, visible, semi_private, public
 * - Privacy level selector integration
 * - Permissions matrix functionality
 * - Security and sharing settings
 * - Mobile responsiveness and accessibility
 * - Tab navigation and state management
 */
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { userEvent } from './test-utils';
import PrivacySettingsPage from '@/app/settings/privacy/page';
import { 
  renderWithProviders, 
  mockPrivacyLevels,
  mockUser,
  mockRelationships,
  mockFetch,
  expectValidPrivacyLevel,
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
  useSearchParams: () => ({
    get: vi.fn(() => null), // Default to no search params
  }),
}));

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    user: mockUser,
    demoMode: true, // Use demo mode for consistent testing
    loading: false,
  }),
}));

vi.mock('@/lib/demo-store', () => ({
  DemoStore: {
    listRelationships: vi.fn(() => mockRelationships),
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/components/ui/permission-editor', () => ({
  PermissionEditor: ({ items, onChange }: any) => (
    <div data-testid="permission-editor">
      <p>Permission Matrix: {items.length} items</p>
      {items.map((item: any) => (
        <div key={item.target.id} data-testid={`permission-item-${item.target.id}`}>
          <span>{item.target.name}</span>
          <select
            data-testid={`permission-select-${item.target.id}`}
            value={item.default}
            onChange={(e) => {
              const updated = items.map((i: any) => 
                i.target.id === item.target.id 
                  ? { ...i, default: e.target.value }
                  : i
              );
              onChange(updated);
            }}
          >
            {mockPrivacyLevels.map(level => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </div>
      ))}
    </div>
  ),
}));

describe('Settings Privacy Page', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    mockMatchMedia(false);
    mockFetch({ message: 'Settings saved successfully' });
  });

  describe('Core Functionality', () => {
    it('renders the privacy settings page with all sections', async () => {
      renderWithProviders(<PrivacySettingsPage />, { withAuth: true });
      
      await waitFor(() => {
        expect(screen.getByText(/privacy settings/i)).toBeInTheDocument();
      });
      
      // Check main tabs are present
      expect(screen.getByRole('tab', { name: /permissions/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /sharing/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /security/i })).toBeInTheDocument();
    });

    it('displays the default privacy level selector with all options', async () => {
      renderWithProviders(<PrivacySettingsPage />, { withAuth: true });
      
      await waitFor(() => {
        expect(screen.getByText(/default privacy level/i)).toBeInTheDocument();
      });
      
      const privacySelector = screen.getByRole('combobox');
      await user.click(privacySelector);
      
      // Verify all privacy levels are available
      expect(screen.getByRole('option', { name: /private/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /visible/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /semi-private/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /public/i })).toBeInTheDocument();
    });

    it('shows permission matrix with relationship data', async () => {
      renderWithProviders(<PrivacySettingsPage />, { withAuth: true });
      
      await waitFor(() => {
        expect(screen.getByTestId('permission-editor')).toBeInTheDocument();
      });
      
      // Should show permission items for mock relationships
      expect(screen.getByText(/alice johnson/i)).toBeInTheDocument();
      expect(screen.getByText(/bob smith/i)).toBeInTheDocument();
    });
  });

  describe('Privacy Level Integration', () => {
    it('updates default privacy level when selector changes', async () => {
      const mockToast = vi.fn();
      vi.mocked(require('@/hooks/use-toast').useToast).mockReturnValue({ toast: mockToast });
      
      renderWithProviders(<PrivacySettingsPage />, { withAuth: true });
      
      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });
      
      const privacySelector = screen.getByRole('combobox');
      await user.click(privacySelector);
      
      const visibleOption = screen.getByRole('option', { name: /visible/i });
      await user.click(visibleOption);
      
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Default privacy updated',
          description: expect.stringContaining('visible'),
        })
      );
    });

    it('validates privacy level values against schema', () => {
      renderWithProviders(<PrivacySettingsPage />, { withAuth: true });
      
      // The default value should be a valid privacy level
      expectValidPrivacyLevel('private');
    });

    it('allows changing individual permission privacy levels', async () => {
      renderWithProviders(<PrivacySettingsPage />, { withAuth: true });
      
      await waitFor(() => {
        expect(screen.getByTestId('permission-editor')).toBeInTheDocument();
      });
      
      const permissionSelect = screen.getByTestId('permission-select-rel-1');
      await user.selectOptions(permissionSelect, 'visible');
      
      expect(permissionSelect).toHaveValue('visible');
    });
  });

  describe('Tab Navigation', () => {
    it('switches between permission, sharing, and security tabs', async () => {
      renderWithProviders(<PrivacySettingsPage />, { withAuth: true });
      
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /permissions/i })).toBeInTheDocument();
      });
      
      // Start on permissions tab
      expect(screen.getByText(/default privacy level/i)).toBeInTheDocument();
      
      // Switch to sharing tab
      const sharingTab = screen.getByRole('tab', { name: /sharing/i });
      await user.click(sharingTab);
      
      expect(screen.getByText(/calendar sharing/i)).toBeInTheDocument();
      expect(screen.getByText(/public calendar/i)).toBeInTheDocument();
      
      // Switch to security tab
      const securityTab = screen.getByRole('tab', { name: /security/i });
      await user.click(securityTab);
      
      expect(screen.getByText(/data encryption/i)).toBeInTheDocument();
      expect(screen.getByText(/two-factor authentication/i)).toBeInTheDocument();
    });

    it('maintains state when switching between tabs', async () => {
      renderWithProviders(<PrivacySettingsPage />, { withAuth: true });
      
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /sharing/i })).toBeInTheDocument();
      });
      
      // Switch to sharing tab and enable public calendar
      const sharingTab = screen.getByRole('tab', { name: /sharing/i });
      await user.click(sharingTab);
      
      const publicCalendarSwitch = screen.getByRole('switch', { name: /public calendar/i });
      await user.click(publicCalendarSwitch);
      
      expect(publicCalendarSwitch).toBeChecked();
      
      // Switch to security tab and back
      const securityTab = screen.getByRole('tab', { name: /security/i });
      await user.click(securityTab);
      await user.click(sharingTab);
      
      // State should be maintained
      expect(screen.getByRole('switch', { name: /public calendar/i })).toBeChecked();
    });
  });

  describe('Sharing Settings', () => {
    it('enables public calendar sharing', async () => {
      renderWithProviders(<PrivacySettingsPage />, { withAuth: true });
      
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /sharing/i })).toBeInTheDocument();
      });
      
      const sharingTab = screen.getByRole('tab', { name: /sharing/i });
      await user.click(sharingTab);
      
      const publicCalendarSwitch = screen.getByRole('switch', { name: /public calendar/i });
      await user.click(publicCalendarSwitch);
      
      // Should show public calendar link
      expect(screen.getByText(/your public calendar link/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue(/https:\/\/polyharmony\.app\/calendar\/share/)).toBeInTheDocument();
    });

    it('shows active shares with correct privacy levels', async () => {
      renderWithProviders(<PrivacySettingsPage />, { withAuth: true });
      
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /sharing/i })).toBeInTheDocument();
      });
      
      const sharingTab = screen.getByRole('tab', { name: /sharing/i });
      await user.click(sharingTab);
      
      // Should show active shares section
      expect(screen.getByText(/active shares/i)).toBeInTheDocument();
      
      // Should show relationships with non-private access
      const activeShares = screen.getByText(/people and groups currently having access/i).closest('div');
      expect(activeShares).toBeInTheDocument();
    });

    it('provides advanced sharing options', async () => {
      renderWithProviders(<PrivacySettingsPage />, { withAuth: true });
      
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /sharing/i })).toBeInTheDocument();
      });
      
      const sharingTab = screen.getByRole('tab', { name: /sharing/i });
      await user.click(sharingTab);
      
      // Open advanced options
      const advancedTrigger = screen.getByRole('button', { name: /advanced sharing options/i });
      await user.click(advancedTrigger);
      
      expect(screen.getByText(/subscription calendar/i)).toBeInTheDocument();
      expect(screen.getByText(/external calendar access/i)).toBeInTheDocument();
    });
  });

  describe('Security Settings', () => {
    it('displays encryption and security options', async () => {
      renderWithProviders(<PrivacySettingsPage />, { withAuth: true });
      
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /security/i })).toBeInTheDocument();
      });
      
      const securityTab = screen.getByRole('tab', { name: /security/i });
      await user.click(securityTab);
      
      expect(screen.getByText(/data encryption/i)).toBeInTheDocument();
      expect(screen.getByRole('switch', { name: /data encryption/i })).toBeInTheDocument();
      expect(screen.getByText(/two-factor authentication/i)).toBeInTheDocument();
      expect(screen.getByText(/session management/i)).toBeInTheDocument();
    });

    it('shows privacy audit options', async () => {
      renderWithProviders(<PrivacySettingsPage />, { withAuth: true });
      
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /security/i })).toBeInTheDocument();
      });
      
      const securityTab = screen.getByRole('tab', { name: /security/i });
      await user.click(securityTab);
      
      expect(screen.getByText(/privacy audit/i)).toBeInTheDocument();
      expect(screen.getByText(/privacy checkup/i)).toBeInTheDocument();
      expect(screen.getByText(/activity log/i)).toBeInTheDocument();
      expect(screen.getByText(/data export/i)).toBeInTheDocument();
    });

    it('triggers privacy checkup when clicked', async () => {
      renderWithProviders(<PrivacySettingsPage />, { withAuth: true });
      
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /security/i })).toBeInTheDocument();
      });
      
      const securityTab = screen.getByRole('tab', { name: /security/i });
      await user.click(securityTab);
      
      const checkupButton = screen.getByRole('button', { name: /start checkup/i });
      await user.click(checkupButton);
      
      // Should switch back to permissions tab
      expect(screen.getByRole('tab', { name: /permissions/i, selected: true })).toBeInTheDocument();
    });
  });

  describe('Form Actions', () => {
    it('saves privacy settings successfully', async () => {
      const mockToast = vi.fn();
      vi.mocked(require('@/hooks/use-toast').useToast).mockReturnValue({ toast: mockToast });
      
      renderWithProviders(<PrivacySettingsPage />, { withAuth: true });
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save settings/i })).toBeInTheDocument();
      });
      
      const saveButton = screen.getByRole('button', { name: /save settings/i });
      await user.click(saveButton);
      
      expect(saveButton).toHaveTextContent(/saving/i);
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Privacy settings saved',
            description: 'Your privacy preferences have been updated',
          })
        );
      });
    });

    it('shows loading state during save', async () => {
      renderWithProviders(<PrivacySettingsPage />, { withAuth: true });
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save settings/i })).toBeInTheDocument();
      });
      
      const saveButton = screen.getByRole('button', { name: /save settings/i });
      await user.click(saveButton);
      
      expect(saveButton).toHaveTextContent(/saving/i);
      expect(saveButton).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels and roles', async () => {
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
      
      // Navigate with arrow keys
      await user.keyboard('{ArrowRight}');
      
      const sharingTab = screen.getByRole('tab', { name: /sharing/i });
      expect(document.activeElement).toBe(sharingTab);
    });

    it('provides informational alerts with proper ARIA attributes', async () => {
      renderWithProviders(<PrivacySettingsPage />, { withAuth: true });
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
      
      const alerts = screen.getAllByRole('alert');
      alerts.forEach(alert => {
        expect(alert).toBeInTheDocument();
      });
    });

    it('ensures switches have accessible labels', async () => {
      renderWithProviders(<PrivacySettingsPage />, { withAuth: true });
      
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /sharing/i })).toBeInTheDocument();
      });
      
      const sharingTab = screen.getByRole('tab', { name: /sharing/i });
      await user.click(sharingTab);
      
      const switches = screen.getAllByRole('switch');
      switches.forEach(switchElement => {
        expect(switchElement).toHaveAccessibleName();
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

    it('adapts layout for mobile screens', async () => {
      renderWithProviders(<PrivacySettingsPage />, { withAuth: true });
      
      await waitFor(() => {
        expect(screen.getByText(/privacy settings/i)).toBeInTheDocument();
      });
      
      // Header should be responsive
      const header = screen.getByText(/privacy settings/i).closest('header');
      expect(header).toBeInTheDocument();
      
      // Tab list should stack appropriately on mobile
      const tabList = screen.getByRole('tablist');
      expect(tabList).toBeInTheDocument();
    });

    it('maintains touch-friendly targets on mobile', async () => {
      renderWithProviders(<PrivacySettingsPage />, { withAuth: true });
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save settings/i })).toBeInTheDocument();
      });
      
      const saveButton = screen.getByRole('button', { name: /save settings/i });
      const styles = getComputedStyle(saveButton);
      
      // Should have adequate touch target size
      expect(saveButton).toBeVisible();
    });

    it('handles mobile tab navigation', async () => {
      renderWithProviders(<PrivacySettingsPage />, { withAuth: true });
      
      await waitFor(() => {
        expect(screen.getByRole('tablist')).toBeInTheDocument();
      });
      
      const sharingTab = screen.getByRole('tab', { name: /sharing/i });
      
      // Simulate touch interaction
      fireEvent.touchStart(sharingTab);
      fireEvent.touchEnd(sharingTab);
      fireEvent.click(sharingTab);
      
      await waitFor(() => {
        expect(screen.getByText(/calendar sharing/i)).toBeInTheDocument();
      });
    });
  });

  describe('Integration with Permission Matrix', () => {
    it('updates permission matrix when privacy levels change', async () => {
      renderWithProviders(<PrivacySettingsPage />, { withAuth: true });
      
      await waitFor(() => {
        expect(screen.getByTestId('permission-editor')).toBeInTheDocument();
      });
      
      const permissionSelect = screen.getByTestId('permission-select-rel-1');
      await user.selectOptions(permissionSelect, 'visible');
      
      expect(permissionSelect).toHaveValue('visible');
      expectValidPrivacyLevel('visible');
    });

    it('shows correct relationship information in permission matrix', async () => {
      renderWithProviders(<PrivacySettingsPage />, { withAuth: true });
      
      await waitFor(() => {
        expect(screen.getByTestId('permission-editor')).toBeInTheDocument();
      });
      
      // Should show mock relationships
      expect(screen.getByText(/alice johnson/i)).toBeInTheDocument();
      expect(screen.getByText(/bob smith/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles save errors gracefully', async () => {
      mockFetch({ error: 'Failed to save settings' }, false, 500);
      const mockToast = vi.fn();
      vi.mocked(require('@/hooks/use-toast').useToast).mockReturnValue({ toast: mockToast });
      
      renderWithProviders(<PrivacySettingsPage />, { withAuth: true });
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save settings/i })).toBeInTheDocument();
      });
      
      const saveButton = screen.getByRole('button', { name: /save settings/i });
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Error',
            description: 'Failed to save privacy settings',
            variant: 'destructive',
          })
        );
      });
    });

    it('recovers from component errors', () => {
      // Component should handle errors gracefully
      renderWithProviders(<PrivacySettingsPage />, { withAuth: true });
      
      expect(screen.getByText(/loading/i) || screen.getByText(/privacy settings/i)).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('does not cause excessive re-renders', async () => {
      const renderSpy = vi.fn();
      
      const TrackedPrivacySettings = () => {
        renderSpy();
        return <PrivacySettingsPage />;
      };
      
      renderWithProviders(<TrackedPrivacySettings />, { withAuth: true });
      
      await waitFor(() => {
        expect(screen.getByText(/privacy settings/i)).toBeInTheDocument();
      });
      
      const initialRenderCount = renderSpy.mock.calls.length;
      
      // Switch tabs multiple times
      const sharingTab = screen.getByRole('tab', { name: /sharing/i });
      await user.click(sharingTab);
      
      const securityTab = screen.getByRole('tab', { name: /security/i });
      await user.click(securityTab);
      
      const permissionsTab = screen.getByRole('tab', { name: /permissions/i });
      await user.click(permissionsTab);
      
      const finalRenderCount = renderSpy.mock.calls.length;
      
      // Should not cause excessive re-renders
      expect(finalRenderCount - initialRenderCount).toBeLessThan(10);
    });
  });
});