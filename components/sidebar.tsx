'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/theme-toggle'
import { useSidebar } from '@/components/sidebar-context'
import {
  LayoutDashboard,
  Upload,
  Clock,
  FileText,
  Download,
  Settings,
  LogOut,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Uploads', href: '/dashboard/uploads', icon: Upload },
  { name: 'Jobs', href: '/dashboard/jobs', icon: Clock },
  { name: 'Documents', href: '/dashboard/documents', icon: FileText },
  { name: 'Exports', href: '/dashboard/exports', icon: Download },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { isOpen } = useSidebar()

  return (
    <motion.aside
      initial={false}
      animate={{ x: isOpen ? 0 : -256 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="fixed left-0 top-0 h-screen w-64 border-r border-border bg-card flex flex-col z-50"
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex items-center justify-center border-b border-border px-6 py-8">
          <Link href="/dashboard" className="flex items-center justify-center w-full">
            <span className="text-lg font-semibold">StreamLine</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-6">
          {navigation.map((item, idx) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.3 }}
              >
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-card-foreground/5'
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span>{item.name}</span>
                </Link>
              </motion.div>
            )
          })}
        </nav>

        {/* User Footer */}
        <div className="border-t border-border px-3 py-6 space-y-3">
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">John Doe</p>
              <p className="text-sm font-medium text-foreground">john@example.com</p>
            </div>
            <ThemeToggle />
          </div>
          <button className="w-full flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-card-foreground/5 transition-colors">
            <LogOut className="h-5 w-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </motion.aside>
  )
}
