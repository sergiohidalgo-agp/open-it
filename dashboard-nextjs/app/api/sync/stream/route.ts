/**
 * API Route: Stream de Logs de Sincronización
 * OpenIT Dashboard
 *
 * GET /api/sync/stream
 * Server-Sent Events para logs en tiempo real
 */

import { NextRequest } from 'next/server'
import { spawn } from 'child_process'
import type { AzureRawData } from '@/lib/types/azure'
import { transformAzureResources } from '@/lib/azure/transformer'
import { getAllResources, upsertResource, deleteResource, saveSyncHistory } from '@/lib/db/queries'
import { determineSyncActions, azureResourceToDBResource, applyConflictResolutions } from '@/lib/db/sync-helpers'
import { initializeDatabase } from '@/lib/db/init'
import type { SyncHistory } from '@/lib/db/schemas'

export const dynamic = 'force-dynamic'

function sendEvent(controller: ReadableStreamDefaultController, event: string, data: any) {
  try {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
    controller.enqueue(new TextEncoder().encode(message))
  } catch (error) {
    // Controller ya está cerrado, ignorar
    console.warn('Controller closed, cannot send event:', event)
  }
}

function execCommandWithProgress(
  command: string,
  args: string[],
  controller: ReadableStreamDefaultController,
  timeoutMs: number = 120000 // 2 minutos default
): Promise<string> {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args)
    let stdout = ''
    let stderr = ''
    const progressInterval = 3000 // Actualizar cada 3 segundos

    const progressMessages = [
      '   ⏳ Consultando Azure API...',
      '   ⏳ Obteniendo recursos (esto puede tomar ~1 minuto)...',
      '   ⏳ Procesando respuesta...',
      '   ⏳ Aún trabajando...',
    ]
    let progressIndex = 0
    let elapsedSeconds = 0

    const progressTimer = setInterval(() => {
      elapsedSeconds += 3
      if (progressIndex < progressMessages.length) {
        sendEvent(controller, 'log', {
          level: 'info',
          message: progressMessages[progressIndex]
        })
        progressIndex++
      } else {
        sendEvent(controller, 'log', {
          level: 'info',
          message: `   ⏳ Procesando... (${elapsedSeconds}s)`
        })
      }
    }, progressInterval)

    // Timeout para evitar esperas infinitas
    const timeout = setTimeout(() => {
      clearInterval(progressTimer)
      process.kill()
      reject(new Error(`Command timeout after ${timeoutMs / 1000}s`))
    }, timeoutMs)

    process.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    process.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    process.on('close', (code) => {
      clearTimeout(timeout)
      clearInterval(progressTimer)
      if (code === 0) {
        resolve(stdout)
      } else {
        reject(new Error(stderr || `Command failed with code ${code}`))
      }
    })

    process.on('error', (error) => {
      clearTimeout(timeout)
      clearInterval(progressTimer)
      reject(error)
    })
  })
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const conflictResolutionsParam = searchParams.get('conflictResolutions')
  const conflictResolutions = conflictResolutionsParam ? JSON.parse(conflictResolutionsParam) : undefined

  const stream = new ReadableStream({
    async start(controller) {
      const startTime = Date.now()

      try {
        // 1. Inicializar BD
        sendEvent(controller, 'log', { level: 'info', message: '🔍 Inicializando base de datos...' })
        const dbInit = await initializeDatabase()

        if (!dbInit.success) {
          sendEvent(controller, 'log', { level: 'error', message: `❌ Error al inicializar BD: ${dbInit.error}` })
          sendEvent(controller, 'error', { error: dbInit.error })
          controller.close()
          return
        }
        sendEvent(controller, 'log', { level: 'success', message: '✅ Base de datos inicializada' })

        // 2. Obtener información de suscripción de Azure
        sendEvent(controller, 'log', { level: 'info', message: '☁️  Obteniendo información de suscripción de Azure...' })
        sendEvent(controller, 'log', { level: 'info', message: '   $ az account show --output json' })
        let subscription: { subscriptionId: string; subscriptionName: string; tenantId: string }

        try {
          const subStdout = await execCommandWithProgress('az', ['account', 'show', '--output', 'json'], controller)
          const subData = JSON.parse(subStdout)
          subscription = {
            subscriptionId: subData.id,
            subscriptionName: subData.name,
            tenantId: subData.tenantId
          }
          sendEvent(controller, 'log', { level: 'success', message: `✅ Suscripción: ${subscription.subscriptionName}` })
        } catch (error: any) {
          sendEvent(controller, 'log', { level: 'error', message: `❌ Error obteniendo suscripción: ${error.message}` })
          sendEvent(controller, 'error', { error: error.message })
          controller.close()
          return
        }

        // 3. Ejecutar Azure CLI para obtener recursos (optimizado con query)
        sendEvent(controller, 'log', { level: 'info', message: '📊 Ejecutando Azure CLI para obtener recursos...' })
        sendEvent(controller, 'log', { level: 'info', message: '   $ az resource list --query "[].{...}" --output json' })
        sendEvent(controller, 'log', { level: 'info', message: '   ⏳ Optimizado: solo campos necesarios...' })

        // Query JMESPath optimizada: solo campos que realmente usamos
        const query = `[].{
          id: id,
          name: name,
          type: type,
          location: location,
          resourceGroup: resourceGroup,
          tags: tags,
          kind: kind,
          managedBy: managedBy,
          createdTime: createdTime,
          sku: sku,
          properties: properties.{
            provisioningState: provisioningState,
            powerState: powerState,
            state: state,
            creationDate: creationDate,
            hardwareProfile: hardwareProfile.{vmSize: vmSize}
          }
        }`

        let azureData: AzureRawData
        try {
          const stdout = await execCommandWithProgress(
            'az',
            ['resource', 'list', '--query', query, '--output', 'json'],
            controller
          )

          const resources = JSON.parse(stdout)
          azureData = {
            subscription,
            resources,
            timestamp: new Date().toISOString()
          }

          sendEvent(controller, 'log', { level: 'success', message: `✅ ${resources.length} recursos obtenidos de Azure` })
        } catch (error: any) {
          sendEvent(controller, 'log', { level: 'error', message: `❌ Error ejecutando Azure CLI: ${error.message}` })
          sendEvent(controller, 'error', { error: error.message })
          controller.close()
          return
        }

        // 4. Transformar recursos
        sendEvent(controller, 'log', { level: 'info', message: '🔄 Transformando recursos Azure...' })
        const azureResources = transformAzureResources(azureData.resources, azureData.subscription)
        sendEvent(controller, 'log', { level: 'success', message: `✅ ${azureResources.length} recursos transformados` })

        // 5. Obtener recursos de BD
        sendEvent(controller, 'log', { level: 'info', message: '💾 Consultando Cosmos DB...' })
        const dbResources = await getAllResources()
        sendEvent(controller, 'log', { level: 'success', message: `✅ ${dbResources.length} recursos en BD` })

        // 6. Determinar acciones
        sendEvent(controller, 'log', { level: 'info', message: '📋 Calculando diferencias...' })
        const actions = determineSyncActions(azureResources, dbResources, conflictResolutions)
        
        const creates = actions.filter(a => a.operation === 'create').length
        const updates = actions.filter(a => a.operation === 'update').length
        const deletes = actions.filter(a => a.operation === 'delete').length
        const skips = actions.filter(a => a.operation === 'skip').length

        sendEvent(controller, 'log', { 
          level: 'info', 
          message: `📊 Acciones: ${creates} crear, ${updates} actualizar, ${deletes} eliminar, ${skips} omitir` 
        })

        // 7. Ejecutar acciones
        let resourcesCreated = 0
        let resourcesUpdated = 0
        let resourcesDeleted = 0
        let resourcesSkipped = 0
        const errors: string[] = []

        const azureResourceMap = new Map(azureResources.map(r => [r.name, r]))
        const dbResourceMap = new Map(dbResources.map(r => [r.name, r]))

        sendEvent(controller, 'log', { level: 'info', message: '🚀 Iniciando sincronización...' })

        for (const action of actions) {
          try {
            const azureResource = azureResourceMap.get(action.resourceName)

            switch (action.operation) {
              case 'create': {
                if (!azureResource) continue
                const dbResource = azureResourceToDBResource(azureResource, 'manual')
                await upsertResource(dbResource)
                resourcesCreated++
                sendEvent(controller, 'log', { 
                  level: 'success', 
                  message: `  ✅ Creado: ${action.resourceName}`,
                  resource: action.resourceName,
                  operation: 'create'
                })
                break
              }

              case 'update': {
                if (!azureResource) continue
                const dbResource = dbResourceMap.get(action.resourceName)
                if (!dbResource) continue

                let updatedResource: any
                if (conflictResolutions?.[action.resourceName]) {
                  updatedResource = applyConflictResolutions(azureResource, dbResource, conflictResolutions[action.resourceName])
                } else {
                  updatedResource = azureResourceToDBResource(azureResource, 'manual')
                  updatedResource.createdInDbAt = dbResource.createdInDbAt
                }

                await upsertResource(updatedResource)
                resourcesUpdated++
                sendEvent(controller, 'log', { 
                  level: 'success', 
                  message: `  ✅ Actualizado: ${action.resourceName}`,
                  resource: action.resourceName,
                  operation: 'update'
                })
                break
              }

              case 'delete': {
                await deleteResource(action.resourceName)
                resourcesDeleted++
                sendEvent(controller, 'log', { 
                  level: 'warning', 
                  message: `  🗑️  Eliminado: ${action.resourceName}`,
                  resource: action.resourceName,
                  operation: 'delete'
                })
                break
              }

              case 'skip': {
                resourcesSkipped++
                sendEvent(controller, 'log', { 
                  level: 'info', 
                  message: `  ⏭️  Omitido: ${action.resourceName} (${action.reason})`,
                  resource: action.resourceName,
                  operation: 'skip'
                })
                break
              }
            }
          } catch (error) {
            const errorMsg = `${action.operation} ${action.resourceName}: ${error instanceof Error ? error.message : 'Error'}`
            errors.push(errorMsg)
            sendEvent(controller, 'log', { 
              level: 'error', 
              message: `  ❌ ${errorMsg}`,
              resource: action.resourceName,
              operation: action.operation
            })
          }
        }

        const durationMs = Date.now() - startTime

        // 8. Guardar historial
        const historyId = `sync-${Date.now()}`
        const syncHistory: SyncHistory = {
          id: historyId,
          date: new Date().toISOString().split('T')[0],
          timestamp: new Date().toISOString(),
          syncType: conflictResolutions ? 'conflict-resolution' : 'full',
          source: 'ui-stream',
          status: errors.length === 0 ? 'success' : errors.length < actions.length ? 'partial' : 'failed',
          stats: {
            resourcesProcessed: actions.length,
            resourcesCreated,
            resourcesUpdated,
            resourcesDeleted,
            resourcesSkipped,
            conflictsDetected: 0,
            conflictsResolved: 0,
            durationMs,
          },
          errors: errors.length > 0 ? errors : undefined,
          details: `Synced ${resourcesCreated} new, ${resourcesUpdated} updated, ${resourcesDeleted} deleted`,
        }

        await saveSyncHistory(syncHistory)

        sendEvent(controller, 'log', { 
          level: 'success', 
          message: `✅ Sincronización completada en ${(durationMs / 1000).toFixed(2)}s` 
        })
        sendEvent(controller, 'log', { 
          level: 'info', 
          message: `📊 Resumen: ${resourcesCreated} creados, ${resourcesUpdated} actualizados, ${resourcesDeleted} eliminados` 
        })

        // 9. Enviar resultado final
        sendEvent(controller, 'complete', {
          success: errors.length === 0,
          summary: {
            totalResources: actions.length,
            newResources: resourcesCreated,
            updatedResources: resourcesUpdated,
            deletedResources: resourcesDeleted,
            unchangedResources: resourcesSkipped,
            durationMs,
          },
          historyId,
          errors: errors.length > 0 ? errors : undefined,
        })

      } catch (error) {
        sendEvent(controller, 'log', { 
          level: 'error', 
          message: `❌ Error fatal: ${error instanceof Error ? error.message : 'Error desconocido'}` 
        })
        sendEvent(controller, 'error', { error: error instanceof Error ? error.message : 'Error desconocido' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
