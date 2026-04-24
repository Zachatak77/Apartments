import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ChevronLeft } from 'lucide-react'
import { ClientDetailTabs } from '@/components/dashboard/client-detail-tabs'

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: client } = await supabase
    .from('clients')
    .select('id, package, status, start_date, notes, profile:profiles(full_name, email)')
    .eq('id', params.id)
    .eq('coach_id', user.id)
    .single()

  if (!client) notFound()

  // Normalise profile (Supabase returns array for joins)
  const clientNorm = {
    ...client,
    profile: Array.isArray(client.profile) ? client.profile[0] ?? null : client.profile,
  }

  const [
    { data: intakeForms },
    { data: plans },
    { data: sessions },
    { data: clientResources },
    { data: allResources },
  ] = await Promise.all([
    supabase
      .from('intake_forms')
      .select('submitted_at')
      .eq('client_id', params.id)
      .order('submitted_at', { ascending: false })
      .limit(1),
    supabase
      .from('coaching_plans')
      .select('id, title, content, is_published, updated_at')
      .eq('client_id', params.id)
      .order('created_at', { ascending: false })
      .limit(1),
    supabase
      .from('sessions')
      .select('id, session_date, session_notes, action_items, shared_with_parent')
      .eq('client_id', params.id)
      .order('session_date', { ascending: false }),
    supabase
      .from('client_resources')
      .select('resource_id, resource:resources(id, title, description, file_url, tags, is_public)')
      .eq('client_id', params.id),
    supabase
      .from('resources')
      .select('id, title, description, file_url, tags, is_public')
      .order('title'),
  ])

  const intakeForm = intakeForms?.[0] ?? null
  const plan = plans?.[0] ?? null

  const assignedResources = (clientResources ?? []).map((cr) => ({
    resource_id: cr.resource_id,
    resource: Array.isArray(cr.resource) ? cr.resource[0] ?? null : (cr.resource as any),
  }))

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard/clients"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#2D5016] transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Clients
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {clientNorm.profile?.full_name ?? 'Client Detail'}
        </h1>
      </div>

      <ClientDetailTabs
        client={clientNorm as any}
        intakeForm={intakeForm}
        plan={plan as any}
        sessions={(sessions ?? []) as any[]}
        assignedResources={assignedResources as any[]}
        allResources={(allResources ?? []) as any[]}
      />
    </div>
  )
}
