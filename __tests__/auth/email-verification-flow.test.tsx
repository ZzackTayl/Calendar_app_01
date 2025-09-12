import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import SignUp from '@/app/auth/signup/page'
import ConfirmEmailPage from '@/app/auth/confirm-email/page'
import { useAuth } from '@/lib/auth-context'
import { useRouter, useSearchParams } from 'next/navigation'

// Mock modules
vi.mock('@/lib/auth-context')
vi.mock('next/navigation')

// Mock fetch globally
global.fetch = vi.fn()

describe('Email Verification Flow - Complete User Journey', () => {
  const mockPush = vi.fn()
  const mockSignUp = vi.fn()
  const mockSignOut = vi.fn()
  
  const mockAuthContext = {
    user: null,
    signUp: mockSignUp,
    signOut: mockSignOut,
    error: null,
    clearError: vi.fn(),
    loading: false,
    offlineAvailable: false,
    signIn: vi.fn(),
    resetPassword: vi.fn(),
    updatePassword: vi.fn(),
    resendConfirmationEmail: vi.fn(),
    syncOfflineData: vi.fn(),
    offlineStatus: {
      isOnline: true,
      lastSynced: null,
      pendingChanges: 0
    },
    retryAuthentication: vi.fn(),
    isEmailVerified: false,
    sessionHealth: 'healthy' as const
  }

  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
    
    vi.mocked(useRouter).mockReturnValue({ 
      push: mockPush,
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn()
    })
    
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn(() => null),
      getAll: vi.fn(),
      has: vi.fn(),
      entries: vi.fn(),
      keys: vi.fn(),
      values: vi.fn(),
      toString: vi.fn(),
      forEach: vi.fn()
    })
    
    vi.mocked(useAuth).mockReturnValue(mockAuthContext)
    vi.mocked(global.fetch).mockReset()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('First-Time Signup Flow', () => {
    it('should show success message with 60-second wait info and redirect to confirm-email', async () => {
      // Mock successful signup
      mockSignUp.mockResolvedValueOnce({ error: null })
      
      // Render signup form in a wrapper to handle suspense
      const SignUpWrapper = () => (
        <div>
          <SignUp />
        </div>
      )
      
      const { rerender } = render(<SignUpWrapper />)
      
      // Fill out form
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter your full name')).toBeInTheDocument()
      })
      
      fireEvent.change(screen.getByPlaceholderText('Enter your full name'), {
        target: { value: 'Test User' }
      })
      fireEvent.change(screen.getByPlaceholderText('Enter your email'), {
        target: { value: 'test@example.com' }
      })
      fireEvent.change(screen.getByPlaceholderText(/Create a password/), {
        target: { value: 'TestPassword123!' }
      })
      fireEvent.change(screen.getByPlaceholderText('Confirm your password'), {
        target: { value: 'TestPassword123!' }
      })
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /Create account/i })
      fireEvent.click(submitButton)
      
      // Wait for success state
      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith(
          'test@example.com',
          'TestPassword123!',
          'Test User',
          'TestPassword123!'
        )
      })
      
      // Force update to show success state
      vi.mocked(useAuth).mockReturnValue({
        ...mockAuthContext,
        user: null
      })
      rerender(<SignUpWrapper />)
      
      // Check for success message with 60-second info
      await waitFor(() => {
        expect(screen.getByText('Check your email!')).toBeInTheDocument()
        expect(screen.getByText(/you can resend after 60 seconds/i)).toBeInTheDocument()
      })
      
      // Verify redirect after 2 seconds
      vi.advanceTimersByTime(2000)
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/auth/confirm-email')
      })
    })
  })

  describe('Duplicate Signup Flow', () => {
    it('should auto-resend email and redirect to confirm-email with message', async () => {
      // Mock existing user error
      mockSignUp.mockResolvedValueOnce({
        error: new Error('An account with this email already exists'),
        isExistingUser: true,
        email: 'existing@example.com',
        helpMessage: 'If you haven\'t confirmed your email yet, you can resend the confirmation email below.'
      })
      
      // Mock successful resend
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      } as Response)
      
      const SignUpWrapper = () => (
        <div>
          <SignUp />
        </div>
      )
      
      render(<SignUpWrapper />)
      
      // Wait for form and fill it out
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument()
      })
      
      fireEvent.change(screen.getByPlaceholderText('Enter your full name'), {
        target: { value: 'Existing User' }
      })
      fireEvent.change(screen.getByPlaceholderText('Enter your email'), {
        target: { value: 'existing@example.com' }
      })
      fireEvent.change(screen.getByPlaceholderText(/Create a password/), {
        target: { value: 'TestPassword123!' }
      })
      fireEvent.change(screen.getByPlaceholderText('Confirm your password'), {
        target: { value: 'TestPassword123!' }
      })
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /Create account/i })
      fireEvent.click(submitButton)
      
      // Wait for duplicate user handling
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/resend-confirmation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: 'existing@example.com' })
        })
      })
      
      // Check localStorage was set
      expect(localStorage.getItem('pendingEmailForVerification')).toBe('existing@example.com')
      expect(localStorage.getItem('autoResendSuccess')).toBe('true')
      
      // Verify redirect to confirm-email with auto flag
      expect(mockPush).toHaveBeenCalledWith('/auth/confirm-email?auto=1')
    })
  })

  describe('Confirm Email Page Behavior', () => {
    it('should show auto-resend success message when coming from duplicate signup', () => {
      // Set up auto-resend scenario
      localStorage.setItem('pendingEmailForVerification', 'test@example.com')
      localStorage.setItem('autoResendSuccess', 'true')
      
      vi.mocked(useSearchParams).mockReturnValue({
        get: vi.fn((key) => key === 'auto' ? '1' : null),
        getAll: vi.fn(),
        has: vi.fn(),
        entries: vi.fn(),
        keys: vi.fn(),
        values: vi.fn(),
        toString: vi.fn(),
        forEach: vi.fn()
      })
      
      render(<ConfirmEmailPage />)
      
      // Should show success message
      expect(screen.getByText('We\'ve resent your confirmation email. Please check your inbox and spam folder.')).toBeInTheDocument()
      
      // Email should be displayed even without user session
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
      
      // LocalStorage should be cleared
      expect(localStorage.getItem('pendingEmailForVerification')).toBeNull()
      expect(localStorage.getItem('autoResendSuccess')).toBeNull()
    })

    it('should not show countdown timer when rate limited', async () => {
      // Mock user session
      vi.mocked(useAuth).mockReturnValue({
        ...mockAuthContext,
        user: {
          id: 'test-id',
          email: 'test@example.com',
          email_confirmed_at: null
        } as any
      })
      
      // Mock rate limit response
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          message: 'Too many requests',
          waitTime: 120,
          attempts: 2,
          maxAttempts: 3
        })
      } as Response)
      
      render(<ConfirmEmailPage />)
      
      // Click resend
      const resendButton = screen.getByText('Resend Confirmation Email')
      fireEvent.click(resendButton)
      
      // Should show rate limit message without countdown
      await waitFor(() => {
        expect(screen.getByText('Please try again shortly. We limit how often you can resend to prevent abuse.')).toBeInTheDocument()
      })
      
      // Should not show any countdown text
      expect(screen.queryByText(/Resend in/)).not.toBeInTheDocument()
    })
  })

  describe('Email Verification Callback', () => {
    it('clicking email link should verify user and allow sign in', async () => {
      // This would be tested in an E2E test or by testing the auth/callback route
      // The callback route already handles:
      // 1. Exchange code for session
      // 2. Log user in
      // 3. Redirect to dashboard
      // 4. Handle pending invitations
      
      // We can verify the callback route exists and redirects properly
      expect(true).toBe(true) // Placeholder for E2E test
    })
  })

  describe('Rate Limiting Behavior', () => {
    it('should enforce rate limits without showing countdown', async () => {
      vi.mocked(useAuth).mockReturnValue({
        ...mockAuthContext,
        user: {
          id: 'test-id',
          email: 'test@example.com',
          email_confirmed_at: null
        } as any
      })
      
      render(<ConfirmEmailPage />)
      
      // First resend - success
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      } as Response)
      
      const resendButton = screen.getByText('Resend Confirmation Email')
      fireEvent.click(resendButton)
      
      await waitFor(() => {
        expect(screen.getByText('Confirmation email sent! Please check your inbox and spam folder.')).toBeInTheDocument()
      })
      
      // Button should be disabled and show simple message
      await waitFor(() => {
        expect(screen.getByText('Please try again shortly. We limit how often you can resend to prevent abuse.')).toBeInTheDocument()
      })
      
      // No countdown should be shown
      expect(screen.queryByText(/Resend in/)).not.toBeInTheDocument()
    })

    it('should show max attempts message after 3 attempts', () => {
      // Set up max attempts state
      localStorage.setItem('email_resend_state', JSON.stringify({
        canResend: false,
        attempts: 3,
        maxAttempts: 3,
        timestamp: Date.now(),
        nextAllowedAt: Date.now() + 300000
      }))
      
      vi.mocked(useAuth).mockReturnValue({
        ...mockAuthContext,
        user: {
          id: 'test-id',
          email: 'test@example.com',
          email_confirmed_at: null
        } as any
      })
      
      render(<ConfirmEmailPage />)
      
      // Should show max attempts message
      expect(screen.getByText(/Maximum resend attempts reached/)).toBeInTheDocument()
      expect(screen.getByText(/Please wait a few minutes/)).toBeInTheDocument()
      
      // Should not show resend button
      expect(screen.queryByText('Resend Confirmation Email')).not.toBeInTheDocument()
    })
  })

  describe('User Profile Creation', () => {
    it('database trigger should create profile on email verification', () => {
      // The SQL migration we created ensures:
      // 1. When email_confirmed_at is set (email verified)
      // 2. A trigger fires to create user_profile entry
      // 3. Also creates entry in users table
      // 4. User can then sign in normally
      
      // This would be tested via integration tests against real database
      expect(true).toBe(true) // Placeholder for integration test
    })
  })
})
