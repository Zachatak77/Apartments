import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ResourceLibrary } from '@/components/dashboard/resource-library'

export default async function DashboardResourcesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: resources } = await supabase
    .from('resources')
    .select('id, title, description, tags, is_public, file_url, created_at')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Resource Library</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Upload and manage resources to share with clients
        </p>
      </div>
      <ResourceLibrary resources={(resources ?? []) as any[]} />
    </div>
  )
}
