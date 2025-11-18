/**
 * Funciones de transformación para recursos de Azure
 * OpenIT Dashboard
 */

import type {
  AzureResourceRaw,
  AzureResource,
  AzureSubscription,
  Environment,
  ResourceStatus,
  AzureServiceType,
} from '@/lib/types/azure'

/**
 * Determina el ambiente basado en el nombre de la suscripción
 * Regla de negocio: si contiene "cl-azure-prd" → production, resto → development
 */
export function determineEnvironment(subscriptionName: string): Environment {
  const lowerName = subscriptionName.toLowerCase()

  if (lowerName.includes('cl-azure-prd') || lowerName.includes('prd') || lowerName.includes('prod')) {
    return 'production'
  }

  if (lowerName.includes('dev') || lowerName.includes('development')) {
    return 'development'
  }

  return 'unknown'
}

/**
 * Normaliza el estado del recurso a partir de múltiples campos posibles
 */
export function normalizeStatus(raw: AzureResourceRaw): ResourceStatus {
  const props = raw.properties || {}

  // Para VMs, verificar powerState primero
  if (props.powerState) {
    const powerState = props.powerState.toLowerCase()
    if (powerState.includes('running')) return 'running'
    if (powerState.includes('stopped') || powerState.includes('deallocat')) return 'stopped'
  }

  // Para App Services y otros, verificar state
  if (props.state) {
    const state = props.state.toLowerCase()
    if (state === 'running') return 'running'
    if (state === 'stopped') return 'stopped'
  }

  // Verificar provisioningState
  if (props.provisioningState) {
    const provisioningState = props.provisioningState.toLowerCase()
    if (provisioningState === 'succeeded') return 'available'
    if (provisioningState === 'failed') return 'failed'
    if (provisioningState === 'creating' || provisioningState === 'updating') return 'creating'
  }

  return 'unknown'
}

/**
 * Mapea el tipo de recurso de Azure al tipo del frontend
 */
export function mapResourceType(azureType: string): AzureServiceType {
  const typeMap: Record<string, AzureServiceType> = {
    'Microsoft.Compute/virtualMachines': 'Virtual Machine',
    'Microsoft.Sql/servers/databases': 'SQL Database',
    'Microsoft.Storage/storageAccounts': 'Storage Account',
    'Microsoft.Network/virtualNetworks': 'Virtual Network',
    'Microsoft.KeyVault/vaults': 'Key Vault',
    'Microsoft.Web/sites': 'App Service',
    'Microsoft.DocumentDB/databaseAccounts': 'Cosmos DB',
    'Microsoft.Cdn/profiles': 'CDN Profile',
    'Microsoft.Network/loadBalancers': 'Load Balancer',
  }

  return typeMap[azureType] || 'Other'
}

/**
 * Genera el URL del portal de Azure para un recurso
 * Formato: https://portal.azure.com/#@{TENANT}/resource{RESOURCE_ID}
 */
export function generatePortalUrl(resourceId: string, tenantId: string): string {
  return `https://portal.azure.com/#@${tenantId}/resource${resourceId}`
}

/**
 * Extrae el resource group del resource ID
 * Formato de ID: /subscriptions/{guid}/resourceGroups/{rg}/providers/{provider}/{type}/{name}
 */
export function extractResourceGroup(resourceId: string): string {
  const match = resourceId.match(/\/resourceGroups\/([^\/]+)/i)
  return match ? match[1] : 'unknown'
}

/**
 * Convierte tags de objeto a array de strings para facilitar filtrado
 * Formato: ["key:value", "key2:value2"]
 */
export function tagsToArray(tags?: Record<string, string> | null): string[] {
  if (!tags) return []
  return Object.entries(tags).map(([key, value]) => `${key}:${value}`)
}

/**
 * Extrae el SKU name de diferentes fuentes posibles
 */
function extractSkuName(raw: AzureResourceRaw): string | undefined {
  // Primero intentar desde sku.name
  if (raw.sku?.name) {
    return raw.sku.name
  }

  // Para VMs, intentar obtener desde properties.hardwareProfile.vmSize
  if (raw.properties?.hardwareProfile?.vmSize) {
    return raw.properties.hardwareProfile.vmSize
  }

  return undefined
}

/**
 * Transforma un recurso raw de Azure a formato procesado
 */
export function transformAzureResource(
  raw: AzureResourceRaw,
  subscription: AzureSubscription
): AzureResource {
  const resourceGroup = raw.resourceGroup || extractResourceGroup(raw.id)
  const environment = determineEnvironment(subscription.subscriptionName)
  const status = normalizeStatus(raw)
  const type = mapResourceType(raw.type)
  const portalUrl = generatePortalUrl(raw.id, subscription.tenantId)
  const skuName = extractSkuName(raw)

  return {
    id: raw.id,
    name: raw.name,
    type,
    resourceGroup,
    location: raw.location,
    subscription: subscription.subscriptionName,
    status,
    provisioningState: raw.properties?.provisioningState,
    powerState: raw.properties?.powerState || raw.properties?.state,
    sku: skuName
      ? {
          name: skuName,
          tier: raw.sku?.tier,
        }
      : undefined,
    tags: tagsToArray(raw.tags),
    rawTags: raw.tags || undefined,
    environment,
    portalUrl,
    kind: raw.kind || undefined,
    managedBy: raw.managedBy || undefined,
  }
}

/**
 * Transforma un array de recursos raw
 */
export function transformAzureResources(
  rawResources: AzureResourceRaw[],
  subscription: AzureSubscription
): AzureResource[] {
  return rawResources.map((raw) => transformAzureResource(raw, subscription))
}
