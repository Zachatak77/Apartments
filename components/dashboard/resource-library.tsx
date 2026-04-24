'use client'

import { useState, useTransition } from 'react'
import { Search, Upload, Trash2, Edit2, ExternalLink, Loader2, X, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { deleteResource, uploadResource } from '@/app/(dashboard)/actions/resources'

interface Resource {
  id: string
  title: string
  description: string | null
  tags: string[] | null
  is_public: boolean
  file_url: string | null
  created_at: string
}

function UploadModal({ onClose }: { onClose: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [isPublic, setIsPublic] = useState(false)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('is_public', String(isPublic))
    startTransition(async () => {
      const result = await uploadResource(fd)
      if (result.error) toast.error(result.error)
      else { toast.success('Resource uploaded.'); onClose() }
    })
  }

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Upload Resource</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="title">Title *</Label>
          <Input id="title" name="title" placeholder="Resource title" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            name="description"
            rows={2}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5016] resize-none"
            placeholder="Brief description..."
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tags">Tags (comma-separated)</Label>
          <Input id="tags" name="tags" placeholder="e.g. behavior, routines, toddler" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="file">File</Label>
          <Input id="file" name="file" type="file" className="cursor-pointer" />
        </div>
        <div className="flex items-center gap-3">
          <Switch id="is_public" checked={isPublic} onCheckedChange={setIsPublic} />
          <Label htmlFor="is_public" className="cursor-pointer">
            Public (visible to all parents)
          </Label>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Upload
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

export function ResourceLibrary({ resources }: { resources: Resource[] }) {
  const [search, setSearch] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const filtered = resources.filter(
    (r) =>
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  )

  const handleDelete = (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This will remove it from all client assignments.`)) return
    startTransition(async () => {
      const result = await deleteResource(id)
      if (result.error) toast.error(result.error)
      else toast.success('Resource deleted.')
    })
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or tag..."
            className="pl-9"
          />
        </div>
        <Button onClick={() => setUploadOpen(true)} size="sm" className="gap-1.5">
          <Upload className="w-4 h-4" /> Upload Resource
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="font-medium text-gray-500 mb-1">
            {resources.length === 0 ? 'No resources yet' : 'No resources match your search'}
          </p>
          <p className="text-sm">
            {resources.length === 0
              ? 'Upload your first resource to share with clients.'
              : 'Try a different search term.'}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r) => (
            <div
              key={r.id}
              className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{r.title}</p>
                  {r.description && (
                    <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{r.description}</p>
                  )}
                </div>
                <Badge variant={r.is_public ? 'active' : 'secondary'} className="shrink-0">
                  {r.is_public ? 'Public' : 'Private'}
                </Badge>
              </div>

              {r.tags && r.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {r.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-full bg-[#2D5016]/8 text-[#2D5016] text-xs font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 mt-auto pt-3 border-t border-gray-100">
                {r.file_url && (
                  <a
                    href={r.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[#2D5016] hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" /> View file
                  </a>
                )}
                <button
                  onClick={() => handleDelete(r.id, r.title)}
                  disabled={isPending}
                  className="ml-auto text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <UploadModal onClose={() => setUploadOpen(false)} />
      </Dialog>
    </div>
  )
}
