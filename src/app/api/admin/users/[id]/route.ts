import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import connectDB from '@/lib/db/connection'
import { User } from '@/lib/db/models/User'
import { ActivityLog } from '@/lib/db/models/ActivityLog'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

function isAdmin(session: { user?: { role?: string; id?: string } } | null) {
  return session?.user?.role === 'admin'
}

// GET /api/admin/users/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!isAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await connectDB()
  const user = await User.findById(id).select('-passwordHash')
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(user)
}

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  role: z.enum(['admin', 'user']).optional(),
  isActive: z.boolean().optional(),
})

// PATCH /api/admin/users/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!isAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const parsed = updateUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
  }

  await connectDB()

  const update: Record<string, unknown> = { ...parsed.data }
  if (parsed.data.password) {
    update.passwordHash = await bcrypt.hash(parsed.data.password, 12)
    delete update.password
  }

  const user = await User.findByIdAndUpdate(id, update, { new: true }).select('-passwordHash')
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await ActivityLog.create({
    userId: session!.user.id,
    action: 'user.updated',
    resourceType: 'User',
    resourceId: id,
    metadata: { changes: Object.keys(parsed.data) },
  })

  return NextResponse.json(user)
}

// DELETE /api/admin/users/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!isAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Prevent self-deletion
  if (session!.user.id === id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
  }

  await connectDB()
  const user = await User.findByIdAndDelete(id)
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await ActivityLog.create({
    userId: session!.user.id,
    action: 'user.deleted',
    resourceType: 'User',
    resourceId: id,
    metadata: { deletedEmail: user.email },
  })

  return NextResponse.json({ success: true })
}
