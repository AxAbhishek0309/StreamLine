export interface Document {
  id: string
  filename: string
  original_name: string
  file_size: number
  mime_type: string
  storage_path: string
  page_count: number
  created_at: string
  updated_at: string
}

export interface Job {
  id: string
  document_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'retrying'
  progress: number
  current_stage: string | null
  error_message: string | null
  retry_count: number
  celery_task_id: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export interface ExtractedResult {
  id: string
  document_id: string
  title: string | null
  category: string | null
  summary: string | null
  keywords: string[] | null
  structured_data: Record<string, unknown> | null
  reviewed_data: Record<string, unknown> | null
  is_finalized: boolean
  finalized_at: string | null
  created_at: string
  updated_at: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface UploadResponse {
  document: Document
  job: Job
  task_id: string
  message: string
}

export interface ProgressEvent {
  job_id: string
  document_id: string
  status: Job['status']
  progress: number
  stage: string
  message: string
  timestamp: string
}

// Legacy shape kept for UI components that haven't been migrated yet
export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  plan: 'free' | 'pro' | 'enterprise'
}

export interface Export {
  id: string
  documentId: string
  documentName: string
  format: 'pdf' | 'json' | 'csv'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  downloadUrl?: string
  createdAt: string
}
