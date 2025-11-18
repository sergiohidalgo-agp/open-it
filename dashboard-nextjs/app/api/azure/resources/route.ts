/**
 * API Route para recursos de Azure
 * OpenIT Dashboard
 *
 * GET /api/azure/resources
 * Retorna lista de recursos Azure procesados con lógica de negocio
 */

import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import type {
  AzureRawData,
  AzureResourcesResponse,
} from '@/lib/types/azure'
import { transformAzureResources } from '@/lib/azure/transformer'

/**
 * GET /api/azure/resources
 * Lee el archivo azure-raw.json, aplica transformaciones y retorna recursos procesados
 */
export async function GET() {
  try {
    // Ruta al archivo JSON raw
    const dataPath = join(process.cwd(), 'data', 'azure-raw.json')

    // Leer el archivo
    const fileContent = await readFile(dataPath, 'utf-8')
    const rawData: AzureRawData = JSON.parse(fileContent)

    // Transformar recursos con lógica de negocio
    const processedResources = transformAzureResources(
      rawData.resources,
      rawData.subscription
    )

    // Obtener lista única de suscripciones
    const subscriptions = Array.from(
      new Set(processedResources.map((r) => r.subscription))
    )

    // Preparar respuesta
    const response: AzureResourcesResponse = {
      success: true,
      data: processedResources,
      metadata: {
        total: processedResources.length,
        subscriptions,
        lastUpdated: rawData.timestamp,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    // Manejar diferentes tipos de errores
    if (error instanceof Error) {
      // Archivo no encontrado
      if ('code' in error && error.code === 'ENOENT') {
        return NextResponse.json(
          {
            success: false,
            data: [],
            error: 'Archivo de datos no encontrado. Ejecuta el script de recolección: ./scripts/fetch-azure-resources.sh',
          } as AzureResourcesResponse,
          { status: 404 }
        )
      }

      // Error de parseo JSON
      if (error instanceof SyntaxError) {
        return NextResponse.json(
          {
            success: false,
            data: [],
            error: 'Error al parsear datos de Azure. El archivo JSON está corrupto.',
          } as AzureResourcesResponse,
          { status: 500 }
        )
      }

      // Otros errores
      return NextResponse.json(
        {
          success: false,
          data: [],
          error: `Error interno: ${error.message}`,
        } as AzureResourcesResponse,
        { status: 500 }
      )
    }

    // Error desconocido
    return NextResponse.json(
      {
        success: false,
        data: [],
        error: 'Error desconocido al procesar recursos',
      } as AzureResourcesResponse,
      { status: 500 }
    )
  }
}
