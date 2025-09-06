import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Simple button component for testing
const TestButton = ({ children, onClick, disabled, className }: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
}) => (
  <button 
    onClick={onClick} 
    disabled={disabled} 
    className={className}
  >
    {children}
  </button>
)

describe('Simple Button Test', () => {
  it('renders correctly', () => {
    render(<TestButton>Test Button</TestButton>)
    
    const button = screen.getByRole('button', { name: 'Test Button' })
    expect(button).toBeInTheDocument()
  })

  it('handles click events', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()
    
    render(<TestButton onClick={handleClick}>Click me</TestButton>)
    
    const button = screen.getByRole('button', { name: 'Click me' })
    await user.click(button)
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('renders as disabled', () => {
    render(<TestButton disabled>Disabled</TestButton>)
    
    const button = screen.getByRole('button', { name: 'Disabled' })
    expect(button).toBeDisabled()
  })
})