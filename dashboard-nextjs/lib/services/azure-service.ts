/**
 * Azure Service - Servicio para interactuar con Azure CLI
 * OpenIT Dashboard
 *
 * Responsabilidad única: Ejecutar comandos Azure CLI y validar respuestas
 */

import { spawn } from 'child_process'
import { z } from 'zod'
import {
  AzureAccountSchema,
  AzureResourceRawSchema,
  parseJsonSafe,
  type AzureAccount,
  type AzureResourceRaw,
} from '@/lib/validation/azure-schemas'
import { azureLogger, logError } from '@/lib/logger'
import { withRetry, RetryPredicates } from '@/lib/utils/retry'

/**
 * Resultado de ejecución de comando Azure
 */
export type AzureCommandResult<T> =
  | {
      success: true
      data: T
    }
  | {
      success: false
      error: string
    }

/**
 * Opciones para ejecutar comandos Azure
 */
export interface AzureCommandOptions {
  timeoutMs?: number
  onProgress?: (message: string) => void
}

/**
 * Servicio para interactuar con Azure CLI
 */
export class AzureService {
  /**
   * Ejecuta un comando Azure CLI con timeout y manejo de errores
   */
  private async executeCommand(
    args: string[],
    options: AzureCommandOptions = {}
  ): Promise<string> {
    const { timeoutMs = 120000, onProgress } = options

    return new Promise((resolve, reject) => {
      const process = spawn('az', args)
      let stdout = ''
      let stderr = ''

      const progressMessages = [
        'Consultando Azure API...',
        'Obteniendo recursos (esto puede tomar ~1 minuto)...',
        'Procesando respuesta...',
        'Aún trabajando...',
      ]
      let progressIndex = 0
      let elapsedSeconds = 0

      const progressTimer = setInterval(() => {
        elapsedSeconds += 3
        if (onProgress) {
          const message = progressIndex < progressMessages.length
            ? progressMessages[progressIndex]
            : `Procesando... (${elapsedSeconds}s)`
          onProgress(message)
          if (progressIndex < progressMessages.length) {
            progressIndex++
          }
        }
      }, 3000)

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

  /**
   * Obtiene información de la suscripción Azure activa
   */
  async getSubscription(
    options?: AzureCommandOptions
  ): Promise<AzureCommandResult<AzureAccount>> {
    try {
      azureLogger.info('Getting Azure subscription')

      // Ejecutar comando con reintentos automáticos
      const stdout = await withRetry(
        () => this.executeCommand(['account', 'show', '--output', 'json'], options),
        {
          maxRetries: 3,
          initialDelay: 2000,
          shouldRetry: RetryPredicates.isAzureTransientError,
          onRetry: (error, attempt, delay) => {
            azureLogger.warn(
              { attempt, nextRetryIn: `${delay}ms` },
              'Retrying Azure subscription request'
            )
          },
        }
      )

      const parseResult = parseJsonSafe(stdout, AzureAccountSchema)

      if (!parseResult.success) {
        azureLogger.error({ error: parseResult.error }, 'Invalid Azure account data')
        return {
          success: false,
          error: `Invalid Azure account data: ${parseResult.error}`
        }
      }

      azureLogger.info({ subscription: parseResult.data.name }, 'Subscription retrieved')

      return {
        success: true,
        data: parseResult.data
      }
    } catch (error) {
      logError(azureLogger, error, 'Failed to get Azure subscription')
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Obtiene todos los recursos de Azure con query optimizada
   */
  async getResources(
    options?: AzureCommandOptions
  ): Promise<AzureCommandResult<AzureResourceRaw[]>> {
    try {
      azureLogger.info('Getting Azure resources')

      // Query JMESPath optimizada: solo campos necesarios
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

      // Ejecutar comando con reintentos automáticos
      const stdout = await withRetry(
        () => this.executeCommand(['resource', 'list', '--query', query, '--output', 'json'], options),
        {
          maxRetries: 3,
          initialDelay: 2000,
          shouldRetry: RetryPredicates.isAzureTransientError,
          onRetry: (error, attempt, delay) => {
            azureLogger.warn(
              { attempt, nextRetryIn: `${delay}ms` },
              'Retrying Azure resources request'
            )
          },
        }
      )

      const parseResult = parseJsonSafe(stdout, z.array(AzureResourceRawSchema))

      if (!parseResult.success) {
        azureLogger.error({ error: parseResult.error }, 'Invalid Azure resources data')
        return {
          success: false,
          error: `Invalid Azure resources data: ${parseResult.error}`
        }
      }

      azureLogger.info({ count: parseResult.data.length }, 'Resources retrieved')

      return {
        success: true,
        data: parseResult.data
      }
    } catch (error) {
      logError(azureLogger, error, 'Failed to get Azure resources')
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Obtiene suscripción y recursos en una sola operación
   */
  async getSubscriptionAndResources(
    options?: AzureCommandOptions
  ): Promise<AzureCommandResult<{
    subscription: AzureAccount
    resources: AzureResourceRaw[]
  }>> {
    const subscriptionResult = await this.getSubscription(options)

    if (!subscriptionResult.success) {
      return subscriptionResult
    }

    const resourcesResult = await this.getResources(options)

    if (!resourcesResult.success) {
      return resourcesResult
    }

    return {
      success: true,
      data: {
        subscription: subscriptionResult.data,
        resources: resourcesResult.data
      }
    }
  }
}

/**
 * Instancia singleton del servicio Azure
 */
export const azureService = new AzureService()
