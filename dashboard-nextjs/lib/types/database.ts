/**
 * Tipos TypeScript para Base de Datos
 * OpenIT Dashboard
 *
 * Define tipos específicos para operaciones de base de datos
 */

import type { ResourceDB, ParticipantDB, SyncHistory, AppConfig, Conflict } from '../db/schemas'

/**
 * Operación de sincronización
 */
export type SyncOperation = 'create' | 'update' | 'delete' | 'skip'

/**
 * Tipo de conflicto
 */
export type ConflictType = 'field-mismatch' | 'resource-deleted' | 'resource-modified'

/**
 * Resolución de conflicto
 */
export type ConflictResolution = 'use-azure' | 'use-database' | 'manual'

/**
 * Estado de sincronización
 */
export type SyncStatus = 'idle' | 'previewing' | 'syncing' | 'conflicts' | 'success' | 'error'

/**
 * Acción de sincronización con metadata
 */
export interface SyncAction {
  operation: SyncOperation
  resourceId: string
  resourceName: string
  resourceType: string
  reason: string
  conflicts?: Conflict[]
}

/**
 * Resultado detallado de comparación
 */
export interface ComparisonResult {
  isEqual: boolean
  differences: {
    field: string
    azureValue: any
    databaseValue: any
  }[]
}

/**
 * Opciones de sincronización
 */
export interface SyncOptions {
  dryRun?: boolean
  resolveConflicts?: boolean
  conflictResolutions?: Record<string, Record<string, ConflictResolution>>
  userId?: string
  source?: 'ui-button' | 'api' | 'script' | 'scheduled'
}

/**
 * Respuesta de API de sincronización
 */
export interface SyncAPIResponse {
  success: boolean
  data?: {
    summary: {
      totalResources: number
      newResources: number
      updatedResources: number
      deletedResources: number
      unchangedResources: number
      conflicts: number
    }
    conflicts?: Conflict[]
    changes?: {
      new: string[]
      updated: string[]
      deleted: string[]
    }
    historyId?: string
  }
  error?: string
  timestamp: string
}

/**
 * Estado de la base de datos
 */
export interface DatabaseStatus {
  isConnected: boolean
  databaseExists: boolean
  containers: {
    name: string
    exists: boolean
    itemCount?: number
  }[]
  error?: string
}

/**
 * Configuración de sincronización
 */
export interface SyncConfig {
  autoSync: boolean
  syncInterval: number // en minutos
  lastSyncAt?: string
  conflictStrategy: 'prefer-azure' | 'prefer-database' | 'manual'
  notifyOnConflicts: boolean
}

/**
 * Queries comunes para recursos
 */
export interface ResourceQuery {
  type?: string
  environment?: 'production' | 'development' | 'unknown'
  resourceGroup?: string
  location?: string
  hasGitRepository?: boolean
  projectId?: string
  tags?: string[]
  limit?: number
  offset?: number
}

/**
 * Resultado paginado
 */
export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

// Re-exportar tipos de schemas para conveniencia
export type { ResourceDB, ParticipantDB, SyncHistory, AppConfig, Conflict }
