"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { GitBranch, Calendar } from "lucide-react"
import { AzureServiceIcon } from "@/components/azure-service-icon"
import type { AzureResource, AzureResourcesResponse, ResourceStatus } from "@/lib/types/azure"

const getStatusVariant = (status: ResourceStatus): "default" | "secondary" | "destructive" => {
  switch (status) {
    case "running":
      return "default"
    case "available":
      return "default"
    case "stopped":
      return "secondary"
    case "failed":
      return "destructive"
    default:
      return "secondary"
  }
}

const formatLocation = (location: string): string => {
  // Mapa de locaciones conocidas de Azure
  const locationMap: Record<string, string> = {
    'eastus': 'East US',
    'eastus2': 'East US 2',
    'westus': 'West US',
    'westus2': 'West US 2',
    'westus3': 'West US 3',
    'centralus': 'Central US',
    'northcentralus': 'North Central US',
    'southcentralus': 'South Central US',
    'westcentralus': 'West Central US',
    'northeurope': 'North Europe',
    'westeurope': 'West Europe',
    'eastasia': 'East Asia',
    'southeastasia': 'Southeast Asia',
    'japaneast': 'Japan East',
    'japanwest': 'Japan West',
    'brazilsouth': 'Brazil South',
    'australiaeast': 'Australia East',
    'australiasoutheast': 'Australia Southeast',
    'southindia': 'South India',
    'centralindia': 'Central India',
    'westindia': 'West India',
    'canadacentral': 'Canada Central',
    'canadaeast': 'Canada East',
    'uksouth': 'UK South',
    'ukwest': 'UK West',
    'koreacentral': 'Korea Central',
    'koreasouth': 'Korea South',
    'francecentral': 'France Central',
    'francesouth': 'France South',
    'australiacentral': 'Australia Central',
    'australiacentral2': 'Australia Central 2',
    'uaecentral': 'UAE Central',
    'uaenorth': 'UAE North',
    'southafricanorth': 'South Africa North',
    'southafricawest': 'South Africa West',
    'switzerlandnorth': 'Switzerland North',
    'switzerlandwest': 'Switzerland West',
    'germanynorth': 'Germany North',
    'germanywestcentral': 'Germany West Central',
    'norwayeast': 'Norway East',
    'norwaywest': 'Norway West',
  }

  return locationMap[location.toLowerCase()] || location
}

const formatDate = (dateString?: string): string => {
  if (!dateString) return '-'

  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return '-'
  }
}

export default function AzureResourcesPage() {
  const [resources, setResources] = useState<AzureResource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cargar recursos desde la API
  useEffect(() => {
    fetchResources()
  }, [])

  const fetchResources = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/azure/resources')
      const data: AzureResourcesResponse = await response.json()

      if (data.success) {
        setResources(data.data)
      } else {
        setError(data.error || 'Error al cargar recursos')
      }
    } catch (err) {
      setError('Error de conexión al cargar recursos')
      console.error('Error fetching resources:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Mensaje de error */}
      {error && (
        <div className="mb-4 p-4 border border-red-200 bg-red-50 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Tabla de recursos */}
      <TooltipProvider>
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b">
                <TableHead className="h-10 px-4 font-medium text-xs uppercase text-muted-foreground">Recurso</TableHead>
                <TableHead className="h-10 px-4 font-medium text-xs uppercase text-muted-foreground">Resource Group</TableHead>
                <TableHead className="h-10 px-4 font-medium text-xs uppercase text-muted-foreground">Ambiente</TableHead>
                <TableHead className="h-10 px-4 font-medium text-xs uppercase text-muted-foreground">Locación</TableHead>
                <TableHead className="h-10 px-4 font-medium text-xs uppercase text-muted-foreground">Creación</TableHead>
                <TableHead className="h-10 px-4 text-center font-medium text-xs uppercase text-muted-foreground">Git</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resources.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    {loading ? 'Cargando recursos...' : error ? 'Error al cargar recursos' : 'No hay recursos disponibles'}
                  </TableCell>
                </TableRow>
              ) : (
                resources.map((resource) => (
                  <TableRow
                    key={resource.id}
                    className="group hover:bg-accent/50 transition-colors cursor-pointer border-b last:border-0"
                  >
                    <TableCell className="px-4 py-2">
                      <div className="flex items-center gap-3">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <a
                              href={resource.portalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-shrink-0 hover:opacity-70 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <AzureServiceIcon serviceType={resource.type} size="20" />
                            </a>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <p className="text-xs">{resource.type}</p>
                          </TooltipContent>
                        </Tooltip>
                        <div className="marquee-container">
                          <span
                            className="marquee-text font-medium text-sm"
                            data-long={resource.name.length > 32 ? "true" : "false"}
                          >
                            {resource.name}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      <div className="marquee-container">
                        <span
                          className="marquee-text text-sm text-muted-foreground"
                          data-long={resource.resourceGroup.length > 32 ? "true" : "false"}
                        >
                          {resource.resourceGroup}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      <Badge
                        variant={resource.environment === 'production' ? 'default' : 'secondary'}
                        className={`text-xs ${resource.environment === 'production' ? 'bg-orange-500 hover:bg-orange-600 text-white' : ''}`}
                      >
                        {resource.environment === 'production' ? 'Prod' : 'Dev'}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      <span className="text-sm text-muted-foreground">{formatLocation(resource.location)}</span>
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {formatDate(resource.createdDate)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-2 text-center">
                      {resource.gitRepository ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <a
                              href={resource.gitRepository.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center hover:opacity-70 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <GitBranch className="h-4 w-4 text-blue-600" />
                            </a>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">{resource.gitRepository.provider || 'Git'}</p>
                            {resource.gitRepository.branch && (
                              <p className="text-xs text-muted-foreground">Branch: {resource.gitRepository.branch}</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-muted-foreground/30">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </TooltipProvider>
    </div>
  )
}
