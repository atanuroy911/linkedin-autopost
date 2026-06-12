'use client'
import { useState, useEffect, use } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Send, Calendar, Image, Link2, Loader2, Hash, X, Plus,
  Eye, Upload, Trash2, Check
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useSession } from 'next-auth/react'
import { apiRequest, formatDateTime } from '@/lib/utils'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { useDropzone } from 'react-dropzone'

interface Post {
  _id: string
  content: string
  hashtags: string[]
  postType: string
  status: string
  mediaAssetIds: Array<{ _id: string; url: string; fileType: string; originalName: string }>
  externalUrl?: string
}

interface MediaAsset {
  _id: string
  url: string
  fileType: string
  originalName: string
  fileSize: number
}

export default function ComposerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: session } = useSession()

  const [content, setContent] = useState('')
  const [hashtags, setHashtags] = useState<string[]>([])
  const [hashtagInput, setHashtagInput] = useState('')
  const [externalUrl, setExternalUrl] = useState('')
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([])
  const [scheduledFor, setScheduledFor] = useState('')
  const [activeTab, setActiveTab] = useState('compose')
  const [publishing, setPublishing] = useState(false)
  const [scheduling, setScheduling] = useState(false)
  const [uploading, setUploading] = useState(false)

  const { data: post, isLoading } = useQuery<Post>({
    queryKey: ['post', id],
    queryFn: () => apiRequest(`/api/posts/${id}`),
  })

  const { data: mediaData } = useQuery<{ items: MediaAsset[] }>({
    queryKey: ['media'],
    queryFn: () => apiRequest('/api/media?pageSize=50'),
  })

  useEffect(() => {
    if (post) {
      setContent(post.content)
      setHashtags(post.hashtags || [])
      setExternalUrl(post.externalUrl || '')
      setSelectedMediaIds(post.mediaAssetIds?.map((m) => m._id) || [])
    }
  }, [post])

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiRequest(`/api/posts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  })

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'], 'video/mp4': ['.mp4'], 'application/pdf': ['.pdf'] },
    maxSize: 100 * 1024 * 1024,
    onDrop: async (files) => {
      setUploading(true)
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        try {
          const asset = await fetch('/api/media', { method: 'POST', body: formData }).then((r) => r.json())
          setSelectedMediaIds((prev) => [...prev, asset._id])
          queryClient.invalidateQueries({ queryKey: ['media'] })
          toast.success(`${file.name} uploaded`)
        } catch {
          toast.error(`Failed to upload ${file.name}`)
        }
      }
      setUploading(false)
    },
  })

  async function handleSave() {
    await saveMutation.mutateAsync({
      content,
      hashtags,
      externalUrl,
      mediaAssetIds: selectedMediaIds,
      postType: selectedMediaIds.length > 0 ? 'image' : externalUrl ? 'link' : 'text',
    })
    toast.success('Draft saved')
  }

  async function handlePublishNow() {
    setPublishing(true)
    try {
      await handleSave()
      await apiRequest(`/api/posts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'approved' }),
      })
      const result = await apiRequest<{ postUrl: string }>(`/api/posts/${id}`, {
        method: 'POST',
        body: JSON.stringify({ action: 'publish_now' }),
      })
      toast.success('Published to LinkedIn!')
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      router.push('/published')
    } catch (err: unknown) {
      toast.error((err as Error).message)
    } finally {
      setPublishing(false)
    }
  }

  async function handleSchedule() {
    if (!scheduledFor) {
      toast.error('Please select a date and time')
      return
    }
    setScheduling(true)
    try {
      await handleSave()
      await apiRequest(`/api/posts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'approved' }),
      })
      await apiRequest(`/api/posts/${id}`, {
        method: 'POST',
        body: JSON.stringify({ action: 'schedule', scheduledFor }),
      })
      toast.success('Post scheduled!')
      router.push('/scheduled')
    } catch (err: unknown) {
      toast.error((err as Error).message)
    } finally {
      setScheduling(false)
    }
  }

  function addHashtag() {
    const tag = hashtagInput.replace(/^#/, '').trim()
    if (tag && !hashtags.includes(tag)) setHashtags([...hashtags, tag])
    setHashtagInput('')
  }

  const fullContent = `${content}\n\n${hashtags.map((h) => `#${h}`).join(' ')}`
  const charCount = fullContent.length

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  )

  return (
    <div className="max-w-5xl space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/drafts"><ArrowLeft className="w-5 h-5" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Post Composer</h1>
          <p className="text-muted-foreground text-sm">Edit, enhance, and publish your post</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Draft'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left — Editor */}
        <div className="lg:col-span-3 space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="compose">Compose</TabsTrigger>
              <TabsTrigger value="media">Media</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="compose" className="space-y-4">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Post Content</Label>
                      <span className={`text-xs ${charCount > 3000 ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {charCount} / 3000
                      </span>
                    </div>
                    <Textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={12}
                      className="resize-none font-mono text-sm"
                      placeholder="Your post content..."
                    />
                  </div>

                  {/* Hashtags */}
                  <div className="space-y-2">
                    <Label>Hashtags</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          className="pl-8"
                          placeholder="Add hashtag"
                          value={hashtagInput}
                          onChange={(e) => setHashtagInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addHashtag()}
                        />
                      </div>
                      <Button variant="outline" onClick={addHashtag}><Plus className="w-4 h-4" /></Button>
                    </div>
                    {hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {hashtags.map((h) => (
                          <span key={h} className="flex items-center gap-1 bg-primary/10 text-primary text-xs px-3 py-1 rounded-full">
                            #{h}
                            <button onClick={() => setHashtags(hashtags.filter((t) => t !== h))}>
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* External URL */}
                  <div className="space-y-2">
                    <Label>External URL (optional)</Label>
                    <div className="relative">
                      <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        className="pl-8"
                        placeholder="https://example.com/article"
                        value={externalUrl}
                        onChange={(e) => setExternalUrl(e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="media">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  {/* Upload zone */}
                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                  >
                    <input {...getInputProps()} />
                    {uploading ? (
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
                    ) : (
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    )}
                    <p className="text-sm font-medium">{isDragActive ? 'Drop files here' : 'Drag & drop or click to upload'}</p>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP, MP4, PDF · Max 100MB</p>
                  </div>

                  {/* Media library */}
                  {mediaData?.items && mediaData.items.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-3">Your Media Library</p>
                      <div className="grid grid-cols-3 gap-3">
                        {mediaData.items.map((asset) => (
                          <div
                            key={asset._id}
                            onClick={() => {
                              setSelectedMediaIds((prev) =>
                                prev.includes(asset._id) ? prev.filter((id) => id !== asset._id) : [...prev, asset._id]
                              )
                            }}
                            className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${selectedMediaIds.includes(asset._id) ? 'border-primary shadow-lg shadow-primary/20' : 'border-transparent'}`}
                          >
                            {asset.fileType.startsWith('image/') ? (
                              <img src={asset.url} alt={asset.originalName} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-muted flex items-center justify-center">
                                <span className="text-xs text-muted-foreground text-center px-2">{asset.originalName}</span>
                              </div>
                            )}
                            {selectedMediaIds.includes(asset._id) && (
                              <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                <Check className="w-6 h-6 text-white drop-shadow" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preview">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-xs text-muted-foreground mb-4">LinkedIn post preview</p>
                  <LinkedInPreview
                    content={content}
                    hashtags={hashtags}
                    userName={session?.user?.name || 'Your Name'}
                    userAvatar={session?.user?.avatar}
                    externalUrl={externalUrl}
                    mediaUrls={mediaData?.items.filter((m) => selectedMediaIds.includes(m._id)).map((m) => m.url) || []}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right — Actions */}
        <div className="lg:col-span-2 space-y-4">
          {/* Publish Now */}
          <Card>
            <CardHeader><CardTitle className="text-base">Publish</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" onClick={handlePublishNow} disabled={publishing}>
                {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Publish Now
              </Button>
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card>
            <CardHeader><CardTitle className="text-base">Schedule</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>
              <Button variant="outline" className="w-full" onClick={handleSchedule} disabled={scheduling || !scheduledFor}>
                {scheduling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                Schedule Post
              </Button>
            </CardContent>
          </Card>

          {/* Post details */}
          <Card>
            <CardHeader><CardTitle className="text-base">Post Details</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Characters</span>
                <span className={charCount > 3000 ? 'text-destructive font-medium' : 'font-medium'}>{charCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hashtags</span>
                <span className="font-medium">{hashtags.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Media</span>
                <span className="font-medium">{selectedMediaIds.length} file(s)</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function LinkedInPreview({
  content,
  hashtags,
  userName,
  userAvatar,
  externalUrl,
  mediaUrls,
}: {
  content: string
  hashtags: string[]
  userName: string
  userAvatar?: string
  externalUrl?: string
  mediaUrls: string[]
}) {
  return (
    <div className="border border-border rounded-xl p-4 bg-white dark:bg-slate-900 space-y-3 max-w-sm">
      <div className="flex items-center gap-3">
        <Avatar className="w-10 h-10">
          <AvatarImage src={userAvatar} />
          <AvatarFallback className="gradient-primary text-white text-sm">{userName.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold text-sm">{userName}</p>
          <p className="text-xs text-muted-foreground">Just now · 🌐</p>
        </div>
      </div>
      <div className="text-sm whitespace-pre-line text-foreground">
        {content}
        {hashtags.length > 0 && (
          <span className="text-blue-600 dark:text-blue-400"> {hashtags.map((h) => `#${h}`).join(' ')}</span>
        )}
      </div>
      {mediaUrls.length > 0 && (
        <div className="rounded-lg overflow-hidden">
          <img src={mediaUrls[0]} alt="Post media" className="w-full object-cover max-h-48" />
        </div>
      )}
      {externalUrl && (
        <div className="border border-border rounded-lg p-3 text-xs text-muted-foreground truncate">
          🔗 {externalUrl}
        </div>
      )}
    </div>
  )
}
