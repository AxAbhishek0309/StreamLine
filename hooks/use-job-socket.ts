'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createJobSocket } from '@/lib/api'
import type { ProgressEvent } from '@/lib/types'

interface Options {
  onProgress: (event: ProgressEvent) => void
  onClose?: () => void
  enabled?: boolean
}

/**
 * Subscribes to real-time job progress via WebSocket.
 * Automatically reconnects on unexpected close (up to maxRetries).
 */
export function useJobSocket(jobId: string | null, { onProgress, onClose, enabled = true }: Options) {
  const wsRef = useRef<WebSocket | null>(null)
  const retriesRef = useRef(0)
  const maxRetries = 5

  const connect = useCallback(() => {
    if (!jobId || !enabled) return

    const ws = createJobSocket(
      jobId,
      (event) => {
        retriesRef.current = 0
        onProgress(event)
      },
      () => {
        onClose?.()
        // Reconnect unless terminal state was already received
        if (retriesRef.current < maxRetries) {
          retriesRef.current++
          const delay = Math.min(1000 * 2 ** retriesRef.current, 30000)
          setTimeout(connect, delay)
        }
      },
    )
    wsRef.current = ws
  }, [jobId, enabled, onProgress, onClose])

  useEffect(() => {
    connect()
    return () => {
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [connect])
}
