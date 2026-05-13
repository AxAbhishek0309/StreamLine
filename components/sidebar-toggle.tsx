'use client'

import { Menu } from 'lucide-react'
import { useSidebar } from '@/components/sidebar-context'

export function SidebarToggle() {
  const { toggle } = useSidebar()

  return (
    <button
      onClick={toggle}
      className="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-card-foreground/10 transition-colors"
      aria-label="Toggle sidebar"
    >
      <Menu className="h-5 w-5" />
    </button>
  )
}
