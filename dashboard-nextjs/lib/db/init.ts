/**
 * Inicialización de Azure Cosmos DB
 * OpenIT Dashboard
 *
 * Crea la base de datos y contenedores necesarios si no existen.
 * Se ejecuta automáticamente al iniciar la aplicación.
 */

import { cosmosClient, cosmosConfig, getContainer } from './cosmos-client'

/**
 * Inicializa todos los contenedores necesarios
 */
export async function initializeDatabase(): Promise<{
  success: boolean
  message: string
  containersCreated: string[]
  error?: string
}> {
  const containersCreated: string[] = []

  try {
    console.log('🚀 Initializing Cosmos DB...')

    // Verificar conexión
    const isConnected = await cosmosClient.isConnected()
    if (!isConnected) {
      throw new Error('Cannot connect to Cosmos DB. Check your connection string.')
    }

    // Obtener base de datos (se crea si no existe)
    const database = await cosmosClient.getDatabase()
    console.log(`📊 Database: ${database.id}`)

    // Crear contenedores
    const containers = Object.keys(cosmosConfig.containers) as Array<
      keyof typeof cosmosConfig.containers
    >

    for (const containerType of containers) {
      try {
        const container = await getContainer(containerType)
        containersCreated.push(container.id)
      } catch (error) {
        console.error(`❌ Failed to create container ${containerType}:`, error)
        throw error
      }
    }

    console.log('✅ Cosmos DB initialized successfully')
    console.log(`📦 Containers ready: ${containersCreated.join(', ')}`)

    return {
      success: true,
      message: 'Database initialized successfully',
      containersCreated,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Database initialization failed:', errorMessage)

    return {
      success: false,
      message: 'Failed to initialize database',
      containersCreated,
      error: errorMessage,
    }
  }
}

/**
 * Verifica el estado de la base de datos
 */
export async function checkDatabaseStatus(): Promise<{
  isConnected: boolean
  databaseExists: boolean
  containers: {
    name: string
    exists: boolean
    itemCount?: number
  }[]
  error?: string
}> {
  try {
    // Verificar conexión
    const isConnected = await cosmosClient.isConnected()

    if (!isConnected) {
      return {
        isConnected: false,
        databaseExists: false,
        containers: [],
        error: 'Cannot connect to Cosmos DB',
      }
    }

    // Obtener base de datos
    const database = await cosmosClient.getDatabase()

    // Verificar contenedores
    const containers = Object.keys(cosmosConfig.containers) as Array<
      keyof typeof cosmosConfig.containers
    >

    const containerStatus = await Promise.all(
      containers.map(async (containerType) => {
        const containerName = cosmosConfig.containers[containerType]

        try {
          const container = await database.container(containerName).read()

          // Obtener conteo aproximado (puede ser costoso, usar con precaución)
          let itemCount: number | undefined

          try {
            const { resources } = await database
              .container(containerName)
              .items.query('SELECT VALUE COUNT(1) FROM c', { maxItemCount: 1 })
              .fetchAll()

            itemCount = resources[0] || 0
          } catch {
            // Si falla, no es crítico
            itemCount = undefined
          }

          return {
            name: containerName,
            exists: !!container.container,
            itemCount,
          }
        } catch {
          return {
            name: containerName,
            exists: false,
          }
        }
      })
    )

    return {
      isConnected: true,
      databaseExists: true,
      containers: containerStatus,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return {
      isConnected: false,
      databaseExists: false,
      containers: [],
      error: errorMessage,
    }
  }
}

/**
 * Limpia todos los datos de la base de datos (cuidado!)
 * Útil para desarrollo y testing
 */
export async function resetDatabase(): Promise<{
  success: boolean
  message: string
  error?: string
}> {
  try {
    console.warn('⚠️  Resetting database...')

    const database = await cosmosClient.getDatabase()

    // Eliminar todos los contenedores
    const containers = Object.values(cosmosConfig.containers)

    for (const containerName of containers) {
      try {
        await database.container(containerName).delete()
        console.log(`🗑️  Deleted container: ${containerName}`)
      } catch (error) {
        // Ignorar si el contenedor no existe
        console.log(`⚠️  Container ${containerName} doesn't exist, skipping`)
      }
    }

    // Recrear contenedores
    const result = await initializeDatabase()

    if (result.success) {
      console.log('✅ Database reset successfully')
      return {
        success: true,
        message: 'Database reset successfully',
      }
    } else {
      throw new Error(result.error || 'Failed to reinitialize database')
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Database reset failed:', errorMessage)

    return {
      success: false,
      message: 'Failed to reset database',
      error: errorMessage,
    }
  }
}
