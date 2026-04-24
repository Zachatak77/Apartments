'use client'

import { useState, useTransition } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { logSession } from '@/app/(dashboard)/actions/sessions'

const schema = z.object({
  session_date: z.string().min(1, 'Date is required'),
  session_notes: z.string().min(1, 'Notes are required'),
  action_items: z.array(z.object({ value: z.string() })).default([]),
  shared_with_parent: z.boolean().default(false),
})
type FormValues = z.infer<typeof schema>

interface LogSessionModalProps {
  clientId: string
  trigger: React.ReactNode
}

export function LogSessionModal({ clientId, trigger }: LogSessionModalProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: {
        session_date: format(new Date(), 'yyyy-MM-dd'),
        session_notes: '',
        action_items: [],
        shared_with_parent: false,
      },
    })

  const { fields, append, remove } = useFieldArray({ control, name: 'action_items' })
  const shared = watch('shared_with_parent')

  const onSubmit = (data: FormValues) => {
    startTransition(async () => {
      const fd = new FormData()
      fd.append('client_id', clientId)
      fd.append('session_date', data.session_date)
      fd.append('session_notes', data.session_notes)
      fd.append('action_items', JSON.stringify(data.action_items.map((i) => i.value).filter(Boolean)))
      fd.append('shared_with_parent', String(data.shared_with_parent))
      const result = await logSession(fd)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Session logged.')
        reset()
        setOpen(false)
      }
    })
  }

  return (
    <>
      <div onClick={() => setOpen(true)}>{trigger}</div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log Session</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Session Date</Label>
              <Input type="date" {...register('session_date')} />
              {errors.session_date && <p className="text-xs text-red-500">{errors.session_date.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Session Notes *</Label>
              <textarea
                {...register('session_notes')}
                rows={5}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5016] resize-none"
                placeholder="What was discussed, progress made, observations..."
              />
              {errors.session_notes && <p className="text-xs text-red-500">{errors.session_notes.message}</p>}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Action Items</Label>
                <button
                  type="button"
                  onClick={() => append({ value: '' })}
                  className="text-xs text-[#2D5016] hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add item
                </button>
              </div>
              {fields.map((field, i) => (
                <div key={field.id} className="flex gap-2">
                  <Input
                    {...register(`action_items.${i}.value`)}
                    placeholder={`Action item ${i + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 py-2 border-t border-gray-100">
              <Switch
                checked={shared}
                onCheckedChange={(v) => setValue('shared_with_parent', v)}
                id="share-toggle"
              />
              <Label htmlFor="share-toggle" className="cursor-pointer">
                Share with parent
              </Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Session
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
