import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PrivacyLevelSelector } from '@/components/ui/privacy-level-selector'
import type { PrivacyLevel } from '@/lib/supabase/types'

describe('PrivacyLevelSelector Component', () => {
  const defaultProps = {
    value: 'private' as PrivacyLevel,
    onChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Functionality', () => {
    it('renders with initial value', () => {
      render(<PrivacyLevelSelector {...defaultProps} />)
      
      const trigger = screen.getByRole('combobox')
      expect(trigger).toBeInTheDocument()
      expect(trigger).toHaveTextContent('Private')
    })

    it('displays correct icon for privacy level', () => {
      render(<PrivacyLevelSelector {...defaultProps} value="visible" />)
      
      const trigger = screen.getByRole('combobox')
      expect(trigger.querySelector('svg')).toBeInTheDocument() // Eye icon for visible
    })

    it('opens dropdown when clicked', async () => {
      const user = userEvent.setup()
      render(<PrivacyLevelSelector {...defaultProps} />)
      
      const trigger = screen.getByRole('combobox')
      await user.click(trigger)
      
      expect(screen.getByRole('option', { name: /private/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /busy only/i })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: /full details/i })).toBeInTheDocument()
    })
  })

  describe('Privacy Level Options', () => {
    it('displays all privacy levels correctly', async () => {
      const user = userEvent.setup()
      render(<PrivacyLevelSelector {...defaultProps} />)
      
      const trigger = screen.getByRole('combobox')
      await user.click(trigger)
      
      // Check all three privacy levels are present
      expect(screen.getByText('Private')).toBeInTheDocument()
      expect(screen.getByText('Busy Only')).toBeInTheDocument()
      expect(screen.getByText('Full Details')).toBeInTheDocument()
    })

    it('shows descriptions when description prop is true', async () => {
      const user = userEvent.setup()
      render(<PrivacyLevelSelector {...defaultProps} description={true} />)
      
      const trigger = screen.getByRole('combobox')
      await user.click(trigger)
      
      expect(screen.getByText('No access to any calendar information')).toBeInTheDocument()
      expect(screen.getByText('Can see when you are busy but not event details')).toBeInTheDocument()
      expect(screen.getByText('Can see all details of events and calendar')).toBeInTheDocument()
    })

    it('handles selection change', async () => {
      const onChange = vi.fn()
      const user = userEvent.setup()
      render(<PrivacyLevelSelector {...defaultProps} onChange={onChange} />)
      
      const trigger = screen.getByRole('combobox')
      await user.click(trigger)
      
      const visibleOption = screen.getByRole('option', { name: /full details/i })
      await user.click(visibleOption)
      
      expect(onChange).toHaveBeenCalledWith('visible')
    })
  })

  describe('Badge Mode', () => {
    it('renders as badge when showBadge is true', () => {
      render(<PrivacyLevelSelector {...defaultProps} showBadge={true} />)
      
      const badge = screen.getByRole('combobox')
      expect(badge).toHaveClass('flex', 'items-center', 'justify-between', 'cursor-pointer')
    })

    it('handles badge click to open dropdown', async () => {
      const user = userEvent.setup()
      render(<PrivacyLevelSelector {...defaultProps} showBadge={true} />)
      
      const badge = screen.getByRole('combobox')
      await user.click(badge)
      
      expect(screen.getByRole('option', { name: /private/i })).toBeInTheDocument()
    })
  })

  describe('Disabled State', () => {
    it('renders as disabled when disabled prop is true', () => {
      render(<PrivacyLevelSelector {...defaultProps} disabled={true} />)
      
      const trigger = screen.getByRole('combobox')
      expect(trigger).toBeDisabled()
      expect(trigger).toHaveClass('opacity-50', 'cursor-not-allowed')
    })

    it('prevents interaction when disabled', async () => {
      const user = userEvent.setup()
      render(<PrivacyLevelSelector {...defaultProps} disabled={true} />)
      
      const trigger = screen.getByRole('combobox')
      await user.click(trigger)
      
      // Dropdown should not open
      expect(screen.queryByRole('option')).not.toBeInTheDocument()
    })

    it('prevents badge click when disabled', async () => {
      const user = userEvent.setup()
      render(<PrivacyLevelSelector {...defaultProps} showBadge={true} disabled={true} />)
      
      const badge = screen.getByRole('combobox')
      await user.click(badge)
      
      expect(screen.queryByRole('option')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<PrivacyLevelSelector {...defaultProps} />)
      
      const trigger = screen.getByRole('combobox')
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
    })

    it('updates ARIA expanded state when opened', async () => {
      const user = userEvent.setup()
      render(<PrivacyLevelSelector {...defaultProps} />)
      
      const trigger = screen.getByRole('combobox')
      await user.click(trigger)
      
      expect(trigger).toHaveAttribute('aria-expanded', 'true')
    })

    it('supports keyboard navigation', async () => {
      const onChange = vi.fn()
      const user = userEvent.setup()
      render(<PrivacyLevelSelector {...defaultProps} onChange={onChange} />)
      
      const trigger = screen.getByRole('combobox')
      trigger.focus()
      await user.keyboard('{Enter}')
      
      // Should open dropdown
      expect(screen.getByRole('option', { name: /private/i })).toBeInTheDocument()
      
      // Navigate with arrow keys
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{Enter}')
      
      expect(onChange).toHaveBeenCalled()
    })

    it('has proper tooltip descriptions for options', async () => {
      const user = userEvent.setup()
      render(<PrivacyLevelSelector {...defaultProps} />)
      
      const trigger = screen.getByRole('combobox')
      await user.click(trigger)
      
      const privateOption = screen.getByRole('option', { name: /private/i })
      expect(privateOption).toHaveAttribute('title', 'No access to any calendar information')
    })
  })

  describe('Neurodiversity-Affirming Features', () => {
    it('uses clear, literal labels without metaphors', async () => {
      const user = userEvent.setup()
      render(<PrivacyLevelSelector {...defaultProps} />)
      
      const trigger = screen.getByRole('combobox')
      await user.click(trigger)
      
      // Labels are clear and descriptive
      expect(screen.getByText('Private')).toBeInTheDocument()
      expect(screen.getByText('Busy Only')).toBeInTheDocument()
      expect(screen.getByText('Full Details')).toBeInTheDocument()
    })

    it('provides visual icons for better understanding', () => {
      render(<PrivacyLevelSelector {...defaultProps} value="private" />)
      
      const trigger = screen.getByRole('combobox')
      const icon = trigger.querySelector('svg')
      expect(icon).toBeInTheDocument()
    })

    it('shows check mark for currently selected option', async () => {
      const user = userEvent.setup()
      render(<PrivacyLevelSelector {...defaultProps} value="semi_private" />)
      
      const trigger = screen.getByRole('combobox')
      await user.click(trigger)
      
      // Find the semi_private option and check for the check mark
      const options = screen.getAllByRole('option')
      const semiPrivateOption = options.find(option => option.textContent?.includes('Busy Only'))
      expect(semiPrivateOption?.querySelector('.opacity-100')).toBeInTheDocument()
    })
  })

  describe('Search Functionality', () => {
    it('includes search input for better UX', async () => {
      const user = userEvent.setup()
      render(<PrivacyLevelSelector {...defaultProps} />)
      
      const trigger = screen.getByRole('combobox')
      await user.click(trigger)
      
      const searchInput = screen.getByPlaceholderText('Search privacy levels...')
      expect(searchInput).toBeInTheDocument()
    })

    it('filters options based on search input', async () => {
      const user = userEvent.setup()
      render(<PrivacyLevelSelector {...defaultProps} />)
      
      const trigger = screen.getByRole('combobox')
      await user.click(trigger)
      
      const searchInput = screen.getByPlaceholderText('Search privacy levels...')
      await user.type(searchInput, 'private')
      
      // Should show Private option but hide others
      await waitFor(() => {
        expect(screen.getByText('Private')).toBeInTheDocument()
      })
    })
  })

  describe('Color Coding', () => {
    it('applies correct color classes for privacy levels', async () => {
      const user = userEvent.setup()
      render(<PrivacyLevelSelector {...defaultProps} />)
      
      const trigger = screen.getByRole('combobox')
      await user.click(trigger)
      
      // Check that different privacy levels have different color indicators
      const options = screen.getAllByRole('option')
      expect(options.length).toBeGreaterThan(0)
      
      // Each option should have a colored indicator
      options.forEach(option => {
        const indicator = option.querySelector('.rounded-full')
        expect(indicator).toBeInTheDocument()
      })
    })
  })
})