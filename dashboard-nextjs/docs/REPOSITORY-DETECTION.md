# Detección Automática de Repositorios Git

## 🎯 Cómo Funciona

El dashboard detecta automáticamente los repositorios Git asociados a cada App Service y Azure Function que usa Azure DevOps Pipelines.

## 🔍 Proceso de Detección

### 1. Extracción de Metadata
Para cada App Service, el script:
- Llama a la API de Azure: `config/metadata/list`
- Obtiene los campos de VSTSRM (Visual Studio Team Services Release Management):
  - `VSTSRM_ProjectId` - ID del proyecto en Azure DevOps
  - `VSTSRM_BuildDefinitionId` - ID del build pipeline
  - `VSTSRM_BuildDefinitionWebAccessUrl` - URL al pipeline

### 2. Consulta a Azure DevOps API
Con el Project ID y Build Definition ID:
- Llama a Azure DevOps API: `/_apis/build/definitions/{id}`
- Extrae información del repositorio:
  - URL completa del repositorio Git
  - Rama por defecto (main, develop, etc.)
  - Tipo de repositorio (TfsGit, GitHub, GitLab)

### 3. Enriquecimiento de Datos
El transformer prioriza las fuentes de datos:
1. **devopsRepository** (Azure DevOps API) ← Máxima prioridad
2. deploymentSource (az webapp deployment source show)
3. Tags personalizados (fallback)

## 📊 Datos Obtenidos

Para cada App Service con Azure DevOps configurado:

```json
{
  "name": "as-lecturahomologado-api-prd",
  "type": "App Service",
  "gitRepository": {
    "url": "https://dev.azure.com/agpsacl/Homologado/_git/api-lecturahomologado",
    "branch": "main",
    "provider": "azuredevops"
  }
}
```

## ✅ Providers Detectados

El sistema detecta automáticamente:
- **azuredevops** - Azure Repos (TfsGit)
- **github** - GitHub
- **gitlab** - GitLab
- **other** - Otros sistemas Git

## 🚀 Uso

### Un solo comando
```bash
cd dashboard-nextjs
./scripts/fetch-azure-resources.sh
```

El script:
1. ✅ Recolecta recursos Azure
2. ✅ Extrae metadata de VSTSRM automáticamente
3. ✅ Consulta Azure DevOps API con el PAT
4. ✅ Enriquece datos con repositorios Git
5. ✅ Genera `data/azure-raw.json`

### Configuración Requerida

Solo necesitas configurar el Personal Access Token una vez:

**Archivo `.env.local`:**
```bash
AZURE_DEVOPS_PAT=tu-pat-token-aqui
```

**Permisos necesarios del PAT:**
- Build (Read)
- Code (Read)
- Release (Read)

## 📈 Visualización en el Dashboard

En la tabla de recursos Azure verás:
- **Columna Git**: Icono de `GitBranch` en color azul
- **Clickeable**: Abre el repositorio en Azure DevOps
- **Tooltip**: Muestra provider y branch

### Sin repositorio
Si un App Service no tiene pipeline configurado:
- Muestra: `-` (guión tenue)

## 🔐 Seguridad

- ✅ `.env.local` está en `.gitignore`
- ✅ PAT nunca se expone en el frontend
- ✅ PAT solo se usa en scripts de backend
- ✅ Permisos mínimos de solo lectura

## 🛠️ Troubleshooting

### No se detectan repositorios

**Causa**: PAT inválido o sin permisos

**Solución**:
```bash
# Verificar que el PAT esté configurado
cat .env.local

# Probar manualmente la API
source .env.local
curl -u ":$AZURE_DEVOPS_PAT" \
  "https://dev.azure.com/ORG/PROJECT/_apis/build/definitions?api-version=7.0"
```

### Algunos App Services sin repositorio

**Causa**: El App Service usa otro método de deployment (FTP, GitHub Actions, etc.)

**Solución**: Estos recursos mostrarán `-` en la columna Git, que es el comportamiento esperado.

## 📝 Notas Técnicas

### Limitaciones de Azure CLI
El comando `az webapp deployment source show` devuelve `repoUrl: "VSTSRM"` para App Services con Azure DevOps, que no es una URL real. Por eso necesitamos consultar la API de metadata y luego la API de Azure DevOps.

### Performance
- Con PAT: ~3-5 minutos para 70 App Services
- Sin PAT: ~30-60 segundos (pero sin repositorios)

### Cache
No hay cache implementado. Cada ejecución hace llamadas frescas a la API para obtener datos actualizados.

## 🎉 Resultado Final

Todos los App Services que usan Azure DevOps Pipelines mostrarán automáticamente:
- ✅ Icono de Git clickeable
- ✅ Enlace directo al repositorio
- ✅ Información de la rama
- ✅ Provider identificado

¡Sin configuración manual de tags!
