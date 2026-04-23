import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { PhoneCall } from 'lucide-react'

export default function DiscoveryCallsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#2D5016] mb-1">
        Discovery Calls
      </h1>
      <p className="text-sm text-muted-foreground mb-8">
        Prospective clients who have submitted a discovery call request.
      </p>

      <Card className="border-[#2D5016]/15 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <PhoneCall className="w-10 h-10 text-[#2D5016]/30 mb-4" />
          <CardTitle className="text-base text-[#2D5016]/50 font-medium mb-2">
            No discovery calls yet
          </CardTitle>
          <p className="text-sm text-muted-foreground max-w-xs">
            Discovery call submissions will appear here once the public booking
            form is live in Phase 2.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
