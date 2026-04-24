import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

export const metadata: Metadata = {
  title: 'Services & Programs | Parent Coaching with Marissa',
  description:
    'Explore parent coaching programs designed for your family — from short-term intensive support to ongoing monthly guidance.',
}

const packages = [
  {
    name: 'Confident Parent Program',
    duration: '2 Weeks',
    tagline: 'Clear plan. Less overwhelm. Strategies you can use right away.',
    includes: [
      '2 private coaching sessions (45–60 min)',
      'Personalized home strategy plan',
      'Custom scripts for behavior + transitions',
      '2 weeks of text/email support',
      'Follow-up notes with clear action steps',
    ],
    featured: false,
  },
  {
    name: 'Parent Coaching Partnership',
    duration: '4 Weeks',
    tagline: 'More consistency, fewer battles, and stronger parent confidence.',
    includes: [
      '4 weekly coaching sessions (45–60 min)',
      'Fully customized home support plan',
      'Ongoing text/email support',
      'School + IEP guidance',
      'Routine/behavior tracking tool',
      'Session recaps with next steps',
    ],
    featured: true,
  },
  {
    name: 'Ongoing Support',
    duration: 'Monthly',
    tagline: 'Ongoing clarity, accountability, and support.',
    includes: [
      '1 monthly check-in call (30 min)',
      'Ongoing text/email access',
      'Strategy adjustments as needed',
      'School communication support',
    ],
    featured: false,
  },
]

const faqs = [
  {
    q: 'Is parent coaching the same as therapy?',
    a: 'No. Coaching is forward-focused and practical. I\'m not diagnosing or treating — I\'m working with you on strategies, routines, and communication to make daily life better.',
  },
  {
    q: 'What age children do you work with?',
    a: 'I work with families with children from toddlers through teenagers. Every program is tailored to your child\'s specific age, temperament, and what your family is working through.',
  },
  {
    q: 'How do sessions work?',
    a: 'Sessions are held via Zoom and are 45–60 minutes. You\'ll always leave with clear next steps — not just a conversation, but an actual plan to try before we meet again.',
  },
  {
    q: 'What if I\'m not sure which package is right for me?',
    a: "That's exactly what the discovery call is for. There's no pressure — just a conversation about what's going on at home and what might help most. I'll share my honest recommendation.",
  },
  {
    q: 'Do you offer any guarantees?',
    a: "I'm committed to your progress. If you're not finding the sessions helpful, we'll talk openly and honestly about adjustments or next steps. Your results matter to me.",
  },
]

export default function ServicesPage() {
  return (
    <div>

      {/* ── Header ───────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 lg:px-8 pt-20 pb-16 sm:pt-28 sm:pb-20 text-center">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-[#2D5016] mb-5">
            Programs built around your family
          </h1>
          <p className="text-lg text-[#2D5016]/70 leading-relaxed mb-4">
            Every family is different. Choose the level of support that fits where you are right now.
          </p>
          <p className="text-sm text-[#2D5016]/50 italic">
            Pricing is shared during your free discovery call so we can recommend the right fit for your family.
          </p>
        </div>
      </section>

      {/* ── Package Cards ────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 lg:px-8 py-8 pb-24">
        <div className="max-w-5xl mx-auto grid sm:grid-cols-3 gap-6 items-start">
          {packages.map(({ name, duration, tagline, includes, featured }) => (
            <div
              key={name}
              className={`flex flex-col rounded-2xl border p-8 h-full ${
                featured
                  ? 'bg-[#2D5016] border-[#2D5016] text-[#F5F0E8] shadow-xl shadow-[#2D5016]/25'
                  : 'bg-white/80 border-[#2D5016]/15'
              }`}
            >
              {featured && (
                <span className="self-start mb-4 px-3 py-1 rounded-full bg-[#F5F0E8]/20 text-[#F5F0E8] text-xs font-bold uppercase tracking-wider">
                  Most Popular
                </span>
              )}
              <span
                className={`text-xs font-semibold uppercase tracking-wider mb-3 ${
                  featured ? 'text-[#F5F0E8]/60' : 'text-[#2D5016]/50'
                }`}
              >
                {duration}
              </span>
              <h2
                className={`font-display font-extrabold text-xl mb-5 leading-snug ${
                  featured ? 'text-[#F5F0E8]' : 'text-[#2D5016]'
                }`}
              >
                {name}
              </h2>
              <ul className="space-y-2.5 flex-1 mb-6">
                {includes.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm">
                    <CheckCircle2
                      className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                        featured ? 'text-[#F5F0E8]/70' : 'text-[#2D5016]'
                      }`}
                    />
                    <span className={featured ? 'text-[#F5F0E8]/80' : 'text-[#2D5016]/70'}>
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
              <div
                className={`text-sm font-semibold pt-4 border-t italic ${
                  featured ? 'border-[#F5F0E8]/20 text-[#F5F0E8]/70' : 'border-[#2D5016]/10 text-[#2D5016]/60'
                }`}
              >
                {tagline}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Add-ons ──────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 sm:py-24 bg-white/40">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-2xl font-extrabold text-[#2D5016] mb-8">Add-ons</h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            {['Additional Session', 'IEP/School Prep Call', 'Custom Behavior Plan'].map((addon) => (
              <div
                key={addon}
                className="px-5 py-3 rounded-full border border-[#2D5016]/20 bg-[#2D5016]/5 text-sm font-medium text-[#2D5016]"
              >
                {addon}
              </div>
            ))}
          </div>
          <p className="text-sm text-[#2D5016]/50 italic">
            Pricing for all packages and add-ons is discussed during your discovery call.
          </p>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-extrabold text-[#2D5016]">
              Common questions
            </h2>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-base">{faq.q}</AccordionTrigger>
                <AccordionContent>{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ── Bottom CTA ───────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 sm:py-24 bg-[#2D5016] text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#F5F0E8] mb-4">
            Not sure where to start? Let's talk.
          </h2>
          <p className="text-[#F5F0E8]/70 mb-8">
            A free discovery call is the best way to figure out what your family needs.
          </p>
          <Link
            href="/book"
            className="inline-flex items-center gap-2 h-12 px-8 rounded-md bg-[#F5F0E8] text-[#2D5016] font-semibold hover:bg-white transition-colors"
          >
            Book a Free Call <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

    </div>
  )
}
