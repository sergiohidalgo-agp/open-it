/**
 * Sistema de Logging Estructurado - OpenIT Dashboard
 *
 * Usa Pino para logging rápido y estructurado
 * En desarrollo: salida pretty con colores
 * En producción: salida JSON para agregación
 */

import pino from 'pino'

const isDevelopment = process.env.NODE_ENV === 'development'

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: isDevelopment ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname',
      singleLine: false,
    }
  } : undefined,
  formatters: {
    level: (label) => ({ level: label }),
  },
  base: {
    env: process.env.NODE_ENV,
  },
})

/**
 * Crea un logger con contexto específico
 * @param context - Nombre del contexto (ej: 'api', 'database', 'sync')
 */
export const createLogger = (context: string) => logger.child({ context })

/**
 * Loggers especializados por módulo
 */
export const apiLogger = createLogger('api')
export const dbLogger = createLogger('database')
export const syncLogger = createLogger('sync')
export const azureLogger = createLogger('azure')

/**
 * Helper para logging de errores con contexto
 */
export function logError(logger: pino.Logger, error: unknown, message: string, context?: Record<string, any>) {
  if (error instanceof Error) {
    logger.error({
      err: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      ...context,
    }, message)
  } else {
    logger.error({ error, ...context }, message)
  }
}
