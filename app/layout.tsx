import { ThemeProvider } from '@/components/ui/theme-provider';
import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import { TimeZoneProvider } from '@/lib/time-zones/time-zone-context';
import { NotificationProvider } from '@/lib/notifications/context';
import dynamicImport from 'next/dynamic';
import { ClientErrorBoundaryWrapper } from '@/components/error-boundary/ClientErrorBoundaryWrapper';
import { BackgroundController } from '@/components/ui/background-controller';

// Dynamic import to ensure client-side only rendering
const PerformanceMonitor = dynamicImport(
  () => import('@/components/ui/performance-monitor').then(mod => mod.PerformanceMonitor),
  { ssr: false }
);

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
  robots: { index: true, follow: true },
  other: { 'X-DNS-Prefetch-Control': 'on' },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon.svg', type: 'image/svg+xml' }
    ],
    apple: '/favicon.svg',
  },
  manifest: '/manifest.json',
};

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  minimumScale: 1,
  userScalable: true,
  themeColor: '#0F172A',
};

export default function RootLayout({
  children,
}: { children: React.ReactNode; }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        {/* DNS prefetch for external domains */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />
        {/* Mobile-specific meta tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="PolyHarmony" />
        <meta name="application-name" content="PolyHarmony" />
        <meta name="msapplication-TileColor" content="#0F172A" />
        {/* theme-color is not supported by Firefox/Opera but works in Chrome/Safari/Edge */}
        <meta name="theme-color" content="#0F172A" />
      </head>
      <body className={`${inter.className} h-full bg-background antialiased`}>
        {/* Skip links for accessibility */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <a href="#navigation" className="skip-link">
          Skip to navigation
        </a>
        
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
          storageKey="polyharmony-theme"
        >
          <ClientErrorBoundaryWrapper>
            <AuthProvider>
              <TimeZoneProvider>
                <NotificationProvider>
                  <div className="min-h-screen pb-20 sm:pb-0">
                    <main id="main-content" role="main">
                      <BackgroundController />
                      {children}
                    </main>
                  </div>
                  <PerformanceMonitor />
                </NotificationProvider>
              </TimeZoneProvider>
            </AuthProvider>
          </ClientErrorBoundaryWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
