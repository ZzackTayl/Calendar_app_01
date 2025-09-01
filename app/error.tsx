'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, RefreshCw } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-0 shadow-xl bg-slate-800/90 backdrop-blur border-slate-700">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
            <AlertCircle className="h-6 w-6 text-red-500" />
          </div>
          <CardTitle className="text-white">Something went wrong!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-300 text-center">
            We encountered an unexpected error. Please try again.
          </p>
          {process.env.NODE_ENV === 'development' && (
            <details className="text-xs text-slate-400 bg-slate-900/50 p-3 rounded border">
              <summary className="cursor-pointer mb-2">Error Details</summary>
              <pre className="whitespace-pre-wrap break-words">
                {error.message}
                {error.stack && `\n\nStack trace:\n${error.stack}`}
              </pre>
            </details>
          )}
          <div className="flex gap-2">
            <Button
              onClick={reset}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try again
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.href = '/'}
              className="flex-1"
            >
              Go home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
