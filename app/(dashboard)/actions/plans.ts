'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type PlanObjective = {
  objective: string
  action_steps: string
  timeline: string
  success_indicators: string
}

export type PlanContent = {
  body: string
  objectives: PlanObjective[]
}

export async function savePlan(
  clientId: string,
  planId: string | null,
  title: string,
  content: PlanContent,
  publish: boolean
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (planId) {
    const { error } = await supabase
      .from('coaching_plans')
      .update({
        title,
        content,
        is_published: publish,
        updated_at: new Date().toISOString(),
      })
      .eq('id', planId)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase.from('coaching_plans').insert({
      client_id: clientId,
      coach_id: user.id,
      title,
      content,
      is_published: publish,
    })
    if (error) return { error: error.message }
  }

  revalidatePath(`/dashboard/clients/${clientId}`)
  return { success: true }
}

export async function togglePlanPublish(planId: string, clientId: string, publish: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('coaching_plans')
    .update({ is_published: publish, updated_at: new Date().toISOString() })
    .eq('id', planId)
  if (error) return { error: error.message }
  revalidatePath(`/dashboard/clients/${clientId}`)
  return { success: true }
}
