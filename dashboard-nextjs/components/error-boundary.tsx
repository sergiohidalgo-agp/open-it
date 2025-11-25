/**
 * Error Boundary Component
 * OpenIT Dashboard
 *
 * Captura errores de React y muestra UI de fallback
 */

'use client'

import React, { Component, ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw } from 'lucide-react'

/**
 * Props del Error Boundary
 */
interface ErrorBoundaryProps {
  children: ReactNode
  /** Mensaje personalizado de fallback */
  fallbackMessage?: string
  /** Callback cuando ocurre un error */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  /** Mostrar detalles técnicos del error (solo en desarrollo) */
  showDetails?: boolean
}

/**
 * State del Error Boundary
 */
interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

/**
 * Error Boundary para capturar y manejar errores de React
 *
 * Envuelve componentes que puedan fallar y muestra UI de fallback
 * en lugar de romper toda la aplicación.
 *
 * @example
 * ```tsx
 * <ErrorBoundary fallbackMessage="Error al cargar recursos">
 *   <AzureResourcesTable />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Actualizar state con información del error
    this.setState({
      error,
      errorInfo,
    })

    // Ejecutar callback si existe
    this.props.onError?.(error, errorInfo)

    // Log del error (en producción irá a sistema de logging)
    console.error('Error Boundary caught error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render() {
    if (this.state.hasError) {
      const isDevelopment = process.env.NODE_ENV === 'development'
      const showDetails = this.props.showDetails ?? isDevelopment

      return (
        <Card className="p-6 border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2">
                {this.props.fallbackMessage || 'Algo salió mal'}
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                Ha ocurrido un error inesperado. Intenta recargar el componente o la página.
              </p>

              {showDetails && this.state.error && (
                <details className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 rounded text-xs font-mono">
                  <summary className="cursor-pointer text-red-800 dark:text-red-200 font-semibold mb-2">
                    Detalles técnicos (desarrollo)
                  </summary>
                  <div className="space-y-2 text-red-700 dark:text-red-300">
                    <div>
                      <strong>Error:</strong> {this.state.error.message}
                    </div>
                    {this.state.error.stack && (
                      <div>
                        <strong>Stack Trace:</strong>
                        <pre className="mt-1 overflow-x-auto whitespace-pre-wrap">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}
                    {this.state.errorInfo && (
                      <div>
                        <strong>Component Stack:</strong>
                        <pre className="mt-1 overflow-x-auto whitespace-pre-wrap">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              <div className="flex gap-2 mt-4">
                <Button
                  onClick={this.handleReset}
                  size="sm"
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/50"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reintentar
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  size="sm"
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/50"
                >
                  Recargar página
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )
    }

    return this.props.children
  }
}

/**
 * HOC para envolver componentes con Error Boundary
 *
 * @example
 * ```tsx
 * export default withErrorBoundary(MyComponent, {
 *   fallbackMessage: 'Error al cargar componente'
 * })
 * ```
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  return function WithErrorBoundaryWrapper(props: P) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}
