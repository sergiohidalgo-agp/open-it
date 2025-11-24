# 🚀 Setup Rápido - OpenIT Dashboard

## Punto de entrada único

Todo el proceso de recolección de datos está integrado en un solo comando:

```bash
cd dashboard-nextjs
./scripts/fetch-azure-resources.sh
```

## ¿Qué hace este script?

1. ✅ **Recolecta recursos Azure** (VMs, App Services, Storage, etc.)
2. ✅ **Obtiene metadata de Azure DevOps** automáticamente
3. ✅ **Extrae URLs de repositorios Git** de los pipelines
4. ✅ **Enriquece los datos** con información completa
5. ✅ **Genera archivo final** `data/azure-raw.json`

## Configuración opcional (recomendada)

Para obtener URLs completas de repositorios Git, configura tu PAT de Azure DevOps:

```bash
export AZURE_DEVOPS_PAT="tu-personal-access-token"
```

### ¿Cómo obtener el PAT?

1. Ve a: `https://dev.azure.com/TU-ORG/_usersSettings/tokens`
2. Crea un token con permisos:
   - ✅ Build (Read)
   - ✅ Code (Read)
   - ✅ Release (Read)
3. Copia el token y configúralo

## Sin PAT configurado

El script funcionará de todas formas pero:
- ⚠️ No mostrará URLs de repositorios
- ✅ Recolectará todos los demás datos correctamente

## Tiempo de ejecución

- ~2-3 minutos con PAT configurado
- ~30-60 segundos sin PAT

## Datos obtenidos

### Con PAT:
```json
{
  "name": "as-carpetadigital-api-prd",
  "type": "App Service",
  "location": "East US",
  "environment": "production",
  "gitRepository": {
    "url": "https://dev.azure.com/org/project/_git/repo",
    "branch": "main",
    "provider": "azuredevops"
  }
}
```

### Sin PAT:
```json
{
  "name": "as-carpetadigital-api-prd",
  "type": "App Service",
  "location": "East US",
  "environment": "production",
  "gitRepository": null
}
```

## Siguiente paso

Después de ejecutar el script, inicia el dashboard:

```bash
npm run dev
```

Ve a: `http://localhost:3000`
