'use client'

import { useState, useTransition, useOptimistic } from 'react'
import { Search, ChevronDown, ChevronUp } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { NewClientModal } from './new-client-modal'
import { updateDiscoveryStatus, updateDiscoveryNotes, markDiscoveryConverted } from '@/app/(dashboard)/actions/discovery'

type DiscoveryStatus = 'new' | 'contacted' | 'booked' | 'converted' | 'closed'

interface DiscoveryCall {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  child_ages: string | null
  main_concern: string | null
  how_they_heard: string | null
  submitted_at: string
  status: DiscoveryStatus
  notes: string | null
}

const statusVariantMap: Record<DiscoveryStatus, DiscoveryStatus> = {
  new: 'new', contacted: 'contacted', booked: 'booked', converted: 'converted', closed: 'closed',
}

function DiscoveryRow({ call }: { call: DiscoveryCall }) {
  const [expanded, setExpanded] = useState(false)
  const [notes, setNotes] = useState(call.notes ?? '')
  const [status, setStatus] = useState<DiscoveryStatus>(call.status)
  const [isPending, startTransition] = useTransition()
  const [convertOpen, setConvertOpen] = useState(false)

  const handleStatusChange = (newStatus: string) => {
    const s = newStatus as DiscoveryStatus
    setStatus(s)
    startTransition(async () => {
      const result = await updateDiscoveryStatus(call.id, s)
      if (result.error) {
        toast.error(result.error)
        setStatus(call.status)
      }
    })
  }

  const handleNotesSave = () => {
    startTransition(async () => {
      const result = await updateDiscoveryNotes(call.id, notes)
      if (result.error) toast.error(result.error)
      else toast.success('Notes saved.')
    })
  }

  return (
    <>
      <tr className="bg-white hover:bg-gray-50 transition-colors">
        <td className="px-4 py-3">
          <p className="font-medium text-gray-900">{call.name ?? '—'}</p>
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">{call.email ?? '—'}</td>
        <td className="px-4 py-3 text-sm text-gray-600">{call.phone ?? '—'}</td>
        <td className="px-4 py-3 text-sm text-gray-600">{call.child_ages ?? '—'}</td>
        <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
          <p className="truncate">{call.main_concern ?? '—'}</p>
        </td>
        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
          {formatDistanceToNow(new Date(call.submitted_at), { addSuffix: true })}
        </td>
        <td className="px-4 py-3">
          <Select value={status} onValueChange={handleStatusChange} disabled={isPending}>
            <SelectTrigger className="h-8 w-32 text-xs">
              <Badge variant={statusVariantMap[status]}>{status}</Badge>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="booked">Booked</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {status === 'booked' && (
              <NewClientModal
                prefill={{ full_name: call.name ?? '', email: call.email ?? '' }}
                onSuccess={async () => {
                  await markDiscoveryConverted(call.id)
                  setStatus('converted')
                }}
                trigger={
                  <Button size="sm" variant="outline" className="h-7 text-xs whitespace-nowrap">
                    Convert
                  </Button>
                }
              />
            )}
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-gray-400 hover:text-gray-700 transition-colors"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </td>
      </tr>

      {expanded && (
        <tr className="bg-gray-50">
          <td colSpan={8} className="px-4 py-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Full Concern
                </p>
                <p className="text-sm text-gray-700">{call.main_concern ?? '—'}</p>
                {call.how_they_heard && (
                  <p className="text-xs text-gray-400 mt-2">
                    Heard via: {call.how_they_heard}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Internal Notes
                </p>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5016] resize-none"
                  placeholder="Add internal notes (e.g. Left voicemail 4/21)"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 h-7 text-xs"
                  onClick={handleNotesSave}
                  disabled={isPending}
                >
                  Save Notes
                </Button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export function DiscoveryTable({ calls }: { calls: DiscoveryCall[] }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = calls.filter((c) => {
    const matchesSearch =
      (c.name?.toLowerCase() ?? '').includes(search.toLowerCase()) ||
      (c.email?.toLowerCase() ?? '').includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="booked">Booked</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="font-medium text-gray-500 mb-1">
            {calls.length === 0 ? 'No discovery calls yet' : 'No calls match your filters'}
          </p>
          <p className="text-sm">
            {calls.length === 0
              ? 'Submissions from the booking form will appear here.'
              : 'Try adjusting your search or filter.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Phone</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Child Ages</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Main Concern</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Submitted</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((call) => (
                <DiscoveryRow key={call.id} call={call} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
