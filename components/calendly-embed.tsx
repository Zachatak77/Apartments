'use client'

export function CalendlyEmbed() {
  const url = process.env.NEXT_PUBLIC_CALENDLY_URL

  if (!url) {
    return (
      <div className="mt-8 rounded-xl border-2 border-dashed border-[#2D5016]/20 bg-[#2D5016]/5 p-10 text-center">
        <p className="text-sm text-[#2D5016]/60 font-medium">
          Calendly booking widget will appear here.
        </p>
        <p className="text-xs text-[#2D5016]/40 mt-2">
          Add <code className="bg-[#2D5016]/10 px-1 rounded">NEXT_PUBLIC_CALENDLY_URL</code> to your .env.local
        </p>
      </div>
    )
  }

  return (
    <div className="mt-8 rounded-xl overflow-hidden border border-[#2D5016]/15">
      <iframe
        src={`${url}?embed_type=inline&hide_landing_page_details=1&hide_gdpr_banner=1`}
        width="100%"
        height="700"
        frameBorder="0"
        title="Schedule a discovery call"
      />
    </div>
  )
}
