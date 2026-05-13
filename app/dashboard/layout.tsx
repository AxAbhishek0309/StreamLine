'use client'

import { Sidebar } from '@/components/sidebar'
import { SidebarProvider, useSidebar } from '@/components/sidebar-context'
import { SidebarToggle } from '@/components/sidebar-toggle'

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { isOpen, toggle } = useSidebar()

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Overlay for mobile / when sidebar is open */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={toggle}
        />
      )}

      <Sidebar />

      {/* Main content — pushed by sidebar on large screens */}
      <div
        className="flex flex-col flex-1 min-w-0 transition-all duration-300"
        style={{ marginLeft: isOpen ? '256px' : '0px' }}
      >
        <div className="flex-shrink-0 border-b border-border bg-card px-6 py-4">
          <SidebarToggle />
        </div>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <DashboardContent>{children}</DashboardContent>
    </SidebarProvider>
  )
}
