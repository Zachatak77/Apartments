import { PublicNav } from '@/components/public-nav'
import Link from 'next/link'
import { Leaf } from 'lucide-react'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F5F0E8' }}>
      <PublicNav />

      <main className="flex-1">{children}</main>

      <footer className="border-t border-[#2D5016]/15 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-[#2D5016]">
                <Leaf className="w-3.5 h-3.5 text-[#F5F0E8]" />
              </div>
              <span className="text-sm font-semibold text-[#2D5016]">
                Parent Coaching with Marissa
              </span>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 text-sm text-[#2D5016]/60">
              <Link href="/about" className="hover:text-[#2D5016] transition-colors">About</Link>
              <Link href="/services" className="hover:text-[#2D5016] transition-colors">Services</Link>
              <Link href="/book" className="hover:text-[#2D5016] transition-colors">Book a Call</Link>
              <a
                href="mailto:parentcoachwithmarissa@gmail.com"
                className="hover:text-[#2D5016] transition-colors"
              >
                parentcoachwithmarissa@gmail.com
              </a>
            </div>
          </div>
          <p className="text-center text-xs text-[#2D5016]/35 mt-8">
            © {new Date().getFullYear()} Parent Coaching with Marissa. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
