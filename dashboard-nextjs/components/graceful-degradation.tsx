/**
 * Graceful Degradation Component
 * OpenIT Dashboard
 *
 * Maneja estados de carga, error y datos vacíos con UI consistente
 */

'use client'

import React, { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, RefreshCw, Inbox } from 'lucide-react'

/**
 * Props del componente GracefulDegradation
 */
interface GracefulDegradationProps {
  /** Estado de carga */
  isLoading?: boolean
  /** Error si ocurrió */
  error?: Error | string | null
  /** Si no hay datos */
  isEmpty?: boolean
  /** Contenido a mostrar cuando todo está bien */
  children: ReactNode
  /** Mensaje personalizado cuando está cargando */
  loadingMessage?: string
  /** Mensaje personalizado cuando hay error */
  errorMessage?: string
  /** Mensaje personalizado cuando está vacío */
  emptyMessage?: string
  /** Callback para reintentar */
  onRetry?: () => void
  /** Número de skeleton loaders a mostrar */
  skeletonCount?: number
  /** Altura de cada skeleton */
  skeletonHeight?: string
}

/**
 * Componente para manejar estados de carga, error y vacío
 * con degradación elegante
 *
 * @example
 * ```tsx
 * <GracefulDegradation
 *   isLoading={isLoading}
 *   error={error}
 *   isEmpty={data.length === 0}
 *   onRetry={() => refetch()}
 * >
 *   <ResourceTable data={data} />
 * </GracefulDegradation>
 * ```
 */
export function GracefulDegradation({
  isLoading,
  error,
  isEmpty,
  children,
  loadingMessage = 'Cargando...',
  errorMessage,
  emptyMessage = 'No hay datos disponibles',
  onRetry,
  skeletonCount = 3,
  skeletonHeight = '80px',
}: GracefulDegradationProps) {
  // Estado de carga
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          {loadingMessage}
        </div>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <Skeleton key={i} className="w-full" style={{ height: skeletonHeight }} />
        ))}
      </div>
    )
  }

  // Estado de error
  if (error) {
    const errorMsg = typeof error === 'string' ? error : error.message
    const displayMessage = errorMessage || `Error: ${errorMsg}`

    return (
      <Card className="p-6 border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2">
              Error al cargar datos
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300 mb-4">
              {displayMessage}
            </p>
            {onRetry && (
              <Button
                onClick={onRetry}
                size="sm"
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reintentar
              </Button>
            )}
          </div>
        </div>
      </Card>
    )
  }

  // Estado vacío
  if (isEmpty) {
    return (
      <Card className="p-12 flex flex-col items-center justify-center text-center">
        <div className="rounded-full bg-muted p-3 mb-4">
          <Inbox className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg mb-2">Sin datos</h3>
        <p className="text-sm text-muted-foreground max-w-md mb-4">
          {emptyMessage}
        </p>
        {onRetry && (
          <Button onClick={onRetry} size="sm" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        )}
      </Card>
    )
  }

  // Estado exitoso
  return <>{children}</>
}

/**
 * HOC para agregar graceful degradation a componentes
 *
 * @example
 * ```tsx
 * export default withGracefulDegradation(ResourceTable, {
 *   loadingMessage: 'Cargando recursos...'
 * })
 * ```
 */
export function withGracefulDegradation<P extends object>(
  Component: React.ComponentType<P>,
  degradationProps?: Partial<Omit<GracefulDegradationProps, 'children'>>
) {
  return function WithGracefulDegradationWrapper(
    props: P & {
      isLoading?: boolean
      error?: Error | string | null
      isEmpty?: boolean
      onRetry?: () => void
    }
  ) {
    const { isLoading, error, isEmpty, onRetry, ...componentProps } = props

    return (
      <GracefulDegradation
        isLoading={isLoading}
        error={error}
        isEmpty={isEmpty}
        onRetry={onRetry}
        {...degradationProps}
      >
        <Component {...(componentProps as P)} />
      </GracefulDegradation>
    )
  }
}
