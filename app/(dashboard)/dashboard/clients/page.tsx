import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ClientsTable } from '@/components/dashboard/clients-table'

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: clientRows } = await supabase
    .from('clients')
    .select(`
      id, package, status, start_date,
      profile:profiles(full_name, email)
    `)
    .eq('coach_id', user.id)
    .order('created_at', { ascending: false })

  // Attach last session date for each client
  const clientIds = clientRows?.map((c) => c.id) ?? []
  let lastSessionMap: Record<string, string | null> = {}

  if (clientIds.length > 0) {
    const { data: sessions } = await supabase
      .from('sessions')
      .select('client_id, session_date')
      .in('client_id', clientIds)
      .order('session_date', { ascending: false })

    if (sessions) {
      for (const s of sessions) {
        if (!lastSessionMap[s.client_id]) {
          lastSessionMap[s.client_id] = s.session_date
        }
      }
    }
  }

  const clients = (clientRows ?? []).map((c) => ({
    ...c,
    profile: Array.isArray(c.profile) ? c.profile[0] ?? null : c.profile,
    last_session_date: lastSessionMap[c.id] ?? null,
  }))

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {clients.length} client{clients.length !== 1 ? 's' : ''} total
        </p>
      </div>
      <ClientsTable clients={clients as any} />
    </div>
  )
}
