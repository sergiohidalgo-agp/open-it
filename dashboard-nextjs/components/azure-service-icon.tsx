import {
  VirtualMachine,
  SQLDatabase,
  StorageAccounts,
  VirtualNetworks,
  KeyVaults,
  AppServicesAppServices,
  AzureCosmosDBDatabases,
  CDNProfilesAppServices,
  LoadBalancers,
} from "@threeveloper/azure-react-icons"
import { TbBrandAzure } from "react-icons/tb"

interface AzureServiceIconProps {
  serviceType: string
  size?: string
  className?: string
}

// Mapeo de tipos de servicio a componentes de iconos oficiales de Azure
// Usando @threeveloper/azure-react-icons - iconos oficiales de Microsoft
const serviceIconComponents: Record<string, React.ComponentType<{ size?: string }>> = {
  "Virtual Machine": VirtualMachine,
  "SQL Database": SQLDatabase,
  "Storage Account": StorageAccounts,
  "Virtual Network": VirtualNetworks,
  "Key Vault": KeyVaults,
  "App Service": AppServicesAppServices,
  "Cosmos DB": AzureCosmosDBDatabases,
  "CDN Profile": CDNProfilesAppServices,
  "Load Balancer": LoadBalancers,
}

export function AzureServiceIcon({ serviceType, size = "24", className = "" }: AzureServiceIconProps) {
  const IconComponent = serviceIconComponents[serviceType]

  if (!IconComponent) {
    // Fallback al logo genérico de Azure
    return <TbBrandAzure className={className} size={size} />
  }

  return (
    <div className={className}>
      <IconComponent size={size} />
    </div>
  )
}
