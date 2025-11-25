/**
 * Componente: Diálogo de Conflictos de Sincronización
 * OpenIT Dashboard
 *
 * Modal para resolver conflictos campo por campo antes de sincronizar
 */

'use client'

import { useState } from 'react'
import { AlertCircle, CheckCircle2, Package, Database, Cloud } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import type { Conflict, ConflictResolution } from '@/lib/types/database'

interface ConflictGroup {
  resourceId: string
  resourceName: string
  conflicts: Conflict[]
}

interface SyncConflictsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  conflicts: Conflict[]
  summary: {
    newResources: number
    updatedResources: number
    deletedResources: number
  }
  onResolve: (resolutions: Record<string, Record<string, ConflictResolution>>) => Promise<void>
  isSyncing?: boolean
}

export function SyncConflictsDialog({
  open,
  onOpenChange,
  conflicts,
  summary,
  onResolve,
  isSyncing = false,
}: SyncConflictsDialogProps) {
  // Agrupar conflictos por recurso
  const groupedConflicts = conflicts.reduce((acc, conflict) => {
    const existing = acc.find((g) => g.resourceId === conflict.resourceId)

    if (existing) {
      existing.conflicts.push(conflict)
    } else {
      acc.push({
        resourceId: conflict.resourceId,
        resourceName: conflict.resourceName,
        conflicts: [conflict],
      })
    }

    return acc
  }, [] as ConflictGroup[])

  // Estado de resoluciones: Record<resourceId, Record<field, resolution>>
  const [resolutions, setResolutions] = useState<Record<string, Record<string, ConflictResolution>>>(() => {
    // Inicializar con 'use-azure' por defecto
    const initial: Record<string, Record<string, ConflictResolution>> = {}
    groupedConflicts.forEach((group) => {
      initial[group.resourceId] = {}
      group.conflicts.forEach((conflict) => {
        initial[group.resourceId][conflict.field] = 'use-azure'
      })
    })
    return initial
  })

  const handleResolutionChange = (
    resourceId: string,
    field: string,
    resolution: ConflictResolution
  ) => {
    setResolutions((prev) => ({
      ...prev,
      [resourceId]: {
        ...prev[resourceId],
        [field]: resolution,
      },
    }))
  }

  const handleApply = async () => {
    await onResolve(resolutions)
  }

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '-'
    if (typeof value === 'object') return JSON.stringify(value, null, 2)
    return String(value)
  }

  const totalConflicts = conflicts.length
  const resolvedCount = Object.values(resolutions).reduce(
    (acc, resourceResolutions) =>
      acc + Object.values(resourceResolutions).filter((r) => r !== 'manual').length,
    0
  )
  const progressPercentage = (resolvedCount / totalConflicts) * 100

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Conflictos de Sincronización Detectados
          </DialogTitle>
          <DialogDescription>
            Se encontraron diferencias entre los recursos de Azure y la base de datos. Selecciona
            qué valores usar para cada campo.
          </DialogDescription>
        </DialogHeader>

        {/* Resumen */}
        <div className="bg-muted/30 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Package className="h-4 w-4" />
            Resumen de Cambios
          </h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Nuevos</div>
              <div className="text-lg font-semibold text-green-600">{summary.newResources}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Actualizados</div>
              <div className="text-lg font-semibold text-blue-600">{summary.updatedResources}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Eliminados</div>
              <div className="text-lg font-semibold text-red-600">{summary.deletedResources}</div>
            </div>
          </div>
        </div>

        {/* Progreso */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progreso de Resolución</span>
            <span className="font-medium">
              {resolvedCount} / {totalConflicts} conflictos resueltos
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        <Separator />

        {/* Lista de Conflictos */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Conflictos ({groupedConflicts.length} recursos)
          </h3>

          <div className="space-y-6">
            {groupedConflicts.map((group) => (
              <div key={group.resourceId} className="border rounded-lg p-4 space-y-3">
                {/* Header del recurso */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      {group.resourceName}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {group.conflicts.length} campo{group.conflicts.length !== 1 ? 's' : ''} con
                      conflicto
                    </span>
                  </div>
                </div>

                {/* Conflictos del recurso */}
                <div className="space-y-4">
                  {group.conflicts.map((conflict, idx) => {
                    const resolution = resolutions[group.resourceId]?.[conflict.field] || 'use-azure'

                    return (
                      <div key={`${conflict.field}-${idx}`} className="space-y-2">
                        <div className="text-sm font-medium text-muted-foreground">
                          Campo: <span className="text-foreground font-mono">{conflict.field}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          {/* Valor de Azure */}
                          <button
                            onClick={() =>
                              handleResolutionChange(group.resourceId, conflict.field, 'use-azure')
                            }
                            className={`p-3 rounded-lg border-2 text-left transition-all ${
                              resolution === 'use-azure'
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                                : 'border-border hover:border-blue-300'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Cloud className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-semibold">Azure</span>
                              </div>
                              {resolution === 'use-azure' && (
                                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                              )}
                            </div>
                            <pre className="text-xs bg-background/50 p-2 rounded overflow-x-auto">
                              {formatValue(conflict.azureValue)}
                            </pre>
                          </button>

                          {/* Valor de Base de Datos */}
                          <button
                            onClick={() =>
                              handleResolutionChange(group.resourceId, conflict.field, 'use-database')
                            }
                            className={`p-3 rounded-lg border-2 text-left transition-all ${
                              resolution === 'use-database'
                                ? 'border-purple-500 bg-purple-50 dark:bg-purple-950'
                                : 'border-border hover:border-purple-300'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Database className="h-4 w-4 text-purple-600" />
                                <span className="text-sm font-semibold">Base de Datos</span>
                              </div>
                              {resolution === 'use-database' && (
                                <CheckCircle2 className="h-4 w-4 text-purple-600" />
                              )}
                            </div>
                            <pre className="text-xs bg-background/50 p-2 rounded overflow-x-auto">
                              {formatValue(conflict.databaseValue)}
                            </pre>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSyncing}>
            Cancelar
          </Button>
          <Button onClick={handleApply} disabled={isSyncing}>
            {isSyncing ? (
              <>
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-background border-t-transparent" />
                Aplicando Cambios...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Aplicar Cambios Seleccionados
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
