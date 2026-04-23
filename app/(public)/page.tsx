import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Leaf, Heart, BookOpen } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      {/* Hero */}
      <div className="text-center max-w-3xl mx-auto">
        <div className="flex justify-center mb-6">
          <div className="flex items-center justify-center w-20 h-20 rounded-full bg-[#2D5016]/10">
            <Leaf className="w-10 h-10 text-[#2D5016]" />
          </div>
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-[#2D5016] mb-6 leading-tight">
          Confident parenting starts here.
        </h1>
        <p className="text-lg text-[#2D5016]/70 mb-10 leading-relaxed">
          Work one-on-one with Marissa to build connection, reduce stress, and
          show up as the parent you want to be — with practical tools and
          compassionate support every step of the way.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            asChild
            size="lg"
            className="bg-[#2D5016] hover:bg-[#3a6b1e] text-[#F5F0E8]"
          >
            <Link href="/discovery">Book a Free Discovery Call</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-[#2D5016]/40 text-[#2D5016] hover:bg-[#2D5016]/10">
            <Link href="/login">Client Login</Link>
          </Button>
        </div>
      </div>

      {/* Features */}
      <div className="mt-24 grid sm:grid-cols-3 gap-8">
        {[
          {
            icon: Heart,
            title: 'Compassionate Support',
            body: 'A judgment-free space to explore challenges and celebrate wins.',
          },
          {
            icon: BookOpen,
            title: 'Practical Tools',
            body: 'Evidence-based strategies you can use immediately in daily life.',
          },
          {
            icon: Leaf,
            title: 'Lasting Change',
            body: 'Build a foundation of confidence that grows with your family.',
          },
        ].map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="flex flex-col items-center text-center p-8 rounded-xl bg-white/60 border border-[#2D5016]/10"
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#2D5016]/10 mb-4">
              <Icon className="w-6 h-6 text-[#2D5016]" />
            </div>
            <h3 className="font-semibold text-[#2D5016] mb-2">{title}</h3>
            <p className="text-sm text-[#2D5016]/65 leading-relaxed">{body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
