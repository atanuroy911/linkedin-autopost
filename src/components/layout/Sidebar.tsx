'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { apiRequest } from '@/lib/utils'
import {
  LayoutDashboard,
  FileText,
  Calendar,
  CheckSquare,
  Image,
  Settings,
  Bell,
  LogOut,
  Sparkles,
  History,
  ChevronLeft,
  BookOpen,
  Users,
  ScrollText,
  Shield,
  Activity,
  TerminalSquare,
  Target
} from 'lucide-react'
import { LinkedInIcon } from '@/components/ui/linkedin-icon'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/layout/ThemeToggle'

const userNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/content', label: 'Content', icon: BookOpen },
  { href: '/campaigns', label: 'Campaigns', icon: Target },
  { href: '/drafts', label: 'Drafts', icon: FileText },
  { href: '/scheduled', label: 'Scheduled', icon: Calendar },
  { href: '/published', label: 'Published', icon: History },
  { href: '/media', label: 'Media Library', icon: Image },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/settings', label: 'Settings', icon: Settings },
]

const adminNavItems = [
  { href: '/admin/dashboard', label: 'Admin Overview', icon: Shield },
  { href: '/admin/users', label: 'User Management', icon: Users },
  { href: '/admin/logs', label: 'Activity Logs', icon: ScrollText },
]

const developerNavItems = [
  { href: '/developer/logs', label: 'System Logs', icon: TerminalSquare },
  { href: '/developer/queues', label: 'Job Queues', icon: Activity },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [collapsed, setCollapsed] = useState(false)
  const isAdmin = session?.user?.role === 'admin'

  const { data: preferences } = useQuery({
    queryKey: ['preferences'],
    queryFn: () => apiRequest<{ developerMode: boolean }>('/api/preferences'),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  const navItems = isAdmin ? [...adminNavItems, ...userNavItems] : userNavItems

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-card border-r border-border transition-all duration-300 sticky top-0',
        collapsed ? 'w-16' : 'w-[260px]'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
          <LinkedInIcon className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-bold text-sm text-foreground leading-none">LinkedIn AI</p>
            <p className="text-xs text-muted-foreground mt-0.5">Publisher</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto flex-shrink-0 p-1 rounded hover:bg-accent transition-colors"
        >
          <ChevronLeft className={cn('w-4 h-4 transition-transform', collapsed && 'rotate-180')} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {isAdmin && !collapsed && (
          <p className="px-2 pb-1 text-[11px] uppercase font-semibold tracking-wider text-muted-foreground">
            Admin
          </p>
        )}
        {isAdmin && adminNavItems.map((item) => (
          <NavItem key={item.href} {...item} pathname={pathname} collapsed={collapsed} />
        ))}
        {isAdmin && !collapsed && (
          <p className="px-2 py-1 text-[11px] uppercase font-semibold tracking-wider text-muted-foreground mt-2">
            My Content
          </p>
        )}
        {userNavItems.map((item) => (
          <NavItem key={item.href} {...item} pathname={pathname} collapsed={collapsed} />
        ))}
        {preferences?.developerMode && !collapsed && (
          <p className="px-2 py-1 text-[11px] uppercase font-semibold tracking-wider text-muted-foreground mt-2">
            Developer
          </p>
        )}
        {preferences?.developerMode && developerNavItems.map((item) => (
          <NavItem key={item.href} {...item} pathname={pathname} collapsed={collapsed} />
        ))}
      </nav>

      {/* User info */}
      <div className="border-t border-border p-3 space-y-2">
        <div className="flex items-center gap-3">
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarImage src={session?.user?.avatar} />
            <AvatarFallback className="gradient-primary text-white text-xs">
              {session?.user?.name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{session?.user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{session?.user?.email}</p>
            </div>
          )}
          {!collapsed && <ThemeToggle />}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && 'Sign out'}
        </Button>
      </div>
    </aside>
  )
}

function NavItem({
  href,
  label,
  icon: Icon,
  pathname,
  collapsed,
}: {
  href: string
  label: string
  icon: React.ElementType
  pathname: string
  collapsed: boolean
}) {
  const isActive = pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
        isActive
          ? 'gradient-primary text-white shadow-sm'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent',
        collapsed && 'justify-center px-2'
      )}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {!collapsed && label}
    </Link>
  )
}
