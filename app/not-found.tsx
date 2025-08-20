'use client';

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useRouter } from 'next/navigation'

export default function NotFound() {
  const router = useRouter()
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Page not found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">The page you are looking for doesn’t exist. It may have been moved or deleted.</p>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => router.push('/')}>Go Home</Button>
            <Button variant="outline" className="flex-1" onClick={() => router.back()}>Go Back</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
