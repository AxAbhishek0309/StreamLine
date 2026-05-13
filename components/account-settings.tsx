'use client'

import { User, Mail, Save } from 'lucide-react'

export function AccountSettings() {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
        <User className="h-5 w-5" />
        Account Settings
      </h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Full Name</label>
          <input
            type="text"
            defaultValue="John Doe"
            className="w-full px-4 py-2 rounded-lg bg-card-foreground/5 border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Email Address</label>
          <div className="flex gap-2">
            <input
              type="email"
              defaultValue="john@example.com"
              className="flex-1 px-4 py-2 rounded-lg bg-card-foreground/5 border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <button className="px-4 py-2 rounded-lg bg-accent text-accent-foreground font-medium text-sm hover:opacity-90 transition-opacity">
              Verify
            </button>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Password</label>
          <button className="text-sm text-accent hover:text-accent/80 font-medium">
            Change Password
          </button>
        </div>
        
        <button className="w-full mt-6 px-4 py-2 rounded-lg bg-accent text-accent-foreground font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
          <Save className="h-4 w-4" />
          Save Changes
        </button>
      </div>
    </div>
  )
}
