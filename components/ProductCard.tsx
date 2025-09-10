import type React from 'react'
import { cn } from '@/lib/utils'
import { Badge } from './Badge'

interface Product {
  id: string
  name: string
  description: string
  price: number
  originalPrice?: number
  image: string
  rating?: number
  reviewCount?: number
  category: string
  tags?: string[]
  inStock?: boolean
  discount?: number
}

interface ProductCardProps extends React.HTMLAttributes<HTMLDivElement> {
  product: Product
  variant?: 'default' | 'compact' | 'detailed'
  showBadges?: boolean
  onAddToCart?: (product: Product) => void
  onQuickView?: (product: Product) => void
}

const ProductCard: React.FC<ProductCardProps> = ({
  className,
  product,
  variant = 'default',
  showBadges = true,
  onAddToCart,
  onQuickView,
  ...props
}) => {
  const {
    name,
    description,
    price,
    originalPrice,
    image,
    rating,
    reviewCount,
    category,
    tags = [],
    inStock = true,
    discount
  } = product

  const cardClasses = cn(
    'bg-white rounded-lg border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-gray-300',
    {
      'max-w-sm': variant === 'default',
      'max-w-xs': variant === 'compact',
      'max-w-md': variant === 'detailed',
    },
    !inStock && 'opacity-75',
    className
  )

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(price)
  }

  const renderStars = (rating: number) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 !== 0

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <span key={i} className="text-yellow-400">★</span>
      )
    }

    if (hasHalfStar) {
      stars.push(
        <span key="half" className="text-yellow-400">☆</span>
      )
    }

    const remainingStars = 5 - Math.ceil(rating)
    for (let i = 0; i < remainingStars; i++) {
      stars.push(
        <span key={`empty-${i}`} className="text-gray-300">☆</span>
      )
    }

    return stars
  }

  return (
    <div className={cardClasses} {...props}>
      {/* Image Section */}
      <div className="relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt={name}
          className={cn(
            'w-full object-cover transition-transform duration-200 hover:scale-105',
            {
              'h-48': variant === 'default',
              'h-32': variant === 'compact',
              'h-56': variant === 'detailed',
            }
          )}
        />
        
        {/* Discount Badge */}
        {discount && showBadges && (
          <div className="absolute top-2 left-2">
            <Badge variant="danger" size="sm" rounded>
              -{discount}%
            </Badge>
          </div>
        )}
        
        {/* Stock Status */}
        {!inStock && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <Badge variant="default" size="md">
              Sin Stock
            </Badge>
          </div>
        )}
        
        {/* Quick Actions */}
        <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 hover:opacity-100 transition-opacity duration-200">
          {onQuickView && (
            <button
              type="button"
              onClick={() => onQuickView(product)}
              className="bg-white rounded-full p-2 shadow-md hover:shadow-lg transition-shadow duration-200"
              aria-label="Vista rápida"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                <title>Vista rápida</title>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4">
        {/* Category */}
        <div className="mb-2">
          <Badge variant="secondary" size="sm">
            {category}
          </Badge>
        </div>

        {/* Title */}
        <h3 className={cn(
          'font-semibold text-gray-900 mb-2 line-clamp-2',
          {
            'text-lg': variant === 'default' || variant === 'detailed',
            'text-base': variant === 'compact',
          }
        )}>
          {name}
        </h3>

        {/* Description - only for detailed variant */}
        {variant === 'detailed' && (
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {description}
          </p>
        )}

        {/* Rating */}
        {rating && (
          <div className="flex items-center gap-2 mb-3">
            <div className="flex">{renderStars(rating)}</div>
            <span className="text-sm text-gray-600">
              {rating.toFixed(1)}
            </span>
            {reviewCount && (
              <span className="text-sm text-gray-500">
                ({reviewCount})
              </span>
            )}
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && showBadges && variant === 'detailed' && (
          <div className="flex flex-wrap gap-1 mb-3">
            {tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="info" size="sm">
                {tag}
              </Badge>
            ))}
            {tags.length > 3 && (
              <Badge variant="default" size="sm">
                +{tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Price Section */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-gray-900">
              {formatPrice(price)}
            </span>
            {originalPrice && originalPrice > price && (
              <span className="text-sm text-gray-500 line-through">
                {formatPrice(originalPrice)}
              </span>
            )}
          </div>
        </div>

        {/* Add to Cart Button */}
        {onAddToCart && (
          <button
            type="button"
            onClick={() => onAddToCart(product)}
            disabled={!inStock}
            className={cn(
              'w-full py-2 px-4 rounded-md font-medium transition-colors duration-200',
              inStock
                ? 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            )}
          >
            {inStock ? 'Agregar al carrito' : 'Sin stock'}
          </button>
        )}
      </div>
    </div>
  )
}

export { ProductCard }
export type { ProductCardProps, Product }
