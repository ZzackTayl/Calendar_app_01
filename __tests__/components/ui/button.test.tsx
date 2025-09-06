import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/button'

describe('Button Component', () => {
  describe('Basic Functionality', () => {
    it('renders with default variant and size', () => {
      render(<Button>Default Button</Button>)
      
      const button = screen.getByRole('button', { name: 'Default Button' })
      expect(button).toBeInTheDocument()
      expect(button).toHaveClass('bg-primary', 'text-primary-foreground')
    })

    it('handles click events', async () => {
      const handleClick = vi.fn()
      const user = userEvent.setup()
      
      render(<Button onClick={handleClick}>Click me</Button>)
      
      const button = screen.getByRole('button', { name: 'Click me' })
      await user.click(button)
      
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('renders as disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled Button</Button>)
      
      const button = screen.getByRole('button', { name: 'Disabled Button' })
      expect(button).toBeDisabled()
      expect(button).toHaveClass('disabled:pointer-events-none', 'disabled:opacity-50')
    })
  })

  describe('Variants', () => {
    it('renders destructive variant correctly', () => {
      render(<Button variant="destructive">Delete</Button>)
      
      const button = screen.getByRole('button', { name: 'Delete' })
      expect(button).toHaveClass('bg-destructive', 'text-destructive-foreground')
    })

    it('renders outline variant correctly', () => {
      render(<Button variant="outline">Outline</Button>)
      
      const button = screen.getByRole('button', { name: 'Outline' })
      expect(button).toHaveClass('border', 'border-input', 'bg-background')
    })

    it('renders ghost variant correctly', () => {
      render(<Button variant="ghost">Ghost</Button>)
      
      const button = screen.getByRole('button', { name: 'Ghost' })
      expect(button).toHaveClass('hover:bg-accent', 'hover:text-accent-foreground')
    })

    it('renders link variant correctly', () => {
      render(<Button variant="link">Link</Button>)
      
      const button = screen.getByRole('button', { name: 'Link' })
      expect(button).toHaveClass('text-primary', 'underline-offset-4')
    })
  })

  describe('Sizes', () => {
    it('renders small size correctly', () => {
      render(<Button size="sm">Small</Button>)
      
      const button = screen.getByRole('button', { name: 'Small' })
      expect(button).toHaveClass('h-10', 'rounded-md', 'px-4')
    })

    it('renders large size correctly', () => {
      render(<Button size="lg">Large</Button>)
      
      const button = screen.getByRole('button', { name: 'Large' })
      expect(button).toHaveClass('h-14', 'rounded-lg', 'px-8')
    })

    it('renders icon size correctly', () => {
      render(<Button size="icon" aria-label="Icon button">Icon</Button>)
      
      const button = screen.getByRole('button', { name: 'Icon button' })
      expect(button).toHaveClass('h-12', 'w-12')
    })

    it('renders mobile size correctly', () => {
      render(<Button size="mobile" aria-label="Mobile button">Mobile</Button>)
      
      const button = screen.getByRole('button', { name: 'Mobile button' })
      expect(button).toHaveClass('h-14', 'w-14', 'rounded-full', 'shadow-lg')
    })
  })

  describe('Accessibility', () => {
    it('has proper focus styles', () => {
      render(<Button>Focus Test</Button>)
      
      const button = screen.getByRole('button', { name: 'Focus Test' })
      expect(button).toHaveClass('focus-visible:outline-none', 'focus-visible:ring-2')
    })

    it('supports keyboard navigation', async () => {
      const handleClick = vi.fn()
      const user = userEvent.setup()
      
      render(<Button onClick={handleClick}>Keyboard Test</Button>)
      
      const button = screen.getByRole('button', { name: 'Keyboard Test' })
      button.focus()
      await user.keyboard('{Enter}')
      
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('supports custom aria attributes', () => {
      render(
        <Button aria-label="Custom label" aria-describedby="description">
          Button
        </Button>
      )
      
      const button = screen.getByRole('button', { name: 'Custom label' })
      expect(button).toHaveAttribute('aria-describedby', 'description')
    })
  })

  describe('Neurodiversity-Affirming Features', () => {
    it('has touch-manipulation for better mobile interaction', () => {
      render(<Button>Touch Button</Button>)
      
      const button = screen.getByRole('button', { name: 'Touch Button' })
      expect(button).toHaveClass('touch-manipulation')
    })

    it('has appropriate transition timing for reduced motion preference', () => {
      render(<Button>Transition Button</Button>)
      
      const button = screen.getByRole('button', { name: 'Transition Button' })
      expect(button).toHaveClass('transition-colors')
    })

    it('maintains proper text sizing for readability', () => {
      render(<Button>Readable Text</Button>)
      
      const button = screen.getByRole('button', { name: 'Readable Text' })
      expect(button).toHaveClass('text-base')
    })
  })

  describe('asChild Prop', () => {
    it('renders as a different element when asChild is true', () => {
      render(
        <Button asChild>
          <a href="#test">Link Button</a>
        </Button>
      )
      
      const link = screen.getByRole('link', { name: 'Link Button' })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', '#test')
    })
  })

  describe('Custom className', () => {
    it('merges custom className with default classes', () => {
      render(<Button className="custom-class">Custom</Button>)
      
      const button = screen.getByRole('button', { name: 'Custom' })
      expect(button).toHaveClass('custom-class')
      expect(button).toHaveClass('bg-primary') // Still has default classes
    })
  })
})