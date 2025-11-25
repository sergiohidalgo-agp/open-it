/**
 * API Route para recursos de Azure
 * OpenIT Dashboard
 *
 * GET /api/azure/resources
 * Lee recursos SOLO desde Cosmos DB (seguro, sin exponer tokens)
 */

import { NextResponse } from 'next/server'
import { getAllResources, getLastSyncHistory } from '@/lib/db/queries'
import type { AzureResourcesResponse } from '@/lib/types/azure'

export const dynamic = 'force-dynamic'

/**
 * GET /api/azure/resources
 * Lee recursos desde Cosmos DB de forma segura
 */
export async function GET() {
  try {
    // Leer recursos desde Cosmos DB
    const dbResources = await getAllResources()

    // Obtener última sincronización
    const lastSync = await getLastSyncHistory()

    // Obtener lista única de suscripciones
    const subscriptions = Array.from(
      new Set(dbResources.map((r) => r.subscription))
    )

    // Preparar respuesta
    const response: AzureResourcesResponse = {
      success: true,
      data: dbResources,
      metadata: {
        total: dbResources.length,
        subscriptions,
        lastUpdated: lastSync?.timestamp || new Date().toISOString(),
        lastSyncStatus: lastSync?.status,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        {
          success: false,
          data: [],
          error: `Error al leer desde Cosmos DB: ${error.message}`,
        } as AzureResourcesResponse,
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        data: [],
        error: 'Error desconocido al leer recursos',
      } as AzureResourcesResponse,
      { status: 500 }
    )
  }
}
