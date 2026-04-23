import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, CalendarDays, Library } from 'lucide-react'

export default async function PortalDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user!.id)
    .single()

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#2D5016] mb-1">
        Welcome back, {firstName}
      </h1>
      <p className="text-sm text-muted-foreground mb-8">
        Here's what's happening in your coaching journey.
      </p>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="border-[#2D5016]/15">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#2D5016]" />
              <CardTitle className="text-sm font-medium text-[#2D5016]">
                My Plan
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              View your personalized coaching plan.
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#2D5016]/15">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[#2D5016]" />
              <CardTitle className="text-sm font-medium text-[#2D5016]">
                Sessions
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Review your session notes and action items.
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#2D5016]/15">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Library className="w-4 h-4 text-[#2D5016]" />
              <CardTitle className="text-sm font-medium text-[#2D5016]">
                Resources
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Access guides, worksheets, and tools.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
