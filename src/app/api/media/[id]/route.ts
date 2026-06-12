import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import connectDB from '@/lib/db/connection'
import { MediaAsset } from '@/lib/db/models/MediaAsset'

// DELETE /api/media/[id] — remove a media asset record
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const asset = await MediaAsset.findOne({ _id: id, userId: session.user.id })
  if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // No file on disk/cloud to delete — just remove the DB record
  await MediaAsset.findByIdAndDelete(id)
  return NextResponse.json({ success: true })
}

// GET /api/media/[id] — get a single media asset record
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const asset = await MediaAsset.findOne({ _id: id, userId: session.user.id }).select('-inlineData')
  if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(asset)
}
