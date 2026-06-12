'use client'
import { useQuery } from '@tanstack/react-query'
import { Users, FileText, TrendingUp, Shield } from 'lucide-react'
import { LinkedInIcon } from '@/components/ui/linkedin-icon'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { apiRequest } from '@/lib/utils'

interface AdminStats {
  totalUsers: number
  activeUsers: number
  totalPosts: number
  totalPublished: number
  connectedLinkedIn: number
}

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: () => apiRequest('/api/admin/stats'),
  })

  const cards = [
    { label: 'Total Users', value: stats?.totalUsers || 0, icon: Users, color: 'text-blue-500' },
    { label: 'Active Users', value: stats?.activeUsers || 0, icon: Shield, color: 'text-emerald-500' },
    { label: 'Total Posts', value: stats?.totalPosts || 0, icon: FileText, color: 'text-violet-500' },
    { label: 'Published Posts', value: stats?.totalPublished || 0, icon: TrendingUp, color: 'text-orange-500' },
    { label: 'LinkedIn Connections', value: stats?.connectedLinkedIn || 0, icon: LinkedInIcon, color: 'text-[#0077B5]' },
  ]

  return (
    <div className="space-y-8 animate-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Platform overview and system health</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardContent className="pt-6">
              <card.icon className={`w-6 h-6 mb-3 ${card.color}`} />
              <div className="text-3xl font-bold">{isLoading ? '—' : card.value}</div>
              <p className="text-sm text-muted-foreground mt-1">{card.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
