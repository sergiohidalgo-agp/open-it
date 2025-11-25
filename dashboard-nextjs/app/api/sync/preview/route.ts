/**
 * API Route: Preview de Sincronización
 * OpenIT Dashboard
 *
 * POST /api/sync/preview
 * Compara recursos de Azure con la base de datos y retorna cambios y conflictos
 */

import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import type { AzureRawData } from '@/lib/types/azure'
import { transformAzureResources } from '@/lib/azure/transformer'
import { getAllResources } from '@/lib/db/queries'
import { detectConflicts, determineSyncActions, calculateSyncStats } from '@/lib/db/sync-helpers'
import { initializeDatabase } from '@/lib/db/init'
import type { SyncAPIResponse } from '@/lib/types/database'
import { SyncLogger } from '@/lib/types/sync-logs'

export async function POST() {
  const logger = new SyncLogger()

  try {
    // 1. Inicializar base de datos si es necesario
    logger.info('🔍 Checking database connection and initialization...')
    const dbInit = await initializeDatabase()

    if (!dbInit.success) {
      logger.error('Database initialization failed', { error: dbInit.error })
      return NextResponse.json(
        {
          success: false,
          error: `Database initialization failed: ${dbInit.error}`,
          timestamp: new Date().toISOString(),
          logs: logger.getLogs(),
        } as SyncAPIResponse,
        { status: 500 }
      )
    }
    logger.success('Database initialized successfully')

    // 2. Leer recursos de Azure desde el archivo
    logger.info('📊 Loading Azure resources from data file...')
    const dataPath = join(process.cwd(), 'data', 'azure-raw.json')

    let azureData: AzureRawData

    try {
      const fileContent = await readFile(dataPath, 'utf-8')
      azureData = JSON.parse(fileContent)
      logger.debug(`Read ${fileContent.length} bytes from azure-raw.json`)
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        logger.error('Azure resources data file not found', { path: dataPath })
        return NextResponse.json(
          {
            success: false,
            error:
              'Azure resources data not found. Please run the fetch script: ./scripts/fetch-azure-resources.sh',
            timestamp: new Date().toISOString(),
            logs: logger.getLogs(),
          } as SyncAPIResponse,
          { status: 404 }
        )
      }
      throw error
    }

    // 3. Transformar recursos de Azure
    logger.info('🔄 Transforming Azure resources...')
    const azureResources = transformAzureResources(azureData.resources, azureData.subscription)
    logger.success(`Loaded ${azureResources.length} Azure resources`, {
      subscription: azureData.subscription,
      count: azureResources.length,
    })

    // 4. Obtener recursos de la base de datos
    logger.info('💾 Loading resources from Cosmos DB...')
    const dbResources = await getAllResources()
    logger.success(`Loaded ${dbResources.length} database resources`)

    // 5. Detectar conflictos
    logger.info('🔍 Detecting conflicts between Azure and Database...')
    const conflicts = detectConflicts(azureResources, dbResources)

    if (conflicts.length > 0) {
      logger.warning(`Found ${conflicts.length} conflicts that need resolution`, {
        conflictCount: conflicts.length,
        resources: conflicts.map(c => c.resourceName).filter((v, i, a) => a.indexOf(v) === i),
      })
    } else {
      logger.success('No conflicts detected')
    }

    // 6. Determinar acciones de sincronización
    logger.info('📋 Determining sync actions (create/update/delete)...')
    const actions = determineSyncActions(azureResources, dbResources)

    // 7. Calcular estadísticas
    const stats = calculateSyncStats(actions)
    logger.info('📊 Sync statistics calculated', {
      new: stats.newResources,
      updated: stats.updatedResources,
      deleted: stats.deletedResources,
      unchanged: stats.unchangedResources,
    })

    // 8. Preparar resumen de cambios
    const changes = {
      new: actions.filter((a) => a.operation === 'create').map((a) => a.resourceName),
      updated: actions.filter((a) => a.operation === 'update').map((a) => a.resourceName),
      deleted: actions.filter((a) => a.operation === 'delete').map((a) => a.resourceName),
    }

    logger.success(`Preview completed successfully`)

    // 9. Retornar resultado
    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalResources: stats.totalResources,
          newResources: stats.newResources,
          updatedResources: stats.updatedResources,
          deletedResources: stats.deletedResources,
          unchangedResources: stats.unchangedResources,
          conflicts: stats.conflicts,
        },
        conflicts: conflicts.length > 0 ? conflicts : undefined,
        changes,
      },
      logs: logger.getLogs(),
      timestamp: new Date().toISOString(),
    } as SyncAPIResponse)
  } catch (error) {
    logger.error('Preview failed with exception', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during preview',
        logs: logger.getLogs(),
        timestamp: new Date().toISOString(),
      } as SyncAPIResponse,
      { status: 500 }
    )
  }
}
