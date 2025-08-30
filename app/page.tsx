'use client';

import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Heart, Shield, Calendar, Users, Sparkles, ArrowRight } from 'lucide-react'
import { ModeToggle } from '@/components/ui/theme-toggle'

export default function Home() {
  const { user, loading, enableDemoMode } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  // Show loading state while auth is initializing
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // If user is authenticated, redirect (handled by useEffect)
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="px-4 py-2 text-sm font-medium bg-blue-100 text-blue-800 rounded-full flex items-center">
                <Sparkles className="w-4 h-4 mr-2" />
                Privacy-First Calendar
              </div>
              <div className="absolute top-4 right-4">
                <ModeToggle />
              </div>
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-gray-900 mb-6">
              Private Conversations.
              <br />
              <span className="text-blue-600">Organized Life.</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-6 leading-relaxed">
              The first calendar designed specifically for polyamorous relationships. 
              Coordinate schedules with multiple partners while maintaining complete privacy control.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
              <Button 
                size="lg" 
                onClick={() => router.push('/auth/signup')}
                className="group px-8 py-4 text-base bg-blue-600 hover:bg-blue-700"
              >
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => router.push('/auth/signin')}
                className="px-8 py-4 text-base border-blue-600 text-blue-600 hover:bg-blue-50"
              >
                Sign In
              </Button>
            </div>
            <div className="text-center">
              <Button 
                variant="ghost"
                onClick={() => {
                  enableDemoMode()
                  router.push('/calendar')
                }}
                className="text-gray-600 hover:text-gray-900"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Try Demo (No Account Required)
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="py-20 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Built for Modern Relationships
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Every feature designed with polyamorous relationships in mind
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="group hover:shadow-lg transition-all duration-300 border-0 bg-card/80 backdrop-blur rounded-lg p-6">
              <div className="text-center pb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-200 transition-colors">
                  <Shield className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Privacy First</h3>
              </div>
              <p className="text-center text-base leading-relaxed text-gray-600">
                Granular privacy controls for every event. Choose exactly what each partner can see with visual indicators.
              </p>
            </div>

            <div className="group hover:shadow-lg transition-all duration-300 border-0 bg-card/80 backdrop-blur rounded-lg p-6">
              <div className="text-center pb-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-green-200 transition-colors">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Relationship Aware</h3>
              </div>
              <p className="text-center text-base leading-relaxed text-gray-600">
                Define relationship types, hierarchies, and preferences. The calendar understands your unique polycule structure.
              </p>
            </div>

            <div className="group hover:shadow-lg transition-all duration-300 border-0 bg-card/80 backdrop-blur rounded-lg p-6">
              <div className="text-center pb-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-yellow-200 transition-colors">
                  <Calendar className="w-6 h-6 text-yellow-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Smart Scheduling</h3>
              </div>
              <p className="text-center text-base leading-relaxed text-gray-600">
                Natural language event creation and intelligent conflict detection help you avoid double-booking.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="py-16 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-8">
              Built by the Polyamorous Community
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex items-center justify-center">
                <Heart className="w-6 h-6 text-red-500 mr-3" />
                <span className="text-lg font-medium text-gray-700">Community Driven</span>
              </div>
              <div className="flex items-center justify-center">
                <Shield className="w-6 h-6 text-blue-500 mr-3" />
                <span className="text-lg font-medium text-gray-700">Privacy-First Design</span>
              </div>
              <div className="flex items-center justify-center">
                <Users className="w-6 h-6 text-green-500 mr-3" />
                <span className="text-lg font-medium text-gray-700">Made for Polycules</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="bg-card border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h4 className="text-2xl font-bold text-gray-900 mb-4">PolyHarmony</h4>
            <p className="text-gray-600 mb-6">
              Privacy-first calendar for polyamorous relationships
            </p>
            <div className="flex justify-center space-x-6 text-sm text-gray-500">
              <a href="/privacy" className="hover:text-gray-900 transition-colors">Privacy Policy</a>
              <a href="/terms" className="hover:text-gray-900 transition-colors">Terms of Service</a>
              <a href="/support" className="hover:text-gray-900 transition-colors">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
