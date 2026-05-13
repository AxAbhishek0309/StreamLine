'use client'

import { useEffect, useState, useCallback } from 'react'
import { StatCard } from '@/components/stat-card'
import { getDashboardStats } from '@/lib/api'

interface Stats {
  totalDocuments: number
  activeJobs: number
  completedToday: number
  successRate: number
}

export function DashboardStats() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const data = await getDashboardStats()
      setStats(data)
    } catch {
      // keep stale data on error
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    // Poll every 8s — lightweight, keeps stats live without hammering the API
    const interval = setInterval(refresh, 8000)
    return () => clearInterval(interval)
  }, [refresh])

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
      <StatCard
        label="Total Documents"
        value={stats?.totalDocuments ?? '—'}
        change="all time"
        loading={loading}
      />
      <StatCard
        label="Active Jobs"
        value={stats?.activeJobs ?? '—'}
        change="pending + processing"
        loading={loading}
      />
      <StatCard
        label="Completed"
        value={stats?.completedToday ?? '—'}
        change="total completed"
        loading={loading}
      />
      <StatCard
        label="Success Rate"
        value={stats ? `${stats.successRate}%` : '—'}
        change="completed / total"
        loading={loading}
      />
    </div>
  )
}
