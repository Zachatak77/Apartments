'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function uploadResource(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const tagsRaw = formData.get('tags') as string
  const isPublic = formData.get('is_public') === 'true'
  const file = formData.get('file') as File | null

  if (!title) return { error: 'Title is required' }

  let file_url: string | null = null

  if (file && file.size > 0) {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('resources')
      .upload(fileName, buffer, { contentType: file.type })

    if (uploadError) return { error: uploadError.message }

    const { data: urlData } = supabase.storage.from('resources').getPublicUrl(uploadData.path)
    file_url = urlData.publicUrl
  }

  const tags = tagsRaw
    ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean)
    : []

  const { error } = await supabase.from('resources').insert({
    title,
    description: description || null,
    tags,
    is_public: isPublic,
    file_url,
    created_by: user.id,
  })
  if (error) return { error: error.message }

  revalidatePath('/dashboard/resources')
  return { success: true }
}

export async function updateResource(
  id: string,
  updates: { title?: string; description?: string; tags?: string[]; is_public?: boolean }
) {
  const supabase = await createClient()
  const { error } = await supabase.from('resources').update(updates).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/resources')
  return { success: true }
}

export async function deleteResource(id: string) {
  const supabase = await createClient()
  // Remove all client assignments first
  await supabase.from('client_resources').delete().eq('resource_id', id)
  const { error } = await supabase.from('resources').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/resources')
  return { success: true }
}

export async function assignResourceToClient(clientId: string, resourceId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('client_resources').insert({
    client_id: clientId,
    resource_id: resourceId,
    assigned_by: user.id,
  })
  if (error && error.code !== '23505') return { error: error.message }
  revalidatePath(`/dashboard/clients/${clientId}`)
  return { success: true }
}

export async function removeClientResource(clientId: string, resourceId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('client_resources')
    .delete()
    .eq('client_id', clientId)
    .eq('resource_id', resourceId)
  if (error) return { error: error.message }
  revalidatePath(`/dashboard/clients/${clientId}`)
  return { success: true }
}
