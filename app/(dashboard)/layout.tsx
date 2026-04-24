import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardSidebar } from '@/components/dashboard/sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { count: newDiscoveryCount }] = await Promise.all([
    supabase.from('profiles').select('full_name, role').eq('id', user.id).single(),
    supabase
      .from('discovery_calls')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'new'),
  ])

  if (profile?.role === 'parent') redirect('/portal')

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      <DashboardSidebar
        fullName={profile?.full_name ?? null}
        email={user.email ?? ''}
        role={profile?.role ?? 'coach'}
        newDiscoveryCount={newDiscoveryCount ?? 0}
      />
      <main className="flex-1 overflow-auto min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
