import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { Library } from 'lucide-react'

export default function ResourcesPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#2D5016] mb-1">Resources</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Guides, worksheets, and tools assigned to you by your coach.
      </p>

      <Card className="border-[#2D5016]/15 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Library className="w-10 h-10 text-[#2D5016]/30 mb-4" />
          <CardTitle className="text-base text-[#2D5016]/50 font-medium mb-2">
            No resources yet
          </CardTitle>
          <p className="text-sm text-muted-foreground max-w-xs">
            Resources your coach assigns to you will appear here.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
