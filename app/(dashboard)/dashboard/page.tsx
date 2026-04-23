import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, PhoneCall, Library, CalendarDays } from 'lucide-react'

export default async function DashboardOverviewPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user!.id)
    .single()

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Coach'

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#2D5016] mb-1">
        Good morning, {firstName}
      </h1>
      <p className="text-sm text-muted-foreground mb-8">
        Here's an overview of your coaching practice.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Active Clients', value: '—', icon: Users },
          { label: 'Discovery Calls', value: '—', icon: PhoneCall },
          { label: 'Sessions This Month', value: '—', icon: CalendarDays },
          { label: 'Resources', value: '—', icon: Library },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="border-[#2D5016]/15">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{label}</p>
                <Icon className="w-4 h-4 text-[#2D5016]/50" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-[#2D5016]">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="border-[#2D5016]/15 border-dashed">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-[#2D5016]">
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Activity feed coming in Phase 2.
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#2D5016]/15 border-dashed">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-[#2D5016]">
              Upcoming Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Calendar integration coming in Phase 2.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
