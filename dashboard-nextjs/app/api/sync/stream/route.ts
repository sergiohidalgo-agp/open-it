/**
 * API Route: Stream de Logs de Sincronización
 * OpenIT Dashboard
 *
 * GET /api/sync/stream
 * Server-Sent Events para logs en tiempo real
 */

import { NextRequest } from 'next/server'
import { transformAzureResources } from '@/lib/azure/transformer'
import { initializeDatabase } from '@/lib/db/init'
import { syncLogger, logError } from '@/lib/logger'
import { azureService } from '@/lib/services/azure-service'
import { syncService } from '@/lib/services/sync-service'

export const dynamic = 'force-dynamic'

/**
 * Tipo de evento SSE
 */
type SSEEvent = 'log' | 'complete' | 'error'

/**
 * Nivel de log
 */
type LogLevel = 'info' | 'success' | 'warning' | 'error' | 'debug'

/**
 * Envía un evento SSE al cliente
 */
function sendEvent(
  controller: ReadableStreamDefaultController,
  event: SSEEvent,
  data: unknown
) {
  try {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
    controller.enqueue(new TextEncoder().encode(message))
  } catch (error) {
    syncLogger.warn({ event }, 'Controller closed, cannot send event')
  }
}

/**
 * Envía un log al cliente
 */
function sendLog(
  controller: ReadableStreamDefaultController,
  level: LogLevel,
  message: string,
  meta?: { resource?: string; operation?: string }
) {
  sendEvent(controller, 'log', { level, message, ...meta })
}

/**
 * GET /api/sync/stream
 * Ejecuta sincronización con logs en tiempo real
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const conflictResolutionsParam = searchParams.get('conflictResolutions')
  const conflictResolutions = conflictResolutionsParam
    ? JSON.parse(conflictResolutionsParam)
    : undefined

  const stream = new ReadableStream({
    async start(controller) {
      const startTime = Date.now()

      try {
        // 1. Inicializar BD
        sendLog(controller, 'info', '🔍 Inicializando base de datos...')
        const dbInit = await initializeDatabase()

        if (!dbInit.success) {
          sendLog(controller, 'error', `❌ Error al inicializar BD: ${dbInit.error}`)
          sendEvent(controller, 'error', { error: dbInit.error })
          controller.close()
          return
        }
        sendLog(controller, 'success', '✅ Base de datos inicializada')

        // 2. Obtener información de Azure
        sendLog(controller, 'info', '☁️  Obteniendo información de suscripción de Azure...')
        sendLog(controller, 'info', '   $ az account show --output json')

        const subscriptionResult = await azureService.getSubscription({
          onProgress: (message) => sendLog(controller, 'info', `   ⏳ ${message}`)
        })

        if (!subscriptionResult.success) {
          sendLog(controller, 'error', `❌ Error obteniendo suscripción: ${subscriptionResult.error}`)
          sendEvent(controller, 'error', { error: subscriptionResult.error })
          controller.close()
          return
        }

        const subscription = subscriptionResult.data
        sendLog(controller, 'success', `✅ Suscripción: ${subscription.name}`)

        // 3. Obtener recursos de Azure
        sendLog(controller, 'info', '📊 Ejecutando Azure CLI para obtener recursos...')
        sendLog(controller, 'info', '   $ az resource list --query "[].{...}" --output json')
        sendLog(controller, 'info', '   ⏳ Optimizado: solo campos necesarios...')

        const resourcesResult = await azureService.getResources({
          onProgress: (message) => sendLog(controller, 'info', `   ⏳ ${message}`)
        })

        if (!resourcesResult.success) {
          sendLog(controller, 'error', `❌ Error ejecutando Azure CLI: ${resourcesResult.error}`)
          sendEvent(controller, 'error', { error: resourcesResult.error })
          controller.close()
          return
        }

        const rawResources = resourcesResult.data
        sendLog(controller, 'success', `✅ ${rawResources.length} recursos obtenidos de Azure`)

        // 4. Transformar recursos
        sendLog(controller, 'info', '🔄 Transformando recursos Azure...')
        const azureResources = transformAzureResources(rawResources as any, {
          subscriptionId: subscription.id,
          subscriptionName: subscription.name,
          tenantId: subscription.tenantId,
        })
        sendLog(controller, 'success', `✅ ${azureResources.length} recursos transformados`)

        // 5. Consultar Cosmos DB
        sendLog(controller, 'info', '💾 Consultando Cosmos DB...')

        // 6. Ejecutar sincronización
        sendLog(controller, 'info', '🚀 Iniciando sincronización...')

        const syncResult = await syncService.sync(
          azureResources,
          { conflictResolutions, syncSource: 'manual' },
          (progress) => {
            const icons = {
              create: '✅',
              update: '✅',
              delete: '🗑️',
              skip: '⏭️',
            }
            const labels = {
              create: 'Creado',
              update: 'Actualizado',
              delete: 'Eliminado',
              skip: 'Omitido',
            }
            const levels: Record<typeof progress.operation, LogLevel> = {
              create: 'success',
              update: 'success',
              delete: 'warning',
              skip: 'info',
            }

            const message = progress.reason
              ? `  ${icons[progress.operation]} ${labels[progress.operation]}: ${progress.resourceName} (${progress.reason})`
              : `  ${icons[progress.operation]} ${labels[progress.operation]}: ${progress.resourceName}`

            sendLog(controller, levels[progress.operation], message, {
              resource: progress.resourceName,
              operation: progress.operation,
            })
          }
        )

        const durationMs = Date.now() - startTime

        // 7. Logs de resumen
        sendLog(
          controller,
          'success',
          `✅ Sincronización completada en ${(durationMs / 1000).toFixed(2)}s`
        )
        sendLog(
          controller,
          'info',
          `📊 Resumen: ${syncResult.stats.resourcesCreated} creados, ${syncResult.stats.resourcesUpdated} actualizados, ${syncResult.stats.resourcesDeleted} eliminados`
        )

        // 8. Enviar resultado final
        sendEvent(controller, 'complete', {
          success: syncResult.success,
          summary: {
            totalResources: syncResult.stats.resourcesProcessed,
            newResources: syncResult.stats.resourcesCreated,
            updatedResources: syncResult.stats.resourcesUpdated,
            deletedResources: syncResult.stats.resourcesDeleted,
            unchangedResources: syncResult.stats.resourcesSkipped,
            durationMs: syncResult.stats.durationMs,
          },
          historyId: syncResult.historyId,
          errors: syncResult.errors,
        })

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
        sendLog(controller, 'error', `❌ Error fatal: ${errorMessage}`)
        sendEvent(controller, 'error', { error: errorMessage })
        logError(syncLogger, error, 'Stream sync failed')
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
