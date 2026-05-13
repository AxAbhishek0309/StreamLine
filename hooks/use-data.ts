'use client'

import { useState, useEffect, useCallback } from 'react'
import * as api from '@/lib/api'
import type { Document, Job, Export, User } from '@/lib/types'

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.getDocuments()
      setDocuments(data.items)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const add = useCallback(async (file: File) => {
    const res = await api.uploadDocument(file)
    setDocuments((prev) => [res.document, ...prev])
    return res.document
  }, [])

  const remove = useCallback(async (id: string) => {
    await api.deleteDocument(id)
    setDocuments((prev) => prev.filter((d) => d.id !== id))
  }, [])

  return { documents, loading, error, fetch, add, remove }
}

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.getJobs()
      setJobs(data.items)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch()
    // Poll every 5s as a fallback alongside WebSocket
    const interval = setInterval(fetch, 5000)
    return () => clearInterval(interval)
  }, [fetch])

  const updateJob = useCallback((updated: Job) => {
    setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)))
  }, [])

  const retry = useCallback(async (id: string) => {
    await api.retryJob(id)
    await fetch()
  }, [fetch])

  return { jobs, loading, error, fetch, updateJob, retry }
}

export function useExports() {
  const [exports, setExports] = useState<Export[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.getExports()
      setExports(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const create = useCallback(async (documentId: string, format: Export['format']) => {
    const newExport = await api.createExport(documentId, format)
    setExports((prev) => [...prev, newExport])
    return newExport
  }, [])

  const remove = useCallback(async (id: string) => {
    await api.deleteExport(id)
    setExports((prev) => prev.filter((e) => e.id !== id))
  }, [])

  return { exports, loading, error, fetch, create, remove }
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.getUser()
      setUser(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const update = useCallback(async (updates: Partial<User>) => {
    const updated = await api.updateUser(updates)
    setUser(updated)
    return updated
  }, [])

  return { user, loading, error, fetch, update }
}
