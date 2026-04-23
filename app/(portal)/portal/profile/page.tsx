import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { User } from 'lucide-react'

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, created_at')
    .eq('id', user!.id)
    .single()

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#2D5016] mb-1">Profile</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Your account information.
      </p>

      <Card className="border-[#2D5016]/15 max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#2D5016]/10">
              <User className="w-5 h-5 text-[#2D5016]" />
            </div>
            <CardTitle className="text-base text-[#2D5016]">
              {profile?.full_name ?? 'Parent'}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Email</p>
            <p className="text-sm font-medium text-[#2D5016]">
              {profile?.email ?? user?.email}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Member since</p>
            <p className="text-sm font-medium text-[#2D5016]">
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })
                : '—'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
