/**
 * API Route: Ejecutar Sincronización
 * OpenIT Dashboard
 *
 * POST /api/sync/execute
 * Ejecuta la sincronización con resolución de conflictos
 */

import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import type { AzureRawData } from '@/lib/types/azure'
import { transformAzureResources } from '@/lib/azure/transformer'
import { getAllResources, upsertResource, deleteResource } from '@/lib/db/queries'
import {
  determineSyncActions,
  calculateSyncStats,
  azureResourceToDBResource,
  applyConflictResolutions,
} from '@/lib/db/sync-helpers'
import { saveSyncHistory } from '@/lib/db/queries'
import { initializeDatabase } from '@/lib/db/init'
import type { SyncAPIResponse, ConflictResolution, SyncOptions } from '@/lib/types/database'
import type { SyncHistory } from '@/lib/db/schemas'

/**
 * Body del request
 */
interface ExecuteSyncRequest {
  conflictResolutions?: Record<string, Record<string, ConflictResolution>>
  userId?: string
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // 1. Parse request body
    const body: ExecuteSyncRequest = await request.json()
    const { conflictResolutions, userId } = body

    // 2. Inicializar base de datos
    console.log('🔍 Initializing database...')
    const dbInit = await initializeDatabase()

    if (!dbInit.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Database initialization failed: ${dbInit.error}`,
          timestamp: new Date().toISOString(),
        } as SyncAPIResponse,
        { status: 500 }
      )
    }

    // 3. Leer recursos de Azure
    console.log('📊 Loading Azure resources...')
    const dataPath = join(process.cwd(), 'data', 'azure-raw.json')

    let azureData: AzureRawData

    try {
      const fileContent = await readFile(dataPath, 'utf-8')
      azureData = JSON.parse(fileContent)
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return NextResponse.json(
          {
            success: false,
            error: 'Azure resources data not found',
            timestamp: new Date().toISOString(),
          } as SyncAPIResponse,
          { status: 404 }
        )
      }
      throw error
    }

    // 4. Transformar y obtener recursos
    const azureResources = transformAzureResources(azureData.resources, azureData.subscription)
    const dbResources = await getAllResources()

    console.log(`✅ Azure: ${azureResources.length}, DB: ${dbResources.length}`)

    // 5. Determinar acciones
    console.log('📋 Determining sync actions...')
    const actions = determineSyncActions(azureResources, dbResources, conflictResolutions)

    // Estadísticas para tracking
    let resourcesCreated = 0
    let resourcesUpdated = 0
    let resourcesDeleted = 0
    let resourcesSkipped = 0
    const errors: string[] = []

    // Crear mapa de recursos de Azure para búsqueda rápida
    const azureResourceMap = new Map(azureResources.map((r) => [r.name, r]))
    const dbResourceMap = new Map(dbResources.map((r) => [r.name, r]))

    // 6. Ejecutar acciones de sincronización
    console.log('🔄 Executing sync actions...')

    for (const action of actions) {
      try {
        const azureResource = azureResourceMap.get(action.resourceName)

        switch (action.operation) {
          case 'create': {
            if (!azureResource) {
              errors.push(`Resource not found in Azure: ${action.resourceName}`)
              continue
            }

            // Crear nuevo recurso en BD
            const dbResource = azureResourceToDBResource(azureResource, 'manual')
            await upsertResource(dbResource)
            resourcesCreated++
            console.log(`  ✅ Created: ${action.resourceName}`)
            break
          }

          case 'update': {
            if (!azureResource) {
              errors.push(`Resource not found in Azure: ${action.resourceName}`)
              continue
            }

            const dbResource = dbResourceMap.get(action.resourceName)

            if (!dbResource) {
              errors.push(`Resource not found in database: ${action.resourceName}`)
              continue
            }

            // Aplicar resoluciones de conflictos si las hay
            let updatedResource: any

            if (conflictResolutions?.[action.resourceName]) {
              updatedResource = applyConflictResolutions(
                azureResource,
                dbResource,
                conflictResolutions[action.resourceName]
              )
            } else {
              // Sin conflictos, actualizar completamente
              updatedResource = azureResourceToDBResource(azureResource, 'manual')
              updatedResource.createdInDbAt = dbResource.createdInDbAt // Preservar fecha de creación
            }

            await upsertResource(updatedResource)
            resourcesUpdated++
            console.log(`  ✅ Updated: ${action.resourceName}`)
            break
          }

          case 'delete': {
            // Eliminar recurso de BD
            await deleteResource(action.resourceName)
            resourcesDeleted++
            console.log(`  ✅ Deleted: ${action.resourceName}`)
            break
          }

          case 'skip': {
            resourcesSkipped++
            console.log(`  ⏭️  Skipped: ${action.resourceName} (${action.reason})`)
            break
          }
        }
      } catch (error) {
        const errorMsg = `Failed to ${action.operation} ${action.resourceName}: ${error instanceof Error ? error.message : 'Unknown error'}`
        errors.push(errorMsg)
        console.error(`  ❌ ${errorMsg}`)
      }
    }

    const durationMs = Date.now() - startTime

    // 7. Calcular estadísticas finales
    const stats = calculateSyncStats(actions)

    // 8. Guardar en historial
    const historyId = `sync-${Date.now()}`
    const syncHistory: SyncHistory = {
      id: historyId,
      date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toISOString(),
      syncType: conflictResolutions ? 'conflict-resolution' : 'full',
      source: 'ui-button',
      userId,
      status: errors.length === 0 ? 'success' : errors.length < actions.length ? 'partial' : 'failed',
      stats: {
        resourcesProcessed: actions.length,
        resourcesCreated,
        resourcesUpdated,
        resourcesDeleted,
        resourcesSkipped,
        conflictsDetected: stats.conflicts,
        conflictsResolved: stats.conflictsResolved,
        durationMs,
      },
      errors: errors.length > 0 ? errors : undefined,
      details: `Synced ${resourcesCreated} new, ${resourcesUpdated} updated, ${resourcesDeleted} deleted`,
    }

    await saveSyncHistory(syncHistory)

    console.log(`✅ Sync completed in ${durationMs}ms`)
    console.log(`   Created: ${resourcesCreated}, Updated: ${resourcesUpdated}, Deleted: ${resourcesDeleted}, Skipped: ${resourcesSkipped}`)

    // 9. Retornar resultado
    return NextResponse.json({
      success: errors.length === 0,
      data: {
        summary: {
          totalResources: actions.length,
          newResources: resourcesCreated,
          updatedResources: resourcesUpdated,
          deletedResources: resourcesDeleted,
          unchangedResources: resourcesSkipped,
          conflicts: stats.conflictsPending,
        },
        historyId,
      },
      error: errors.length > 0 ? errors.join('; ') : undefined,
      timestamp: new Date().toISOString(),
    } as SyncAPIResponse)
  } catch (error) {
    console.error('❌ Sync execution error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during sync execution',
        timestamp: new Date().toISOString(),
      } as SyncAPIResponse,
      { status: 500 }
    )
  }
}
