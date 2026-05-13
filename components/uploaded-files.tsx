'use client'

import { useEffect, useState, useCallback } from 'react'
import { FileText, Trash2, CheckCircle2, Clock, AlertCircle, RefreshCw } from 'lucide-react'
import { getDocumentsWithStatus, deleteDocument } from '@/lib/api'
import type { Document } from '@/lib/types'

type DocWithStatus = Document & { status: string }

const statusIcon = {
  completed: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
  processing: <Clock className="h-4 w-4 text-blue-400 animate-spin" />,
  pending: <Clock className="h-4 w-4 text-amber-400" />,
  failed: <AlertCircle className="h-4 w-4 text-red-400" />,
  cancelled: <AlertCircle className="h-4 w-4 text-muted-foreground" />,
  retrying: <RefreshCw className="h-4 w-4 text-orange-400 animate-spin" />,
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function UploadedFiles({ refreshKey }: { refreshKey?: number }) {
  const [docs, setDocs] = useState<DocWithStatus[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await getDocumentsWithStatus(1, 50)
      setDocs(res.items as DocWithStatus[])
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { refresh() }, [refresh, refreshKey])

  // Poll while any doc is still processing
  useEffect(() => {
    const active = docs.some(d => ['pending', 'processing', 'retrying'].includes(d.status))
    if (!active) return
    const t = setInterval(refresh, 3000)
    return () => clearInterval(t)
  }, [docs, refresh])

  const handleDelete = async (id: string) => {
    await deleteDocument(id)
    setDocs(prev => prev.filter(d => d.id !== id))
  }

  if (loading) return (
    <div className="space-y-2">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-16 rounded-lg bg-card border border-border animate-pulse" />
      ))}
    </div>
  )

  if (docs.length === 0) return (
    <div className="text-center py-12 text-muted-foreground text-sm">No files uploaded yet</div>
  )

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {docs.map((doc, idx) => (
        <div
          key={doc.id}
          className={`flex items-center justify-between p-4 ${idx !== docs.length - 1 ? 'border-b border-border' : ''}`}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{doc.original_name}</p>
              <p className="text-xs text-muted-foreground">{formatSize(doc.file_size)} • {timeAgo(doc.created_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {statusIcon[doc.status as keyof typeof statusIcon] ?? statusIcon.pending}
            <button
              onClick={() => handleDelete(doc.id)}
              className="p-2 hover:bg-card-foreground/10 rounded transition-colors"
            >
              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
