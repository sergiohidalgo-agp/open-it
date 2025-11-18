"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Download, RefreshCw, Server, Database, HardDrive, Network } from "lucide-react"
import { AzureServiceIcon } from "@/components/azure-service-icon"
import { TbBrandAzure } from "react-icons/tb"

// Mock data de recursos Azure
const mockAzureResources = [
  {
    id: "1",
    name: "srv-web-prod-01",
    type: "Virtual Machine",
    resourceGroup: "rg-production",
    location: "East US",
    status: "Running",
    subscription: "Production",
    tags: ["web", "production"],
    cost: "$245.50",
  },
  {
    id: "2",
    name: "sql-db-main",
    type: "SQL Database",
    resourceGroup: "rg-databases",
    location: "East US",
    status: "Running",
    subscription: "Production",
    tags: ["database", "production"],
    cost: "$189.00",
  },
  {
    id: "3",
    name: "storage-backup-01",
    type: "Storage Account",
    resourceGroup: "rg-storage",
    location: "West US",
    status: "Available",
    subscription: "Backup",
    tags: ["backup", "storage"],
    cost: "$45.30",
  },
  {
    id: "4",
    name: "vnet-main",
    type: "Virtual Network",
    resourceGroup: "rg-network",
    location: "East US",
    status: "Available",
    subscription: "Infrastructure",
    tags: ["network", "core"],
    cost: "$12.00",
  },
  {
    id: "5",
    name: "kv-secrets-prod",
    type: "Key Vault",
    resourceGroup: "rg-security",
    location: "East US",
    status: "Available",
    subscription: "Security",
    tags: ["security", "secrets"],
    cost: "$8.50",
  },
  {
    id: "6",
    name: "app-service-api",
    type: "App Service",
    resourceGroup: "rg-production",
    location: "East US",
    status: "Running",
    subscription: "Production",
    tags: ["api", "production"],
    cost: "$156.00",
  },
  {
    id: "7",
    name: "srv-app-dev-01",
    type: "Virtual Machine",
    resourceGroup: "rg-development",
    location: "Central US",
    status: "Stopped",
    subscription: "Development",
    tags: ["app", "development"],
    cost: "$0.00",
  },
  {
    id: "8",
    name: "cosmos-db-prod",
    type: "Cosmos DB",
    resourceGroup: "rg-databases",
    location: "East US",
    status: "Running",
    subscription: "Production",
    tags: ["nosql", "production"],
    cost: "$312.75",
  },
  {
    id: "9",
    name: "cdn-frontend",
    type: "CDN Profile",
    resourceGroup: "rg-production",
    location: "Global",
    status: "Running",
    subscription: "Production",
    tags: ["cdn", "frontend"],
    cost: "$67.20",
  },
  {
    id: "10",
    name: "lb-main-prod",
    type: "Load Balancer",
    resourceGroup: "rg-network",
    location: "East US",
    status: "Available",
    subscription: "Production",
    tags: ["network", "loadbalancer"],
    cost: "$34.50",
  },
]


const getStatusVariant = (status: string): "default" | "secondary" | "destructive" => {
  switch (status) {
    case "Running":
      return "default"
    case "Available":
      return "default"
    case "Stopped":
      return "secondary"
    default:
      return "secondary"
  }
}

export default function AzureResourcesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [resourceTypeFilter, setResourceTypeFilter] = useState("all")
  const [subscriptionFilter, setSubscriptionFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [locationFilter, setLocationFilter] = useState("all")

  // Filtrar recursos
  const filteredResources = mockAzureResources.filter((resource) => {
    const matchesSearch = resource.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.resourceGroup.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = resourceTypeFilter === "all" || resource.type === resourceTypeFilter
    const matchesSubscription = subscriptionFilter === "all" || resource.subscription === subscriptionFilter
    const matchesStatus = statusFilter === "all" || resource.status === statusFilter
    const matchesLocation = locationFilter === "all" || resource.location === locationFilter

    return matchesSearch && matchesType && matchesSubscription && matchesStatus && matchesLocation
  })

  // Obtener valores únicos para filtros
  const uniqueTypes = Array.from(new Set(mockAzureResources.map(r => r.type)))
  const uniqueSubscriptions = Array.from(new Set(mockAzureResources.map(r => r.subscription)))
  const uniqueStatuses = Array.from(new Set(mockAzureResources.map(r => r.status)))
  const uniqueLocations = Array.from(new Set(mockAzureResources.map(r => r.location)))

  // Calcular totales
  const totalCost = filteredResources.reduce((sum, r) => {
    return sum + parseFloat(r.cost.replace('$', '').replace(',', ''))
  }, 0)

  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* Header con métricas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Recursos</CardTitle>
            <TbBrandAzure className="h-4 w-4 text-[#0078D4]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredResources.length}</div>
            <p className="text-xs text-muted-foreground">
              de {mockAzureResources.length} recursos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Costo Mensual</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              recursos filtrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Ejecución</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredResources.filter(r => r.status === "Running").length}
            </div>
            <p className="text-xs text-muted-foreground">
              recursos activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Locaciones</CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(filteredResources.map(r => r.location)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              regiones Azure
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros y búsqueda */}
      <Card>
        <CardHeader>
          <CardTitle>Recursos de Azure</CardTitle>
          <CardDescription>
            Gestiona y visualiza todos tus recursos en la nube de Azure
          </CardDescription>
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
                <Button variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualizar
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </div>

            {/* Filtros */}
            <div className="grid gap-4 md:grid-cols-4">
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
            </div>

            {/* Tabla de recursos */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recurso</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Grupo de Recursos</TableHead>
                    <TableHead>Suscripción</TableHead>
                    <TableHead>Locación</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Costo/mes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResources.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No se encontraron recursos con los filtros seleccionados
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredResources.map((resource) => (
                      <TableRow key={resource.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <AzureServiceIcon serviceType={resource.type} size="32" />
                            <div>
                              <div className="font-medium">{resource.name}</div>
                              <div className="flex gap-1 mt-1">
                                {resource.tags.map((tag) => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">{resource.type}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{resource.resourceGroup}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{resource.subscription}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">{resource.location}</span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={getStatusVariant(resource.status)}
                            className={resource.status === "Running" ? "bg-green-500 hover:bg-green-600" : ""}
                          >
                            {resource.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {resource.cost}
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
