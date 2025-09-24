'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function UpdatePasswordPage() {
  const { updatePassword } = useAuth()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Enhanced password validation
    if (password.length < 12) {
      setError('Password must be at least 12 characters')
      return
    }

    const hasLowercase = /[a-z]/.test(password)
    const hasUppercase = /[A-Z]/.test(password)
    const hasNumber = /\d/.test(password)
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password)

    if (!hasLowercase || !hasUppercase || !hasNumber || !hasSpecial) {
      setError('Password must include uppercase, lowercase, numbers, and special characters')
      return
    }

    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    const { error } = await updatePassword(password, confirm)
    setLoading(false)
    if (error) {
      setError(error.message || 'Unable to update password')
    } else {
      setSuccess(true)
      // Redirect immediately after successful password update
      setTimeout(() => router.push('/auth/signin'), 500)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-background text-foreground">
      <Card className="w-full max-w-md border-border shadow-xl bg-card/80 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-xl font-bold">Set a new password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {password && (
              <div className="text-xs text-gray-600 space-y-1">
                <div className="flex space-x-2">
                  <span className={password.length >= 12 ? 'text-green-600' : 'text-red-600'}>
                    {password.length >= 12 ? '✓' : '○'} 12+ characters
                  </span>
                  <span className={/[a-z]/.test(password) ? 'text-green-600' : 'text-red-600'}>
                    {/[a-z]/.test(password) ? '✓' : '○'} Lowercase
                  </span>
                  <span className={/[A-Z]/.test(password) ? 'text-green-600' : 'text-red-600'}>
                    {/[A-Z]/.test(password) ? '✓' : '○'} Uppercase
                  </span>
                </div>
                <div className="flex space-x-2">
                  <span className={/\d/.test(password) ? 'text-green-600' : 'text-red-600'}>
                    {/\d/.test(password) ? '✓' : '○'} Number
                  </span>
                  <span className={/[!@#$%^&*(),.?":{}|<>]/.test(password) ? 'text-green-600' : 'text-red-600'}>
                    {/[!@#$%^&*(),.?":{}|<>]/.test(password) ? '✓' : '○'} Special character
                  </span>
                </div>
              </div>
            )}
            <Input
              type="password"
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-green-600">Password updated</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Updating...' : 'Update password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
