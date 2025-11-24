/**
 * Tipos TypeScript para recursos de Azure
 * OpenIT Dashboard - Sistema de gestión de infraestructura Azure
 */

/**
 * Ambiente del recurso basado en la suscripción
 */
export type Environment = 'production' | 'development' | 'unknown'

/**
 * Estado normalizado del recurso
 */
export type ResourceStatus = 'running' | 'stopped' | 'available' | 'creating' | 'failed' | 'unknown'

/**
 * Tipos de servicios Azure soportados en el dashboard
 */
export type AzureServiceType =
  | 'Virtual Machine'
  | 'SQL Database'
  | 'Storage Account'
  | 'Virtual Network'
  | 'Key Vault'
  | 'App Service'
  | 'Cosmos DB'
  | 'CDN Profile'
  | 'Load Balancer'
  | 'Other'

/**
 * Respuesta raw de Azure CLI
 * Basado en la salida de comandos como: az vm list, az webapp list, etc.
 */
export interface AzureResourceRaw {
  id: string
  name: string
  type: string
  location: string
  tags?: Record<string, string> | null
  sku?: {
    name?: string
    tier?: string
    size?: string
    family?: string
    capacity?: number
  } | null
  properties?: {
    provisioningState?: string
    powerState?: string
    state?: string
    hardwareProfile?: {
      vmSize?: string
    }
    // Para App Services y Functions
    creationDate?: string
    // Configuración de deployment source (App Services)
    siteConfig?: {
      scmType?: string
    }
    repositorySiteConfig?: {
      repoUrl?: string
      branch?: string
    }
  } | null
  // Información de deployment source (se obtiene con comando separado)
  deploymentSource?: {
    type?: string
    repoUrl?: string
    branch?: string
    isManualIntegration?: boolean
    isMercurial?: boolean
  } | null
  // Información de Azure DevOps (se obtiene del script enrich-with-devops.sh)
  devopsRepository?: {
    url: string
    branch?: string
    provider?: string
  } | null
  resourceGroup?: string
  kind?: string | null
  managedBy?: string | null
  // Fecha de creación del recurso (si está disponible en tags o metadatos)
  createdTime?: string | null
}

/**
 * Metadata de suscripción de Azure
 */
export interface AzureSubscription {
  subscriptionId: string
  subscriptionName: string
  tenantId: string
  state?: string
}

/**
 * Recurso de Azure procesado y optimizado para el frontend
 */
export interface AzureResource {
  // Información básica
  id: string
  name: string
  type: AzureServiceType
  resourceGroup: string
  location: string
  subscription: string

  // Estado
  status: ResourceStatus
  provisioningState?: string
  powerState?: string

  // SKU y configuración
  sku?: {
    name: string
    tier?: string
  }

  // Tags
  tags: string[]
  rawTags?: Record<string, string>

  // Ambiente (derivado de subscription)
  environment: Environment

  // Link al portal de Azure
  portalUrl: string

  // Metadata adicional
  kind?: string
  managedBy?: string

  // Fecha de creación del recurso
  createdDate?: string

  // Información de repositorio Git asociado
  gitRepository?: {
    url: string
    branch?: string
    provider?: 'github' | 'gitlab' | 'azuredevops' | 'other'
  }
}

/**
 * Respuesta de la API de recursos Azure
 */
export interface AzureResourcesResponse {
  success: boolean
  data: AzureResource[]
  metadata?: {
    total: number
    subscriptions: string[]
    lastUpdated: string
  }
  error?: string
}

/**
 * Datos raw completos de Azure CLI (para el archivo JSON)
 */
export interface AzureRawData {
  subscription: AzureSubscription
  resources: AzureResourceRaw[]
  timestamp: string
}
