import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings } from 'lucide-react'

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, role')
    .eq('id', user!.id)
    .single()

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#2D5016] mb-1">Settings</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Manage your account and application settings.
      </p>

      <Card className="border-[#2D5016]/15 max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-[#2D5016]" />
            <CardTitle className="text-sm font-medium text-[#2D5016]">
              Account
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Name</p>
            <p className="text-sm font-medium text-[#2D5016]">
              {profile?.full_name ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Email</p>
            <p className="text-sm font-medium text-[#2D5016]">
              {profile?.email ?? user?.email ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Role</p>
            <p className="text-sm font-medium text-[#2D5016] capitalize">
              {profile?.role ?? '—'}
            </p>
          </div>
          <p className="text-xs text-muted-foreground pt-2">
            Full settings management will be available in Phase 2.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
