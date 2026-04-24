import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  ProfileForm,
  PasswordForm,
  NotificationPreferences,
} from '@/components/dashboard/settings-forms'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-800 mb-1">Profile</h2>
        <p className="text-sm text-gray-500 mb-5">Update your display name</p>

        <div className="space-y-4 mb-6">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Email</p>
            <p className="text-sm text-gray-800">{user.email}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Role</p>
            <p className="text-sm text-gray-800 capitalize">{profile?.role ?? '—'}</p>
          </div>
        </div>

        <ProfileForm initialName={profile?.full_name ?? ''} />
      </div>

      {/* Password */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-800 mb-1">Password</h2>
        <p className="text-sm text-gray-500 mb-5">Change your account password</p>
        <PasswordForm />
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-800 mb-1">Notification Preferences</h2>
        <p className="text-sm text-gray-500 mb-5">Choose what you want to be notified about</p>
        <NotificationPreferences />
      </div>
    </div>
  )
}
