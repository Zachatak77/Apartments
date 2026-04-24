import type { Metadata } from 'next'
import { CheckCircle2, Mail } from 'lucide-react'
import { DiscoveryCallForm } from '@/components/discovery-call-form'

export const metadata: Metadata = {
  title: 'Book a Free Discovery Call | Parent Coaching with Marissa',
  description:
    'Book a free, no-pressure discovery call with Marissa. Share what\'s going on at home and find out if coaching is the right fit for your family.',
}

export default function BookPage() {
  return (
    <div>
      {/* ── Header ───────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 lg:px-8 pt-20 pb-12 sm:pt-28 sm:pb-16 text-center">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-[#2D5016] mb-5">
            Let's talk about your family.
          </h1>
          <p className="text-lg text-[#2D5016]/70 leading-relaxed">
            This free call is a chance to share what's going on at home and see if coaching is
            a good fit. No pressure, no commitment — just an honest conversation.
          </p>
        </div>
      </section>

      {/* ── Form + Trust ─────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 lg:px-8 pb-24">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white/80 rounded-2xl border border-[#2D5016]/15 p-8 sm:p-10 shadow-sm mb-8">
            <DiscoveryCallForm />
          </div>

          {/* Trust signals */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-[#2D5016]/60">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#2D5016]" />
              <span>Free. No commitment. Just a conversation.</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#2D5016]" />
              <a
                href="mailto:parentcoachwithmarissa@gmail.com"
                className="hover:text-[#2D5016] transition-colors"
              >
                parentcoachwithmarissa@gmail.com
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
