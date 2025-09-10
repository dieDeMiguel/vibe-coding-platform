import type React from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info'
  size?: 'sm' | 'md' | 'lg'
  rounded?: boolean
  children: React.ReactNode
}

const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  size = 'md',
  rounded = false,
  children,
  ...props
}) => {
  const badgeClasses = cn(
    // Base styles
    'inline-flex items-center font-medium transition-colors duration-200',
    
    // Size variants
    {
      'px-2 py-1 text-xs': size === 'sm',
      'px-3 py-1.5 text-sm': size === 'md',
      'px-4 py-2 text-base': size === 'lg',
    },
    
    // Rounded variants
    {
      'rounded-md': !rounded,
      'rounded-full': rounded,
    },
    
    // Color variants
    {
      'bg-gray-100 text-gray-800 hover:bg-gray-200': variant === 'default',
      'bg-blue-100 text-blue-800 hover:bg-blue-200': variant === 'primary',
      'bg-purple-100 text-purple-800 hover:bg-purple-200': variant === 'secondary',
      'bg-green-100 text-green-800 hover:bg-green-200': variant === 'success',
      'bg-yellow-100 text-yellow-800 hover:bg-yellow-200': variant === 'warning',
      'bg-red-100 text-red-800 hover:bg-red-200': variant === 'danger',
      'bg-cyan-100 text-cyan-800 hover:bg-cyan-200': variant === 'info',
    },
    
    className
  )

  return (
    <span className={badgeClasses} {...props}>
      {children}
    </span>
  )
}

export { Badge }
export type { BadgeProps }
