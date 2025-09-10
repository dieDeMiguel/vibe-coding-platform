import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'outlined' | 'filled'
  size?: 'sm' | 'md' | 'lg'
  error?: boolean
  label?: string
  helper?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    variant = 'default', 
    size = 'md', 
    error = false,
    label,
    helper,
    type = 'text',
    ...props 
  }, ref) => {
    const inputClasses = cn(
      // Base styles
      'w-full transition-colors duration-200 focus:outline-none',
      
      // Size variants
      {
        'px-3 py-2 text-sm': size === 'sm',
        'px-4 py-3 text-base': size === 'md', 
        'px-5 py-4 text-lg': size === 'lg',
      },
      
      // Variant styles
      {
        'border border-gray-300 rounded-md bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200': variant === 'default',
        'border-2 border-gray-300 rounded-lg bg-white focus:border-blue-500': variant === 'outlined',
        'border-0 rounded-md bg-gray-100 focus:bg-white focus:ring-2 focus:ring-blue-200': variant === 'filled',
      },
      
      // Error state
      {
        'border-red-500 focus:border-red-500 focus:ring-red-200': error && variant !== 'filled',
        'bg-red-50 focus:bg-red-50 focus:ring-red-200': error && variant === 'filled',
      },
      
      // Disabled state
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100',
      
      className
    )

    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={props.id || props.name}
            className={cn(
              'block text-sm font-medium mb-1',
              error ? 'text-red-600' : 'text-gray-700'
            )}
          >
            {label}
          </label>
        )}
        
        <input
          type={type}
          className={inputClasses}
          ref={ref}
          id={props.id || props.name}
          {...props}
        />
        
        {helper && (
          <p className={cn(
            'mt-1 text-xs',
            error ? 'text-red-600' : 'text-gray-500'
          )}>
            {helper}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }
export type { InputProps }
