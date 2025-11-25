/**
 * Sync Service - Servicio de Sincronización Azure-Cosmos DB
 * OpenIT Dashboard
 *
 * Responsabilidad única: Orquestar sincronización entre Azure y BD
 */

import type { AzureResource } from '@/lib/types/azure'
import type {
  ResourceDB,
  SyncAction,
  ConflictResolution,
} from '@/lib/types/database'
import type { SyncHistory } from '@/lib/db/schemas'
import {
  getAllResources,
  upsertResource,
  deleteResource,
  saveSyncHistory,
} from '@/lib/db/queries'
import {
  determineSyncActions,
  azureResourceToDBResource,
  applyConflictResolutions,
} from '@/lib/db/sync-helpers'
import { syncLogger, logError } from '@/lib/logger'

/**
 * Opciones para sincronización
 */
export interface SyncOptions {
  conflictResolutions?: Record<string, Record<string, ConflictResolution>>
  syncSource?: 'manual' | 'automatic' | 'script'
  userId?: string
}

/**
 * Resultado de sincronización
 */
export interface SyncResult {
  success: boolean
  stats: {
    resourcesProcessed: number
    resourcesCreated: number
    resourcesUpdated: number
    resourcesDeleted: number
    resourcesSkipped: number
    durationMs: number
  }
  historyId: string
  errors?: string[]
}

/**
 * Callback para progreso de sincronización
 */
export type SyncProgressCallback = (progress: {
  operation: 'create' | 'update' | 'delete' | 'skip'
  resourceName: string
  reason?: string
}) => void

/**
 * Servicio de sincronización Azure-Cosmos DB
 */
export class SyncService {
  /**
   * Ejecuta sincronización completa
   */
  async sync(
    azureResources: AzureResource[],
    options: SyncOptions = {},
    onProgress?: SyncProgressCallback
  ): Promise<SyncResult> {
    const startTime = Date.now()
    const { conflictResolutions, syncSource = 'manual', userId } = options

    syncLogger.info(
      { azureResourceCount: azureResources.length },
      'Starting sync operation'
    )

    try {
      // 1. Obtener recursos de BD
      const dbResources = await getAllResources()
      syncLogger.info({ dbResourceCount: dbResources.length }, 'DB resources loaded')

      // 2. Determinar acciones
      const actions = determineSyncActions(azureResources, dbResources, conflictResolutions)
      syncLogger.info({ actionCount: actions.length }, 'Sync actions determined')

      // 3. Ejecutar acciones
      const stats = await this.executeActions(
        actions,
        azureResources,
        dbResources,
        conflictResolutions,
        syncSource,
        onProgress
      )

      const durationMs = Date.now() - startTime

      // 4. Guardar historial
      const historyId = `sync-${Date.now()}`
      const syncHistory: SyncHistory = {
        id: historyId,
        date: new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString(),
        syncType: conflictResolutions ? 'conflict-resolution' : 'full',
        source: 'api',
        userId,
        status: stats.errors.length === 0 ? 'success' : stats.errors.length < actions.length ? 'partial' : 'failed',
        stats: {
          resourcesProcessed: actions.length,
          resourcesCreated: stats.resourcesCreated,
          resourcesUpdated: stats.resourcesUpdated,
          resourcesDeleted: stats.resourcesDeleted,
          resourcesSkipped: stats.resourcesSkipped,
          conflictsDetected: 0,
          conflictsResolved: 0,
          durationMs,
        },
        errors: stats.errors.length > 0 ? stats.errors : undefined,
        details: `Synced ${stats.resourcesCreated} new, ${stats.resourcesUpdated} updated, ${stats.resourcesDeleted} deleted`,
      }

      await saveSyncHistory(syncHistory)

      syncLogger.info(
        {
          historyId,
          durationMs,
          created: stats.resourcesCreated,
          updated: stats.resourcesUpdated,
          deleted: stats.resourcesDeleted,
        },
        'Sync completed'
      )

      return {
        success: stats.errors.length === 0,
        stats: {
          resourcesProcessed: actions.length,
          resourcesCreated: stats.resourcesCreated,
          resourcesUpdated: stats.resourcesUpdated,
          resourcesDeleted: stats.resourcesDeleted,
          resourcesSkipped: stats.resourcesSkipped,
          durationMs,
        },
        historyId,
        errors: stats.errors.length > 0 ? stats.errors : undefined,
      }
    } catch (error) {
      logError(syncLogger, error, 'Sync operation failed')
      throw error
    }
  }

  /**
   * Ejecuta las acciones de sincronización
   */
  private async executeActions(
    actions: SyncAction[],
    azureResources: AzureResource[],
    dbResources: ResourceDB[],
    conflictResolutions?: Record<string, Record<string, ConflictResolution>>,
    syncSource: 'manual' | 'automatic' | 'script' = 'manual',
    onProgress?: SyncProgressCallback
  ): Promise<{
    resourcesCreated: number
    resourcesUpdated: number
    resourcesDeleted: number
    resourcesSkipped: number
    errors: string[]
  }> {
    let resourcesCreated = 0
    let resourcesUpdated = 0
    let resourcesDeleted = 0
    let resourcesSkipped = 0
    const errors: string[] = []

    const azureResourceMap = new Map(azureResources.map(r => [r.name, r]))
    const dbResourceMap = new Map(dbResources.map(r => [r.name, r]))

    for (const action of actions) {
      try {
        const azureResource = azureResourceMap.get(action.resourceName)

        switch (action.operation) {
          case 'create': {
            if (!azureResource) continue
            const dbResource = azureResourceToDBResource(azureResource, syncSource)
            await upsertResource(dbResource)
            resourcesCreated++
            onProgress?.({
              operation: 'create',
              resourceName: action.resourceName,
            })
            break
          }

          case 'update': {
            if (!azureResource) continue
            const dbResource = dbResourceMap.get(action.resourceName)
            if (!dbResource) continue

            let updatedResource: ResourceDB

            if (conflictResolutions?.[action.resourceName]) {
              updatedResource = applyConflictResolutions(
                azureResource,
                dbResource,
                conflictResolutions[action.resourceName]
              )
            } else {
              updatedResource = azureResourceToDBResource(azureResource, syncSource)
              updatedResource.createdInDbAt = dbResource.createdInDbAt
            }

            await upsertResource(updatedResource)
            resourcesUpdated++
            onProgress?.({
              operation: 'update',
              resourceName: action.resourceName,
            })
            break
          }

          case 'delete': {
            await deleteResource(action.resourceName)
            resourcesDeleted++
            onProgress?.({
              operation: 'delete',
              resourceName: action.resourceName,
            })
            break
          }

          case 'skip': {
            resourcesSkipped++
            onProgress?.({
              operation: 'skip',
              resourceName: action.resourceName,
              reason: action.reason,
            })
            break
          }
        }
      } catch (error) {
        const errorMsg = `${action.operation} ${action.resourceName}: ${error instanceof Error ? error.message : 'Error'}`
        errors.push(errorMsg)
        logError(syncLogger, error, 'Sync action failed', {
          operation: action.operation,
          resource: action.resourceName,
        })
      }
    }

    return {
      resourcesCreated,
      resourcesUpdated,
      resourcesDeleted,
      resourcesSkipped,
      errors,
    }
  }
}

/**
 * Instancia singleton del servicio de sincronización
 */
export const syncService = new SyncService()
