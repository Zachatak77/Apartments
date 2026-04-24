'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CalendlyEmbed } from '@/components/calendly-embed'
import { CheckCircle } from 'lucide-react'

const schema = z.object({
  name: z.string().min(2, 'Please enter your name'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().optional(),
  child_ages: z.string().min(1, "Please share your children's ages"),
  main_concern: z.string().min(10, 'Please share a bit more — a sentence or two is great'),
  how_they_heard: z.string().min(1, 'Please select an option'),
})

type FormData = z.infer<typeof schema>

export function DiscoveryCallForm() {
  const [submitted, setSubmitted] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setSubmitError(null)
    const supabase = createClient()

    const { error } = await supabase.from('discovery_calls').insert({
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      child_ages: data.child_ages,
      main_concern: data.main_concern,
      how_they_heard: data.how_they_heard,
    })

    if (error) {
      setSubmitError(
        'Something went wrong submitting your form. Please try again or email us directly.'
      )
      return
    }

    setFirstName(data.name.split(' ')[0])
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div>
        <div className="flex flex-col items-center text-center py-8 gap-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-[#2D5016]/10">
            <CheckCircle className="w-8 h-8 text-[#2D5016]" />
          </div>
          <h3 className="text-2xl font-display font-bold text-[#2D5016]">
            Thanks, {firstName}!
          </h3>
          <p className="text-[#2D5016]/70 max-w-sm">
            Now pick a time that works for you. I can't wait to connect.
          </p>
        </div>
        <CalendlyEmbed />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {submitError && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {submitError}
        </div>
      )}

      {/* Name + Email */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-[#2D5016]">
            Full Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            placeholder="Jane Smith"
            className="border-[#2D5016]/25 focus-visible:ring-[#2D5016]"
            {...register('name')}
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-[#2D5016]">
            Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="jane@example.com"
            className="border-[#2D5016]/25 focus-visible:ring-[#2D5016]"
            {...register('email')}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>
      </div>

      {/* Phone + Child ages */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="phone" className="text-[#2D5016]">
            Phone{' '}
            <span className="text-[#2D5016]/40 font-normal text-xs">(optional)</span>
          </Label>
          <Input
            id="phone"
            type="tel"
            placeholder="(555) 000-0000"
            className="border-[#2D5016]/25 focus-visible:ring-[#2D5016]"
            {...register('phone')}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="child_ages" className="text-[#2D5016]">
            Children's ages <span className="text-destructive">*</span>
          </Label>
          <Input
            id="child_ages"
            placeholder='e.g. "4 and 7"'
            className="border-[#2D5016]/25 focus-visible:ring-[#2D5016]"
            {...register('child_ages')}
          />
          {errors.child_ages && (
            <p className="text-xs text-destructive">{errors.child_ages.message}</p>
          )}
        </div>
      </div>

      {/* Main concern */}
      <div className="space-y-1.5">
        <Label htmlFor="main_concern" className="text-[#2D5016]">
          What's the main challenge you're facing right now?{' '}
          <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="main_concern"
          placeholder="Tell me a bit about what's been hard lately — mornings, bedtime, behaviors, communication..."
          className="border-[#2D5016]/25 focus-visible:ring-[#2D5016] min-h-[120px]"
          {...register('main_concern')}
        />
        {errors.main_concern && (
          <p className="text-xs text-destructive">{errors.main_concern.message}</p>
        )}
      </div>

      {/* How did you hear */}
      <div className="space-y-1.5">
        <Label htmlFor="how_they_heard" className="text-[#2D5016]">
          How did you hear about Marissa?{' '}
          <span className="text-destructive">*</span>
        </Label>
        <select
          id="how_they_heard"
          className="flex h-10 w-full rounded-md border border-[#2D5016]/25 bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5016] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          defaultValue=""
          {...register('how_they_heard')}
        >
          <option value="" disabled>
            Select one…
          </option>
          <option value="Instagram">Instagram</option>
          <option value="Google">Google</option>
          <option value="Friend/Family referral">Friend / Family referral</option>
          <option value="Other">Other</option>
        </select>
        {errors.how_they_heard && (
          <p className="text-xs text-destructive">{errors.how_they_heard.message}</p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-[#2D5016] hover:bg-[#3a6b1e] text-[#F5F0E8] h-11 text-base"
      >
        {isSubmitting ? 'Submitting…' : 'Send My Request'}
      </Button>
    </form>
  )
}
