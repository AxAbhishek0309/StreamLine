'use client'

import { useEffect, useState, useCallback } from 'react'
import { File, Download } from 'lucide-react'
import { getDocumentsWithStatus, getExportJsonUrl, getExportCsvUrl } from '@/lib/api'
import type { Document } from '@/lib/types'

type DocWithStatus = Document & { status: string }

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function ExportsList() {
  const [docs, setDocs] = useState<DocWithStatus[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await getDocumentsWithStatus(1, 50)
      setDocs(res.items.filter((d) => d.status === 'completed') as DocWithStatus[])
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  if (loading) return (
    <div className="space-y-2">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-16 rounded-lg bg-card border border-border animate-pulse" />
      ))}
    </div>
  )

  if (docs.length === 0) return (
    <div className="text-center py-16 text-muted-foreground text-sm border border-border rounded-lg">
      No completed documents yet — upload and process a file first
    </div>
  )

  return (
    <div className="space-y-2">
      {docs.map(doc => (
        <div
          key={doc.id}
          className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-card-foreground/5 transition-colors"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <File className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{doc.original_name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatSize(doc.file_size)} • {timeAgo(doc.updated_at)} • {doc.page_count} page{doc.page_count !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href={getExportJsonUrl(doc.id)}
              download={`${doc.original_name}.json`}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-card-foreground/10 hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Download className="h-3 w-3" /> JSON
            </a>
            <a
              href={getExportCsvUrl(doc.id)}
              download={`${doc.original_name}.csv`}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-card-foreground/10 hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Download className="h-3 w-3" /> CSV
            </a>
          </div>
        </div>
      ))}
    </div>
  )
}
