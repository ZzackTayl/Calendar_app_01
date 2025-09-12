import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import ConfirmEmailPage from '@/app/auth/confirm-email/page'
import { useAuth } from '@/lib/auth-context'
import { useRouter, useSearchParams } from 'next/navigation'
import { User } from '@supabase/supabase-js'

// Mock modules
vi.mock('@/lib/auth-context')
vi.mock('next/navigation')

// Mock global fetch
global.fetch = vi.fn()

describe('Email Confirmation Page', () => {
  const mockPush = vi.fn()
  const mockSignOut = vi.fn()
  const mockSearchParams = {
    get: vi.fn().mockReturnValue(null)
  }
  
  const mockUser: Partial<User> = {
    id: 'test-user-id',
    email: 'test@example.com',
    email_confirmed_at: null
  }

  const mockAuthContext = {
    user: mockUser as User,
    signOut: mockSignOut,
    loading: false,
    error: null,
    offlineAvailable: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    resetPassword: vi.fn(),
    updatePassword: vi.fn(),
    resendConfirmationEmail: vi.fn(),
    syncOfflineData: vi.fn(),
    offlineStatus: {
      isOnline: true,
      lastSynced: null,
      pendingChanges: 0
    },
    clearError: vi.fn(),
    retryAuthentication: vi.fn(),
    isEmailVerified: false,
    sessionHealth: 'healthy' as const
  }

  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(useRouter).mockReturnValue({ 
      push: mockPush,
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn()
    })
    vi.mocked(useSearchParams).mockReturnValue(mockSearchParams as any)
    vi.mocked(useAuth).mockReturnValue(mockAuthContext)
    
    // Clear localStorage
    localStorage.clear()
    
    // Reset fetch mock
    vi.mocked(global.fetch).mockReset()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('Access Control', () => {
    it('should redirect unauthenticated users to sign in', () => {
      vi.mocked(useAuth).mockReturnValue({
        ...mockAuthContext,
        user: null
      })

      render(<ConfirmEmailPage />)

      expect(screen.getByText('Access Required')).toBeInTheDocument()
      expect(screen.getByText('Please sign in to access this page')).toBeInTheDocument()
      expect(screen.getByText('Go to Sign In')).toBeInTheDocument()
    })

    it('should redirect verified users to dashboard', async () => {
      vi.mocked(useAuth).mockReturnValue({
        ...mockAuthContext,
        user: {
          ...mockUser,
          email_confirmed_at: '2024-01-01T00:00:00Z'
        } as User
      })

      render(<ConfirmEmailPage />)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })
  })

  describe('Initial Display', () => {
    it('should display correct UI elements for unverified users', () => {
      render(<ConfirmEmailPage />)

      expect(screen.getByText('Confirm Your Email')).toBeInTheDocument()
      expect(screen.getByText(/We've sent a confirmation link to/)).toBeInTheDocument()
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
      expect(screen.getByText(/Click the confirmation link in your email/)).toBeInTheDocument()
      expect(screen.getByText('Resend Confirmation Email')).toBeInTheDocument()
      expect(screen.getByText('Sign out and use different email')).toBeInTheDocument()
    })

    it('should not show rate limit info on initial load', () => {
      render(<ConfirmEmailPage />)

      expect(screen.queryByText(/Attempts:/)).not.toBeInTheDocument()
      expect(screen.queryByText(/Resend in/)).not.toBeInTheDocument()
    })
  })

  describe('Resend Functionality', () => {
    it('should successfully resend confirmation email', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: 'Confirmation email sent successfully',
          success: true,
          attempts: 1,
          maxAttempts: 3
        })
      } as Response)

      render(<ConfirmEmailPage />)

      const resendButton = screen.getByText('Resend Confirmation Email')
      fireEvent.click(resendButton)

      await waitFor(() => {
        expect(screen.getByText('Confirmation email sent! Please check your inbox and spam folder.')).toBeInTheDocument()
      })

      expect(global.fetch).toHaveBeenCalledWith('/api/auth/resend-confirmation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com'
        })
      })
    })

    it('should handle resend errors gracefully', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          message: 'Failed to resend confirmation email',
          error: 'RESEND_FAILED'
        })
      } as Response)

      render(<ConfirmEmailPage />)

      const resendButton = screen.getByText('Resend Confirmation Email')
      fireEvent.click(resendButton)

      await waitFor(() => {
        expect(screen.getByText('Failed to resend confirmation email')).toBeInTheDocument()
      })
    })

    it('should handle network errors', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'))

      render(<ConfirmEmailPage />)

      const resendButton = screen.getByText('Resend Confirmation Email')
      fireEvent.click(resendButton)

      await waitFor(() => {
        expect(screen.getByText('Network error. Please check your connection and try again.')).toBeInTheDocument()
      })
    })
  })

  describe('Rate Limiting', () => {

    it('should enforce rate limiting after successful resend', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: 'Confirmation email sent successfully',
          success: true,
          attempts: 1,
          maxAttempts: 3
        })
      } as Response)

      render(<ConfirmEmailPage />)

      const resendButton = screen.getByText('Resend Confirmation Email')
      fireEvent.click(resendButton)

      await waitFor(() => {
        expect(screen.getByText('Confirmation email sent! Please check your inbox and spam folder.')).toBeInTheDocument()
      })

      expect(screen.getByText('Attempts: 1/3')).toBeInTheDocument()
      // Button should be disabled after successful send
      expect(screen.queryByText('Resend Confirmation Email')).not.toBeInTheDocument()
    })

    it('should handle rate limit response from server', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          message: 'Please try again shortly. We limit how often you can resend to prevent abuse.',
          error: 'RATE_LIMITED',
          waitTime: 120,
          attempts: 2,
          maxAttempts: 3
        })
      } as Response)

      render(<ConfirmEmailPage />)

      const resendButton = screen.getByText('Resend Confirmation Email')
      fireEvent.click(resendButton)

      await waitFor(() => {
        expect(screen.getByText('Please try again shortly. We limit how often you can resend to prevent abuse.')).toBeInTheDocument()
      })

      // Should not show countdown, but show rate limit message
      expect(screen.queryByText('Resend Confirmation Email')).not.toBeInTheDocument()
    })

    it('should show max attempts reached message', async () => {
      // Set up localStorage to simulate max attempts reached
      localStorage.setItem('email_resend_state', JSON.stringify({
        canResend: false,
        waitTime: 0,
        attempts: 3,
        maxAttempts: 3,
        timestamp: Date.now(),
        nextAllowedAt: Date.now() + 300000 // 5 minutes from now
      }))

      render(<ConfirmEmailPage />)

      expect(screen.getByText(/Maximum resend attempts reached/)).toBeInTheDocument()
      expect(screen.queryByText('Resend Confirmation Email')).not.toBeInTheDocument()
    })


    it('should persist rate limit state in localStorage', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: 'Confirmation email sent successfully',
          success: true,
          attempts: 1,
          maxAttempts: 3
        })
      } as Response)

      render(<ConfirmEmailPage />)

      const resendButton = screen.getByText('Resend Confirmation Email')
      fireEvent.click(resendButton)

      await waitFor(() => {
        const storedState = localStorage.getItem('email_resend_state')
        expect(storedState).toBeTruthy()
        
        const parsedState = JSON.parse(storedState!)
        expect(parsedState.attempts).toBe(1)
        expect(parsedState.maxAttempts).toBe(3)
        expect(parsedState.canResend).toBe(false)
      })
    })

    it('should restore rate limit state from localStorage on mount', () => {
      const futureTime = Date.now() + 120000 // 2 minutes from now
      localStorage.setItem('email_resend_state', JSON.stringify({
        canResend: false,
        waitTime: 120,
        attempts: 1,
        maxAttempts: 3,
        timestamp: Date.now(),
        nextAllowedAt: futureTime
      }))

      render(<ConfirmEmailPage />)

      expect(screen.getByText('Please try again shortly. We limit how often you can resend to prevent abuse.')).toBeInTheDocument()
      expect(screen.getByText('Attempts: 1/3')).toBeInTheDocument()
      expect(screen.queryByText('Resend Confirmation Email')).not.toBeInTheDocument()
    })

    it('should reset rate limit state after 5 minutes', () => {
      const oldTime = Date.now() - (6 * 60 * 1000) // 6 minutes ago
      localStorage.setItem('email_resend_state', JSON.stringify({
        canResend: false,
        waitTime: 0,
        attempts: 3,
        maxAttempts: 3,
        timestamp: oldTime,
        nextAllowedAt: oldTime + 300000
      }))

      render(<ConfirmEmailPage />)

      expect(screen.getByText('Resend Confirmation Email')).toBeInTheDocument()
      expect(screen.queryByText(/Attempts:/)).not.toBeInTheDocument()
      expect(localStorage.getItem('email_resend_state')).toBeNull()
    })
  })

  describe('Sign Out Functionality', () => {
    it('should sign out and redirect to sign in page', async () => {
      render(<ConfirmEmailPage />)

      const signOutButton = screen.getByText('Sign out and use different email')
      fireEvent.click(signOutButton)

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled()
        expect(mockPush).toHaveBeenCalledWith('/auth/signin')
      })
    })
  })

  describe('UI States', () => {
    it('should show loading state while resending', async () => {
      vi.mocked(global.fetch).mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true })
        } as Response), 1000))
      )

      render(<ConfirmEmailPage />)

      const resendButton = screen.getByText('Resend Confirmation Email')
      fireEvent.click(resendButton)

      expect(screen.getByText('Sending...')).toBeInTheDocument()
      expect(resendButton).toBeDisabled()
    })

  })
})
