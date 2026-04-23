import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { ClipboardList } from 'lucide-react'

export default function IntakeFormPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#2D5016] mb-1">Intake Form</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Complete your intake form so Marissa can learn about your family and goals.
      </p>

      <Card className="border-[#2D5016]/15 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <ClipboardList className="w-10 h-10 text-[#2D5016]/30 mb-4" />
          <CardTitle className="text-base text-[#2D5016]/50 font-medium mb-2">
            Intake form coming soon
          </CardTitle>
          <p className="text-sm text-muted-foreground max-w-xs">
            Your intake form will be available here once your account is fully set up.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
