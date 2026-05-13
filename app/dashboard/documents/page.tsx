import { PageHeader } from '@/components/page-header'
import { DocumentsList } from '@/components/documents-list'

export default function DocumentsPage() {
  return (
    <>
      <PageHeader
        title="Documents"
        description="Manage all your processed documents"
      />
      
      <div className="p-8 max-w-6xl mx-auto">
        <DocumentsList />
      </div>
    </>
  )
}
