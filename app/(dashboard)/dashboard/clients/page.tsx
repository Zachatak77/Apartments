import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { Users } from 'lucide-react'

export default function ClientsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#2D5016] mb-1">Clients</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Manage your active and past coaching clients.
      </p>

      <Card className="border-[#2D5016]/15 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="w-10 h-10 text-[#2D5016]/30 mb-4" />
          <CardTitle className="text-base text-[#2D5016]/50 font-medium mb-2">
            No clients yet
          </CardTitle>
          <p className="text-sm text-muted-foreground max-w-xs">
            Client management will be built in Phase 2.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
