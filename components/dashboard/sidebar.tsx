'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, Leaf, LayoutDashboard, Users, PhoneCall, Library, Settings, LogOut } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { signOut } from '@/app/(dashboard)/actions/signout'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/clients', label: 'Clients', icon: Users },
  { href: '/dashboard/discovery', label: 'Discovery Calls', icon: PhoneCall },
  { href: '/dashboard/resources', label: 'Resources', icon: Library },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

const roleLabel: Record<string, string> = { admin: 'Admin', coach: 'Coach' }

interface SidebarProps {
  fullName: string | null
  email: string
  role: string
  newDiscoveryCount: number
}

export function DashboardSidebar({ fullName, email, role, newDiscoveryCount }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href)

  const NavContent = () => (
    <>
      {/* Brand + identity */}
      <div className="px-5 py-5 border-b border-[#F5F0E8]/15">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-[#F5F0E8]/15">
            <Leaf className="w-3.5 h-3.5 text-[#F5F0E8]" />
          </div>
          <span className="text-xs font-medium text-[#F5F0E8]/60 leading-tight">
            Parent Coaching with Marissa
          </span>
        </div>
        <p className="text-sm font-semibold text-[#F5F0E8] truncate">{fullName ?? email}</p>
        <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#F5F0E8]/20 text-[#F5F0E8]/90 uppercase tracking-wide">
          {roleLabel[role] ?? 'Coach'}
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon, exact }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors',
              isActive(href, exact)
                ? 'bg-[#F5F0E8]/15 text-[#F5F0E8] font-medium'
                : 'text-[#F5F0E8]/70 hover:text-[#F5F0E8] hover:bg-[#F5F0E8]/10'
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{label}</span>
            {label === 'Discovery Calls' && newDiscoveryCount > 0 && (
              <span className="flex items-center justify-center min-w-[1.25rem] h-5 rounded-full bg-[#F5F0E8] text-[#2D5016] text-[10px] font-bold px-1">
                {newDiscoveryCount}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-4 border-t border-[#F5F0E8]/15">
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-md text-sm text-[#F5F0E8]/60 hover:text-[#F5F0E8] hover:bg-[#F5F0E8]/10 transition-colors"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            Sign out
          </button>
        </form>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-shrink-0 bg-[#2D5016] flex-col">
        <NavContent />
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between bg-[#2D5016] text-[#F5F0E8] px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#F5F0E8]/15 flex items-center justify-center">
            <Leaf className="w-3 h-3" />
          </div>
          <span className="text-sm font-semibold">Dashboard</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1 rounded hover:bg-[#F5F0E8]/10 transition-colors"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile slide-down menu */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileOpen(false)}>
          <div
            className="w-72 h-full bg-[#2D5016] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <NavContent />
          </div>
        </div>
      )}
    </>
  )
}
