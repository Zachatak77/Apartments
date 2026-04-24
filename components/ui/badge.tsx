import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default:    'border-transparent bg-[#2D5016] text-[#F5F0E8]',
        secondary:  'border-transparent bg-[#2D5016]/10 text-[#2D5016]',
        outline:    'border-[#2D5016]/30 text-[#2D5016]',
        active:     'border-transparent bg-green-100 text-green-800',
        paused:     'border-transparent bg-yellow-100 text-yellow-800',
        discovery:  'border-transparent bg-blue-100 text-blue-800',
        completed:  'border-transparent bg-gray-100 text-gray-600',
        new:        'border-transparent bg-blue-100 text-blue-800',
        contacted:  'border-transparent bg-yellow-100 text-yellow-800',
        booked:     'border-transparent bg-green-100 text-green-800',
        converted:  'border-transparent bg-[#2D5016] text-[#F5F0E8]',
        closed:     'border-transparent bg-gray-100 text-gray-500',
        published:  'border-transparent bg-green-100 text-green-800',
        draft:      'border-transparent bg-gray-100 text-gray-600',
        shared:     'border-transparent bg-blue-100 text-blue-800',
        private:    'border-transparent bg-gray-100 text-gray-600',
        destructive: 'border-transparent bg-red-100 text-red-700',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
