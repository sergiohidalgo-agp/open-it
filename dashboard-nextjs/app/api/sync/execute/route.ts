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
import { initializeDatabase } from '@/lib/db/init'
import type { SyncAPIResponse, ConflictResolution } from '@/lib/types/database'
import { syncLogger, logError } from '@/lib/logger'
import { syncService } from '@/lib/services/sync-service'

/**
 * Body del request
 */
interface ExecuteSyncRequest {
  conflictResolutions?: Record<string, Record<string, ConflictResolution>>
  userId?: string
}

/**
 * POST /api/sync/execute
 * Ejecuta sincronización desde archivo azure-raw.json
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // 1. Parse request body
    const body: ExecuteSyncRequest = await request.json()
    const { conflictResolutions, userId } = body

    // 2. Inicializar base de datos
    syncLogger.info('Initializing database')
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

    // 3. Leer recursos de Azure desde archivo
    syncLogger.info('Loading Azure resources from file')
    const dataPath = join(process.cwd(), 'data', 'azure-raw.json')

    let azureData: AzureRawData

    try {
      const fileContent = await readFile(dataPath, 'utf-8')
      azureData = JSON.parse(fileContent)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
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

    // 4. Transformar recursos
    const azureResources = transformAzureResources(
      azureData.resources,
      azureData.subscription
    )

    syncLogger.info(
      { azureResourceCount: azureResources.length },
      'Azure resources loaded'
    )

    // 5. Ejecutar sincronización usando el servicio
    const syncResult = await syncService.sync(
      azureResources,
      {
        conflictResolutions,
        syncSource: 'manual',
        userId,
      }
    )

    const durationMs = Date.now() - startTime

    syncLogger.info(
      {
        durationMs,
        created: syncResult.stats.resourcesCreated,
        updated: syncResult.stats.resourcesUpdated,
        deleted: syncResult.stats.resourcesDeleted,
      },
      'Sync completed'
    )

    // 6. Retornar resultado
    return NextResponse.json({
      success: syncResult.success,
      data: {
        summary: {
          totalResources: syncResult.stats.resourcesProcessed,
          newResources: syncResult.stats.resourcesCreated,
          updatedResources: syncResult.stats.resourcesUpdated,
          deletedResources: syncResult.stats.resourcesDeleted,
          unchangedResources: syncResult.stats.resourcesSkipped,
          conflicts: 0, // TODO: Implementar detección de conflictos
        },
        historyId: syncResult.historyId,
      },
      error: syncResult.errors?.join('; '),
      timestamp: new Date().toISOString(),
    } as SyncAPIResponse)
  } catch (error) {
    logError(syncLogger, error, 'Sync execution error')

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
