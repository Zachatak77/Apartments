import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  Leaf,
  LayoutDashboard,
  Users,
  PhoneCall,
  Library,
  Settings,
  LogOut,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/clients', label: 'Clients', icon: Users },
  { href: '/dashboard/discovery', label: 'Discovery Calls', icon: PhoneCall },
  { href: '/dashboard/resources', label: 'Resources', icon: Library },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

const roleLabel: Record<string, string> = {
  admin: 'Admin',
  coach: 'Coach',
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'parent') redirect('/portal')

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#F5F0E8' }}>
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-[#2D5016] text-[#F5F0E8] flex flex-col">
        {/* Brand + Coach identity */}
        <div className="px-6 py-6 border-b border-[#F5F0E8]/15">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#F5F0E8]/15">
              <Leaf className="w-4 h-4 text-[#F5F0E8]" />
            </div>
            <span className="text-xs font-medium text-[#F5F0E8]/70">
              Parent Coaching
            </span>
          </div>

          <p className="text-sm font-semibold text-[#F5F0E8]">
            {profile?.full_name ?? user.email}
          </p>

          <span className="inline-flex items-center mt-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F5F0E8]/20 text-[#F5F0E8]/90 uppercase tracking-wide">
            {roleLabel[profile?.role ?? 'coach'] ?? 'Coach'}
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-[#F5F0E8]/80 hover:text-[#F5F0E8] hover:bg-[#F5F0E8]/10 transition-colors"
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Sign out */}
        <div className="px-3 py-4 border-t border-[#F5F0E8]/15">
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="flex w-full items-center gap-3 px-3 py-2.5 rounded-md text-sm text-[#F5F0E8]/70 hover:text-[#F5F0E8] hover:bg-[#F5F0E8]/10 transition-colors"
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-8 py-8">{children}</div>
      </main>
    </div>
  )
}
