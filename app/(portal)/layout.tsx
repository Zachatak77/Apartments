import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Leaf, LayoutDashboard, BookOpen, CalendarDays, Library, ClipboardList, User, LogOut } from 'lucide-react'

const navItems = [
  { href: '/portal', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/portal/plan', label: 'My Plan', icon: BookOpen },
  { href: '/portal/sessions', label: 'Sessions', icon: CalendarDays },
  { href: '/portal/resources', label: 'Resources', icon: Library },
  { href: '/portal/intake', label: 'Intake Form', icon: ClipboardList },
  { href: '/portal/profile', label: 'Profile', icon: User },
]

export default async function PortalLayout({
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

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#F5F0E8' }}>
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-[#2D5016] text-[#F5F0E8] flex flex-col">
        {/* Brand */}
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
          <p className="text-xs text-[#F5F0E8]/60 mt-0.5">Parent</p>
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
        <div className="max-w-4xl mx-auto px-8 py-8">{children}</div>
      </main>
    </div>
  )
}
