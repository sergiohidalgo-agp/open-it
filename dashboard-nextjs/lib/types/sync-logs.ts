/**
 * Tipos para el sistema de logs de sincronización
 * OpenIT Dashboard
 */

export type LogLevel = 'info' | 'success' | 'warning' | 'error' | 'debug'

export interface SyncLog {
  timestamp: string
  level: LogLevel
  message: string
  details?: any
  duration?: number
}

export interface SyncLogEvent {
  type: 'log' | 'progress' | 'complete' | 'error'
  data: SyncLog | { current: number; total: number } | { success: boolean; error?: string }
}

export class SyncLogger {
  private logs: SyncLog[] = []
  private startTime: number = Date.now()

  log(level: LogLevel, message: string, details?: any) {
    const log: SyncLog = {
      timestamp: new Date().toISOString(),
      level,
      message,
      details,
      duration: Date.now() - this.startTime,
    }
    this.logs.push(log)

    // Log to console for server-side debugging
    const emoji = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      debug: '🔍',
    }[level]

    console.log(`${emoji} [${log.duration}ms] ${message}`, details ? details : '')

    return log
  }

  info(message: string, details?: any) {
    return this.log('info', message, details)
  }

  success(message: string, details?: any) {
    return this.log('success', message, details)
  }

  warning(message: string, details?: any) {
    return this.log('warning', message, details)
  }

  error(message: string, details?: any) {
    return this.log('error', message, details)
  }

  debug(message: string, details?: any) {
    return this.log('debug', message, details)
  }

  getLogs() {
    return this.logs
  }

  clear() {
    this.logs = []
    this.startTime = Date.now()
  }
}
