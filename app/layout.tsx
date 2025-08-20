import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import { PerformanceMonitor } from '@/components/ui/performance-monitor';

// Optimize font loading with display swap for better performance
const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'arial']
});

export const metadata: Metadata = {
  title: 'PolyHarmony - Privacy-First Calendar for Polyamorous Relationships',
  description: 'Effortlessly coordinate schedules with multiple partners while maintaining complete privacy control.',
  keywords: 'polyamory, calendar, privacy, relationships, scheduling',
  authors: [{ name: 'PolyHarmony Team' }],
  // removed viewport/themeColor per Next.js guidance
  robots: { index: true, follow: true },
  other: { 'X-DNS-Prefetch-Control': 'on' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0F172A',
};

export default function RootLayout({
  children,
}: { children: React.ReactNode; }) {
  return (
    <html lang="en" className="h-full dark">
      <head>
        {/* DNS prefetch for external domains */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />
        {/* Favicon */}
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      </head>
      <body className={`${inter.className} h-full bg-background antialiased`}>
        <AuthProvider>
          {children}
          <PerformanceMonitor />
        </AuthProvider>
      </body>
    </html>
  );
}