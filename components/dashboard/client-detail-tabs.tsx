'use client'

import { useState, useTransition, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { format } from 'date-fns'
import { Plus, Trash2, Eye, EyeOff, Loader2, ExternalLink, BookOpen, CheckSquare } from 'lucide-react'
import { toast } from 'sonner'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { LogSessionModal } from './log-session-modal'
import { updateClientNotes, updateClientStatus } from '@/app/(dashboard)/actions/clients'
import { savePlan, togglePlanPublish } from '@/app/(dashboard)/actions/plans'
import { updateSession, deleteSession } from '@/app/(dashboard)/actions/sessions'
import { assignResourceToClient, removeClientResource } from '@/app/(dashboard)/actions/resources'
import type { PlanContent, PlanObjective } from '@/app/(dashboard)/actions/plans'

const ReactMarkdown = dynamic(() => import('react-markdown'), { ssr: false, loading: () => <Skeleton className="h-32 w-full" /> })

// ─── Types ───────────────────────────────────────────────────────────────────

interface ClientSession {
  id: string
  session_date: string | null
  session_notes: string | null
  action_items: string[] | null
  shared_with_parent: boolean
}

interface CoachingPlan {
  id: string
  title: string | null
  content: PlanContent | null
  is_published: boolean
  updated_at: string
}

interface Resource {
  id: string
  title: string
  description: string | null
  file_url: string | null
  tags: string[] | null
  is_public: boolean
}

interface ClientDetailTabsProps {
  client: {
    id: string
    package: string | null
    status: string | null
    start_date: string | null
    notes: string | null
    profile: { full_name: string | null; email: string | null } | null
  }
  intakeForm: { submitted_at: string } | null
  plan: CoachingPlan | null
  sessions: ClientSession[]
  assignedResources: { resource_id: string; resource: Resource | null }[]
  allResources: Resource[]
}

const packageLabels: Record<string, string> = {
  confident_parent: 'Confident Parent Program',
  partnership: 'Parent Coaching Partnership',
  ongoing: 'Ongoing Support',
}

// ─── Overview Tab ────────────────────────────────────────────────────────────

function OverviewTab({ client, intakeForm, sessionCount, lastSessionDate }: {
  client: ClientDetailTabsProps['client']
  intakeForm: ClientDetailTabsProps['intakeForm']
  sessionCount: number
  lastSessionDate: string | null
}) {
  const [notes, setNotes] = useState(client.notes ?? '')
  const [status, setStatus] = useState(client.status ?? 'active')
  const [isPending, startTransition] = useTransition()

  const handleNotesSave = () => {
    startTransition(async () => {
      const result = await updateClientNotes(client.id, notes)
      if (result.error) toast.error(result.error)
      else toast.success('Notes saved.')
    })
  }

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus)
    startTransition(async () => {
      const result = await updateClientStatus(
        client.id,
        newStatus as 'discovery' | 'active' | 'paused' | 'completed'
      )
      if (result.error) {
        toast.error(result.error)
        setStatus(client.status ?? 'active')
      } else {
        toast.success('Status updated.')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {client.profile?.full_name ?? 'Unnamed Client'}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">{client.profile?.email}</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {client.package && (
              <Badge variant="secondary">{packageLabels[client.package] ?? client.package}</Badge>
            )}
            <Select value={status} onValueChange={handleStatusChange} disabled={isPending}>
              <SelectTrigger className="h-8 w-36 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="discovery">Discovery</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Start Date', value: client.start_date ? format(new Date(client.start_date), 'MMM d, yyyy') : '—' },
            { label: 'Total Sessions', value: String(sessionCount) },
            { label: 'Last Session', value: lastSessionDate ? format(new Date(lastSessionDate), 'MMM d, yyyy') : '—' },
            { label: 'Intake Form', value: intakeForm ? `Submitted ${format(new Date(intakeForm.submitted_at), 'MMM d')}` : 'Not submitted' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
              <p className="text-sm font-semibold text-gray-800">{value}</p>
            </div>
          ))}
        </div>

        {!intakeForm && (
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <span>Intake form link:</span>
            <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">/portal/intake</code>
            <button
              className="text-[#2D5016] hover:underline text-xs"
              onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/portal/intake`); toast.success('Link copied!') }}
            >
              Copy
            </button>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Coach Notes</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleNotesSave}
          rows={5}
          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5016] resize-none"
          placeholder="Add notes about this client..."
          disabled={isPending}
        />
        <p className="text-xs text-gray-400 mt-1">Auto-saves on blur.</p>
      </div>
    </div>
  )
}

// ─── Plan Tab ────────────────────────────────────────────────────────────────

const emptyObjective = (): PlanObjective => ({
  objective: '', action_steps: '', timeline: '', success_indicators: '',
})

function PlanTab({ clientId, plan }: { clientId: string; plan: CoachingPlan | null }) {
  const [title, setTitle] = useState(plan?.title ?? '')
  const [body, setBody] = useState((plan?.content as PlanContent)?.body ?? '')
  const [objectives, setObjectives] = useState<PlanObjective[]>(
    (plan?.content as PlanContent)?.objectives ?? []
  )
  const [preview, setPreview] = useState(false)
  const [isPending, startTransition] = useTransition()

  const save = (publish: boolean) => {
    startTransition(async () => {
      const result = await savePlan(clientId, plan?.id ?? null, title, { body, objectives }, publish)
      if (result.error) toast.error(result.error)
      else toast.success(publish ? 'Plan published to parent.' : 'Draft saved.')
    })
  }

  const handleTogglePublish = () => {
    if (!plan?.id) return
    startTransition(async () => {
      const result = await togglePlanPublish(plan.id, clientId, !plan.is_published)
      if (result.error) toast.error(result.error)
      else toast.success(plan.is_published ? 'Plan unpublished.' : 'Plan published.')
    })
  }

  const updateObjective = (i: number, field: keyof PlanObjective, value: string) => {
    setObjectives((prev) => prev.map((o, idx) => idx === i ? { ...o, [field]: value } : o))
  }

  return (
    <div className="space-y-6">
      {plan?.id && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={plan.is_published ? 'published' : 'draft'}>
              {plan.is_published ? 'Published' : 'Draft'}
            </Badge>
            <span className="text-xs text-gray-400">
              Last updated {format(new Date(plan.updated_at), 'MMM d, yyyy')}
            </span>
          </div>
          <Button size="sm" variant="outline" onClick={handleTogglePublish} disabled={isPending}>
            {plan.is_published ? 'Unpublish' : 'Publish to Parent'}
          </Button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="space-y-1.5">
          <Label>Plan Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 4-Week Partnership Plan" />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label>Plan Body (Markdown)</Label>
            <button
              onClick={() => setPreview(!preview)}
              className="text-xs text-[#2D5016] hover:underline flex items-center gap-1"
            >
              <Eye className="w-3 h-3" /> {preview ? 'Edit' : 'Preview'}
            </button>
          </div>
          {preview ? (
            <div className="prose prose-sm max-w-none rounded-md border border-gray-200 px-4 py-3 min-h-[150px] bg-gray-50">
              <ReactMarkdown>{body || '*Nothing to preview yet.*'}</ReactMarkdown>
            </div>
          ) : (
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2D5016] resize-none"
              placeholder="Write the coaching plan here. Supports Markdown."
            />
          )}
        </div>
      </div>

      {/* Objectives table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-700">Key Objectives</h3>
          <Button size="sm" variant="outline" onClick={() => setObjectives([...objectives, emptyObjective()])}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Row
          </Button>
        </div>
        {objectives.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No objectives yet. Add a row to get started.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="bg-gray-50">
                  {['Objective', 'Action Steps', 'Timeline', 'Success Indicators', ''].map((h) => (
                    <th key={h} className="text-left px-3 py-2 font-semibold text-gray-600 text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {objectives.map((obj, i) => (
                  <tr key={i}>
                    {(['objective', 'action_steps', 'timeline', 'success_indicators'] as const).map((field) => (
                      <td key={field} className="px-2 py-1.5">
                        <input
                          value={obj[field]}
                          onChange={(e) => updateObjective(i, field, e.target.value)}
                          className="w-full rounded border border-transparent hover:border-gray-200 focus:border-[#2D5016] px-2 py-1 text-sm outline-none transition-colors"
                        />
                      </td>
                    ))}
                    <td className="px-2 py-1.5">
                      <button onClick={() => setObjectives(objectives.filter((_, idx) => idx !== i))}
                        className="text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => save(false)} disabled={isPending}>
          {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save Draft
        </Button>
        <Button onClick={() => save(true)} disabled={isPending}>
          {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Publish to Parent
        </Button>
      </div>
    </div>
  )
}

// ─── Sessions Tab ────────────────────────────────────────────────────────────

function SessionCard({ session, clientId }: { session: ClientSession; clientId: string }) {
  const [expanded, setExpanded] = useState(false)
  const [sharing, startTransition] = useTransition()

  const toggleShare = () => {
    startTransition(async () => {
      const result = await updateSession(session.id, clientId, { shared_with_parent: !session.shared_with_parent })
      if (result.error) toast.error(result.error)
    })
  }

  const handleDelete = () => {
    if (!confirm('Delete this session?')) return
    startTransition(async () => {
      const result = await deleteSession(session.id, clientId)
      if (result.error) toast.error(result.error)
      else toast.success('Session deleted.')
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div>
          <p className="font-medium text-gray-900">
            {session.session_date ? format(new Date(session.session_date), 'MMM d, yyyy') : '—'}
          </p>
          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
            {session.session_notes?.slice(0, 80) ?? ''}
            {(session.session_notes?.length ?? 0) > 80 ? '…' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={session.shared_with_parent ? 'shared' : 'private'}>
            {session.shared_with_parent ? 'Shared' : 'Private'}
          </Badge>
          {(session.action_items?.length ?? 0) > 0 && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <CheckSquare className="w-3 h-3" />
              {session.action_items!.length}
            </span>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-4">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{session.session_notes}</p>
          {session.action_items && session.action_items.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Action Items</p>
              <ul className="space-y-1">
                {session.action_items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-[#2D5016] mt-0.5">•</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <button
              onClick={toggleShare}
              disabled={sharing}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#2D5016] transition-colors"
            >
              {session.shared_with_parent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {session.shared_with_parent ? 'Unshare from parent' : 'Share with parent'}
            </button>
            <button
              onClick={handleDelete}
              disabled={sharing}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Resources Tab ───────────────────────────────────────────────────────────

function ResourcesTab({
  clientId, assignedResources, allResources,
}: { clientId: string; assignedResources: ClientDetailTabsProps['assignedResources']; allResources: Resource[] }) {
  const [search, setSearch] = useState('')
  const [assignOpen, setAssignOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const assignedIds = new Set(assignedResources.map((r) => r.resource_id))
  const available = allResources.filter(
    (r) => !assignedIds.has(r.id) && r.title.toLowerCase().includes(search.toLowerCase())
  )

  const handleAssign = (resourceId: string) => {
    startTransition(async () => {
      const result = await assignResourceToClient(clientId, resourceId)
      if (result.error) toast.error(result.error)
      else toast.success('Resource assigned.')
    })
  }

  const handleRemove = (resourceId: string) => {
    startTransition(async () => {
      const result = await removeClientResource(clientId, resourceId)
      if (result.error) toast.error(result.error)
      else toast.success('Resource removed.')
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setAssignOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> Assign Resource
        </Button>
      </div>

      {assignedResources.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="font-medium text-gray-500 mb-1">No resources assigned yet</p>
          <p className="text-sm">Assign resources from your library to this client.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignedResources.map(({ resource_id, resource }) => (
            resource && (
              <div key={resource_id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{resource.title}</p>
                  {resource.description && (
                    <p className="text-sm text-gray-500 mt-0.5">{resource.description}</p>
                  )}
                  {resource.file_url && (
                    <a href={resource.file_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-[#2D5016] hover:underline mt-1">
                      <ExternalLink className="w-3 h-3" /> View file
                    </a>
                  )}
                </div>
                <button
                  onClick={() => handleRemove(resource_id)}
                  disabled={isPending}
                  className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )
          ))}
        </div>
      )}

      {/* Assign modal */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Assign Resource</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Search resources..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="max-h-64 overflow-y-auto space-y-2">
              {available.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  {allResources.length === 0 ? 'No resources in library yet.' : 'All resources already assigned.'}
                </p>
              ) : available.map((r) => (
                <button
                  key={r.id}
                  onClick={() => { handleAssign(r.id); setAssignOpen(false) }}
                  disabled={isPending}
                  className="w-full text-left px-3 py-2.5 rounded-lg border border-gray-200 hover:border-[#2D5016] hover:bg-[#2D5016]/5 transition-colors"
                >
                  <p className="font-medium text-sm text-gray-900">{r.title}</p>
                  {r.description && <p className="text-xs text-gray-500 mt-0.5">{r.description}</p>}
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ClientDetailTabs({
  client, intakeForm, plan, sessions, assignedResources, allResources,
}: ClientDetailTabsProps) {
  const lastSessionDate = sessions[0]?.session_date ?? null

  return (
    <Tabs defaultValue="overview">
      <TabsList className="mb-6">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="plan">Coaching Plan</TabsTrigger>
        <TabsTrigger value="sessions">
          Sessions
          {sessions.length > 0 && (
            <span className="ml-1.5 text-xs bg-[#2D5016]/15 text-[#2D5016] rounded-full px-1.5 py-0.5">
              {sessions.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="resources">Resources</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <OverviewTab
          client={client}
          intakeForm={intakeForm}
          sessionCount={sessions.length}
          lastSessionDate={lastSessionDate}
        />
      </TabsContent>

      <TabsContent value="plan">
        <PlanTab clientId={client.id} plan={plan} />
      </TabsContent>

      <TabsContent value="sessions">
        <div className="space-y-4">
          <div className="flex justify-end">
            <LogSessionModal
              clientId={client.id}
              trigger={
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-1" /> Log Session
                </Button>
              }
            />
          </div>
          {sessions.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <BookOpen className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-gray-500 mb-1">No sessions logged yet</p>
              <p className="text-sm">Log your first session to start tracking progress.</p>
            </div>
          ) : (
            sessions.map((s) => <SessionCard key={s.id} session={s} clientId={client.id} />)
          )}
        </div>
      </TabsContent>

      <TabsContent value="resources">
        <ResourcesTab clientId={client.id} assignedResources={assignedResources} allResources={allResources} />
      </TabsContent>
    </Tabs>
  )
}
