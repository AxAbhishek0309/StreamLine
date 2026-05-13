'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { getJobs } from '@/lib/api'
import type { Job } from '@/lib/types'

type View = 'daily' | 'weekly'

interface DataPoint { label: string; completed: number; failed: number }

function buildDaily(jobs: Job[]): DataPoint[] {
  const days: Record<string, DataPoint> = {}
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateKey = d.toISOString().slice(0, 10)
    const label = d.toLocaleDateString('en-US', { weekday: 'short' })
    days[dateKey] = { label, completed: 0, failed: 0 }
  }
  for (const job of jobs) {
    const key = job.created_at.slice(0, 10)
    if (!days[key]) continue
    if (job.status === 'completed') days[key].completed++
    if (job.status === 'failed') days[key].failed++
  }
  return Object.values(days)
}

function buildWeekly(jobs: Job[]): DataPoint[] {
  const weeks: Record<string, DataPoint> = {}
  for (let i = 3; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i * 7)
    const weekStart = new Date(d)
    weekStart.setDate(d.getDate() - d.getDay())
    const key = weekStart.toISOString().slice(0, 10)
    const label = `W${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    weeks[key] = { label, completed: 0, failed: 0 }
  }
  for (const job of jobs) {
    const d = new Date(job.created_at)
    const weekStart = new Date(d)
    weekStart.setDate(d.getDate() - d.getDay())
    const key = weekStart.toISOString().slice(0, 10)
    if (!weeks[key]) continue
    if (job.status === 'completed') weeks[key].completed++
    if (job.status === 'failed') weeks[key].failed++
  }
  return Object.values(weeks)
}

export function ProcessingChart() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [view, setView] = useState<View>('daily')
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await getJobs(1, 500)
      setJobs(res.items)
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 10000)
    return () => clearInterval(interval)
  }, [refresh])

  const data = view === 'daily' ? buildDaily(jobs) : buildWeekly(jobs)

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Processing Activity</h3>
        <div className="flex items-center gap-1 bg-card-foreground/10 rounded-lg p-1">
          {(['daily', 'weekly'] as View[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`text-xs px-3 py-1.5 rounded-md font-medium capitalize transition-colors ${
                view === v
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-[280px] flex items-center justify-center">
          <div className="text-xs text-muted-foreground animate-pulse">Loading…</div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.2 0 0)" />
            <XAxis dataKey="label" stroke="oklch(0.55 0 0)" style={{ fontSize: '0.75rem' }} />
            <YAxis allowDecimals={false} stroke="oklch(0.55 0 0)" style={{ fontSize: '0.75rem' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'oklch(0.12 0 0)',
                border: '1px solid oklch(0.25 0 0)',
                borderRadius: '0.5rem',
                color: 'oklch(0.95 0 0)',
                fontSize: '0.8rem',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '0.75rem', paddingTop: '12px' }} />
            <Line
              type="monotone"
              dataKey="completed"
              name="Completed"
              stroke="oklch(0.65 0.15 145)"
              strokeWidth={2}
              dot={{ fill: 'oklch(0.65 0.15 145)', r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="failed"
              name="Failed"
              stroke="oklch(0.55 0.2 25)"
              strokeWidth={2}
              dot={{ fill: 'oklch(0.55 0.2 25)', r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
