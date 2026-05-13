import { PageHeader } from '@/components/page-header'
import { JobsList } from '@/components/jobs-list'

export default function JobsPage() {
  return (
    <>
      <PageHeader
        title="Processing Jobs"
        description="Monitor and manage all document processing tasks"
      />
      
      <div className="p-8 max-w-6xl mx-auto">
        <JobsList />
      </div>
    </>
  )
}
