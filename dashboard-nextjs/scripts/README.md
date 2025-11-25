# Scripts de Integración con Azure DevOps

## 📋 Descripción General

Este directorio contiene scripts para obtener y enriquecer información de recursos de Azure con metadata de Azure DevOps, incluyendo repositorios Git, pipelines y participantes de proyectos.

## 🔑 Configuración Inicial

### 1. Obtener Personal Access Token (PAT) de Azure DevOps

Para ejecutar los scripts necesitas un PAT con los siguientes permisos:

1. Ve a https://dev.azure.com/TU-ORGANIZACION/_usersSettings/tokens
2. Crea un nuevo token con estos permisos:
   - **Build** (Read) - Para leer definiciones de pipelines
   - **Code** (Read) - Para acceder a información de repositorios
   - **Project and Team** (Read) - Para listar proyectos y equipos
   - **Identity** (Read) - Para obtener información de usuarios

### 2. Configurar Variables de Entorno

```bash
# Organización de Azure DevOps (ej: "Automotriz-Chile")
export AZURE_DEVOPS_ORG="tu-organizacion"

# Personal Access Token
export AZURE_DEVOPS_PAT="tu-pat-token-aqui"

# Opcional: Proyecto por defecto
export AZURE_DEVOPS_PROJECT="nombre-proyecto"
```

Puedes agregar estas variables a tu `~/.bashrc` o `~/.zshrc` para persistencia.

## 🚀 Scripts Disponibles

### 1. `fetch-azure-resources.sh`

**Propósito**: Obtiene todos los recursos de Azure de la suscripción activa.

**Uso**:
```bash
./scripts/fetch-azure-resources.sh
```

**Output**: `data/azure-raw.json` - Archivo con todos los recursos Azure raw.

**Requisitos**:
- Azure CLI autenticado (`az login`)
- Permisos de lectura en la suscripción

---

### 2. `extract-devops-metadata.sh`

**Propósito**: Extrae información de Azure DevOps desde la metadata de deployment de App Services que usan VSTSRM (Azure Pipelines).

**Uso**:
```bash
./scripts/extract-devops-metadata.sh
```

**Qué hace**:
1. Lee `data/azure-raw.json`
2. Para cada App Service, obtiene metadata de deployment
3. Extrae información de Azure DevOps:
   - Project ID
   - Build Definition ID
   - URL del repositorio
   - Branch por defecto
   - Tipo de provider (GitHub, GitLab, Azure Repos)

**Output**: `data/azure-devops-mappings.json`

**Por qué algunos recursos no tienen proyecto Git configurado**:
- El App Service no usa Azure Pipelines para deployment
- Usa otro método de deployment (FTP, GitHub Actions, etc.)
- El deployment fue configurado manualmente sin CI/CD
- El recurso es nuevo y aún no tiene deployment configurado

---

### 3. `enrich-with-devops.sh`

**Propósito**: Enriquece recursos con información de pipelines de Azure DevOps mediante búsqueda heurística.

**Uso**:
```bash
./scripts/enrich-with-devops.sh
```

**Qué hace**:
1. Lista todos los proyectos de Azure DevOps
2. Obtiene pipelines de cada proyecto
3. Intenta asociar App Services con pipelines por similitud de nombres
4. Extrae información del repositorio asociado

**Output**: `data/azure-devops-mappings.json`

**Ventaja**: Puede encontrar asociaciones que no están en la metadata de deployment.

---

### 4. `enrich-with-participants.sh` ⭐ NUEVO

**Propósito**: Obtiene la lista de participantes (miembros del equipo) de cada proyecto de Azure DevOps.

**Uso**:
```bash
./scripts/enrich-with-participants.sh
```

**Qué hace**:
1. Lee `data/azure-devops-mappings.json`
2. Obtiene proyectos únicos
3. Para cada proyecto:
   - Obtiene el equipo principal
   - Lista todos los miembros
   - Extrae información de cada participante:
     - ID único
     - Nombre completo (displayName)
     - Email/username (uniqueName)
     - URL de avatar (imageUrl)

**Output**: `data/azure-participants.json`

**Formato del output**:
```json
[
  {
    "projectId": "abc123",
    "projectName": "Mi Proyecto",
    "participants": [
      {
        "id": "user-guid",
        "displayName": "Juan Pérez",
        "uniqueName": "juan.perez@company.com",
        "imageUrl": "https://dev.azure.com/..."
      }
    ]
  }
]
```

---

## 🔄 Workflow Completo

Para obtener toda la información necesaria, ejecuta los scripts en este orden:

```bash
# 1. Obtener recursos de Azure
./scripts/fetch-azure-resources.sh

# 2. Extraer metadata de deployment (VSTSRM)
./scripts/extract-devops-metadata.sh

# 3. (Opcional) Enriquecer con pipelines de DevOps
./scripts/enrich-with-devops.sh

# 4. Obtener participantes de proyectos
./scripts/enrich-with-participants.sh
```

## 📊 Estructura de Datos

### `data/azure-raw.json`
```json
{
  "subscription": {
    "subscriptionId": "...",
    "subscriptionName": "...",
    "tenantId": "..."
  },
  "resources": [
    {
      "id": "/subscriptions/.../resourceGroups/.../providers/Microsoft.Web/sites/mi-app",
      "name": "mi-app",
      "type": "Microsoft.Web/sites",
      "location": "eastus",
      "properties": { ... }
    }
  ],
  "timestamp": "2024-11-24T12:00:00Z"
}
```

### `data/azure-devops-mappings.json`
```json
[
  {
    "resourceName": "as-api-cl-agpsa-carpetadigitalcliente-netcore-prd",
    "repository": {
      "url": "https://dev.azure.com/org/project/_git/repo",
      "branch": "main",
      "provider": "azuredevops"
    },
    "buildDefinitionId": "123",
    "projectId": "abc-def-123"
  }
]
```

### `data/azure-participants.json`
```json
[
  {
    "projectId": "abc-def-123",
    "projectName": "Automotriz Chile",
    "participants": [
      {
        "id": "user-123",
        "displayName": "Juan Pérez",
        "uniqueName": "juan.perez@company.com",
        "imageUrl": "https://..."
      }
    ]
  }
]
```

## 🔍 Troubleshooting

### Error: "Variable AZURE_DEVOPS_PAT no configurada"

**Solución**:
```bash
export AZURE_DEVOPS_PAT="tu-pat-token"
```

### Error: "Archivo azure-raw.json no encontrado"

**Solución**: Ejecuta primero `fetch-azure-resources.sh`

### Error: "No se pudo obtener info del repositorio"

**Causas**:
- PAT sin permisos suficientes
- El build definition no tiene repositorio asociado
- Error de conectividad con Azure DevOps

**Solución**: Verifica permisos del PAT y conectividad

### Pregunta: "¿Por qué algunos App Services no tienen repositorio?"

**Respuesta**: Los recursos solo tendrán información de Git si:
1. Tienen Azure Pipelines configurado (VSTSRM), O
2. Tienen un nombre similar a un pipeline en Azure DevOps (heurística)

Si un App Service se despliega por otros medios (FTP, GitHub Actions, despliegue manual), no tendrá esta información.

### Pregunta: "¿Cómo verificar la configuración de deployment de un App Service?"

**Comando**:
```bash
# Verificar si tiene deployment source configurado
az webapp deployment source show \
  --name nombre-app-service \
  --resource-group nombre-resource-group

# Ver metadata de deployment (VSTSRM)
az rest --method post \
  --uri "https://management.azure.com/subscriptions/{sub-id}/resourceGroups/{rg}/providers/Microsoft.Web/sites/{app-name}/config/metadata/list?api-version=2022-09-01"
```

## 💡 Tips y Best Practices

1. **Frecuencia de ejecución**:
   - `fetch-azure-resources.sh`: Diario o cuando haya cambios en Azure
   - `extract-devops-metadata.sh`: Después de cada fetch
   - `enrich-with-participants.sh`: Semanal o cuando cambien equipos

2. **Seguridad del PAT**:
   - Nunca commitees el PAT en el repositorio
   - Usa variables de entorno o secretos
   - Rota el PAT periódicamente
   - Usa el mínimo de permisos necesarios

3. **Performance**:
   - Los scripts pueden tardar varios minutos con muchos recursos
   - Usa `AZURE_DEVOPS_PROJECT` para limitar scope
   - Los datos se cachean en archivos JSON para rápido acceso

4. **Debugging**:
   - Agrega `set -x` al inicio del script para ver comandos ejecutados
   - Revisa los archivos JSON intermedios en `data/`
   - Usa `jq` para explorar los datos: `jq . data/azure-participants.json`

## 📚 Referencias

- [Azure CLI Documentation](https://docs.microsoft.com/en-us/cli/azure/)
- [Azure DevOps REST API](https://docs.microsoft.com/en-us/rest/api/azure/devops/)
- [Azure Resource Manager API](https://docs.microsoft.com/en-us/rest/api/resources/)
- [jq Manual](https://stedolan.github.io/jq/manual/)
