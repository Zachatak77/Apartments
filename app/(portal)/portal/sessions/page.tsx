import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { CalendarDays } from 'lucide-react'

export default function SessionsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#2D5016] mb-1">Sessions</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Session notes and action items shared by your coach.
      </p>

      <Card className="border-[#2D5016]/15 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <CalendarDays className="w-10 h-10 text-[#2D5016]/30 mb-4" />
          <CardTitle className="text-base text-[#2D5016]/50 font-medium mb-2">
            No sessions yet
          </CardTitle>
          <p className="text-sm text-muted-foreground max-w-xs">
            Session notes will appear here after your coach shares them with you.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
