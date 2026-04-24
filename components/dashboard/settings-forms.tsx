'use client'

import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { updateProfile, changePassword } from '@/app/(dashboard)/actions/settings'

export function ProfileForm({ initialName }: { initialName: string }) {
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await updateProfile(fd)
      if (result.error) toast.error(result.error)
      else toast.success('Profile updated.')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="full_name">Full Name</Label>
        <Input id="full_name" name="full_name" defaultValue={initialName} />
      </div>
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Save Changes
      </Button>
    </form>
  )
}

export function PasswordForm() {
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await changePassword(fd)
      if (result.error) toast.error(result.error)
      else {
        toast.success('Password changed.')
        ;(e.target as HTMLFormElement).reset()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="password">New Password</Label>
        <Input id="password" name="password" type="password" placeholder="Min. 8 characters" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">Confirm Password</Label>
        <Input id="confirm" name="confirm" type="password" placeholder="Repeat new password" />
      </div>
      <Button type="submit" size="sm" variant="outline" disabled={isPending}>
        {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Change Password
      </Button>
    </form>
  )
}

export function NotificationPreferences() {
  const [newCall, setNewCall] = useState(true)
  const [intake, setIntake] = useState(true)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-800">
            New discovery call submitted
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Email me when a new booking form is submitted
          </p>
        </div>
        <Switch checked={newCall} onCheckedChange={setNewCall} />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-800">
            Intake form completed
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Email me when a parent completes their intake form
          </p>
        </div>
        <Switch checked={intake} onCheckedChange={setIntake} />
      </div>
      <p className="text-xs text-gray-400 pt-2 border-t border-gray-100">
        Notifications via Resend — coming in a future update
      </p>
    </div>
  )
}
