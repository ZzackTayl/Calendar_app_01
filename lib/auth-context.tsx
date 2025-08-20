'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react'
import { createSupabaseClient } from './supabase/client'
import { User, AuthChangeEvent, Session } from '@supabase/supabase-js'
import { DemoStore } from './demo-store'

interface AuthContextType {
  user: User | null
  loading: boolean
  demoMode: boolean
  signOut: () => Promise<void>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>
  resetPassword: (email: string, redirectTo?: string) => Promise<{ error: any }>
  updatePassword: (newPassword: string) => Promise<{ error: any }>
  enableDemoMode: () => void
  demo: {
    seed: () => void
    reset: () => void
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [demoMode, setDemoMode] = useState(false)
  
  // Memoize Supabase client to prevent recreation on every render
  const supabase = useMemo(() => createSupabaseClient(), [])

  // Demo helpers
  const demoSeed = useCallback(() => {
    const demoUserId = 'demo-user'
    DemoStore.seedSampleData(demoUserId)
  }, [])

  const demoReset = useCallback(() => {
    DemoStore.reset()
  }, [])

  // Memoize auth functions to prevent unnecessary re-renders
  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      // ignore
    }
    setDemoMode(false)
  }, [supabase.auth])

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      return { error }
    } catch (error) {
      return { error: { message: 'Authentication not available in demo mode' } }
    }
  }, [supabase.auth])

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      })
      return { error }
    } catch (error) {
      return { error: { message: 'Authentication not available in demo mode' } }
    }
  }, [supabase.auth])

  const resetPassword = useCallback(async (email: string, redirectTo?: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo || (typeof window !== 'undefined' ? `${window.location.origin}/auth/update-password` : undefined),
      })
      return { error }
    } catch (error) {
      return { error: { message: 'Password reset not available in demo mode' } }
    }
  }, [supabase.auth])

  const updatePassword = useCallback(async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      return { error }
    } catch (error) {
      return { error: { message: 'Password update not available in demo mode' } }
    }
  }, [supabase.auth])

  const enableDemoMode = useCallback(() => {
    setDemoMode(true)
    setUser({
      id: 'demo-user',
      email: 'demo@example.com',
      user_metadata: { full_name: 'Demo User' },
      app_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString()
    } as User)

    // Persist demo flag
    if (typeof window !== 'undefined') localStorage.setItem('ph_demo_enabled', '1')

    // Seed if empty
    const existing = localStorage.getItem('ph_demo_version')
    if (!existing) {
      DemoStore.seedSampleData('demo-user')
    }
  }, [])

  useEffect(() => {
    // Restore demo mode if previously enabled
    if (typeof window !== 'undefined' && localStorage.getItem('ph_demo_enabled') === '1') {
      enableDemoMode()
      setLoading(false)
      return
    }

    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
      } catch {
        // ignore
      }
      setLoading(false)
    }
    init()

    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (_event: AuthChangeEvent, session: Session | null) => {
          setUser(session?.user ?? null)
          setLoading(false)
        }
      )
      return () => subscription.unsubscribe()
    } catch {
      // ignore
    }
  }, [supabase.auth, enableDemoMode])

  const contextValue = useMemo(() => ({
    user,
    loading,
    demoMode,
    signOut,
    signIn,
    signUp,
    resetPassword,
    updatePassword,
    enableDemoMode,
    demo: { seed: demoSeed, reset: demoReset },
  }), [user, loading, demoMode, signOut, signIn, signUp, enableDemoMode, demoSeed, demoReset])

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}