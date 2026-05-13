'use client'

import { motion } from 'framer-motion'

interface StatCardProps {
  label: string
  value: string | number
  change: string
  loading?: boolean
}

export function StatCard({ label, value, change, loading }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-lg border border-border bg-card p-6 hover:border-accent/50 transition-colors"
    >
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <motion.p
        key={String(value)}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="mt-2 text-4xl font-bold text-foreground"
      >
        {loading ? <span className="text-muted-foreground text-2xl">—</span> : value}
      </motion.p>
      <p className="mt-2 text-xs text-muted-foreground">{change}</p>
    </motion.div>
  )
}
