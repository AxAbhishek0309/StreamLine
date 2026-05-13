'use client'

import { Sliders } from 'lucide-react'

export function PreferencesSettings() {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
        <Sliders className="h-5 w-5" />
        Preferences
      </h2>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Email Notifications</p>
            <p className="text-xs text-muted-foreground mt-1">Get notified when jobs complete</p>
          </div>
          <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-card-foreground/10 transition-colors focus:outline-none focus:ring-2 focus:ring-accent">
            <span className="inline-block h-4 w-4 transform rounded-full bg-foreground transition-transform ml-1" />
          </button>
        </div>
        
        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">API Access</p>
              <p className="text-xs text-muted-foreground mt-1">Enable API for integrations</p>
            </div>
            <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-accent">
              <span className="inline-block h-4 w-4 transform rounded-full bg-accent-foreground transition-transform ml-6" />
            </button>
          </div>
        </div>
        
        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Two-Factor Authentication</p>
              <p className="text-xs text-muted-foreground mt-1">Enhanced security for your account</p>
            </div>
            <button className="text-sm text-accent hover:text-accent/80 font-medium">
              Setup
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
