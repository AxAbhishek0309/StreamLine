'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Clock, AlertCircle, Zap, RefreshCw, XCircle, RotateCcw } from 'lucide-react'
import { getJobs, retryJob, cancelJob, createJobSocket } from '@/lib/api'
import type { Job, ProgressEvent } from '@/lib/types'

const statusConfig = {
  completed: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', bar: 'bg-emerald-500' },
  processing: { icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10', bar: 'bg-blue-500' },
  pending: { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10', bar: 'bg-amber-500' },
  failed: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10', bar: 'bg-red-500' },
  cancelled: { icon: XCircle, color: 'text-muted-foreground', bg: 'bg-card-foreground/5', bar: 'bg-muted' },
  retrying: { icon: RefreshCw, color: 'text-orange-400', bg: 'bg-orange-500/10', bar: 'bg-orange-500' },
}

function timeAgo(iso: string | null) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  return `${Math.floor(m / 60)}h ago`
}

function JobRow({ job, onUpdate }: { job: Job; onUpdate: (j: Job) => void }) {
  const cfg = statusConfig[job.status] ?? statusConfig.pending
  const Icon = cfg.icon
  const isActive = ['pending', 'processing', 'retrying'].includes(job.status)

  // Subscribe to WebSocket for active jobs
  useEffect(() => {
    if (!isActive) return
    const ws = createJobSocket(job.id, (event: ProgressEvent) => {
      onUpdate({
        ...job,
        status: event.status,
        progress: event.progress,
        current_stage: event.stage,
      })
      if (['completed', 'failed', 'cancelled'].includes(event.status)) ws.close()
    })
    return () => ws.close()
  }, [job.id, isActive]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRetry = async () => {
    try { await retryJob(job.id) } catch {}
  }

  const handleCancel = async () => {
    try {
      const updated = await cancelJob(job.id)
      onUpdate(updated)
    } catch {}
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-border rounded-lg p-4 hover:bg-card-foreground/5 transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Zap className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground text-sm truncate">Job {job.id.slice(0, 8)}…</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {job.current_stage?.replace(/_/g, ' ') ?? 'queued'} • started {timeAgo(job.started_at ?? job.created_at)}
              {job.retry_count > 0 && ` • retry #${job.retry_count}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.color}`}>
            {job.status}
          </span>
          <Icon className={`h-4 w-4 ${cfg.color} ${isActive ? 'animate-pulse' : ''}`} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full bg-card-foreground/10 overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${cfg.bar}`}
            animate={{ width: `${job.progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <span className="text-xs font-medium text-muted-foreground w-10 text-right">
          {Math.round(job.progress)}%
        </span>
      </div>

      {job.error_message && (
        <p className="text-xs text-red-400 mt-2 truncate">{job.error_message}</p>
      )}

      <div className="flex gap-2 mt-3">
        {job.status === 'failed' && (
          <button
            onClick={handleRetry}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-accent/10 hover:bg-accent/20 text-accent-foreground transition-colors"
          >
            <RotateCcw className="h-3 w-3" /> Retry
          </button>
        )}
        {isActive && (
          <button
            onClick={handleCancel}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-card-foreground/10 hover:bg-card-foreground/20 text-muted-foreground transition-colors"
          >
            <XCircle className="h-3 w-3" /> Cancel
          </button>
        )}
      </div>
    </motion.div>
  )
}

export function JobsList() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  const refresh = useCallback(async () => {
    try {
      const res = await getJobs(1, 50)
      setJobs(res.items)
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 10000)
    return () => clearInterval(interval)
  }, [refresh])

  const updateJob = useCallback((updated: Job) => {
    setJobs(prev => prev.map(j => j.id === updated.id ? updated : j))
  }, [])

  const filters = ['all', 'pending', 'processing', 'completed', 'failed']
  const visible = filter === 'all' ? jobs : jobs.filter(j => j.status === filter)

  if (loading) return (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-24 rounded-lg bg-card border border-border animate-pulse" />
      ))}
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors capitalize ${
              filter === f
                ? 'bg-accent text-accent-foreground'
                : 'bg-card-foreground/10 text-muted-foreground hover:text-foreground'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">No jobs found</div>
      ) : (
        <motion.div className="space-y-3" layout>
          {visible.map(job => (
            <JobRow key={job.id} job={job} onUpdate={updateJob} />
          ))}
        </motion.div>
      )}
    </div>
  )
}
