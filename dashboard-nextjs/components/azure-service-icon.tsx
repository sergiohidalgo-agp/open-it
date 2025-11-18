import Image from "next/image"

interface AzureServiceIconProps {
  serviceType: string
  className?: string
}

// Mapeo de tipos de servicio a iconos oficiales de Azure
// Usando az-icons.com CDN que tiene los iconos oficiales actualizados (Nov 2025)
const serviceIconMap: Record<string, string> = {
  "Virtual Machine": "https://az-icons.com/icons/10021-icon-service-Virtual-Machine.svg",
  "SQL Database": "https://az-icons.com/icons/10130-icon-service-SQL-Database.svg",
  "Storage Account": "https://az-icons.com/icons/10086-icon-service-Storage-Accounts.svg",
  "Virtual Network": "https://az-icons.com/icons/10061-icon-service-Virtual-Networks.svg",
  "Key Vault": "https://az-icons.com/icons/10245-icon-service-Key-Vaults.svg",
  "App Service": "https://az-icons.com/icons/10035-icon-service-App-Services.svg",
  "Cosmos DB": "https://az-icons.com/icons/10121-icon-service-Azure-Cosmos-DB.svg",
  "CDN Profile": "https://az-icons.com/icons/10261-icon-service-CDN-Profiles.svg",
  "Load Balancer": "https://az-icons.com/icons/10062-icon-service-Load-Balancers.svg",
}

// Fallback icon genérico de Azure
const defaultIcon = "https://az-icons.com/icons/00004-icon-service-Azure.svg"

export function AzureServiceIcon({ serviceType, className = "h-6 w-6" }: AzureServiceIconProps) {
  const iconUrl = serviceIconMap[serviceType] || defaultIcon

  return (
    <div className={`relative ${className}`}>
      <Image
        src={iconUrl}
        alt={`${serviceType} icon`}
        width={24}
        height={24}
        className="object-contain"
        unoptimized // CDN externo, no optimizar
      />
    </div>
  )
}
