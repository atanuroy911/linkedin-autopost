'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Image as ImageIcon, Video, FileText, Upload, Trash2, Loader2, Search, Filter } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { apiRequest, formatDate, formatFileSize } from '@/lib/utils'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'

interface MediaAsset {
  _id: string
  url: string
  fileType: string
  originalName: string
  fileSize: number
  createdAt: string
}

export default function MediaPage() {
  const queryClient = useQueryClient()
  const [activeType, setActiveType] = useState('all')
  const [uploading, setUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['media', activeType],
    queryFn: () => apiRequest<{ items: MediaAsset[]; total: number }>(
      `/api/media${activeType !== 'all' ? `?fileType=${activeType}` : ''}?pageSize=50`
    ),
  })

  const deleteAsset = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/media/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] })
      toast.success('File deleted')
    },
  })

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'video/mp4': ['.mp4'],
      'application/pdf': ['.pdf'],
    },
    maxSize: 100 * 1024 * 1024,
    onDrop: async (files) => {
      setUploading(true)
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        try {
          await fetch('/api/media', { method: 'POST', body: formData })
          toast.success(`${file.name} uploaded`)
        } catch {
          toast.error(`Failed to upload ${file.name}`)
        }
      }
      queryClient.invalidateQueries({ queryKey: ['media'] })
      setUploading(false)
    },
  })

  const filtered = data?.items.filter((a) =>
    a.originalName.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  function getTypeIcon(fileType: string) {
    if (fileType.startsWith('image/')) return <ImageIcon className="w-4 h-4" />
    if (fileType.startsWith('video/')) return <Video className="w-4 h-4" />
    return <FileText className="w-4 h-4" />
  }

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Media Library</h1>
          <p className="text-muted-foreground mt-1">Upload and manage media for your LinkedIn posts</p>
        </div>
        <div className="text-sm text-muted-foreground">{data?.total || 0} files</div>
      </div>

      {/* Upload Zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 ${
          isDragActive ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-border hover:border-primary/50 hover:bg-accent/50'
        }`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3 text-primary" />
        ) : (
          <Upload className={`w-10 h-10 mx-auto mb-3 transition-colors ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`} />
        )}
        <p className="font-semibold text-lg">
          {isDragActive ? 'Drop files here' : uploading ? 'Uploading...' : 'Drag & drop files to upload'}
        </p>
        <p className="text-sm text-muted-foreground mt-1">or click to browse · JPG, PNG, WEBP, MP4, PDF · Max 100MB</p>
      </div>

      {/* Filters & Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Tabs value={activeType} onValueChange={setActiveType}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="image">Images</TabsTrigger>
            <TabsTrigger value="video">Videos</TabsTrigger>
            <TabsTrigger value="document">Documents</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Media Grid */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">No files found</p>
          <p className="text-sm mt-1">Upload files using the area above</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filtered.map((asset) => (
            <div key={asset._id} className="group relative">
              <div className="aspect-square rounded-xl overflow-hidden bg-muted border border-border">
                {asset.fileType.startsWith('image/') ? (
                  <img src={asset.url} alt={asset.originalName} className="w-full h-full object-cover" loading="lazy" />
                ) : asset.fileType.startsWith('video/') ? (
                  <video src={asset.url} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-3">
                    <FileText className="w-8 h-8 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground text-center line-clamp-2">{asset.originalName}</span>
                  </div>
                )}
              </div>

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/60 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                <button
                  onClick={() => deleteAsset.mutate(asset._id)}
                  className="p-2 bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                </button>
              </div>

              <div className="mt-1.5 px-0.5">
                <p className="text-xs font-medium truncate">{asset.originalName}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(asset.fileSize)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
