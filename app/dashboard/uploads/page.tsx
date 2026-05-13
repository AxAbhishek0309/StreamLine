'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/page-header'
import { UploadZone } from '@/components/upload-zone'
import { UploadedFiles } from '@/components/uploaded-files'

export default function UploadsPage() {
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <>
      <PageHeader
        title="Upload Documents"
        description="Add new documents for processing"
      />
      <div className="p-8 max-w-4xl mx-auto">
        <UploadZone onUploaded={() => setRefreshKey(k => k + 1)} />
        <div className="mt-12">
          <h2 className="text-lg font-semibold text-foreground mb-4">Uploaded Files</h2>
          <UploadedFiles refreshKey={refreshKey} />
        </div>
      </div>
    </>
  )
}
