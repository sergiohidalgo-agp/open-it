# Azure CLI - Comandos para OpenIT Dashboard

## Resumen Ejecutivo

Para obtener la máxima información de recursos Azure, se recomienda **usar comandos específicos por tipo de recurso** en lugar del comando genérico `az resource list`. Cada comando especializado retorna propiedades específicas y completas del tipo de recurso.

---

## 📋 Comando General (Baseline)

### Listar todos los recursos
```bash
az resource list --output json
```

**Campos disponibles:**
- `id` - Resource ID completo
- `name` - Nombre del recurso
- `type` - Tipo de recurso (ej: Microsoft.Compute/virtualMachines)
- `resourceGroup` - Grupo de recursos
- `location` - Región de Azure
- `provisioningState` - Estado (Succeeded, Failed, etc.)
- `tags` - Etiquetas del recurso
- `sku` - SKU (limitado, solo algunos recursos)
- `kind` - Tipo específico (limitado)
- `createdTime` - Fecha de creación
- `changedTime` - Última modificación
- `managedBy` - Recurso que lo administra (si aplica)

**Limitación:** No incluye propiedades específicas como tamaño de VM, estado de ejecución, configuración de red, etc.

---

## 🎯 Comandos Específicos por Tipo de Recurso

### 1. Virtual Machines (VMs)
```bash
az vm list --output json --show-details
```

**Información adicional vs comando general:**
- `powerState` - Estado actual (Running, Stopped, Deallocated)
- `hardwareProfile.vmSize` - Tamaño de VM (Standard_E2s_v3, etc.)
- `storageProfile` - Configuración de discos (OS disk, data disks)
- `networkProfile` - Interfaces de red asociadas
- `osProfile` - Sistema operativo y configuración
- `publicIps` - IPs públicas (con --show-details)
- `privateIps` - IPs privadas (con --show-details)
- `fqdns` - DNS públicos

**Por resource group:**
```bash
az vm list -g RESOURCE_GROUP_NAME --output json --show-details
```

### 2. App Services
```bash
az webapp list --output json
```

**Información adicional:**
- `state` - Estado (Running, Stopped)
- `defaultHostName` - URL del app service
- `enabledHostNames` - Todos los hostnames
- `repositorySiteName` - Nombre del repositorio
- `usageState` - Estado de uso
- `serverFarmId` - App Service Plan asociado
- `httpsOnly` - Si requiere HTTPS
- `siteConfig` - Configuración detallada

**Detalles completos de un App Service:**
```bash
az webapp show -g RESOURCE_GROUP_NAME -n APP_NAME --output json
```

### 3. SQL Databases
```bash
az sql db list --server SERVER_NAME --resource-group RESOURCE_GROUP_NAME --output json
```

**Información adicional:**
- `status` - Estado de la BD (Online, Offline, etc.)
- `currentServiceObjectiveName` - Tier actual (S0, P1, etc.)
- `requestedServiceObjectiveName` - Tier solicitado
- `maxSizeBytes` - Tamaño máximo
- `collation` - Collation de la BD
- `creationDate` - Fecha de creación
- `earliestRestoreDate` - Punto de restauración más antiguo
- `zoneRedundant` - Si tiene redundancia de zona

**Listar todos los SQL Servers primero:**
```bash
az sql server list --output json
```

### 4. Storage Accounts
```bash
az storage account list --output json
```

**Información adicional:**
- `accessTier` - Tier de acceso (Hot, Cool, Archive)
- `kind` - Tipo (StorageV2, BlobStorage, etc.)
- `primaryEndpoints` - Endpoints de blob, file, queue, table
- `primaryLocation` - Ubicación primaria
- `secondaryLocation` - Ubicación secundaria (si aplica)
- `statusOfPrimary` - Estado del storage primario
- `enableHttpsTrafficOnly` - Si solo acepta HTTPS
- `minimumTlsVersion` - Versión mínima de TLS
- `allowBlobPublicAccess` - Si permite acceso público a blobs
- `networkRuleSet` - Reglas de firewall y red

**Detalles de uso y métricas:**
```bash
az storage account show-usage --location LOCATION --output json
```

### 5. Azure Cosmos DB
```bash
az cosmosdb list --output json
```

**Información adicional:**
- `kind` - Tipo de API (GlobalDocumentDB, MongoDB, Cassandra)
- `documentEndpoint` - Endpoint del servicio
- `writeLocations` - Ubicaciones de escritura
- `readLocations` - Ubicaciones de lectura
- `consistencyPolicy` - Política de consistencia
- `enableAutomaticFailover` - Failover automático
- `enableMultipleWriteLocations` - Escritura multi-región

**Listar databases de un Cosmos DB:**
```bash
az cosmosdb sql database list --account-name ACCOUNT_NAME -g RESOURCE_GROUP_NAME --output json
```

### 6. Virtual Networks (VNets)
```bash
az network vnet list --output json
```

**Información adicional:**
- `addressSpace.addressPrefixes` - Rangos de IP
- `subnets` - Subredes configuradas
- `dhcpOptions` - Configuración DHCP
- `enableDdosProtection` - Protección DDoS
- `enableVmProtection` - Protección de VMs

**Detalles de subnets:**
```bash
az network vnet subnet list --vnet-name VNET_NAME -g RESOURCE_GROUP_NAME --output json
```

### 7. Load Balancers
```bash
az network lb list --output json
```

**Información adicional:**
- `frontendIPConfigurations` - IPs frontend
- `backendAddressPools` - Pools de backend
- `loadBalancingRules` - Reglas de balanceo
- `probes` - Health probes
- `inboundNatRules` - Reglas NAT entrantes

### 8. Key Vaults
```bash
az keyvault list --output json
```

**Información adicional:**
- `properties.vaultUri` - URI del vault
- `properties.enabledForDeployment` - Habilitado para deployment
- `properties.enabledForTemplateDeployment` - Habilitado para templates
- `properties.enableSoftDelete` - Soft delete habilitado
- `properties.enablePurgeProtection` - Protección contra purga
- `properties.sku` - SKU (Standard, Premium)
- `properties.networkAcls` - Reglas de red

### 9. CDN Profiles
```bash
az cdn profile list --output json
```

**Información adicional:**
- `sku.name` - SKU del CDN (Standard_Microsoft, Premium_Verizon, etc.)
- `resourceState` - Estado del recurso

**Endpoints del CDN:**
```bash
az cdn endpoint list --profile-name PROFILE_NAME -g RESOURCE_GROUP_NAME --output json
```

---

## 💰 Comandos de Costos

### Consumo actual (último mes)
```bash
az consumption usage list \
  --start-date 2025-10-01 \
  --end-date 2025-10-31 \
  --output json \
  --include-meter-details \
  --include-additional-properties
```

**Campos importantes:**
- `pretaxCost` - Costo antes de impuestos
- `usageStart` / `usageEnd` - Período de uso
- `instanceName` - Nombre del recurso
- `instanceLocation` - Ubicación
- `meterDetails` - Detalles del medidor (qué se está cobrando)
- `quantity` - Cantidad consumida
- `unitPrice` - Precio por unidad

### Budget y alertas
```bash
az consumption budget list --output json
```

---

## 🔄 Estrategia Recomendada para OpenIT Dashboard

### Opción 1: Comando General + Enriquecimiento Selectivo
1. Obtener lista completa: `az resource list`
2. Para recursos críticos (VMs, App Services), ejecutar comandos específicos
3. Cruzar datos por `id` de recurso

### Opción 2: Comandos Específicos por Tipo (Recomendado)
1. Agrupar recursos por tipo desde `az resource list`
2. Ejecutar comando específico para cada tipo con recursos
3. Consolidar información en un solo dataset

### Opción 3: Híbrido con Caché
1. Cache de `az resource list` (actualizar cada 5-15 min)
2. Comandos específicos on-demand para vista detallada
3. Datos de costos actualizados diariamente

---

## 📊 Campos Críticos para Dashboard

### Mínimo Viable
- `name` - Nombre
- `type` - Tipo de recurso
- `resourceGroup` - Grupo
- `location` - Región
- `provisioningState` - Estado de aprovisionamiento
- `tags` - Etiquetas

### Información Extendida
- `powerState` / `state` - Estado de ejecución (VMs, Apps)
- `sku` - SKU/Tier del servicio
- Costos estimados (de `az consumption usage`)
- IPs públicas/privadas (VMs, Load Balancers)
- Endpoints (Storage, Cosmos DB, App Services)

### Métricas y Monitoreo
```bash
az monitor metrics list \
  --resource RESOURCE_ID \
  --metric-names "Percentage CPU" \
  --start-time 2025-10-18T00:00:00Z \
  --end-time 2025-10-18T23:59:59Z \
  --output json
```

---

## 🚀 Scripts de Ejemplo

### Script para obtener todos los recursos con detalles
```bash
#!/bin/bash

# Listar todos los recursos
az resource list --output json > all-resources.json

# VMs con detalles
az vm list --show-details --output json > vms-detailed.json

# App Services
az webapp list --output json > webapps.json

# Storage Accounts
az storage account list --output json > storage-accounts.json

# SQL Servers y Databases
az sql server list --output json > sql-servers.json

# Cosmos DB
az cosmosdb list --output json > cosmosdb.json

# Virtual Networks
az network vnet list --output json > vnets.json

# Load Balancers
az network lb list --output json > load-balancers.json

# Key Vaults
az keyvault list --output json > keyvaults.json

# CDN Profiles
az cdn profile list --output json > cdn-profiles.json

# Costos del mes actual
MONTH=$(date +%Y-%m)
az consumption usage list \
  --start-date ${MONTH}-01 \
  --end-date ${MONTH}-31 \
  --output json > consumption-${MONTH}.json

echo "✅ Datos recopilados en archivos JSON"
```

---

## 🔍 Conclusión

**Respuesta a tu pregunta:**
- ✅ **Existe un comando para todos los recursos:** `az resource list`
- ⚠️ **Pero es limitado:** No incluye propiedades específicas de cada tipo
- 🎯 **Recomendación:** Usar comandos específicos por tipo de recurso
- 💡 **Mejor práctica:** Combinar ambos - usar `az resource list` para inventario general y comandos específicos para detalles

**El JSON varía significativamente entre tipos**, por lo que comandos específicos dan información mucho más rica y útil para el dashboard.
