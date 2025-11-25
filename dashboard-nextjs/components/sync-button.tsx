/**
 * Componente: Botón de Sincronización
 * OpenIT Dashboard
 *
 * Botón para iniciar la sincronización de recursos Azure con Cosmos DB
 */

'use client'

import { useState } from 'react'
import { RefreshCw, Check, X, AlertCircle, Terminal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SyncLogsTerminal } from './sync-logs-terminal'
import type { SyncStatus } from '@/lib/types/database'

interface LogEntry {
  level: 'info' | 'success' | 'warning' | 'error'
  message: string
  timestamp?: string
  resource?: string
  operation?: string
}

interface SyncButtonProps {
  onSyncComplete?: (success: boolean) => void
  disabled?: boolean
}

export function SyncButton({ onSyncComplete, disabled }: SyncButtonProps) {
  const [status, setStatus] = useState<SyncStatus>('idle')
  const [statusMessage, setStatusMessage] = useState<string>('')
  const [showLogs, setShowLogs] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isStreaming, setIsStreaming] = useState(false)

  const handleClick = async () => {
    if (status !== 'idle') return

    setStatus('syncing')
    setStatusMessage('Sincronizando...')
    setLogs([])
    setShowLogs(true)
    setIsStreaming(true)

    try {
      const eventSource = new EventSource('/api/sync/stream')

      eventSource.addEventListener('log', (event) => {
        const logData = JSON.parse(event.data)
        setLogs((prev) => [...prev, logData])
      })

      eventSource.addEventListener('complete', (event) => {
        const result = JSON.parse(event.data)
        setIsStreaming(false)
        
        if (result.success) {
          setStatus('success')
          setStatusMessage('Sincronización completada')
        } else {
          setStatus('error')
          setStatusMessage('Sincronización con errores')
        }

        eventSource.close()
        onSyncComplete?.(result.success)

        setTimeout(() => {
          setStatus('idle')
          setStatusMessage('')
        }, 3000)
      })

      eventSource.addEventListener('error', (event) => {
        setIsStreaming(false)
        setStatus('error')
        setStatusMessage('Error en la sincronización')
        eventSource.close()

        setTimeout(() => {
          setStatus('idle')
          setStatusMessage('')
        }, 3000)
      })

      eventSource.onerror = () => {
        setIsStreaming(false)
        setStatus('error')
        setStatusMessage('Error de conexión')
        eventSource.close()

        setTimeout(() => {
          setStatus('idle')
          setStatusMessage('')
        }, 3000)
      }
    } catch (error) {
      setIsStreaming(false)
      setStatus('error')
      setStatusMessage(error instanceof Error ? error.message : 'Error desconocido')

      setTimeout(() => {
        setStatus('idle')
        setStatusMessage('')
      }, 3000)
    }
  }

  const getButtonContent = () => {
    switch (status) {
      case 'idle':
        return (
          <>
            <RefreshCw className="h-4 w-4 mr-2" />
            Sincronizar con BD
          </>
        )

      case 'previewing':
      case 'syncing':
        return (
          <>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            {status === 'previewing' ? 'Analizando...' : 'Sincronizando...'}
          </>
        )

      case 'success':
        return (
          <>
            <Check className="h-4 w-4 mr-2" />
            Sincronizado
          </>
        )

      case 'error':
        return (
          <>
            <X className="h-4 w-4 mr-2" />
            Error
          </>
        )

      case 'conflicts':
        return (
          <>
            <AlertCircle className="h-4 w-4 mr-2" />
            Revisar Conflictos
          </>
        )

      default:
        return 'Sincronizar'
    }
  }

  const getButtonVariant = () => {
    switch (status) {
      case 'success':
        return 'default'
      case 'error':
        return 'destructive'
      case 'conflicts':
        return 'outline'
      default:
        return 'default'
    }
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Button
            onClick={handleClick}
            disabled={disabled || status !== 'idle'}
            variant={getButtonVariant()}
            className="min-w-[180px]"
          >
            {getButtonContent()}
          </Button>
          {logs.length > 0 && (
            <Button
              onClick={() => setShowLogs(true)}
              variant="outline"
              size="icon"
            >
              <Terminal className="h-4 w-4" />
            </Button>
          )}
        </div>

        {statusMessage && status === 'error' && (
          <Alert variant="destructive" className="text-sm">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{statusMessage}</AlertDescription>
          </Alert>
        )}
      </div>

      <Dialog open={showLogs} onOpenChange={setShowLogs}>
        <DialogContent className="!w-[90vw] !max-w-[1400px] !h-[90vh] p-0">
          <DialogHeader className="p-6 pb-3">
            <DialogTitle className="font-mono">Logs de Sincronización</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6 h-[calc(90vh-80px)]">
            <SyncLogsTerminal logs={logs} isActive={isStreaming} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
