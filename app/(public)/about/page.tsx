import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Leaf, Award } from 'lucide-react'

export const metadata: Metadata = {
  title: 'About Marissa | Parent Coaching with Marissa',
  description:
    'Meet Marissa — a certified parent coach helping families build calmer, more connected homes through practical, compassionate strategies.',
}

export default function AboutPage() {
  return (
    <div>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 lg:px-8 pt-20 pb-16 sm:pt-28 sm:pb-24 text-center">
        <div className="max-w-3xl mx-auto">
          {/* Photo placeholder */}
          <div className="flex justify-center mb-8">
            <div className="w-40 h-40 rounded-full bg-[#2D5016]/10 border-4 border-[#2D5016]/20 flex items-center justify-center">
              <div className="text-center">
                <Leaf className="w-10 h-10 text-[#2D5016]/40 mx-auto" />
                <p className="text-xs text-[#2D5016]/30 mt-1">Marissa</p>
              </div>
            </div>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-[#2D5016] mb-5">
            Hi, I'm Marissa.
          </h1>
          <p className="text-lg sm:text-xl text-[#2D5016]/70 leading-relaxed max-w-2xl mx-auto">
            I help parents feel more confident, connected, and calm — even on the hard days.
          </p>
        </div>
      </section>

      {/* ── My Story ─────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 sm:py-24 bg-white/40">
        <div className="max-w-3xl mx-auto">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#2D5016]/50 mb-4 block">
            My Story
          </span>
          <h2 className="font-display text-3xl font-extrabold text-[#2D5016] mb-8">
            Why I became a parent coach
          </h2>
          <div className="space-y-6 text-[#2D5016]/75 leading-relaxed">
            <p>
              I didn't set out to become a parent coach — I became one because I lived through the
              hardest parts of parenting and realized how much I needed someone in my corner. The
              sleepless nights, the power struggles, the moments where I wasn't sure if I was doing
              anything right. I know what it feels like to love your children deeply and still feel
              like you're failing them.
            </p>
            <p>
              That personal experience is the foundation of everything I do. I pursued my
              certification in parent coaching because I wanted to turn those hard-won lessons into
              something that could actually help other families. I believe that every parent has the
              capacity to show up the way they want to — they just need the right tools, a little
              clarity, and someone who truly understands what they're going through.
            </p>
            <p>
              Today, I work with families across New Jersey helping parents navigate everything from
              toddler meltdowns to teenage communication breakdowns. My approach isn't about
              perfection. It's about progress, connection, and finding what works for your unique
              family — not someone else's.
            </p>
          </div>
        </div>
      </section>

      {/* ── Philosophy ───────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold uppercase tracking-widest text-[#2D5016]/50 mb-3 block">
              How I Work
            </span>
            <h2 className="font-display text-3xl font-extrabold text-[#2D5016]">
              My coaching philosophy
            </h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                number: '01',
                title: 'Connection first',
                body: 'Before strategies, before scripts — parents need to feel heard and understood. Every session starts from a place of real listening, not judgment.',
              },
              {
                number: '02',
                title: 'Real-life strategies',
                body: 'Everything I share is practical, age-appropriate, and designed for actual family life. Not textbook theory — tools you can use today.',
              },
              {
                number: '03',
                title: 'Progress over perfection',
                body: 'Small, consistent wins matter more than getting it right every single time. We celebrate the effort, not just the outcome.',
              },
            ].map(({ number, title, body }) => (
              <div
                key={number}
                className="p-8 rounded-2xl bg-white/70 border border-[#2D5016]/10"
              >
                <span className="font-display text-4xl font-extrabold text-[#2D5016]/10 block mb-4">
                  {number}
                </span>
                <h3 className="font-display font-bold text-lg text-[#2D5016] mb-3">{title}</h3>
                <p className="text-sm text-[#2D5016]/65 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Credentials ──────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 sm:py-24 bg-white/40">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-xs font-semibold uppercase tracking-widest text-[#2D5016]/50 mb-3 block">
              Training &amp; Credentials
            </span>
            <h2 className="font-display text-3xl font-extrabold text-[#2D5016]">
              Certified to support your family
            </h2>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <div className="flex items-center gap-4 px-8 py-6 rounded-2xl border-2 border-[#2D5016]/20 bg-[#2D5016]/5">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#2D5016]/15">
                <Award className="w-6 h-6 text-[#2D5016]" />
              </div>
              <div>
                <p className="font-display font-bold text-[#2D5016]">Certified Parent Coach</p>
                <p className="text-sm text-[#2D5016]/55">Professional Certification</p>
              </div>
            </div>
            <div className="flex items-center gap-4 px-8 py-6 rounded-2xl border-2 border-[#2D5016]/20 bg-[#2D5016]/5">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#2D5016]/15">
                <Leaf className="w-6 h-6 text-[#2D5016]" />
              </div>
              <div>
                <p className="font-display font-bold text-[#2D5016]">Serving New Jersey Families</p>
                <p className="text-sm text-[#2D5016]/55">Sessions via Zoom</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#2D5016] mb-4">
            Ready to get started?
          </h2>
          <p className="text-[#2D5016]/65 mb-8">
            Book a free discovery call and let's talk about your family.
          </p>
          <Link
            href="/book"
            className="inline-flex items-center gap-2 h-12 px-8 rounded-md bg-[#2D5016] text-[#F5F0E8] font-semibold hover:bg-[#3a6b1e] transition-colors shadow-md shadow-[#2D5016]/20"
          >
            Book a Free Discovery Call <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

    </div>
  )
}
