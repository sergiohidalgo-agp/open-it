# Configuración de Azure DevOps para OpenIT Dashboard

Este documento explica cómo obtener información de repositorios Git desde Azure DevOps para App Services y Functions que usan Azure Pipelines.

## 📋 Requisitos Previos

1. **Azure CLI** instalado y autenticado
2. **Cuenta de Azure DevOps** con acceso a los proyectos
3. **Personal Access Token (PAT)** con los permisos adecuados

---

## 🔑 Paso 1: Crear Personal Access Token (PAT)

1. Ve a Azure DevOps: `https://dev.azure.com/TU-ORGANIZACION`

2. Haz clic en tu avatar (esquina superior derecha) → **Personal access tokens**

3. Clic en **+ New Token**

4. Configura el token:
   - **Name**: `OpenIT Dashboard`
   - **Organization**: Tu organización
   - **Expiration**: 90 días (o Custom)
   - **Scopes**: Selecciona los siguientes permisos:
     - ✅ **Build** - Read
     - ✅ **Code** - Read
     - ✅ **Release** - Read
     - ✅ **Project and Team** - Read

5. Clic en **Create**

6. **⚠️ IMPORTANTE**: Copia el token inmediatamente (solo se muestra una vez)

---

## 🔧 Paso 2: Configurar Variables de Entorno

### macOS / Linux

Agrega estas líneas a tu `~/.zshrc` o `~/.bashrc`:

```bash
# Azure DevOps Configuration
export AZURE_DEVOPS_ORG="nombre-de-tu-organizacion"
export AZURE_DEVOPS_PAT="tu-personal-access-token-aqui"
export AZURE_DEVOPS_PROJECT="nombre-proyecto-principal"  # Opcional
```

Luego recarga la configuración:
```bash
source ~/.zshrc  # o ~/.bashrc
```

### Windows (PowerShell)

```powershell
$env:AZURE_DEVOPS_ORG = "nombre-de-tu-organizacion"
$env:AZURE_DEVOPS_PAT = "tu-personal-access-token-aqui"
$env:AZURE_DEVOPS_PROJECT = "nombre-proyecto-principal"  # Opcional
```

### Verificar configuración

```bash
echo $AZURE_DEVOPS_ORG
echo $AZURE_DEVOPS_PAT
```

---

## 🚀 Paso 3: Ejecutar el Script de Enriquecimiento

```bash
cd dashboard-nextjs
./scripts/enrich-with-devops.sh
```

### ¿Qué hace el script?

1. **Instala la extensión** `azure-devops` si no está presente
2. **Lista todos los proyectos** de tu organización de Azure DevOps
3. **Obtiene todos los pipelines** de cada proyecto
4. **Extrae información del repositorio** de cada pipeline:
   - URL del repositorio Git
   - Rama por defecto
   - Tipo de repositorio (TfsGit, GitHub, etc.)
5. **Hace matching** entre pipelines y App Services por nombre
6. **Genera un archivo** `data/azure-devops-mappings.json` con los resultados

### Output esperado

```
╔════════════════════════════════════════════════════╗
║   OpenIT - Azure DevOps Repository Enrichment     ║
╚════════════════════════════════════════════════════╝

🔍 Verificando Azure DevOps CLI extension...
✓ Extensión ya instalada

🔍 Verificando configuración...
✓ Organización: mi-empresa
✓ Proyecto por defecto: mi-proyecto

📊 Obteniendo lista de pipelines de Azure DevOps...
✓ Proyectos encontrados: 3

📁 Proyecto: Backend-Services
  ✓ Pipelines encontrados: 15
    ✓ as-carpetadigital-api-prd → carpetadigital-backend (main)
    ✓ as-homologado-api-prd → homologado-api (develop)
    ...

📁 Proyecto: Frontend-Apps
  ✓ Pipelines encontrados: 8
    ✓ as-sitiopublico-prd → sitio-publico-web (main)
    ...

╔════════════════════════════════════════════════════╗
║   ✅ Enriquecimiento Completado                    ║
╚════════════════════════════════════════════════════╝

📊 Total de recursos mapeados: 45
📁 Archivo generado: data/azure-devops-mappings.json
```

---

## 📊 Paso 4: Integrar con el Script Principal

El script `fetch-azure-resources.sh` ahora buscará automáticamente el archivo `azure-devops-mappings.json` y enriquecerá los recursos con la información del repositorio.

```bash
./scripts/fetch-azure-resources.sh
```

El proceso será:
1. Recolecta recursos de Azure
2. Lee `azure-devops-mappings.json` (si existe)
3. Cruza los datos por nombre de recurso
4. Agrega información de repositorio a cada App Service

---

## 🔍 Estructura del Archivo de Mappings

`data/azure-devops-mappings.json`:

```json
[
  {
    "resourceName": "as-carpetadigital-api-prd",
    "repository": {
      "url": "https://dev.azure.com/myorg/myproject/_git/carpetadigital-backend",
      "branch": "main",
      "provider": "TfsGit"
    },
    "pipelineName": "CarpetaDigital-API-Production",
    "project": "Backend-Services"
  },
  {
    "resourceName": "as-homologado-api-prd",
    "repository": {
      "url": "https://dev.azure.com/myorg/myproject/_git/homologado-api",
      "branch": "develop",
      "provider": "TfsGit"
    },
    "pipelineName": "Homologado-API-Deploy",
    "project": "Backend-Services"
  }
]
```

---

## 🛠️ Troubleshooting

### Error: "AZURE_DEVOPS_ORG no configurada"

Verifica que las variables de entorno estén configuradas:
```bash
echo $AZURE_DEVOPS_ORG
echo $AZURE_DEVOPS_PAT
```

### Error: "VS30063: You are not authorized to access..."

Tu PAT no tiene los permisos necesarios. Crea un nuevo PAT con los scopes correctos.

### Error: "TF400813: The user is not authorized to access this resource"

No tienes acceso al proyecto en Azure DevOps. Solicita acceso al administrador.

### No se encontraron mappings

Posibles causas:
1. Los nombres de los pipelines no coinciden con los nombres de los App Services
2. Los pipelines no tienen configuración de repositorio
3. Estás buscando en el proyecto incorrecto

**Solución**: Revisa manualmente algunos pipelines en Azure DevOps y ajusta la lógica de matching en el script.

---

## 🔐 Seguridad

### ⚠️ Nunca compartas tu PAT

- No lo subas a Git
- No lo compartas por email/chat
- Agrégalo a `.gitignore` si lo guardas en archivo
- Usa variables de entorno o Azure Key Vault

### 🔄 Rotación de tokens

Los PAT expiran. Configura recordatorios para renovarlos antes de que expiren.

### 📝 Permisos mínimos

El script solo necesita permisos de **lectura**. Nunca uses un PAT con permisos de escritura.

---

## 📚 Referencias

- [Azure DevOps PAT Documentation](https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate)
- [Azure DevOps CLI Extension](https://learn.microsoft.com/en-us/azure/devops/cli/)
- [Azure Pipelines YAML Schema](https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/)

---

## 💡 Próximos Pasos

1. Ejecuta el script de enriquecimiento periódicamente (por ejemplo, semanalmente)
2. Si agregas nuevos pipelines, vuelve a ejecutar el script
3. Considera automatizar esto con un cron job o GitHub Action
