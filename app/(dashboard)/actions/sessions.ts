'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const sessionSchema = z.object({
  client_id: z.string().uuid(),
  session_date: z.string(),
  session_notes: z.string().min(1),
  action_items: z.array(z.string()).default([]),
  shared_with_parent: z.boolean().default(false),
})

export async function logSession(formData: FormData) {
  const supabase = await createClient()

  const rawItems = formData.get('action_items')
  let action_items: string[] = []
  try {
    action_items = JSON.parse(rawItems as string)
  } catch {
    action_items = []
  }

  const parsed = sessionSchema.safeParse({
    client_id: formData.get('client_id'),
    session_date: formData.get('session_date'),
    session_notes: formData.get('session_notes'),
    action_items,
    shared_with_parent: formData.get('shared_with_parent') === 'true',
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { error } = await supabase.from('sessions').insert(parsed.data)
  if (error) return { error: error.message }

  revalidatePath(`/dashboard/clients/${parsed.data.client_id}`)
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateSession(
  sessionId: string,
  clientId: string,
  updates: { session_notes?: string; action_items?: string[]; shared_with_parent?: boolean }
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('sessions')
    .update(updates)
    .eq('id', sessionId)
  if (error) return { error: error.message }
  revalidatePath(`/dashboard/clients/${clientId}`)
  return { success: true }
}

export async function deleteSession(sessionId: string, clientId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('sessions').delete().eq('id', sessionId)
  if (error) return { error: error.message }
  revalidatePath(`/dashboard/clients/${clientId}`)
  return { success: true }
}
