import type { Metadata } from 'next'
import { Inter, Nunito } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const nunito = Nunito({ subsets: ['latin'], variable: '--font-nunito' })

export const metadata: Metadata = {
  title: 'Parent Coaching with Marissa',
  description: 'Empowering parents with expert coaching and support.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${nunito.variable} font-sans`}>
        {children}
      </body>
    </html>
  )
}
