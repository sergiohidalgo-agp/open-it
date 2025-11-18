"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ExternalLink } from "lucide-react"
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
                <TableHead className="h-10 px-4 font-medium text-xs uppercase text-muted-foreground">Estado</TableHead>
                <TableHead className="h-10 px-4 font-medium text-xs uppercase text-muted-foreground">SKU</TableHead>
                <TableHead className="h-10 px-4 text-right font-medium text-xs uppercase text-muted-foreground">Portal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resources.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
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
                            <div className="flex-shrink-0">
                              <AzureServiceIcon serviceType={resource.type} size="20" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <p className="text-xs">{resource.type}</p>
                          </TooltipContent>
                        </Tooltip>
                        <span className="font-medium text-sm truncate">{resource.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      <span className="text-sm text-muted-foreground">{resource.resourceGroup}</span>
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      <Badge
                        variant={resource.environment === 'production' ? 'default' : 'secondary'}
                        className={`text-xs ${resource.environment === 'production' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                      >
                        {resource.environment === 'production' ? 'Prod' : 'Dev'}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      <span className="text-sm text-muted-foreground">{resource.location}</span>
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      <Badge
                        variant={getStatusVariant(resource.status)}
                        className={`text-xs ${resource.status === "running" ? "bg-green-600 hover:bg-green-700" : ""}`}
                      >
                        {resource.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      <span className="text-xs text-muted-foreground font-mono">
                        {resource.sku?.name || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-2 text-right">
                      <a
                        href={resource.portalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Ver
                        <ExternalLink className="h-3 w-3" />
                      </a>
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
