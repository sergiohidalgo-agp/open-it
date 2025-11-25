/**
 * Retry Utility - Reintentos con Exponential Backoff
 * OpenIT Dashboard
 *
 * Implementa estrategia de reintentos resiliente para operaciones fallidas
 */

import { logger } from '@/lib/logger'

/**
 * Opciones de configuración para reintentos
 */
export interface RetryOptions {
  /** Número máximo de reintentos (default: 3) */
  maxRetries?: number
  /** Delay inicial en ms (default: 1000) */
  initialDelay?: number
  /** Factor de multiplicación para exponential backoff (default: 2) */
  backoffMultiplier?: number
  /** Delay máximo en ms (default: 30000) */
  maxDelay?: number
  /** Función para determinar si se debe reintentar basado en el error */
  shouldRetry?: (error: unknown, attempt: number) => boolean
  /** Callback ejecutado antes de cada reintento */
  onRetry?: (error: unknown, attempt: number, delay: number) => void
}

/**
 * Opciones por defecto
 */
const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  backoffMultiplier: 2,
  maxDelay: 30000,
  shouldRetry: () => true,
  onRetry: () => {},
}

/**
 * Calcula el delay para el siguiente reintento usando exponential backoff
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  const delay = options.initialDelay * Math.pow(options.backoffMultiplier, attempt - 1)
  return Math.min(delay, options.maxDelay)
}

/**
 * Espera un tiempo determinado
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Ejecuta una función con reintentos automáticos usando exponential backoff
 *
 * @param fn - Función async a ejecutar
 * @param options - Opciones de configuración de reintentos
 * @returns Promesa con el resultado de la función
 *
 * @example
 * ```typescript
 * const result = await withRetry(
 *   async () => {
 *     const response = await fetch('https://api.example.com/data')
 *     return response.json()
 *   },
 *   {
 *     maxRetries: 5,
 *     initialDelay: 2000,
 *     shouldRetry: (error) => {
 *       // Solo reintentar en errores de red
 *       return error instanceof TypeError && error.message.includes('fetch')
 *     }
 *   }
 * )
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: unknown

  for (let attempt = 1; attempt <= opts.maxRetries + 1; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Si es el último intento, lanzar el error
      if (attempt > opts.maxRetries) {
        logger.error(
          {
            error: error instanceof Error ? error.message : String(error),
            attempts: attempt,
          },
          'All retry attempts exhausted'
        )
        throw error
      }

      // Verificar si se debe reintentar
      if (!opts.shouldRetry(error, attempt)) {
        logger.warn(
          {
            error: error instanceof Error ? error.message : String(error),
            attempt,
          },
          'Retry skipped based on shouldRetry condition'
        )
        throw error
      }

      // Calcular delay y esperar
      const delay = calculateDelay(attempt, opts)

      logger.warn(
        {
          error: error instanceof Error ? error.message : String(error),
          attempt,
          nextRetryIn: `${delay}ms`,
        },
        `Retry attempt ${attempt}/${opts.maxRetries}`
      )

      // Ejecutar callback de reintento
      opts.onRetry(error, attempt, delay)

      // Esperar antes del siguiente intento
      await sleep(delay)
    }
  }

  // Nunca debería llegar aquí, pero TypeScript necesita esto
  throw lastError
}

/**
 * Predicados comunes para shouldRetry
 */
export const RetryPredicates = {
  /**
   * Reintentar en errores de red (fetch, timeout, conexión)
   */
  isNetworkError: (error: unknown): boolean => {
    if (error instanceof TypeError) {
      return (
        error.message.includes('fetch') ||
        error.message.includes('network') ||
        error.message.includes('timeout')
      )
    }
    if (error instanceof Error) {
      return (
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('ENOTFOUND')
      )
    }
    return false
  },

  /**
   * Reintentar en errores transitorios de Azure CLI
   */
  isAzureTransientError: (error: unknown): boolean => {
    if (!(error instanceof Error)) return false

    const transientMessages = [
      'timeout',
      'ETIMEDOUT',
      'ECONNREFUSED',
      'ENOTFOUND',
      'socket hang up',
      'rate limit',
      'throttled',
      'too many requests',
      '429',
      '503',
      '504',
    ]

    return transientMessages.some((msg) =>
      error.message.toLowerCase().includes(msg.toLowerCase())
    )
  },

  /**
   * Reintentar solo en errores HTTP específicos (5xx, 429)
   */
  isRetryableHttpError: (error: unknown): boolean => {
    if (!(error instanceof Error)) return false

    const retryableStatuses = ['429', '500', '502', '503', '504']
    return retryableStatuses.some((status) => error.message.includes(status))
  },

  /**
   * Combinar múltiples predicados con OR
   */
  any: (...predicates: Array<(error: unknown) => boolean>) => {
    return (error: unknown): boolean => {
      return predicates.some((predicate) => predicate(error))
    }
  },

  /**
   * Combinar múltiples predicados con AND
   */
  all: (...predicates: Array<(error: unknown) => boolean>) => {
    return (error: unknown): boolean => {
      return predicates.every((predicate) => predicate(error))
    }
  },
}
