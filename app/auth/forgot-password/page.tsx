"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSent(false)
    if (!email) {
      setError('Enter your email')
      return
    }
    setLoading(true)
    const { error } = await resetPassword(email)
    setLoading(false)
    if (error) {
      setError(error.message || 'Could not send reset email')
    } else {
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-background text-foreground">
      <Card className="w-full max-w-md border-border shadow-xl bg-card/80 backdrop-blur">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Forgot password</CardTitle>
          <CardDescription>We’ll email you a link to reset it</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            {sent && <p className="text-sm text-green-600">Reset link sent. Check your email.</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Sending...' : 'Send reset link'}
            </Button>
          </form>
          <div className="text-center mt-6 text-sm">
            <Link href="/auth/signin" className="text-primary hover:text-primary/80">Back to sign in</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
