/**
 * Componente: Terminal de Logs de Sincronización
 * OpenIT Dashboard
 *
 * Terminal estilo consola para mostrar logs en tiempo real
 */

'use client'

import { useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'

interface LogEntry {
  level: 'info' | 'success' | 'warning' | 'error'
  message: string
  timestamp?: string
  resource?: string
  operation?: string
}

interface SyncLogsTerminalProps {
  logs: LogEntry[]
  isActive: boolean
}

export function SyncLogsTerminal({ logs, isActive }: SyncLogsTerminalProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const endOfLogsRef = useRef<HTMLDivElement>(null)

  // Auto-scroll al final cuando hay nuevos logs
  useEffect(() => {
    endOfLogsRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'success':
        return 'text-green-400'
      case 'error':
        return 'text-red-400'
      case 'warning':
        return 'text-yellow-400'
      default:
        return 'text-gray-300'
    }
  }

  const getLevelIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'success':
        return '✓'
      case 'error':
        return '✗'
      case 'warning':
        return '⚠'
      default:
        return '›'
    }
  }

  return (
    <Card className="bg-gray-950 border-gray-800 overflow-hidden h-full flex flex-col">
      <div className="p-3 border-b border-gray-800 flex items-center justify-between bg-gray-900/50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <span className="text-sm text-gray-400 font-mono ml-2">sync-terminal</span>
        </div>
        {isActive && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-gray-400">Ejecutando...</span>
          </div>
        )}
      </div>
      <ScrollArea className="flex-1 sync-terminal-scroll [&>[data-radix-scroll-area-viewport]]:h-full" ref={scrollAreaRef}>
        <div className="p-4 font-mono text-sm space-y-0.5 overflow-x-auto min-h-full">
          {logs.length === 0 ? (
            <div className="text-gray-500 flex items-center gap-2">
              <span className="animate-pulse">▊</span>
              Esperando logs...
            </div>
          ) : (
            logs.map((log, index) => (
              <div
                key={index}
                className={`${getLevelColor(log.level)} leading-relaxed flex items-start gap-2 py-0.5 whitespace-pre-wrap break-all`}
              >
                <span className="opacity-50 select-none flex-shrink-0">{getLevelIcon(log.level)}</span>
                <span className="flex-1 min-w-0">{log.message}</span>
              </div>
            ))
          )}
          {isActive && (
            <div className="text-gray-400 animate-pulse flex items-center gap-2 py-0.5">
              <span>›</span>
              <span>▊</span>
            </div>
          )}
          <div ref={endOfLogsRef} />
        </div>
      </ScrollArea>
    </Card>
  )
}
