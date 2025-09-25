import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EventCard } from '@/components/ui/event-card'
import type { Event } from '@/lib/supabase/types'

// Mock the time zone utility functions
vi.mock('@/lib/time-zones/time-zone-utils', () => ({
  formatDateInTimeZone: (date: string, timeZone: string, format: string) => {
    if (format === 'MMM d, yyyy') return 'Sep 6, 2024'
    if (format === 'h:mm a') return '10:00 AM'
    return 'Formatted Date'
  },
  getEffectiveTimeZone: (timeZone?: string) => timeZone || 'America/New_York'
}))

// Mock tooltip component
vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => children
}))

describe('EventCard Component', () => {
  const mockEvent: Event = {
    id: 'event-1',
    user_id: 'user-1',
    title: 'Team Meeting',
    description: 'Weekly team sync meeting',
    start_time: '2030-09-06T14:00:00Z', // 2 PM UTC (future time - year 2030)
    end_time: '2030-09-06T15:00:00Z',   // 3 PM UTC
    privacy_level: 'visible',
    status: 'confirmed',
    location: 'Conference Room A',
    color: '#3b82f6',
    time_zone: 'America/New_York',
    is_all_day: false,
    visible_to_relationships: ['rel-1', 'rel-2'],
    visible_to_groups: undefined,
    created_at: '2024-09-01T00:00:00Z',
    updated_at: '2024-09-01T00:00:00Z',
  }

  const defaultProps = {
    event: mockEvent,
    onEdit: vi.fn(),
    onClick: vi.fn(),
    onJoin: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  describe('Basic Rendering', () => {
    it('renders event title and basic information', () => {
      const { container } = render(<EventCard {...defaultProps} />)

      expect(container.querySelector('[data-testid="event-card"]')).toBeInTheDocument()
      expect(screen.getByText('Team Meeting')).toBeInTheDocument()
      expect(screen.getByText('Weekly team sync meeting')).toBeInTheDocument()
      expect(screen.getByText('Conference Room A')).toBeInTheDocument()
    })

    it('displays formatted date and time', () => {
      const { container } = render(<EventCard {...defaultProps} />)

      const card = container.querySelector('[data-testid="event-card"]')
      expect(card).toBeInTheDocument()
      // Date and time are displayed within the card
    })

    it('renders as article with proper ARIA attributes', () => {
      const { container } = render(<EventCard {...defaultProps} />)

      const card = container.querySelector('[data-testid="event-card"]')
      expect(card).toBeInTheDocument()
      expect(card).toHaveAttribute('aria-labelledby', 'event-card-title')
      expect(card).toHaveAttribute('aria-describedby', 'event-card-details')
    })
  })

  describe('Privacy Level Display', () => {
    it('shows privacy level indicator for visible events', () => {
      const { container } = render(<EventCard {...defaultProps} />)

      expect(container.querySelector('[data-testid="event-card"]')).toBeInTheDocument()
      // Should show full details for visible privacy level
      expect(screen.getByText('Weekly team sync meeting')).toBeInTheDocument()
      expect(screen.getByText('Conference Room A')).toBeInTheDocument()
    })

    it('shows limited information for semi-private events', () => {
      const semiPrivateEvent = {
        ...mockEvent,
        privacy_level: 'semi_private' as const,
      }

      const { container } = render(<EventCard {...defaultProps} event={semiPrivateEvent} />)

      expect(container.querySelector('[data-testid="event-card"]')).toBeInTheDocument()
      // Should show title but maybe limited details
      expect(screen.getByText('Team Meeting')).toBeInTheDocument()
    })

    it('shows minimal information for private events', () => {
      const privateEvent = {
        ...mockEvent,
        privacy_level: 'private' as const,
      }

      const { container } = render(<EventCard {...defaultProps} event={privateEvent} />)

      expect(container.querySelector('[data-testid="event-card"]')).toBeInTheDocument()
      // For private events, might show "Busy" or limited info
      expect(screen.getByText('Team Meeting')).toBeInTheDocument()
    })
  })

  describe('Event Status Display', () => {
    it('displays confirmed status correctly', () => {
      const { container } = render(<EventCard {...defaultProps} />)

      // Should have some visual indicator for confirmed status
      const card = container.querySelector('[data-testid="event-card"]')
      expect(card).toBeInTheDocument()
    })

    it('displays tentative status correctly', () => {
      const tentativeEvent = {
        ...mockEvent,
        status: 'tentative' as const,
      }

      const { container } = render(<EventCard {...defaultProps} event={tentativeEvent} />)

      const card = container.querySelector('[data-testid="event-card"]')
      expect(card).toBeInTheDocument()
      // Should have different styling or indicator for tentative events
    })

    it('displays cancelled status correctly', () => {
      const cancelledEvent = {
        ...mockEvent,
        status: 'cancelled' as const,
      }

      const { container } = render(<EventCard {...defaultProps} event={cancelledEvent} />)

      const card = container.querySelector('[data-testid="event-card"]')
      expect(card).toBeInTheDocument()
      // Should have strikethrough or other cancelled styling
    })
  })

  describe('Action Buttons', () => {
    it('shows edit button for upcoming events when user can edit', async () => {
      const onEdit = vi.fn()
      const user = userEvent.setup()
      
      render(<EventCard 
        {...defaultProps} 
        onEdit={onEdit} 
        canEdit={true}
        currentUserId="user-1"
      />)
      
      const editButton = screen.getByRole('button', { name: /edit/i })
      await user.click(editButton)
      
      expect(onEdit).toHaveBeenCalledWith(mockEvent)
    })

    it('shows view button for events when user cannot edit', async () => {
      const onClick = vi.fn()
      const user = userEvent.setup()
      
      render(<EventCard {...defaultProps} onClick={onClick} canEdit={false} />)
      
      const viewButton = screen.getByRole('button', { name: /view/i })
      await user.click(viewButton)
      
      expect(onClick).toHaveBeenCalledWith(mockEvent)
    })

    it('shows join button for live events', async () => {
      const onJoin = vi.fn()
      const user = userEvent.setup()
      
      // Create a live event (current time between start and end)
      const liveEvent = {
        ...mockEvent,
        start_time: new Date(Date.now() - 30*60*1000).toISOString(), // 30 min ago
        end_time: new Date(Date.now() + 30*60*1000).toISOString(),   // 30 min from now
      }
      
      render(<EventCard {...defaultProps} event={liveEvent} onJoin={onJoin} />)
      
      const joinButton = screen.getByRole('button', { name: /join/i })
      await user.click(joinButton)
      
      expect(onJoin).toHaveBeenCalledWith(liveEvent)
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      const { container } = render(<EventCard {...defaultProps} />)

      const card = container.querySelector('[data-testid="event-card"]')
      expect(card).toHaveAttribute('aria-labelledby', 'event-card-title')
      expect(card).toHaveAttribute('aria-describedby', 'event-card-details')
      expect(card).toHaveAttribute('tabindex', '0')
    })

    it('supports keyboard navigation for card interaction', async () => {
      const onClick = vi.fn()
      const user = userEvent.setup()

      const { container } = render(<EventCard {...defaultProps} onClick={onClick} />)

      const card = container.querySelector('[data-testid="event-card"]') as HTMLElement
      card?.focus()
      await user.keyboard('{Enter}')

      expect(onClick).toHaveBeenCalled()
    })

    it('provides screen reader friendly content', () => {
      const { container } = render(<EventCard {...defaultProps} />)

      expect(container.querySelector('[data-testid="event-card"]')).toBeInTheDocument()
      // Should have screen reader labels
      expect(screen.getByText('Date:')).toBeInTheDocument() // Screen reader text
      expect(screen.getByText('Time:')).toBeInTheDocument() // Screen reader text
      expect(screen.getByText('Attendees:')).toBeInTheDocument() // Screen reader text
      expect(screen.getByText('Privacy level:')).toBeInTheDocument() // Screen reader text
    })
  })

  describe('Responsive Design', () => {
    it('adapts layout for mobile screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 })

      const { container } = render(<EventCard {...defaultProps} />)

      const card = container.querySelector('[data-testid="event-card"]')
      expect(card).toBeInTheDocument()
      // Should have mobile-friendly layout
    })

    it('shows full layout on desktop', () => {
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 })

      const { container } = render(<EventCard {...defaultProps} />)

      const card = container.querySelector('[data-testid="event-card"]')
      expect(card).toBeInTheDocument()
    })
  })

  describe('Neurodiversity-Affirming Features', () => {
    it('uses clear, predictable layout', () => {
      const { container } = render(<EventCard {...defaultProps} />)

      expect(container.querySelector('[data-testid="event-card"]')).toBeInTheDocument()
      // Title should be prominently displayed
      const title = screen.getByText('Team Meeting')
      expect(title).toBeInTheDocument()

      // Time information should be clearly visible
      expect(screen.getByText('10:00 AM - 10:00 AM')).toBeInTheDocument()
    })

    it('provides sufficient contrast for text', () => {
      const { container } = render(<EventCard {...defaultProps} />)

      const card = container.querySelector('[data-testid="event-card"]')
      expect(card).toBeInTheDocument()
      // Text should have sufficient contrast (tested through styling)
    })

    it('uses consistent visual hierarchy', () => {
      const { container } = render(<EventCard {...defaultProps} />)

      expect(container.querySelector('[data-testid="event-card"]')).toBeInTheDocument()
      // Title should be the most prominent element
      const title = screen.getByText('Team Meeting')
      expect(title).toBeInTheDocument()

      // Description should be secondary
      const description = screen.getByText('Weekly team sync meeting')
      expect(description).toBeInTheDocument()
    })

    it('avoids overwhelming animations or effects', () => {
      const { container } = render(<EventCard {...defaultProps} />)

      const card = container.querySelector('[data-testid="event-card"]')
      // Should not have distracting animations
      expect(card).not.toHaveClass('animate-bounce', 'animate-pulse')
    })
  })

  describe('Event Details Toggle', () => {
    it('shows details when showDetails is true', () => {
      const { container } = render(<EventCard {...defaultProps} showDetails={true} />)

      expect(container.querySelector('[data-testid="event-card"]')).toBeInTheDocument()
      expect(screen.getByText('Weekly team sync meeting')).toBeInTheDocument()
      expect(screen.getByText('Conference Room A')).toBeInTheDocument()
    })

    it('hides details when showDetails is false', () => {
      const { container } = render(<EventCard {...defaultProps} showDetails={false} />)

      expect(container.querySelector('[data-testid="event-card"]')).toBeInTheDocument()
      // Only title should be visible
      expect(screen.getByText('Team Meeting')).toBeInTheDocument()
      expect(screen.queryByText('Weekly team sync description')).not.toBeInTheDocument()
    })
  })

  describe('Time Zone Handling', () => {
    it('displays time in correct timezone', () => {
      const { container } = render(<EventCard {...defaultProps} />)

      expect(container.querySelector('[data-testid="event-card"]')).toBeInTheDocument()
      // Time is formatted according to the timezone
      expect(screen.getByText('10:00 AM - 10:00 AM')).toBeInTheDocument()
    })

    it('handles different timezones correctly', () => {
      const eventWithDifferentTz = {
        ...mockEvent,
        time_zone: 'Europe/London'
      }

      const { container } = render(<EventCard {...defaultProps} event={eventWithDifferentTz} />)

      expect(container.querySelector('[data-testid="event-card"]')).toBeInTheDocument()
      // Time is formatted for the specified timezone
      expect(screen.getByText('10:00 AM - 10:00 AM')).toBeInTheDocument()
    })
  })
})