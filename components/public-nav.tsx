'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X, Leaf } from 'lucide-react'

export function PublicNav() {
  const [open, setOpen] = useState(false)

  return (
    <nav className="border-b border-[#2D5016]/15 bg-[#F5F0E8]/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2"
            onClick={() => setOpen(false)}
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#2D5016]">
              <Leaf className="w-4 h-4 text-[#F5F0E8]" />
            </div>
            <span className="font-semibold text-[#2D5016] text-sm sm:text-base leading-tight">
              Parent Coaching<span className="hidden sm:inline"> with Marissa</span>
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/about"
              className="text-sm text-[#2D5016]/80 hover:text-[#2D5016] transition-colors font-medium"
            >
              About
            </Link>
            <Link
              href="/services"
              className="text-sm text-[#2D5016]/80 hover:text-[#2D5016] transition-colors font-medium"
            >
              Services
            </Link>
            <Link
              href="/book"
              className="inline-flex items-center justify-center h-9 px-4 rounded-md bg-[#2D5016] text-[#F5F0E8] text-sm font-medium hover:bg-[#3a6b1e] transition-colors"
            >
              Book a Call
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 text-[#2D5016] rounded-md hover:bg-[#2D5016]/10 transition-colors"
            aria-label="Toggle menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden border-t border-[#2D5016]/15 py-4 space-y-1">
            <Link
              href="/about"
              onClick={() => setOpen(false)}
              className="block px-3 py-2.5 text-sm font-medium text-[#2D5016]/80 hover:text-[#2D5016] hover:bg-[#2D5016]/5 rounded-md transition-colors"
            >
              About
            </Link>
            <Link
              href="/services"
              onClick={() => setOpen(false)}
              className="block px-3 py-2.5 text-sm font-medium text-[#2D5016]/80 hover:text-[#2D5016] hover:bg-[#2D5016]/5 rounded-md transition-colors"
            >
              Services
            </Link>
            <div className="pt-2">
              <Link
                href="/book"
                onClick={() => setOpen(false)}
                className="block text-center py-2.5 rounded-md bg-[#2D5016] text-[#F5F0E8] text-sm font-medium hover:bg-[#3a6b1e] transition-colors"
              >
                Book a Call
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
