'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type DiscoveryStatus = 'new' | 'contacted' | 'booked' | 'converted' | 'closed'

export async function updateDiscoveryStatus(id: string, status: DiscoveryStatus) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('discovery_calls')
    .update({ status })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/discovery')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateDiscoveryNotes(id: string, notes: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('discovery_calls')
    .update({ notes })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/discovery')
  return { success: true }
}

export async function markDiscoveryConverted(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('discovery_calls')
    .update({ status: 'converted' })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/discovery')
  revalidatePath('/dashboard')
  return { success: true }
}
