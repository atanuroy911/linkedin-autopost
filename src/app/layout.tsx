import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { Toaster } from 'react-hot-toast'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: {
    default: 'LinkedIn AI Publisher',
    template: '%s | LinkedIn AI Publisher',
  },
  description: 'AI-powered LinkedIn content creation, scheduling, and publishing platform.',
  keywords: ['LinkedIn', 'AI', 'content', 'publishing', 'scheduling', 'automation'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <QueryProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                className: 'dark:bg-card dark:text-foreground dark:border-border border',
                duration: 4000,
              }}
            />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
