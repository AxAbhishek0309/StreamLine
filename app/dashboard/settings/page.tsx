import { PageHeader } from '@/components/page-header'
import { AccountSettings } from '@/components/account-settings'
import { PreferencesSettings } from '@/components/preferences-settings'
import { BillingSettings } from '@/components/billing-settings'

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage your account and preferences"
      />
      
      <div className="p-8 max-w-2xl mx-auto space-y-8">
        <AccountSettings />
        <PreferencesSettings />
        <BillingSettings />
      </div>
    </>
  )
}
