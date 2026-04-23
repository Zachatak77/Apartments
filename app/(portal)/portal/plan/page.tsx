import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen } from 'lucide-react'

export default function MyPlanPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#2D5016] mb-1">My Plan</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Your personalized coaching plan will appear here once published by your coach.
      </p>

      <Card className="border-[#2D5016]/15 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="w-10 h-10 text-[#2D5016]/30 mb-4" />
          <CardTitle className="text-base text-[#2D5016]/50 font-medium mb-2">
            No plan published yet
          </CardTitle>
          <p className="text-sm text-muted-foreground max-w-xs">
            Your coach will publish your personalized plan here after your first session.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
