'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { FileText, CheckCircle2, Clock, AlertCircle, RefreshCw } from 'lucide-react'
import { getDocumentsWithStatus } from '@/lib/api'
import type { Document } from '@/lib/types'

type DocWithStatus = Document & { status: string }

const statusConfig = {
  completed: { icon: CheckCircle2, color: 'text-emerald-400' },
  processing: { icon: Clock, color: 'text-blue-400 animate-spin' },
  pending: { icon: Clock, color: 'text-amber-400' },
  failed: { icon: AlertCircle, color: 'text-red-400' },
  cancelled: { icon: AlertCircle, color: 'text-muted-foreground' },
  retrying: { icon: RefreshCw, color: 'text-orange-400 animate-spin' },
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

export function RecentDocuments() {
  const [docs, setDocs] = useState<DocWithStatus[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await getDocumentsWithStatus(1, 5)
      setDocs(res.items as DocWithStatus[])
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 8000)
    return () => clearInterval(interval)
  }, [refresh])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-lg border border-border bg-card p-6 h-full"
    >
      <h3 className="text-lg font-semibold text-foreground mb-4">Recent Documents</h3>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-card-foreground/5 animate-pulse" />
          ))}
        </div>
      ) : docs.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No documents yet</p>
      ) : (
        <motion.div
          className="space-y-1"
          initial="hidden"
          animate="visible"
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } }}
        >
          {docs.map((doc) => {
            const cfg = statusConfig[doc.status as keyof typeof statusConfig] ?? statusConfig.pending
            const Icon = cfg.icon
            return (
              <motion.div
                key={doc.id}
                variants={{ hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0 } }}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-card-foreground/5 transition-colors"
              >
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{doc.original_name}</p>
                  <p className="text-xs text-muted-foreground">{timeAgo(doc.created_at)}</p>
                </div>
                <Icon className={`h-4 w-4 flex-shrink-0 ${cfg.color}`} />
              </motion.div>
            )
          })}
        </motion.div>
      )}
    </motion.div>
  )
}
