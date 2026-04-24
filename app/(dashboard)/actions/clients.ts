'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const newClientSchema = z.object({
  full_name: z.string().min(1),
  email: z.string().email(),
  package: z.enum(['confident_parent', 'partnership', 'ongoing']),
  start_date: z.string().optional(),
  notes: z.string().optional(),
})

export async function createClient_action(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const parsed = newClientSchema.safeParse({
    full_name: formData.get('full_name'),
    email: formData.get('email'),
    package: formData.get('package'),
    start_date: formData.get('start_date') || undefined,
    notes: formData.get('notes') || undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const admin = createAdminClient()

  // Create the auth user and send them a password-setup email
  const { data: newUser, error: authError } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.full_name, role: 'parent' },
  })
  if (authError) return { error: authError.message }

  // Set coach_id on the auto-created profile
  await admin.from('profiles').update({ coach_id: user.id }).eq('id', newUser.user.id)

  // Insert client record
  const { error: clientError } = await supabase.from('clients').insert({
    profile_id: newUser.user.id,
    coach_id: user.id,
    package: parsed.data.package,
    status: 'active',
    start_date: parsed.data.start_date || null,
    notes: parsed.data.notes || null,
  })
  if (clientError) return { error: clientError.message }

  // Send password reset so they can set their own password
  await admin.auth.admin.generateLink({
    type: 'recovery',
    email: parsed.data.email,
  })

  revalidatePath('/dashboard/clients')
  return { success: true, email: parsed.data.email }
}

export async function updateClientNotes(clientId: string, notes: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('clients')
    .update({ notes })
    .eq('id', clientId)
  if (error) return { error: error.message }
  revalidatePath(`/dashboard/clients/${clientId}`)
  return { success: true }
}

export async function updateClientStatus(
  clientId: string,
  status: 'discovery' | 'active' | 'paused' | 'completed'
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('clients')
    .update({ status })
    .eq('id', clientId)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/clients')
  revalidatePath(`/dashboard/clients/${clientId}`)
  return { success: true }
}
