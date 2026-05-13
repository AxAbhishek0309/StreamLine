import { PageHeader } from '@/components/page-header'
import { DashboardStats } from '@/components/dashboard-stats'
import { RecentDocuments } from '@/components/recent-documents'
import { ProcessingChart } from '@/components/processing-chart'

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Welcome back! Here's your processing overview."
      />
      <div className="p-8">
        <DashboardStats />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 mt-8">
          <div className="lg:col-span-2">
            <ProcessingChart />
          </div>
          <div>
            <RecentDocuments />
          </div>
        </div>
      </div>
    </>
  )
}
