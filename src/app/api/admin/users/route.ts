import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import connectDB from '@/lib/db/connection'
import { User } from '@/lib/db/models/User'
import { ActivityLog } from '@/lib/db/models/ActivityLog'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

function isAdmin(session: { user?: { role?: string } } | null) {
  return session?.user?.role === 'admin'
}

// GET /api/admin/users — list all users
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!isAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')
  const search = searchParams.get('search') || ''

  await connectDB()

  const query: Record<string, unknown> = {}
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ]
  }

  const [items, total] = await Promise.all([
    User.find(query).select('-passwordHash').sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    User.countDocuments(query),
  ])

  return NextResponse.json({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
}

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['admin', 'user']).default('user'),
})

// POST /api/admin/users — create a new user
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!isAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const parsed = createUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
  }

  await connectDB()

  const exists = await User.findOne({ email: parsed.data.email.toLowerCase() })
  if (exists) return NextResponse.json({ error: 'Email already in use' }, { status: 409 })

  const passwordHash = await bcrypt.hash(parsed.data.password, 12)

  const user = await User.create({
    ...parsed.data,
    email: parsed.data.email.toLowerCase(),
    passwordHash,
  })

  await ActivityLog.create({
    userId: session!.user.id,
    action: 'user.created',
    resourceType: 'User',
    resourceId: user._id.toString(),
    metadata: { newUserEmail: user.email, newUserRole: user.role },
  })

  const userObj = user.toObject()
  delete (userObj as Record<string, unknown>).passwordHash

  return NextResponse.json(userObj, { status: 201 })
}
