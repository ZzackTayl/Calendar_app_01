import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'PolyHarmony - Privacy-First Calendar for Polyamorous Relationships',
  description: 'Effortlessly coordinate schedules with multiple partners while maintaining complete privacy control.',
  keywords: 'polyamory, calendar, privacy, relationships, scheduling',
  authors: [{ name: 'PolyHarmony Team' }],
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  themeColor: '#3B82F6',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full bg-gradient-to-br from-blue-50 to-purple-50`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}