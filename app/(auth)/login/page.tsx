'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { signIn } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Leaf } from 'lucide-react'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      className="w-full bg-[#2D5016] hover:bg-[#3a6b1e] text-[#F5F0E8]"
      disabled={pending}
    >
      {pending ? 'Signing in…' : 'Sign In'}
    </Button>
  )
}

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setError(null)
    const result = await signIn(formData)
    if (result?.error) {
      setError(result.error)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: '#F5F0E8' }}
    >
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-[#2D5016] mb-4">
            <Leaf className="w-7 h-7 text-[#F5F0E8]" />
          </div>
          <h1 className="text-2xl font-semibold text-[#2D5016] text-center">
            Parent Coaching
          </h1>
          <p className="text-sm text-[#2D5016]/70 mt-1">with Marissa</p>
        </div>

        <Card className="border-[#2D5016]/20 shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-[#2D5016]">
              Welcome back
            </CardTitle>
            <CardDescription>
              Sign in to access your coaching portal
            </CardDescription>
          </CardHeader>

          <form action={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#2D5016]">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="border-[#2D5016]/30 focus-visible:ring-[#2D5016]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-[#2D5016]">
                  Password
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="border-[#2D5016]/30 focus-visible:ring-[#2D5016]"
                />
              </div>
            </CardContent>

            <CardFooter className="flex-col gap-3">
              <SubmitButton />
              <p className="text-xs text-center text-muted-foreground">
                Don&apos;t have an account?{' '}
                <span className="text-[#2D5016] font-medium">
                  Contact your coach to get started.
                </span>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
