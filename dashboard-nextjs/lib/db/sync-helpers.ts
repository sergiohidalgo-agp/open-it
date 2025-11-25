/**
 * Helpers de Sincronización
 * OpenIT Dashboard
 *
 * Funciones para comparar, detectar conflictos y sincronizar recursos
 * entre Azure y Cosmos DB
 */

import type { AzureResource } from '../types/azure'
import type {
  ResourceDB,
  ComparisonResult,
  Conflict,
  SyncAction,
  SyncOperation,
  ConflictResolution,
} from '../types/database'
import { ResourceDBSchema } from './schemas'

/**
 * Campos que se consideran para detectar conflictos
 * (excluye metadata de BD y timestamps)
 */
const CONFLICT_FIELDS = [
  'name',
  'type',
  'resourceGroup',
  'location',
  'subscription',
  'status',
  'environment',
  'createdDate',
  'gitRepository',
] as const

/**
 * Convierte un AzureResource a ResourceDB
 */
export function azureResourceToDBResource(
  resource: AzureResource,
  syncSource: 'manual' | 'automatic' | 'script' = 'manual'
): ResourceDB {
  const now = new Date().toISOString()

  return {
    id: resource.name, // ID único: nombre del recurso
    type: resource.type,
    name: resource.name,
    resourceGroup: resource.resourceGroup,
    location: resource.location,
    subscription: resource.subscription,
    status: resource.status,
    provisioningState: resource.provisioningState,
    powerState: resource.powerState,
    sku: resource.sku,
    tags: resource.tags,
    rawTags: resource.rawTags,
    environment: resource.environment,
    portalUrl: resource.portalUrl,
    kind: resource.kind,
    managedBy: resource.managedBy,
    createdDate: resource.createdDate,
    gitRepository: resource.gitRepository,
    projectId: resource.gitRepository?.projectName,
    createdInDbAt: now,
    updatedInDbAt: now,
    lastSyncedAt: now,
    syncSource,
  }
}

/**
 * Convierte un ResourceDB a AzureResource
 */
export function dbResourceToAzureResource(dbResource: ResourceDB): AzureResource {
  return {
    id: `azure-resource-${dbResource.id}`,
    name: dbResource.name,
    type: dbResource.type,
    resourceGroup: dbResource.resourceGroup,
    location: dbResource.location,
    subscription: dbResource.subscription,
    status: dbResource.status,
    provisioningState: dbResource.provisioningState,
    powerState: dbResource.powerState,
    sku: dbResource.sku,
    tags: dbResource.tags,
    rawTags: dbResource.rawTags as Record<string, string> | undefined,
    environment: dbResource.environment,
    portalUrl: dbResource.portalUrl,
    kind: dbResource.kind,
    managedBy: dbResource.managedBy,
    createdDate: dbResource.createdDate,
    gitRepository: dbResource.gitRepository,
    projectParticipants: [], // Se debe poblar por separado si es necesario
  }
}

/**
 * Compara dos recursos y detecta diferencias
 */
export function compareResources(
  azureResource: AzureResource,
  dbResource: ResourceDB
): ComparisonResult {
  const differences: ComparisonResult['differences'] = []

  for (const field of CONFLICT_FIELDS) {
    const azureValue = azureResource[field as keyof AzureResource]
    const dbValue = dbResource[field as keyof ResourceDB]

    // Comparación profunda para objetos
    if (typeof azureValue === 'object' && typeof dbValue === 'object') {
      if (JSON.stringify(azureValue) !== JSON.stringify(dbValue)) {
        differences.push({
          field,
          azureValue,
          databaseValue: dbValue,
        })
      }
    } else if (azureValue !== dbValue) {
      differences.push({
        field,
        azureValue,
        databaseValue: dbValue,
      })
    }
  }

  return {
    isEqual: differences.length === 0,
    differences,
  }
}

/**
 * Detecta conflictos entre recursos de Azure y la base de datos
 */
export function detectConflicts(
  azureResources: AzureResource[],
  dbResources: ResourceDB[]
): Conflict[] {
  const conflicts: Conflict[] = []

  // Crear mapa de recursos de BD por nombre para búsqueda rápida
  const dbResourceMap = new Map<string, ResourceDB>()
  dbResources.forEach((resource) => {
    dbResourceMap.set(resource.name, resource)
  })

  // Comparar cada recurso de Azure con su contraparte en BD
  for (const azureResource of azureResources) {
    const dbResource = dbResourceMap.get(azureResource.name)

    if (!dbResource) {
      // Recurso nuevo, no hay conflicto
      continue
    }

    // Comparar recursos
    const comparison = compareResources(azureResource, dbResource)

    if (!comparison.isEqual) {
      // Hay diferencias, crear conflictos por campo
      for (const diff of comparison.differences) {
        conflicts.push({
          resourceId: azureResource.name,
          resourceName: azureResource.name,
          field: diff.field,
          azureValue: diff.azureValue,
          databaseValue: diff.databaseValue,
        })
      }
    }
  }

  return conflicts
}

/**
 * Determina las acciones de sincronización necesarias
 */
export function determineSyncActions(
  azureResources: AzureResource[],
  dbResources: ResourceDB[],
  conflictResolutions?: Record<string, Record<string, ConflictResolution>>
): SyncAction[] {
  const actions: SyncAction[] = []

  // Crear mapas para búsqueda rápida
  const azureResourceMap = new Map<string, AzureResource>()
  const dbResourceMap = new Map<string, ResourceDB>()

  azureResources.forEach((resource) => {
    azureResourceMap.set(resource.name, resource)
  })

  dbResources.forEach((resource) => {
    dbResourceMap.set(resource.name, resource)
  })

  // 1. Procesar recursos de Azure (nuevos o actualizados)
  for (const azureResource of azureResources) {
    const dbResource = dbResourceMap.get(azureResource.name)

    if (!dbResource) {
      // Recurso nuevo en Azure
      actions.push({
        operation: 'create',
        resourceId: azureResource.name,
        resourceName: azureResource.name,
        resourceType: azureResource.type,
        reason: 'New resource in Azure',
      })
    } else {
      // Recurso existe, verificar si hay cambios
      const comparison = compareResources(azureResource, dbResource)

      if (!comparison.isEqual) {
        // Hay cambios, detectar conflictos
        const resourceConflicts: Conflict[] = comparison.differences.map((diff) => ({
          resourceId: azureResource.name,
          resourceName: azureResource.name,
          field: diff.field,
          azureValue: diff.azureValue,
          databaseValue: diff.databaseValue,
          resolution: conflictResolutions?.[azureResource.name]?.[diff.field],
        }))

        // Si todos los conflictos están resueltos, actualizar
        const allResolved = resourceConflicts.every((c) => c.resolution === 'use-azure')
        const anyManual = resourceConflicts.some((c) => c.resolution === 'manual')

        if (anyManual) {
          // Requiere resolución manual
          actions.push({
            operation: 'skip',
            resourceId: azureResource.name,
            resourceName: azureResource.name,
            resourceType: azureResource.type,
            reason: 'Manual conflict resolution required',
            conflicts: resourceConflicts,
          })
        } else if (allResolved || conflictResolutions === undefined) {
          // Actualizar (automático o resuelto)
          actions.push({
            operation: 'update',
            resourceId: azureResource.name,
            resourceName: azureResource.name,
            resourceType: azureResource.type,
            reason: 'Resource updated in Azure',
            conflicts: resourceConflicts,
          })
        } else {
          // Tiene conflictos no resueltos
          actions.push({
            operation: 'skip',
            resourceId: azureResource.name,
            resourceName: azureResource.name,
            resourceType: azureResource.type,
            reason: 'Unresolved conflicts',
            conflicts: resourceConflicts,
          })
        }
      } else {
        // Sin cambios
        actions.push({
          operation: 'skip',
          resourceId: azureResource.name,
          resourceName: azureResource.name,
          resourceType: azureResource.type,
          reason: 'No changes detected',
        })
      }
    }
  }

  // 2. Detectar recursos eliminados (en BD pero no en Azure)
  for (const dbResource of dbResources) {
    if (!azureResourceMap.has(dbResource.name)) {
      actions.push({
        operation: 'delete',
        resourceId: dbResource.name,
        resourceName: dbResource.name,
        resourceType: dbResource.type,
        reason: 'Resource no longer exists in Azure',
      })
    }
  }

  return actions
}

/**
 * Type-safe field mapping between AzureResource and ResourceDB
 */
type SyncableField = typeof CONFLICT_FIELDS[number]

/**
 * Aplica resoluciones de conflictos a un recurso
 */
export function applyConflictResolutions(
  azureResource: AzureResource,
  dbResource: ResourceDB,
  resolutions: Record<string, ConflictResolution>
): ResourceDB {
  const result = { ...dbResource }

  for (const [field, resolution] of Object.entries(resolutions)) {
    if (resolution === 'use-azure') {
      // Usar valor de Azure - Type-safe field assignment
      const syncableField = field as SyncableField
      const azureValue = azureResource[syncableField as keyof AzureResource]

      // Type-safe assignment to result
      if (syncableField in result) {
        (result as Record<SyncableField, unknown>)[syncableField] = azureValue
      }
    } else if (resolution === 'use-database') {
      // Mantener valor de BD (no hacer nada)
      continue
    }
    // 'manual' se manejará en la UI
  }

  // Actualizar timestamps
  result.updatedInDbAt = new Date().toISOString()
  result.lastSyncedAt = new Date().toISOString()

  return result
}

/**
 * Type for Zod error
 */
interface ZodValidationError {
  errors?: Array<{ path: Array<string | number>; message: string }>
}

/**
 * Valida un recurso antes de guardarlo en BD
 */
export function validateResource(resource: ResourceDB): {
  isValid: boolean
  errors?: string[]
} {
  try {
    ResourceDBSchema.parse(resource)
    return { isValid: true }
  } catch (error) {
    const zodError = error as ZodValidationError
    const errors = zodError.errors?.map((e) => `${e.path.join('.')}: ${e.message}`) || [
      'Unknown validation error',
    ]
    return { isValid: false, errors }
  }
}

/**
 * Calcula estadísticas de sincronización a partir de acciones
 */
export function calculateSyncStats(actions: SyncAction[]) {
  const stats = {
    totalResources: actions.length,
    newResources: 0,
    updatedResources: 0,
    deletedResources: 0,
    unchangedResources: 0,
    conflicts: 0,
    conflictsResolved: 0,
    conflictsPending: 0,
  }

  for (const action of actions) {
    switch (action.operation) {
      case 'create':
        stats.newResources++
        break
      case 'update':
        stats.updatedResources++
        if (action.conflicts) {
          stats.conflicts += action.conflicts.length
          stats.conflictsResolved += action.conflicts.filter((c) => c.resolution).length
        }
        break
      case 'delete':
        stats.deletedResources++
        break
      case 'skip':
        if (action.conflicts) {
          stats.conflicts += action.conflicts.length
          stats.conflictsPending += action.conflicts.filter((c) => !c.resolution).length
        } else {
          stats.unchangedResources++
        }
        break
    }
  }

  return stats
}
