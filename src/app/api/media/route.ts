import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import connectDB from '@/lib/db/connection'
import { MediaAsset } from '@/lib/db/models/MediaAsset'

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
  'application/pdf': '.pdf',
}

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

// GET /api/media — list user's media asset metadata
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '24')
  const fileType = searchParams.get('fileType') // 'image', 'video', 'document'

  await connectDB()

  const query: Record<string, unknown> = { userId: session.user.id }
  if (fileType === 'image') query.fileType = { $in: ['image/jpeg', 'image/png', 'image/webp'] }
  else if (fileType === 'video') query.fileType = 'video/mp4'
  else if (fileType === 'document') query.fileType = 'application/pdf'

  const [items, total] = await Promise.all([
    MediaAsset.find(query).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    MediaAsset.countDocuments(query),
  ])

  return NextResponse.json({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
}

// POST /api/media — validate & register a media file (processed in memory, not stored)
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  if (!ALLOWED_TYPES[file.type]) {
    return NextResponse.json(
      { error: `File type not allowed. Allowed: ${Object.keys(ALLOWED_TYPES).join(', ')}` },
      { status: 400 }
    )
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File too large. Max 100MB.' }, { status: 400 })
  }

  // Process in memory — get buffer for immediate use (e.g., LinkedIn upload)
  const buffer = Buffer.from(await file.arrayBuffer())
  const fileName = `${crypto.randomUUID()}${ALLOWED_TYPES[file.type]}`

  await connectDB()
  const asset = await MediaAsset.create({
    userId: session.user.id,
    fileName,
    originalName: file.name,
    fileType: file.type,
    fileSize: file.size,
    // Temporarily store base64 inline for same-session use; cleared after LinkedIn upload
    inlineData: buffer.toString('base64'),
  })

  return NextResponse.json(
    {
      _id: asset._id,
      fileName: asset.fileName,
      originalName: asset.originalName,
      fileType: asset.fileType,
      fileSize: asset.fileSize,
      createdAt: asset.createdAt,
    },
    { status: 201 }
  )
}
