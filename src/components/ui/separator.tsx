import { View, type ViewProps } from 'react-native'

import { cn } from '@/lib/cn'

export interface SeparatorProps extends ViewProps {
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

/** A 1px hairline in the border token. Use inside cards and between rows. */
export function Separator({ orientation = 'horizontal', className, ...props }: SeparatorProps) {
  return (
    <View
      accessibilityRole="none"
      className={cn(orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px', 'bg-border', className)}
      {...props}
    />
  )
}
