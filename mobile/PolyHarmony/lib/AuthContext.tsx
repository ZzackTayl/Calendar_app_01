import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, authHelpers } from './supabase'
import { User, AuthState, SignUpData, SignInData } from './types'

interface AuthContextType extends AuthState {
  signIn: (data: SignInData) => Promise<{ error: any }>
  signUp: (data: SignUpData) => Promise<{ error: any }>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        setLoading(true)
        const currentSession = await authHelpers.getCurrentSession()
        const currentUser = await authHelpers.getCurrentUser()
        
        setSession(currentSession)
        if (currentUser) {
          // Fetch user data from our users table
          const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('id', currentUser.id)
            .single()
          
          setUser(userData)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Authentication error')
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        
        if (session?.user) {
          // Fetch user data from our users table
          try {
            const { data: userData } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single()
            
            setUser(userData)
          } catch (err) {
            console.error('Error fetching user data:', err)
          }
        } else {
          setUser(null)
        }
        
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (data: SignUpData) => {
    try {
      setLoading(true)
      setError(null)
      
      // Sign up with Supabase Auth
      const { data: authData, error: authError } = await authHelpers.signUp(
        data.phone_number,
        data.password
      )
      
      if (authError) {
        setError(authError.message)
        return { error: authError }
      }
      
      // Create user record in our users table
      if (authData.user) {
        const { error: userError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            phone_number: data.phone_number,
            email: data.email,
            display_name: data.display_name,
            subscription_tier: 'free',
            is_active: true
          })
        
        if (userError) {
          setError(userError.message)
          return { error: userError }
        }
      }
      
      return { error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign up failed'
      setError(errorMessage)
      return { error: { message: errorMessage } }
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (data: SignInData) => {
    try {
      setLoading(true)
      setError(null)
      
      const { error } = await authHelpers.signIn(data.phone_number, data.password)
      
      if (error) {
        setError(error.message)
        return { error }
      }
      
      return { error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign in failed'
      setError(errorMessage)
      return { error: { message: errorMessage } }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      setError(null)
      
      await authHelpers.signOut()
      setUser(null)
      setSession(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign out failed')
    } finally {
      setLoading(false)
    }
  }

  const refreshUser = async () => {
    try {
      const currentUser = await authHelpers.getCurrentUser()
      if (currentUser) {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', currentUser.id)
          .single()
        
        setUser(userData)
      }
    } catch (err) {
      console.error('Error refreshing user:', err)
    }
  }

  const value: AuthContextType = {
    user,
    session,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    refreshUser,
  }

  return (
    <AuthContext.Provider value={value}>
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