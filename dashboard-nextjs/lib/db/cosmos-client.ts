/**
 * Cliente Singleton de Azure Cosmos DB
 * OpenIT Dashboard
 *
 * Proporciona acceso centralizado a la base de datos Cosmos DB
 * con inicialización automática y manejo de conexiones.
 */

import { CosmosClient, Database } from '@azure/cosmos'

/**
 * Parsea la connection string de Cosmos DB
 */
function parseCosmosConnectionString(connectionString: string): {
  endpoint: string
  key: string
} {
  const endpointMatch = connectionString.match(/AccountEndpoint=([^;]+)/)
  const keyMatch = connectionString.match(/AccountKey=([^;]+)/)

  if (!endpointMatch || !keyMatch) {
    throw new Error(
      'Invalid Cosmos DB connection string format. Expected: AccountEndpoint=...;AccountKey=...;'
    )
  }

  return {
    endpoint: endpointMatch[1],
    key: keyMatch[1],
  }
}

/**
 * Configuración de Cosmos DB
 */
export const cosmosConfig = {
  connectionString: process.env.AZURE_COSMOSDB_OPENIT || '',
  databaseName: process.env.COSMOS_DATABASE_NAME || 'openit',
  logLevel: (process.env.COSMOS_LOG_LEVEL || 'warn') as 'error' | 'warn' | 'info' | 'debug',

  // Contenedores
  containers: {
    resources: 'azure-resources',
    participants: 'project-participants',
    syncHistory: 'sync-history',
    appConfig: 'app-config',
  },

  // Partition keys
  partitionKeys: {
    resources: '/type',
    participants: '/projectId',
    syncHistory: '/date',
    appConfig: '/type',
  },
}

/**
 * Cliente singleton de Cosmos DB
 */
class CosmosDBClient {
  private static instance: CosmosDBClient
  private client: CosmosClient | null = null
  private database: Database | null = null
  private initialized = false

  private constructor() {}

  /**
   * Obtiene la instancia singleton del cliente
   */
  static getInstance(): CosmosDBClient {
    if (!CosmosDBClient.instance) {
      CosmosDBClient.instance = new CosmosDBClient()
    }
    return CosmosDBClient.instance
  }

  /**
   * Inicializa el cliente de Cosmos DB
   */
  private async initializeClient(): Promise<void> {
    if (this.initialized) return

    const { connectionString, databaseName } = cosmosConfig

    if (!connectionString) {
      throw new Error(
        'AZURE_COSMOSDB_OPENIT environment variable is not set. Please configure your Cosmos DB connection string.'
      )
    }

    try {
      const { endpoint, key } = parseCosmosConnectionString(connectionString)

      this.client = new CosmosClient({
        endpoint,
        key,
      })

      // Verificar conexión obteniendo account info
      await this.client.getDatabaseAccount()

      this.initialized = true
      console.log(`✅ Cosmos DB client initialized: ${endpoint}`)
    } catch (error) {
      console.error('❌ Failed to initialize Cosmos DB client:', error)
      throw error
    }
  }

  /**
   * Obtiene el cliente de Cosmos DB
   */
  async getClient(): Promise<CosmosClient> {
    if (!this.client) {
      await this.initializeClient()
    }

    if (!this.client) {
      throw new Error('Cosmos DB client is not initialized')
    }

    return this.client
  }

  /**
   * Obtiene la base de datos (crea si no existe)
   */
  async getDatabase(): Promise<Database> {
    if (this.database) {
      return this.database
    }

    const client = await this.getClient()
    const { databaseName } = cosmosConfig

    // Crear base de datos si no existe
    const { database } = await client.databases.createIfNotExists({
      id: databaseName,
    })

    this.database = database
    console.log(`✅ Database ready: ${databaseName}`)

    return database
  }

  /**
   * Obtiene o crea un contenedor
   */
  async getContainer(containerName: string, partitionKey: string) {
    const database = await this.getDatabase()

    // Crear contenedor si no existe
    const { container } = await database.containers.createIfNotExists({
      id: containerName,
      partitionKey: {
        paths: [partitionKey],
        version: 2, // Usar version 2 para mejor performance
      },
      // Indexing policy optimizado
      indexingPolicy: {
        automatic: true,
        indexingMode: 'consistent',
      },
    })

    console.log(`✅ Container ready: ${containerName}`)
    return container
  }

  /**
   * Verifica si el cliente está conectado
   */
  async isConnected(): Promise<boolean> {
    try {
      if (!this.client) {
        await this.initializeClient()
      }

      if (!this.client) return false

      await this.client.getDatabaseAccount()
      return true
    } catch {
      return false
    }
  }

  /**
   * Resetea la instancia (útil para testing)
   */
  reset(): void {
    this.client = null
    this.database = null
    this.initialized = false
  }
}

/**
 * Instancia global del cliente de Cosmos DB
 */
export const cosmosClient = CosmosDBClient.getInstance()

/**
 * Helper para obtener un contenedor específico
 */
export async function getContainer(containerType: keyof typeof cosmosConfig.containers) {
  const containerName = cosmosConfig.containers[containerType]
  const partitionKey = cosmosConfig.partitionKeys[containerType]

  return await cosmosClient.getContainer(containerName, partitionKey)
}
