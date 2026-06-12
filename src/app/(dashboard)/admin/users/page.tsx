'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users, Plus, Search, Edit, Trash2, Shield, User, Loader2,
  MoreVertical, Check, X, UserCheck, UserX
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { apiRequest, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

interface User {
  _id: string
  name: string
  email: string
  role: 'admin' | 'user'
  isActive: boolean
  createdAt: string
  lastLoginAt?: string
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search],
    queryFn: () => apiRequest<{ items: User[]; total: number }>(`/api/admin/users${search ? `?search=${search}` : ''}`),
  })

  const deleteUser = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/admin/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('User deleted') },
  })

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiRequest(`/api/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify({ isActive }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-1">{data?.total || 0} users in the system</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4" />
          Create User
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Users table */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-3">
          {data?.items.map((user) => (
            <Card key={user._id} className={!user.isActive ? 'opacity-60' : ''}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-4">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="gradient-primary text-white text-sm">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{user.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        user.role === 'admin'
                          ? 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300'
                          : 'bg-secondary text-secondary-foreground'
                      }`}>
                        {user.role === 'admin' ? '👑 Admin' : 'User'}
                      </span>
                      {!user.isActive && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">Disabled</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Joined {formatDate(user.createdAt)}
                      {user.lastLoginAt && ` · Last login ${formatDate(user.lastLoginAt)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Switch
                      checked={user.isActive}
                      onCheckedChange={(v) => toggleActive.mutate({ id: user._id, isActive: v })}
                    />
                    <Button size="sm" variant="ghost" onClick={() => setEditingUser(user)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Delete ${user.name}?`)) deleteUser.mutate(user._id)
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <CreateUserDialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)} />

      {/* Edit Dialog */}
      {editingUser && (
        <EditUserDialog user={editingUser} open={!!editingUser} onClose={() => setEditingUser(null)} />
      )}
    </div>
  )
}

function CreateUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('user')

  const create = useMutation({
    mutationFn: () => apiRequest('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('User created')
      onClose()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>Add a new user to the platform</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Smith" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@company.com" />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={() => create.mutate()} disabled={create.isPending}>
              {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create User'}
            </Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function EditUserDialog({ user, open, onClose }: { user: User; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(user.name)
  const [role, setRole] = useState(user.role)
  const [password, setPassword] = useState('')

  const update = useMutation({
    mutationFn: () => apiRequest(`/api/admin/users/${user._id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name, role, ...(password ? { password } : {}) }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('User updated')
      onClose()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as 'admin' | 'user')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>New Password (optional)</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Leave blank to keep current" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={() => update.mutate()} disabled={update.isPending}>
              {update.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
            </Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
