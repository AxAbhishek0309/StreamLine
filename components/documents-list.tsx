'use client'

import { useEffect, useState, useCallback } from 'react'
import { FileText, Download, Trash2, CheckCircle2, Clock, AlertCircle, RefreshCw } from 'lucide-react'
import { getDocumentsWithStatus, deleteDocument, getExportJsonUrl, getExportCsvUrl } from '@/lib/api'
import type { Document } from '@/lib/types'

type DocWithStatus = Document & { status: string }

const statusBadge = {
  completed: 'bg-emerald-500/15 text-emerald-400',
  processing: 'bg-blue-500/15 text-blue-400',
  pending: 'bg-amber-500/15 text-amber-400',
  failed: 'bg-red-500/15 text-red-400',
  cancelled: 'bg-card-foreground/10 text-muted-foreground',
  retrying: 'bg-orange-500/15 text-orange-400',
}

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

export function DocumentsList() {
  const [docs, setDocs] = useState<DocWithStatus[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await getDocumentsWithStatus(1, 50)
      setDocs(res.items as DocWithStatus[])
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  useEffect(() => {
    const active = docs.some(d => ['pending', 'processing', 'retrying'].includes(d.status))
    if (!active) return
    const t = setInterval(refresh, 4000)
    return () => clearInterval(t)
  }, [docs, refresh])

  const handleDelete = async (id: string) => {
    await deleteDocument(id)
    setDocs(prev => prev.filter(d => d.id !== id))
  }

  if (loading) return (
    <div className="border border-border rounded-lg overflow-hidden">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-16 border-b border-border bg-card animate-pulse last:border-0" />
      ))}
    </div>
  )

  if (docs.length === 0) return (
    <div className="text-center py-16 text-muted-foreground text-sm border border-border rounded-lg">
      No documents yet — upload some files to get started
    </div>
  )

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-card-foreground/5">
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Pages</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Size</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Uploaded</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((doc, idx) => (
              <tr key={doc.id} className={idx !== docs.length - 1 ? 'border-b border-border' : ''}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
                      {doc.original_name}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${statusBadge[doc.status as keyof typeof statusBadge] ?? statusBadge.pending}`}>
                    {doc.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{doc.page_count || '—'}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{formatSize(doc.file_size)}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{timeAgo(doc.created_at)}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-1">
                    {doc.status === 'completed' && (
                      <>
                        <a
                          href={getExportJsonUrl(doc.id)}
                          download
                          className="p-2 hover:bg-card-foreground/10 rounded transition-colors"
                          title="Export JSON"
                        >
                          <Download className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </a>
                        <a
                          href={getExportCsvUrl(doc.id)}
                          download
                          className="p-2 hover:bg-card-foreground/10 rounded transition-colors"
                          title="Export CSV"
                        >
                          <span className="text-xs text-muted-foreground hover:text-foreground font-medium px-1">CSV</span>
                        </a>
                      </>
                    )}
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-2 hover:bg-card-foreground/10 rounded transition-colors"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-400" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
