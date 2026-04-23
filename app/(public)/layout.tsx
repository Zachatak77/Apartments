import Link from 'next/link'
import { Leaf } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F5F0E8' }}>
      {/* Nav */}
      <nav className="border-b border-[#2D5016]/15 bg-[#F5F0E8]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#2D5016]">
              <Leaf className="w-4 h-4 text-[#F5F0E8]" />
            </div>
            <span className="font-semibold text-[#2D5016] text-sm sm:text-base">
              Parent Coaching with Marissa
            </span>
          </Link>

          <Button
            asChild
            className="bg-[#2D5016] hover:bg-[#3a6b1e] text-[#F5F0E8] text-sm"
          >
            <Link href="/discovery">Book a Discovery Call</Link>
          </Button>
        </div>
      </nav>

      {/* Page content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-[#2D5016]/15 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#2D5016]">
              <Leaf className="w-3 h-3 text-[#F5F0E8]" />
            </div>
            <span className="text-sm font-medium text-[#2D5016]">
              Parent Coaching with Marissa
            </span>
          </div>
          <a
            href="mailto:parentcoachwithmarissa@gmail.com"
            className="text-sm text-[#2D5016]/70 hover:text-[#2D5016] transition-colors"
          >
            parentcoachwithmarissa@gmail.com
          </a>
        </div>
      </footer>
    </div>
  )
}
