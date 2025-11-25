/**
 * Schemas Zod para Validación de Datos Azure
 * OpenIT Dashboard
 *
 * Valida datos de Azure CLI antes de procesarlos
 */

import { z } from 'zod'

/**
 * Schema para Azure Account (az account show)
 */
export const AzureAccountSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  tenantId: z.string().min(1),
  state: z.string().optional(),
  isDefault: z.boolean().optional(),
  environmentName: z.string().optional(),
  homeTenantId: z.string().optional(),
  managedByTenants: z.array(z.object({
    tenantId: z.string(),
  })).optional(),
  user: z.object({
    name: z.string(),
    type: z.string(),
  }).optional(),
})

export type AzureAccount = z.infer<typeof AzureAccountSchema>

/**
 * Schema para un recurso Azure raw (salida de az resource list)
 */
export const AzureResourceRawSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  location: z.string(),
  tags: z.record(z.string()).optional().nullable(),
  resourceGroup: z.string().optional(),
  kind: z.string().optional().nullable(),
  managedBy: z.string().optional().nullable(),
  createdTime: z.string().optional().nullable(),
  sku: z.object({
    name: z.string().optional(),
    tier: z.string().optional(),
    size: z.string().optional(),
    family: z.string().optional(),
    capacity: z.number().optional(),
  }).optional().nullable(),
  properties: z.any().optional().nullable(), // Properties es demasiado variado para validar estrictamente
})

export type AzureResourceRaw = z.infer<typeof AzureResourceRawSchema>

/**
 * Schema para suscripción Azure
 */
export const AzureSubscriptionSchema = z.object({
  subscriptionId: z.string().min(1),
  subscriptionName: z.string().min(1),
  tenantId: z.string().min(1),
  state: z.string().optional(),
})

export type AzureSubscription = z.infer<typeof AzureSubscriptionSchema>

/**
 * Schema para datos Azure completos (archivo azure-raw.json)
 */
export const AzureRawDataSchema = z.object({
  subscription: AzureSubscriptionSchema,
  resources: z.array(AzureResourceRawSchema),
  timestamp: z.string(),
})

export type AzureRawData = z.infer<typeof AzureRawDataSchema>

/**
 * Schema para eventos SSE de sincronización
 */
export const SyncLogEventSchema = z.object({
  level: z.enum(['info', 'success', 'warning', 'error', 'debug']),
  message: z.string(),
  timestamp: z.string().optional(),
  resource: z.string().optional(),
  operation: z.string().optional(),
})

export const SyncCompleteEventSchema = z.object({
  success: z.boolean(),
  summary: z.object({
    totalResources: z.number(),
    newResources: z.number(),
    updatedResources: z.number(),
    deletedResources: z.number(),
    unchangedResources: z.number(),
    durationMs: z.number(),
  }),
  historyId: z.string(),
  errors: z.array(z.string()).optional(),
})

/**
 * Helper: Valida y parsea JSON de forma segura
 */
export function parseJsonSafe<T>(
  jsonString: string,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } {
  try {
    const parsed = JSON.parse(jsonString)
    const result = schema.safeParse(parsed)

    if (result.success) {
      return { success: true, data: result.data }
    } else {
      return {
        success: false,
        error: `Validation failed: ${result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse JSON'
    }
  }
}
