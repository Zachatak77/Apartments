'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { NewClientModal } from './new-client-modal'
import { format } from 'date-fns'

type ClientStatus = 'discovery' | 'active' | 'paused' | 'completed'

const statusVariantMap: Record<ClientStatus, 'discovery' | 'active' | 'paused' | 'completed'> = {
  discovery: 'discovery',
  active: 'active',
  paused: 'paused',
  completed: 'completed',
}

const packageLabels: Record<string, string> = {
  confident_parent: 'Confident Parent (2 wk)',
  partnership: 'Partnership (4 wk)',
  ongoing: 'Ongoing',
}

interface Client {
  id: string
  package: string | null
  status: ClientStatus | null
  start_date: string | null
  profile: { full_name: string | null; email: string | null } | null
  last_session_date?: string | null
}

export function ClientsTable({ clients }: { clients: Client[] }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = clients.filter((c) => {
    const name = c.profile?.full_name?.toLowerCase() ?? ''
    const email = c.profile?.email?.toLowerCase() ?? ''
    const matchesSearch = name.includes(search.toLowerCase()) || email.includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div>
      {/* Toolbar */}
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
            <SelectItem value="discovery">Discovery</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <NewClientModal />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="font-medium text-gray-500 mb-1">
            {clients.length === 0 ? 'No clients yet' : 'No clients match your filters'}
          </p>
          <p className="text-sm">
            {clients.length === 0
              ? 'Add your first client to get started.'
              : 'Try adjusting your search or filter.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Client</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Package</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Start Date</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Last Session</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((client) => (
                <tr key={client.id} className="bg-white hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{client.profile?.full_name ?? '—'}</p>
                    <p className="text-xs text-gray-400">{client.profile?.email ?? ''}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {packageLabels[client.package ?? ''] ?? client.package ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariantMap[client.status ?? 'active'] ?? 'secondary'}>
                      {client.status ?? '—'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {client.start_date ? format(new Date(client.start_date), 'MMM d, yyyy') : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {client.last_session_date
                      ? format(new Date(client.last_session_date), 'MMM d, yyyy')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/clients/${client.id}`}
                      className="text-[#2D5016] font-medium hover:underline text-sm"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
