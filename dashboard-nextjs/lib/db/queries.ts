/**
 * Queries Comunes para Cosmos DB
 * OpenIT Dashboard
 *
 * Funciones auxiliares para consultar y modificar datos en Cosmos DB
 */

import { getContainer } from './cosmos-client'
import type { ResourceDB, ParticipantDB, SyncHistory } from './schemas'
import type { ResourceQuery, PaginatedResult } from '../types/database'

/**
 * ==================
 * RECURSOS
 * ==================
 */

/**
 * Obtiene todos los recursos de la base de datos
 */
export async function getAllResources(): Promise<ResourceDB[]> {
  const container = await getContainer('resources')

  const { resources } = await container.items
    .query<ResourceDB>({
      query: 'SELECT * FROM c',
    })
    .fetchAll()

  return resources
}

/**
 * Obtiene un recurso por nombre (ID)
 */
export async function getResourceByName(name: string): Promise<ResourceDB | null> {
  const container = await getContainer('resources')

  try {
    const { resource } = await container.item(name, name).read<ResourceDB>()
    return resource || null
  } catch (error: any) {
    if (error.code === 404) {
      return null
    }
    throw error
  }
}

/**
 * Busca recursos con filtros
 */
export async function queryResources(query: ResourceQuery): Promise<PaginatedResult<ResourceDB>> {
  const container = await getContainer('resources')

  // Construir query SQL
  let sql = 'SELECT * FROM c WHERE 1=1'
  const parameters: { name: string; value: any }[] = []

  if (query.type) {
    sql += ' AND c.type = @type'
    parameters.push({ name: '@type', value: query.type })
  }

  if (query.environment) {
    sql += ' AND c.environment = @environment'
    parameters.push({ name: '@environment', value: query.environment })
  }

  if (query.resourceGroup) {
    sql += ' AND c.resourceGroup = @resourceGroup'
    parameters.push({ name: '@resourceGroup', value: query.resourceGroup })
  }

  if (query.location) {
    sql += ' AND c.location = @location'
    parameters.push({ name: '@location', value: query.location })
  }

  if (query.hasGitRepository !== undefined) {
    sql += query.hasGitRepository ? ' AND IS_DEFINED(c.gitRepository)' : ' AND NOT IS_DEFINED(c.gitRepository)'
  }

  if (query.projectId) {
    sql += ' AND c.projectId = @projectId'
    parameters.push({ name: '@projectId', value: query.projectId })
  }

  // Order by
  sql += ' ORDER BY c.name ASC'

  // Ejecutar query
  const { resources } = await container.items
    .query<ResourceDB>({
      query: sql,
      parameters,
    })
    .fetchAll()

  // Aplicar paginación en memoria (Cosmos DB tiene limitaciones de offset/limit)
  const offset = query.offset || 0
  const limit = query.limit || resources.length

  const paginatedItems = resources.slice(offset, offset + limit)

  return {
    items: paginatedItems,
    total: resources.length,
    page: Math.floor(offset / limit) + 1,
    pageSize: limit,
    hasMore: offset + limit < resources.length,
  }
}

/**
 * Crea o actualiza un recurso
 */
export async function upsertResource(resource: ResourceDB): Promise<ResourceDB> {
  const container = await getContainer('resources')

  const { resource: upsertedResource } = await container.items.upsert<ResourceDB>(resource)

  if (!upsertedResource) {
    throw new Error('Failed to upsert resource')
  }

  return upsertedResource
}

/**
 * Elimina un recurso por nombre
 */
export async function deleteResource(name: string): Promise<void> {
  const container = await getContainer('resources')

  await container.item(name, name).delete()
}

/**
 * Elimina múltiples recursos
 */
export async function deleteResources(names: string[]): Promise<void> {
  const container = await getContainer('resources')

  await Promise.all(names.map((name) => container.item(name, name).delete()))
}

/**
 * ==================
 * PARTICIPANTES
 * ==================
 */

/**
 * Obtiene todos los participantes de un proyecto
 */
export async function getParticipantsByProject(projectId: string): Promise<ParticipantDB[]> {
  const container = await getContainer('participants')

  const { resources } = await container.items
    .query<ParticipantDB>({
      query: 'SELECT * FROM c WHERE c.projectId = @projectId',
      parameters: [{ name: '@projectId', value: projectId }],
    })
    .fetchAll()

  return resources
}

/**
 * Guarda o actualiza participantes de un proyecto
 */
export async function upsertParticipants(participants: ParticipantDB[]): Promise<void> {
  const container = await getContainer('participants')

  await Promise.all(participants.map((participant) => container.items.upsert(participant)))
}

/**
 * ==================
 * HISTORIAL DE SINCRONIZACIÓN
 * ==================
 */

/**
 * Guarda un registro de sincronización
 */
export async function saveSyncHistory(history: SyncHistory): Promise<void> {
  const container = await getContainer('syncHistory')

  await container.items.create(history)
}

/**
 * Obtiene el historial de sincronizaciones (últimos N registros)
 */
export async function getSyncHistory(limit: number = 20): Promise<SyncHistory[]> {
  const container = await getContainer('syncHistory')

  const { resources } = await container.items
    .query<SyncHistory>({
      query: 'SELECT * FROM c ORDER BY c.timestamp DESC OFFSET 0 LIMIT @limit',
      parameters: [{ name: '@limit', value: limit }],
    })
    .fetchAll()

  return resources
}

/**
 * Obtiene la última sincronización exitosa
 */
export async function getLastSuccessfulSync(): Promise<SyncHistory | null> {
  const container = await getContainer('syncHistory')

  const { resources } = await container.items
    .query<SyncHistory>({
      query: 'SELECT TOP 1 * FROM c WHERE c.status = "success" ORDER BY c.timestamp DESC',
    })
    .fetchAll()

  return resources[0] || null
}

/**
 * Obtiene la última sincronización (cualquier estado)
 */
export async function getLastSyncHistory(): Promise<SyncHistory | null> {
  const container = await getContainer('syncHistory')

  const { resources } = await container.items
    .query<SyncHistory>({
      query: 'SELECT TOP 1 * FROM c ORDER BY c.timestamp DESC',
    })
    .fetchAll()

  return resources[0] || null
}

/**
 * ==================
 * ESTADÍSTICAS
 * ==================
 */

/**
 * Obtiene estadísticas generales de la base de datos
 */
export async function getDatabaseStats() {
  const [resources, lastSync] = await Promise.all([
    getAllResources(),
    getLastSuccessfulSync(),
  ])

  const byType = resources.reduce((acc, resource) => {
    acc[resource.type] = (acc[resource.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const byEnvironment = resources.reduce((acc, resource) => {
    acc[resource.environment] = (acc[resource.environment] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const withGit = resources.filter((r) => r.gitRepository).length

  return {
    totalResources: resources.length,
    byType,
    byEnvironment,
    withGitRepository: withGit,
    withoutGitRepository: resources.length - withGit,
    lastSync: lastSync?.timestamp,
    lastSyncStatus: lastSync?.status,
  }
}
