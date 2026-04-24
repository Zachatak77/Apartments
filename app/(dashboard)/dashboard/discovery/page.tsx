import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DiscoveryTable } from '@/components/dashboard/discovery-table'

export default async function DiscoveryCallsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: calls } = await supabase
    .from('discovery_calls')
    .select('id, name, email, phone, child_ages, main_concern, how_they_heard, submitted_at, status, notes')
    .order('submitted_at', { ascending: false })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Discovery Calls</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Leads who have submitted the booking form
        </p>
      </div>
      <DiscoveryTable calls={(calls ?? []) as any[]} />
    </div>
  )
}
