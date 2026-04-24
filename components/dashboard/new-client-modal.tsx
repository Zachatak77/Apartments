'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient_action } from '@/app/(dashboard)/actions/clients'

const schema = z.object({
  full_name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email required'),
  package: z.enum(['confident_parent', 'partnership', 'ongoing'], { required_error: 'Select a package' }),
  start_date: z.string().optional(),
  notes: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

interface NewClientModalProps {
  prefill?: { full_name?: string; email?: string }
  onSuccess?: () => void
  trigger?: React.ReactNode
}

export function NewClientModal({ prefill, onSuccess, trigger }: NewClientModalProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: prefill?.full_name ?? '',
      email: prefill?.email ?? '',
    },
  })

  const onSubmit = (data: FormValues) => {
    startTransition(async () => {
      const fd = new FormData()
      Object.entries(data).forEach(([k, v]) => v && fd.append(k, v))
      const result = await createClient_action(fd)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`Client created. An email has been sent to ${result.email} to set up their account.`)
        reset()
        setOpen(false)
        onSuccess?.()
      }
    })
  }

  return (
    <>
      <div onClick={() => setOpen(true)}>
        {trigger ?? (
          <Button size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" /> New Client
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input id="full_name" {...register('full_name')} placeholder="Jane Smith" />
              {errors.full_name && <p className="text-xs text-red-500">{errors.full_name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" {...register('email')} placeholder="jane@example.com" />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Package *</Label>
              <Select onValueChange={(v) => setValue('package', v as FormValues['package'])}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a package" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confident_parent">Confident Parent Program (2 Weeks)</SelectItem>
                  <SelectItem value="partnership">Parent Coaching Partnership (4 Weeks)</SelectItem>
                  <SelectItem value="ongoing">Ongoing Support (Monthly)</SelectItem>
                </SelectContent>
              </Select>
              {errors.package && <p className="text-xs text-red-500">{errors.package.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="start_date">Start Date</Label>
              <Input id="start_date" type="date" {...register('start_date')} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                {...register('notes')}
                rows={3}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5016] resize-none"
                placeholder="Initial notes..."
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Client
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
