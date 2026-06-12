import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { SessionProvider } from 'next-auth/react'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <SessionProvider session={session}>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="min-h-full p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </SessionProvider>
  )
}
