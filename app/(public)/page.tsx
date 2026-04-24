import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, Leaf } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Parent Coaching with Marissa | New Jersey',
  description:
    'Practical, compassionate parent coaching for families who want calmer routines, fewer daily struggles, and real strategies that work.',
}

function GreenButton({
  href,
  children,
  className = '',
}: {
  href: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-md bg-[#2D5016] text-[#F5F0E8] font-medium transition-colors hover:bg-[#3a6b1e] ${className}`}
    >
      {children}
    </Link>
  )
}

export default function HomePage() {
  return (
    <div className="scroll-smooth">

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 sm:px-6 lg:px-8 pt-20 pb-24 sm:pt-28 sm:pb-32">
        {/* Soft radial glow */}
        <div
          className="absolute inset-0 -z-10 opacity-40"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 0%, #c8e6a0 0%, transparent 70%)',
          }}
        />
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#2D5016]/60 mb-6">
            <Leaf className="w-3 h-3" /> Parent Coaching · New Jersey
          </span>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#2D5016] leading-[1.1] mb-6">
            Parenting is hard.
            <br />
            <span className="text-[#3a6b1e]">You don't have to figure it out alone.</span>
          </h1>
          <p className="text-lg sm:text-xl text-[#2D5016]/70 leading-relaxed mb-10 max-w-2xl mx-auto">
            Support for families who want calmer routines, fewer daily struggles,
            and real strategies that actually work.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <GreenButton href="/book" className="h-12 px-8 text-base shadow-md shadow-[#2D5016]/20">
              Book a Free Discovery Call
            </GreenButton>
            <Link
              href="/services"
              className="inline-flex items-center gap-1.5 text-base font-medium text-[#2D5016] hover:text-[#3a6b1e] transition-colors"
            >
              Learn about the programs <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Social Proof Bar ─────────────────────────────────────── */}
      <section className="border-y border-[#2D5016]/10 bg-white/50 py-8 px-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12 text-center">
          <p className="text-sm font-semibold text-[#2D5016]/60 uppercase tracking-wider">
            Trusted by families across New Jersey
          </p>
          <div className="hidden sm:block w-px h-8 bg-[#2D5016]/15" />
          {[
            '50+ Families Helped',
            'Certified Parent Coach',
            'Personalized to Your Family',
          ].map((stat) => (
            <div key={stat} className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#2D5016] flex-shrink-0" />
              <span className="text-sm font-semibold text-[#2D5016]">{stat}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-[#2D5016]">
              Here's how we work together
            </h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                title: 'Book a free discovery call',
                body: 'We get to know your family and what you\'re working through — no pressure, no commitment.',
              },
              {
                step: '02',
                title: 'Get a personalized plan',
                body: 'A strategy built around your child\'s age, temperament, and your specific goals.',
              },
              {
                step: '03',
                title: 'See real change at home',
                body: 'With ongoing support so you never feel stuck — and real tools you can use the same day.',
              },
            ].map(({ step, title, body }) => (
              <div
                key={step}
                className="relative p-8 rounded-2xl bg-white/70 border border-[#2D5016]/10 shadow-sm"
              >
                <span className="font-display text-5xl font-extrabold text-[#2D5016]/10 leading-none block mb-4">
                  {step}
                </span>
                <h3 className="font-display font-bold text-lg text-[#2D5016] mb-2">{title}</h3>
                <p className="text-sm text-[#2D5016]/65 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Services Preview ─────────────────────────────────────── */}
      <section className="px-4 sm:px-6 lg:px-8 py-20 sm:py-28 bg-white/40">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-[#2D5016]">
              Programs designed around your family
            </h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                name: 'Confident Parent Program',
                duration: '2 Weeks',
                desc: 'A focused, short-term package for immediate clarity and support. Two private sessions, a personalized home strategy plan, custom scripts for behavior and transitions, plus two weeks of text and email support.',
              },
              {
                name: 'Parent Coaching Partnership',
                duration: '4 Weeks',
                desc: 'A higher-touch package for building consistency and real change. Four weekly sessions, a fully customized home support plan, ongoing text and email support, school and IEP guidance, and a routine and behavior tracking tool.',
                featured: true,
              },
              {
                name: 'Ongoing Support',
                duration: 'Monthly',
                desc: 'Continued guidance as your child grows. One monthly check-in call, ongoing text and email access, strategy adjustments, and school communication support.',
              },
            ].map(({ name, duration, desc, featured }) => (
              <div
                key={name}
                className={`flex flex-col p-7 rounded-2xl border ${
                  featured
                    ? 'bg-[#2D5016] text-[#F5F0E8] border-[#2D5016] shadow-lg shadow-[#2D5016]/20'
                    : 'bg-white/80 border-[#2D5016]/15'
                }`}
              >
                <span
                  className={`text-xs font-semibold uppercase tracking-wider mb-3 ${
                    featured ? 'text-[#F5F0E8]/60' : 'text-[#2D5016]/50'
                  }`}
                >
                  {duration}
                </span>
                <h3
                  className={`font-display font-bold text-lg mb-3 leading-snug ${
                    featured ? 'text-[#F5F0E8]' : 'text-[#2D5016]'
                  }`}
                >
                  {name}
                </h3>
                <p
                  className={`text-sm leading-relaxed flex-1 ${
                    featured ? 'text-[#F5F0E8]/80' : 'text-[#2D5016]/65'
                  }`}
                >
                  {desc}
                </p>
                <Link
                  href="/services"
                  className={`inline-flex items-center gap-1 mt-6 text-sm font-semibold transition-colors ${
                    featured
                      ? 'text-[#F5F0E8]/80 hover:text-[#F5F0E8]'
                      : 'text-[#2D5016] hover:text-[#3a6b1e]'
                  }`}
                >
                  Learn More <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── About Teaser ─────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Photo placeholder */}
            <div className="flex justify-center">
              <div className="w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-[#2D5016]/10 border-4 border-[#2D5016]/20 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-[#2D5016]/20 mx-auto mb-3 flex items-center justify-center">
                    <Leaf className="w-8 h-8 text-[#2D5016]/50" />
                  </div>
                  <p className="text-xs text-[#2D5016]/40 font-medium">Photo of Marissa</p>
                </div>
              </div>
            </div>
            {/* Text */}
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-[#2D5016]/50 mb-3 block">
                Meet Your Coach
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-[#2D5016] mb-5">
                Hi, I'm Marissa.
              </h2>
              <p className="text-[#2D5016]/70 leading-relaxed mb-4">
                I became a parent coach because I know firsthand how isolating and overwhelming it
                can feel to navigate the hard moments alone. My approach combines practical,
                evidence-based strategies with genuine compassion — because you deserve both.
              </p>
              <p className="text-[#2D5016]/70 leading-relaxed mb-8">
                Whether you're in the thick of toddler tantrums or navigating a teenager who won't
                talk to you, I'm here to help you find your footing — and feel good about the parent
                you're becoming.
              </p>
              <Link
                href="/about"
                className="inline-flex items-center gap-1.5 font-semibold text-[#2D5016] hover:text-[#3a6b1e] transition-colors"
              >
                Meet Marissa <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 lg:px-8 py-20 sm:py-28 bg-white/40">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-[#2D5016]">
              What parents are saying
            </h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                quote:
                  'Working with Marissa completely changed how I respond to my son\'s meltdowns. I finally feel like I have a plan.',
                name: 'Sarah M.',
                location: 'Morristown, NJ',
              },
              {
                quote:
                  'I was skeptical at first, but within two weeks I noticed a real difference in our mornings. Less fighting, more connection.',
                name: 'Tom R.',
                location: 'Summit, NJ',
              },
              {
                quote:
                  'Marissa doesn\'t just give you advice — she helps you understand your child. That\'s what made all the difference for us.',
                name: 'Jennifer K.',
                location: 'Montclair, NJ',
              },
            ].map(({ quote, name, location }) => (
              <div
                key={name}
                className="p-7 rounded-2xl bg-[#F5F0E8] border-l-4 border-[#2D5016] shadow-sm"
              >
                <p className="text-[#2D5016]/80 leading-relaxed text-sm mb-5 italic">
                  &ldquo;{quote}&rdquo;
                </p>
                <div>
                  <p className="font-semibold text-[#2D5016] text-sm">{name}</p>
                  <p className="text-xs text-[#2D5016]/50">{location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 lg:px-8 py-20 sm:py-28 bg-[#2D5016]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-[#F5F0E8] mb-4">
            Ready for calmer mornings and fewer battles?
          </h2>
          <p className="text-[#F5F0E8]/75 text-lg mb-10">
            Start with a free, no-pressure discovery call.
          </p>
          <Link
            href="/book"
            className="inline-flex items-center justify-center h-12 px-8 rounded-md bg-[#F5F0E8] text-[#2D5016] font-semibold text-base hover:bg-white transition-colors shadow-md"
          >
            Book Your Free Call
          </Link>
          <p className="mt-6 text-sm text-[#F5F0E8]/50">
            <a
              href="mailto:parentcoachwithmarissa@gmail.com"
              className="hover:text-[#F5F0E8]/80 transition-colors"
            >
              parentcoachwithmarissa@gmail.com
            </a>
          </p>
        </div>
      </section>

    </div>
  )
}
