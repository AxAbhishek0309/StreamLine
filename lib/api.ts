import type {
  Document,
  Job,
  ExtractedResult,
  PaginatedResponse,
  UploadResponse,
  User,
  Export,
} from './types'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
const API = `${BASE_URL}/api/v1`

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? `Request failed: ${res.status}`)
  }
  // 204 No Content — return null cast as T
  if (res.status === 204) return null as T
  return res.json()
}

// ── Documents ────────────────────────────────────────────────────────────────

export async function getDocuments(page = 1, pageSize = 20): Promise<PaginatedResponse<Document>> {
  return request(`/documents?page=${page}&page_size=${pageSize}`)
}

export async function getDocument(id: string): Promise<Document> {
  return request(`/documents/${id}`)
}

export async function updateDocument(id: string, data: { original_name?: string }): Promise<Document> {
  return request(`/documents/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
}

export async function deleteDocument(id: string): Promise<void> {
  await request(`/documents/${id}`, { method: 'DELETE' })
}

export async function getDocumentResult(id: string): Promise<ExtractedResult> {
  return request(`/documents/${id}/result`)
}

export async function finalizeDocument(id: string, reviewedData: Record<string, unknown>): Promise<ExtractedResult> {
  return request(`/documents/${id}/finalize`, {
    method: 'POST',
    body: JSON.stringify({ reviewed_data: reviewedData }),
  })
}

// ── Upload ───────────────────────────────────────────────────────────────────

export async function uploadDocument(file: File): Promise<UploadResponse> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API}/upload`, { method: 'POST', body: form })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? `Upload failed: ${res.status}`)
  }
  return res.json()
}

// ── Jobs ─────────────────────────────────────────────────────────────────────

export async function getJobs(page = 1, pageSize = 20, status?: string): Promise<PaginatedResponse<Job>> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  if (status) params.set('status', status)
  return request(`/jobs?${params}`)
}

export async function getJob(id: string): Promise<Job> {
  return request(`/jobs/${id}`)
}

export async function retryJob(id: string): Promise<{ job_id: string; message: string }> {
  return request(`/jobs/${id}/retry`, { method: 'POST' })
}

export async function cancelJob(id: string): Promise<Job> {
  return request(`/jobs/${id}/cancel`, { method: 'POST' })
}

// ── Exports ──────────────────────────────────────────────────────────────────

export function getExportJsonUrl(documentId: string): string {
  return `${API}/export/${documentId}/json`
}

export function getExportCsvUrl(documentId: string): string {
  return `${API}/export/${documentId}/csv`
}

// ── Dashboard stats ──────────────────────────────────────────────────────────

export async function getDashboardStats() {
  const [docsRes, jobsRes] = await Promise.all([
    getDocuments(1, 100),
    getJobs(1, 100),
  ])
  const completed = jobsRes.items.filter((j) => j.status === 'completed').length
  const total = jobsRes.items.length
  return {
    totalDocuments: docsRes.total,
    activeJobs: jobsRes.items.filter((j) => ['pending', 'processing', 'retrying'].includes(j.status)).length,
    completedToday: completed,
    successRate: total > 0 ? Math.round((completed / total) * 1000) / 10 : 0,
  }
}

/** Returns documents enriched with their latest job status */
export async function getDocumentsWithStatus(page = 1, pageSize = 50) {
  const [docsRes, jobsRes] = await Promise.all([
    getDocuments(page, pageSize),
    getJobs(1, 500),
  ])
  // Map latest job per document
  const latestJob: Record<string, Job> = {}
  for (const job of jobsRes.items) {
    const existing = latestJob[job.document_id]
    if (!existing || new Date(job.created_at) > new Date(existing.created_at)) {
      latestJob[job.document_id] = job
    }
  }
  return {
    ...docsRes,
    items: docsRes.items.map((doc) => ({
      ...doc,
      status: latestJob[doc.id]?.status ?? 'pending',
      job: latestJob[doc.id] ?? null,
    })),
  }
}

// ── WebSocket ────────────────────────────────────────────────────────────────

const WS_BASE = (process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8000')

export function createJobSocket(
  jobId: string,
  onMessage: (event: import('./types').ProgressEvent) => void,
  onClose?: () => void,
): WebSocket {
  const ws = new WebSocket(`${WS_BASE}/ws/jobs/${jobId}`)
  ws.onmessage = (e) => {
    try {
      onMessage(JSON.parse(e.data))
    } catch {
      // ignore malformed frames
    }
  }
  ws.onclose = onClose ?? (() => {})
  return ws
}

// ── Legacy stubs (keep UI components working during migration) ───────────────

const mockUser: User = { id: 'user-1', name: 'John Doe', email: 'john@example.com', plan: 'pro' }

export async function getUser(): Promise<User> {
  return mockUser
}

export async function updateUser(updates: Partial<User>): Promise<User> {
  Object.assign(mockUser, updates)
  return mockUser
}

export async function getExports(): Promise<Export[]> {
  return []
}

export async function getExport(id: string): Promise<Export | null> {
  return null
}

export async function createExport(documentId: string, format: Export['format']): Promise<Export> {
  return {
    id: `exp-${Date.now()}`,
    documentId,
    documentName: '',
    format,
    status: 'pending',
    createdAt: new Date().toISOString(),
  }
}

export async function deleteExport(id: string): Promise<void> {}

// createDocument kept for any component still using the old shape
export async function createDocument(file: File): Promise<Document> {
  const res = await uploadDocument(file)
  return res.document
}
