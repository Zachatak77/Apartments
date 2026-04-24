import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Users, PhoneCall, CalendarDays, Clock, ArrowRight, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { NewClientModal } from '@/components/dashboard/new-client-modal'
import { formatDistanceToNow, format, startOfMonth, endOfMonth } from 'date-fns'

function StatCard({
  label, value, icon: Icon, sub,
}: { label: string; value: number | string; icon: React.ElementType; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <div className="w-9 h-9 rounded-lg bg-[#2D5016]/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-[#2D5016]" />
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default async function DashboardOverviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const monthStart = startOfMonth(now).toISOString()
  const monthEnd = endOfMonth(now).toISOString()

  const [
    { count: activeClients },
    { count: newDiscovery },
    { count: sessionsThisMonth },
    { count: upcomingSessions },
    { data: recentCalls },
    { data: recentSessions },
  ] = await Promise.all([
    supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('coach_id', user.id)
      .eq('status', 'active'),
    supabase
      .from('discovery_calls')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'new'),
    supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .gte('session_date', monthStart)
      .lte('session_date', monthEnd),
    supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .gt('session_date', now.toISOString()),
    supabase
      .from('discovery_calls')
      .select('id, name, submitted_at, status')
      .order('submitted_at', { ascending: false })
      .limit(5),
    supabase
      .from('sessions')
      .select('id, session_date, shared_with_parent, client:clients(profile:profiles(full_name))')
      .order('session_date', { ascending: false })
      .limit(5),
  ])

  const statusVariants: Record<string, 'new' | 'contacted' | 'booked' | 'converted' | 'closed'> = {
    new: 'new', contacted: 'contacted', booked: 'booked', converted: 'converted', closed: 'closed',
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
          <p className="text-sm text-gray-500 mt-0.5">{format(now, 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <NewClientModal />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Clients" value={activeClients ?? 0} icon={Users} />
        <StatCard label="New Discovery Calls" value={newDiscovery ?? 0} icon={PhoneCall} />
        <StatCard
          label="Sessions This Month"
          value={sessionsThisMonth ?? 0}
          icon={CalendarDays}
          sub={format(now, 'MMMM yyyy')}
        />
        <StatCard label="Upcoming Sessions" value={upcomingSessions ?? 0} icon={Clock} />
      </div>

      {/* Activity feeds */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-800">Recent Discovery Calls</h2>
            <Link
              href="/dashboard/discovery"
              className="text-sm text-[#2D5016] hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {!recentCalls?.length ? (
            <p className="text-sm text-gray-400 py-4 text-center">No discovery calls yet.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentCalls.map((call) => (
                <div key={call.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{call.name ?? 'Unknown'}</p>
                    <p className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(call.submitted_at), { addSuffix: true })}
                    </p>
                  </div>
                  <Badge variant={statusVariants[call.status] ?? 'secondary'}>{call.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-800">Recent Sessions</h2>
            <Link
              href="/dashboard/clients"
              className="text-sm text-[#2D5016] hover:underline flex items-center gap-1"
            >
              All clients <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {!recentSessions?.length ? (
            <p className="text-sm text-gray-400 py-4 text-center">No sessions logged yet.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {(recentSessions as any[]).map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {s.client?.profile?.full_name ?? 'Unknown client'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {s.session_date ? format(new Date(s.session_date), 'MMM d, yyyy') : '—'}
                    </p>
                  </div>
                  <Badge variant={s.shared_with_parent ? 'shared' : 'private'}>
                    {s.shared_with_parent ? 'Shared' : 'Private'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <NewClientModal
            trigger={
              <button className="inline-flex items-center gap-2 h-9 px-4 rounded-md border border-[#2D5016] text-[#2D5016] text-sm font-medium hover:bg-[#2D5016]/5 transition-colors">
                <Plus className="w-4 h-4" /> Add New Client
              </button>
            }
          />
          <Link
            href="/dashboard/discovery"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-md border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <PhoneCall className="w-4 h-4" /> View Discovery Queue
          </Link>
        </div>
      </div>
    </div>
  )
}
