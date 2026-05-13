'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Cloud, AlertCircle, CheckCircle2, X, Loader2 } from 'lucide-react'
import { uploadDocument, createJobSocket } from '@/lib/api'
import type { ProgressEvent } from '@/lib/types'

interface UploadItem {
  id: string
  file: File
  status: 'uploading' | 'processing' | 'completed' | 'failed'
  progress: number
  stage: string
  message: string
  jobId?: string
  error?: string
}

const ACCEPTED = ['application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain', 'image/jpeg', 'image/png']

export function UploadZone({ onUploaded }: { onUploaded?: () => void }) {
  const [isDragging, setIsDragging] = useState(false)
  const [items, setItems] = useState<UploadItem[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const socketsRef = useRef<Record<string, WebSocket>>({})

  const updateItem = useCallback((id: string, patch: Partial<UploadItem>) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i))
  }, [])

  const processFile = useCallback(async (file: File) => {
    const id = `${Date.now()}-${Math.random()}`
    const item: UploadItem = {
      id, file, status: 'uploading', progress: 0, stage: '', message: 'Uploading...',
    }
    setItems(prev => [item, ...prev])

    try {
      const res = await uploadDocument(file)
      updateItem(id, { status: 'processing', progress: 5, message: 'Queued for processing', jobId: res.job.id })

      // Open WebSocket to stream real-time progress
      const ws = createJobSocket(
        res.job.id,
        (event: ProgressEvent) => {
          updateItem(id, {
            progress: event.progress,
            stage: event.stage,
            message: event.message,
            status: event.status === 'completed' ? 'completed'
              : event.status === 'failed' ? 'failed'
              : 'processing',
          })
          if (event.status === 'completed') {
            onUploaded?.()
            ws.close()
          }
          if (event.status === 'failed') ws.close()
        },
      )
      socketsRef.current[id] = ws
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      updateItem(id, { status: 'failed', message: msg, error: msg })
    }
  }, [updateItem, onUploaded])

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return
    Array.from(files).forEach(f => {
      if (ACCEPTED.includes(f.type)) processFile(f)
    })
  }, [processFile])

  const removeItem = (id: string) => {
    socketsRef.current[id]?.close()
    delete socketsRef.current[id]
    setItems(prev => prev.filter(i => i.id !== id))
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={e => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files) }}
        onClick={() => inputRef.current?.click()}
        className={`rounded-lg border-2 border-dashed p-12 text-center cursor-pointer transition-colors ${
          isDragging ? 'border-accent bg-accent/5' : 'border-border bg-card hover:border-accent/50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.jpg,.jpeg,.png"
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center gap-4">
          <motion.div
            animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
            className="rounded-lg bg-card-foreground/10 p-4"
          >
            <Cloud className="h-8 w-8 text-muted-foreground" />
          </motion.div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Drop files to upload</h3>
            <p className="mt-1 text-sm text-muted-foreground">or click to browse</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <p>PDF, DOCX, TXT, JPG, PNG — max 100MB</p>
          </div>
        </div>
      </motion.div>

      {/* Upload queue */}
      <AnimatePresence>
        {items.map(item => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="border border-border rounded-lg p-4 bg-card"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {item.status === 'uploading' || item.status === 'processing' ? (
                  <Loader2 className="h-4 w-4 text-blue-400 animate-spin flex-shrink-0" />
                ) : item.status === 'completed' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                )}
                <span className="text-sm font-medium text-foreground truncate">{item.file.name}</span>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-xs text-muted-foreground">{Math.round(item.progress)}%</span>
                <button onClick={() => removeItem(item.id)} className="p-1 hover:bg-card-foreground/10 rounded">
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              </div>
            </div>

            <div className="h-1.5 rounded-full bg-card-foreground/10 overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${
                  item.status === 'failed' ? 'bg-red-500' :
                  item.status === 'completed' ? 'bg-emerald-500' : 'bg-accent'
                }`}
                animate={{ width: `${item.progress}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>

            <p className="text-xs text-muted-foreground mt-1.5">{item.message}</p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
