import { PageHeader } from '@/components/page-header'
import { ExportsList } from '@/components/exports-list'

export default function ExportsPage() {
  return (
    <>
      <PageHeader
        title="Exports"
        description="Download your processed documents in various formats"
      />
      
      <div className="p-8 max-w-6xl mx-auto">
        <ExportsList />
      </div>
    </>
  )
}
