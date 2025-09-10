'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/Input'
import { Badge } from '@/components/Badge'
import { ProductCard, type Product } from '@/components/ProductCard'

// Sample product data
const sampleProducts: Product[] = [
  {
    id: '1',
    name: 'iPhone 15 Pro Max',
    description: 'El iPhone más avanzado con chip A17 Pro, cámara profesional y titanio',
    price: 1299000,
    originalPrice: 1499000,
    image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&h=400&fit=crop',
    rating: 4.8,
    reviewCount: 1247,
    category: 'Celulares',
    tags: ['Apple', 'Premium', 'Nuevo'],
    inStock: true,
    discount: 13
  },
  {
    id: '2',
    name: 'Samsung Galaxy S24 Ultra',
    description: 'Galaxy S24 Ultra con S Pen integrado y cámara de 200MP',
    price: 1199000,
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop',
    rating: 4.6,
    reviewCount: 892,
    category: 'Celulares',
    tags: ['Samsung', 'S Pen', 'Cámara'],
    inStock: true
  },
  {
    id: '3',
    name: 'MacBook Air M3',
    description: 'MacBook Air con chip M3, 13 pulgadas, ultra liviano y potente',
    price: 899000,
    originalPrice: 999000,
    image: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400&h=400&fit=crop',
    rating: 4.9,
    reviewCount: 2156,
    category: 'Laptops',
    tags: ['Apple', 'M3', 'Ultrabook'],
    inStock: true,
    discount: 10
  },
  {
    id: '4',
    name: 'Sony WH-1000XM5',
    description: 'Auriculares inalámbricos con cancelación de ruido líder en la industria',
    price: 299000,
    image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400&h=400&fit=crop',
    rating: 4.7,
    reviewCount: 1683,
    category: 'Audio',
    tags: ['Sony', 'Noise Cancelling', 'Premium'],
    inStock: false
  },
  {
    id: '5',
    name: 'iPad Pro 12.9"',
    description: 'iPad Pro con chip M2, pantalla Liquid Retina XDR y Apple Pencil compatible',
    price: 799000,
    image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&h=400&fit=crop',
    rating: 4.5,
    reviewCount: 743,
    category: 'Tablets',
    tags: ['Apple', 'M2', 'Creative'],
    inStock: true
  },
  {
    id: '6',
    name: 'Nintendo Switch OLED',
    description: 'Consola híbrida con pantalla OLED de 7 pulgadas y colores vibrantes',
    price: 349000,
    originalPrice: 399000,
    image: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=400&h=400&fit=crop',
    rating: 4.4,
    reviewCount: 2891,
    category: 'Gaming',
    tags: ['Nintendo', 'OLED', 'Portátil'],
    inStock: true,
    discount: 12
  }
]

const categories = ['Todos', 'Celulares', 'Laptops', 'Audio', 'Tablets', 'Gaming']

export default function ProductListingDemo() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Todos')
  const [sortBy, setSortBy] = useState<'name' | 'price-low' | 'price-high' | 'rating'>('name')

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    const filtered = sampleProducts.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      
      const matchesCategory = selectedCategory === 'Todos' || product.category === selectedCategory
      
      return matchesSearch && matchesCategory
    })

    // Sort products
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price
        case 'price-high':
          return b.price - a.price
        case 'rating':
          return (b.rating || 0) - (a.rating || 0)
        case 'name':
        default:
          return a.name.localeCompare(b.name)
      }
    })

    return filtered
  }, [searchTerm, selectedCategory, sortBy])

  const handleAddToCart = (product: Product) => {
    alert(`Agregado al carrito: ${product.name}`)
  }

  const handleQuickView = (product: Product) => {
    alert(`Vista rápida: ${product.name}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Tienda de Productos
          </h1>
          <p className="text-gray-600">
            Descubre los mejores productos de tecnología con precios increíbles
          </p>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Input */}
            <div className="md:col-span-2">
              <Input
                label="Buscar productos"
                placeholder="Buscar por nombre, descripción o etiquetas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                variant="outlined"
              />
            </div>

            {/* Sort Select */}
            <div>
              <label htmlFor="sort-select" className="block text-sm font-medium text-gray-700 mb-1">
                Ordenar por
              </label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'price-low' | 'price-high' | 'rating')}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white focus:border-blue-500 focus:outline-none"
              >
                <option value="name">Nombre</option>
                <option value="price-low">Precio: Menor a mayor</option>
                <option value="price-high">Precio: Mayor a menor</option>
                <option value="rating">Mejor valorado</option>
              </select>
            </div>
          </div>

          {/* Category Filters */}
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Categorías</h3>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`transition-colors duration-200 ${
                    selectedCategory === category
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Badge
                    variant={selectedCategory === category ? 'primary' : 'default'}
                    size="md"
                    className="cursor-pointer"
                  >
                    {category}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-600">
            {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''} encontrado{filteredProducts.length !== 1 ? 's' : ''}
          </p>
          
          {/* Stock Status Badges */}
          <div className="flex gap-2">
            <Badge variant="success" size="sm">
              ● En stock: {filteredProducts.filter(p => p.inStock).length}
            </Badge>
            <Badge variant="danger" size="sm">
              ● Sin stock: {filteredProducts.filter(p => !p.inStock).length}
            </Badge>
          </div>
        </div>

        {/* Products Grid */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                variant={index % 3 === 0 ? 'detailed' : 'default'}
                onAddToCart={handleAddToCart}
                onQuickView={handleQuickView}
                className="h-full"
              />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No se encontraron productos
            </h3>
            <p className="text-gray-500 mb-4">
              Intenta cambiar los filtros o el término de búsqueda
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchTerm('')
                setSelectedCategory('Todos')
              }}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Limpiar filtros
            </button>
          </div>
        )}

        {/* Demo Information */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            Información del Demo
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
            <div>
              <h4 className="font-medium mb-2">Componentes utilizados:</h4>
              <ul className="space-y-1">
                <li>• Input (custom)</li>
                <li>• Badge (custom)</li>
                <li>• ProductCard (custom)</li>
                <li>• Button (from @meli/ui)</li>
                <li>• Card (from @meli/ui)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Funcionalidades:</h4>
              <ul className="space-y-1">
                <li>• Búsqueda en tiempo real</li>
                <li>• Filtrado por categorías</li>
                <li>• Ordenamiento múltiple</li>
                <li>• Estados de stock</li>
                <li>• Diseño responsivo</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Características técnicas:</h4>
              <ul className="space-y-1">
                <li>• TypeScript con tipos estrictos</li>
                <li>• Tailwind CSS para estilos</li>
                <li>• Componentes reutilizables</li>
                <li>• Hooks de React (useState, useMemo)</li>
                <li>• Accesibilidad web</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
