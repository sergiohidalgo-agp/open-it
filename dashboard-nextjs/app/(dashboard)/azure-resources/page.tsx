"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Download, RefreshCw, ExternalLink } from "lucide-react"
import { AzureServiceIcon } from "@/components/azure-service-icon"
import { TbBrandAzure } from "react-icons/tb"
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
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [resourceTypeFilter, setResourceTypeFilter] = useState("all")
  const [subscriptionFilter, setSubscriptionFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [locationFilter, setLocationFilter] = useState("all")
  const [environmentFilter, setEnvironmentFilter] = useState("all")

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
        setLastUpdated(data.metadata?.lastUpdated || null)
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

  // Filtrar recursos
  const filteredResources = resources.filter((resource) => {
    const matchesSearch = resource.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.resourceGroup.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = resourceTypeFilter === "all" || resource.type === resourceTypeFilter
    const matchesSubscription = subscriptionFilter === "all" || resource.subscription === subscriptionFilter
    const matchesStatus = statusFilter === "all" || resource.status === statusFilter
    const matchesLocation = locationFilter === "all" || resource.location === locationFilter
    const matchesEnvironment = environmentFilter === "all" || resource.environment === environmentFilter

    return matchesSearch && matchesType && matchesSubscription && matchesStatus && matchesLocation && matchesEnvironment
  })

  // Obtener valores únicos para filtros
  const uniqueTypes = Array.from(new Set(resources.map(r => r.type)))
  const uniqueSubscriptions = Array.from(new Set(resources.map(r => r.subscription)))
  const uniqueStatuses = Array.from(new Set(resources.map(r => r.status)))
  const uniqueLocations = Array.from(new Set(resources.map(r => r.location)))
  const uniqueEnvironments = Array.from(new Set(resources.map(r => r.environment)))

  return (
    <div className="flex flex-1 flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recursos de Azure</CardTitle>
              <CardDescription>
                Gestiona y visualiza todos tus recursos en la nube de Azure
                {lastUpdated && (
                  <span className="block text-xs mt-1">
                    Última actualización: {new Date(lastUpdated).toLocaleString('es-CL')}
                  </span>
                )}
              </CardDescription>
            </div>
            {loading && (
              <Badge variant="outline" className="animate-pulse">
                Cargando...
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Barra de búsqueda y acciones */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar recursos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchResources}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Actualizar
                </Button>
                <Button variant="outline" size="sm" disabled={loading}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </div>

            {/* Mensaje de error */}
            {error && (
              <div className="p-4 border border-red-200 bg-red-50 rounded-md">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Filtros */}
            <div className="grid gap-4 md:grid-cols-5">
              <Select value={resourceTypeFilter} onValueChange={setResourceTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de recurso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  {uniqueTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={subscriptionFilter} onValueChange={setSubscriptionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Suscripción" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las suscripciones</SelectItem>
                  {uniqueSubscriptions.map((sub) => (
                    <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  {uniqueStatuses.map((status) => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Locación" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las locaciones</SelectItem>
                  {uniqueLocations.map((location) => (
                    <SelectItem key={location} value={location}>{location}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={environmentFilter} onValueChange={setEnvironmentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Ambiente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los ambientes</SelectItem>
                  {uniqueEnvironments.map((env) => (
                    <SelectItem key={env} value={env}>
                      {env === 'production' ? 'Producción' : env === 'development' ? 'Desarrollo' : env}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tabla de recursos */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recurso</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Grupo de Recursos</TableHead>
                    <TableHead>Ambiente</TableHead>
                    <TableHead>Locación</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Portal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResources.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        {loading ? 'Cargando recursos...' : error ? 'Error al cargar recursos' : 'No se encontraron recursos con los filtros seleccionados'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredResources.map((resource) => (
                      <TableRow key={resource.id}>
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2">
                            <AzureServiceIcon serviceType={resource.type} size="24" />
                            <span className="font-medium text-sm">{resource.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="text-sm text-muted-foreground">{resource.type}</span>
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="text-sm">{resource.resourceGroup}</span>
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge
                            variant={resource.environment === 'production' ? 'default' : 'secondary'}
                            className={resource.environment === 'production' ? 'bg-red-600 hover:bg-red-700' : ''}
                          >
                            {resource.environment === 'production' ? 'Prod' : 'Dev'}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="text-sm text-muted-foreground">{resource.location}</span>
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge
                            variant={getStatusVariant(resource.status)}
                            className={resource.status === "running" ? "bg-green-500 hover:bg-green-600" : ""}
                          >
                            {resource.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="text-sm text-muted-foreground">
                            {resource.sku?.name || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right py-3">
                          <a
                            href={resource.portalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline"
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
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
