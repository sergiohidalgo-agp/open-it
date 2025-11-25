/**
 * Schemas de Validación con Zod
 * OpenIT Dashboard
 *
 * Define schemas para validar datos antes de guardarlos en Cosmos DB
 */

import { z } from 'zod'

/**
 * Schema para recursos de Azure en la base de datos
 */
export const ResourceDBSchema = z.object({
  // ID único: nombre del recurso (partition key helper)
  id: z.string().min(1),

  // Tipo de recurso (partition key)
  type: z.enum([
    'Virtual Machine',
    'SQL Database',
    'Storage Account',
    'Virtual Network',
    'Key Vault',
    'App Service',
    'Cosmos DB',
    'CDN Profile',
    'Load Balancer',
    'Other',
  ]),

  // Información básica del recurso
  name: z.string().min(1),
  resourceGroup: z.string().min(1),
  location: z.string().min(1),
  subscription: z.string().min(1),

  // Estado
  status: z.enum(['running', 'stopped', 'available', 'creating', 'failed', 'unknown']),
  provisioningState: z.string().optional(),
  powerState: z.string().optional(),

  // SKU
  sku: z
    .object({
      name: z.string(),
      tier: z.string().optional(),
    })
    .optional(),

  // Tags
  tags: z.array(z.string()),
  rawTags: z.record(z.string(), z.unknown()).optional(),

  // Ambiente
  environment: z.enum(['production', 'development', 'unknown']),

  // URL del portal
  portalUrl: z.string().url(),

  // Metadata adicional
  kind: z.string().optional(),
  managedBy: z.string().optional(),

  // Fecha de creación del recurso en Azure
  createdDate: z.string().optional(),

  // Repositorio Git asociado
  gitRepository: z
    .object({
      url: z.string().url(),
      branch: z.string().optional(),
      provider: z.enum(['github', 'gitlab', 'azuredevops', 'other']).optional(),
      projectName: z.string().optional(),
      organizationName: z.string().optional(),
    })
    .optional(),

  // Participantes del proyecto (referencia)
  projectId: z.string().optional(),

  // Metadata de la base de datos
  createdInDbAt: z.string(),
  updatedInDbAt: z.string(),
  lastSyncedAt: z.string(),
  syncSource: z.enum(['manual', 'automatic', 'script']),
})

export type ResourceDB = z.infer<typeof ResourceDBSchema>

/**
 * Schema para participantes de proyectos
 */
export const ParticipantDBSchema = z.object({
  // ID único: projectId-userId
  id: z.string().min(1),

  // Project ID (partition key)
  projectId: z.string().min(1),

  // Project name
  projectName: z.string().min(1),

  // Información del participante
  userId: z.string().min(1),
  displayName: z.string().min(1),
  uniqueName: z.string().optional(),
  imageUrl: z.string().url().optional(),

  // Metadata
  createdInDbAt: z.string(),
  updatedInDbAt: z.string(),
  lastSyncedAt: z.string(),
})

export type ParticipantDB = z.infer<typeof ParticipantDBSchema>

/**
 * Schema para historial de sincronización
 */
export const SyncHistorySchema = z.object({
  // ID único: timestamp
  id: z.string().min(1),

  // Fecha (partition key en formato YYYY-MM-DD)
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),

  // Timestamp completo
  timestamp: z.string(),

  // Tipo de sincronización
  syncType: z.enum(['full', 'incremental', 'conflict-resolution']),

  // Fuente de sincronización
  source: z.enum(['ui-button', 'api', 'script', 'scheduled']),

  // Usuario que ejecutó (si aplica)
  userId: z.string().optional(),

  // Resultado
  status: z.enum(['success', 'partial', 'failed']),

  // Estadísticas
  stats: z.object({
    resourcesProcessed: z.number().int().nonnegative(),
    resourcesCreated: z.number().int().nonnegative(),
    resourcesUpdated: z.number().int().nonnegative(),
    resourcesDeleted: z.number().int().nonnegative(),
    resourcesSkipped: z.number().int().nonnegative(),
    conflictsDetected: z.number().int().nonnegative(),
    conflictsResolved: z.number().int().nonnegative(),
    durationMs: z.number().int().nonnegative(),
  }),

  // Errores
  errors: z.array(z.string()).optional(),

  // Detalles adicionales
  details: z.string().optional(),
})

export type SyncHistory = z.infer<typeof SyncHistorySchema>

/**
 * Schema para configuración de la aplicación
 */
export const AppConfigSchema = z.object({
  // ID único: nombre de la configuración
  id: z.string().min(1),

  // Tipo de configuración (partition key)
  type: z.enum(['sync', 'ui', 'notification', 'integration', 'general']),

  // Valor de la configuración (flexible)
  value: z.any(),

  // Metadata
  description: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type AppConfig = z.infer<typeof AppConfigSchema>

/**
 * Schema para conflictos de sincronización
 */
export const ConflictSchema = z.object({
  resourceId: z.string(),
  resourceName: z.string(),
  field: z.string(),
  azureValue: z.any(),
  databaseValue: z.any(),
  resolution: z.enum(['use-azure', 'use-database', 'manual']).optional(),
})

export type Conflict = z.infer<typeof ConflictSchema>

/**
 * Schema para resultado de sincronización
 */
export const SyncResultSchema = z.object({
  success: z.boolean(),
  summary: z.object({
    totalResources: z.number().int().nonnegative(),
    newResources: z.number().int().nonnegative(),
    updatedResources: z.number().int().nonnegative(),
    deletedResources: z.number().int().nonnegative(),
    unchangedResources: z.number().int().nonnegative(),
    conflicts: z.number().int().nonnegative(),
  }),
  conflicts: z.array(ConflictSchema),
  errors: z.array(z.string()).optional(),
  timestamp: z.string(),
})

export type SyncResult = z.infer<typeof SyncResultSchema>

/**
 * Schema para preview de sincronización
 */
export const SyncPreviewSchema = z.object({
  hasChanges: z.boolean(),
  summary: z.object({
    newResources: z.number().int().nonnegative(),
    updatedResources: z.number().int().nonnegative(),
    deletedResources: z.number().int().nonnegative(),
    unchangedResources: z.number().int().nonnegative(),
    conflicts: z.number().int().nonnegative(),
  }),
  conflicts: z.array(ConflictSchema),
  changes: z.object({
    new: z.array(z.string()),
    updated: z.array(z.string()),
    deleted: z.array(z.string()),
  }),
})

export type SyncPreview = z.infer<typeof SyncPreviewSchema>
