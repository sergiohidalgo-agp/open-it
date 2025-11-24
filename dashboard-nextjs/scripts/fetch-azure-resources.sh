#!/bin/bash

###############################################################################
# Script de Recolección de Recursos Azure
# OpenIT Dashboard
#
# Descripción:
#   Recopila información de recursos Azure usando Azure CLI y genera un
#   archivo JSON con toda la información necesaria para el dashboard.
#
# Uso:
#   ./scripts/fetch-azure-resources.sh
#
# Requisitos:
#   - Azure CLI instalado y configurado (az login)
#   - jq instalado para procesamiento JSON
#
# Salida:
#   data/azure-raw.json - Archivo JSON con recursos y metadata
###############################################################################

set -e  # Salir si algún comando falla

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Directorio base del script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DATA_DIR="$PROJECT_ROOT/data"
OUTPUT_FILE="$DATA_DIR/azure-raw.json"
DEVOPS_MAPPINGS="$DATA_DIR/azure-devops-mappings.json"

# Cargar variables de entorno desde .env.local si existe
if [ -f "$PROJECT_ROOT/.env.local" ]; then
    export $(grep -v '^#' "$PROJECT_ROOT/.env.local" | xargs)
fi

echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   OpenIT - Recolector de Recursos Azure           ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
echo ""

# Verificar que Azure CLI esté instalado
if ! command -v az &> /dev/null; then
    echo -e "${RED}❌ Error: Azure CLI no está instalado${NC}"
    echo "Instala Azure CLI desde: https://docs.microsoft.com/cli/azure/install-azure-cli"
    exit 1
fi

# Verificar que jq esté instalado
if ! command -v jq &> /dev/null; then
    echo -e "${RED}❌ Error: jq no está instalado${NC}"
    echo "Instala jq con: brew install jq (macOS) o apt-get install jq (Linux)"
    exit 1
fi

# Verificar que el usuario esté autenticado
echo -e "${YELLOW}🔐 Verificando autenticación Azure...${NC}"
if ! az account show &> /dev/null; then
    echo -e "${RED}❌ Error: No estás autenticado en Azure${NC}"
    echo "Ejecuta: az login"
    exit 1
fi

# Crear directorio data si no existe
mkdir -p "$DATA_DIR"

# Obtener información de la suscripción actual
echo -e "${YELLOW}📋 Obteniendo información de suscripción...${NC}"
SUBSCRIPTION_INFO=$(az account show --output json)
SUBSCRIPTION_ID=$(echo "$SUBSCRIPTION_INFO" | jq -r '.id')
SUBSCRIPTION_NAME=$(echo "$SUBSCRIPTION_INFO" | jq -r '.name')
TENANT_ID=$(echo "$SUBSCRIPTION_INFO" | jq -r '.tenantId')
SUBSCRIPTION_STATE=$(echo "$SUBSCRIPTION_INFO" | jq -r '.state')

echo -e "${GREEN}✓${NC} Suscripción: $SUBSCRIPTION_NAME"
echo -e "${GREEN}✓${NC} ID: $SUBSCRIPTION_ID"
echo -e "${GREEN}✓${NC} Tenant: $TENANT_ID"
echo ""

# Array para almacenar todos los recursos
ALL_RESOURCES="[]"

# Función para agregar recursos al array
add_resources() {
    local resources="$1"
    local count=$(echo "$resources" | jq 'length')
    if [ "$count" -gt 0 ]; then
        ALL_RESOURCES=$(echo "$ALL_RESOURCES" | jq --argjson new "$resources" '. + $new')
    fi
}

# Función para mostrar progreso
show_progress() {
    local service_name="$1"
    local count="$2"
    echo -e "${GREEN}✓${NC} $service_name: $count recursos"
}

echo -e "${YELLOW}🔍 Recopilando recursos Azure...${NC}"
echo ""

# 1. Virtual Machines
echo -e "  ${YELLOW}→${NC} Virtual Machines..."
VMS=$(az vm list --show-details --output json 2>/dev/null || echo "[]")
VM_COUNT=$(echo "$VMS" | jq 'length')
add_resources "$VMS"
show_progress "Virtual Machines" "$VM_COUNT"

# 2. App Services (Web Apps) con deployment source
echo -e "  ${YELLOW}→${NC} App Services..."
WEBAPPS=$(az webapp list --output json 2>/dev/null || echo "[]")
WEBAPP_COUNT=$(echo "$WEBAPPS" | jq 'length')

# Enriquecer cada App Service con deployment source y Azure DevOps info
if [ "$WEBAPP_COUNT" -gt 0 ]; then
    # Crear archivo temporal para procesar
    TEMP_WEBAPPS=$(mktemp)
    echo "$WEBAPPS" > "$TEMP_WEBAPPS"

    # Verificar si existe archivo de mappings de DevOps
    HAS_DEVOPS_MAPPINGS=false
    if [ -f "$DEVOPS_MAPPINGS" ]; then
        HAS_DEVOPS_MAPPINGS=true
        echo -e "  ${GREEN}✓${NC} Mappings de Azure DevOps encontrados"
    fi

    # Procesar cada webapp individualmente
    counter=0
    while IFS= read -r webapp; do
        counter=$((counter + 1))
        app_name=$(echo "$webapp" | jq -r '.name')
        resource_group=$(echo "$webapp" | jq -r '.resourceGroup')

        # Mostrar progreso cada 10 apps
        if [ $((counter % 10)) -eq 0 ]; then
            echo -e "    ${YELLOW}Processing${NC} $counter/$WEBAPP_COUNT App Services..."
        fi

        # Obtener deployment source (silenciar errores)
        deployment_source=$(az webapp deployment source show \
            -n "$app_name" \
            -g "$resource_group" \
            --output json 2>/dev/null || echo "null")

        # Enriquecer con info de Azure DevOps si existe
        if [ "$HAS_DEVOPS_MAPPINGS" = true ]; then
            devops_info=$(jq --arg name "$app_name" \
                '.[] | select(.resourceName == $name) | .repository' \
                "$DEVOPS_MAPPINGS" 2>/dev/null || echo "null")

            # Agregar deploymentSource y devopsRepository
            enriched=$(echo "$webapp" | jq \
                --argjson ds "$deployment_source" \
                --argjson devops "$devops_info" \
                '. + {deploymentSource: $ds, devopsRepository: $devops}')
        else
            # Solo agregar deploymentSource
            enriched=$(echo "$webapp" | jq --argjson ds "$deployment_source" '. + {deploymentSource: $ds}')
        fi

        # Agregar directamente a ALL_RESOURCES en lugar de acumular
        ALL_RESOURCES=$(echo "$ALL_RESOURCES" | jq --argjson new "$enriched" '. + [$new]')
    done < <(jq -c '.[]' "$TEMP_WEBAPPS")

    # Limpiar archivo temporal
    rm -f "$TEMP_WEBAPPS"
else
    add_resources "$WEBAPPS"
fi
show_progress "App Services" "$WEBAPP_COUNT"

# 3. SQL Databases
echo -e "  ${YELLOW}→${NC} SQL Databases..."
# Primero obtener todos los SQL Servers
SQL_SERVERS=$(az sql server list --output json 2>/dev/null || echo "[]")
SQL_DBS="[]"
if [ "$(echo "$SQL_SERVERS" | jq 'length')" -gt 0 ]; then
    # Para cada servidor, obtener sus bases de datos
    while IFS= read -r server; do
        server_name=$(echo "$server" | jq -r '.name')
        resource_group=$(echo "$server" | jq -r '.resourceGroup')
        dbs=$(az sql db list --server "$server_name" --resource-group "$resource_group" --output json 2>/dev/null || echo "[]")
        SQL_DBS=$(echo "$SQL_DBS" | jq --argjson new "$dbs" '. + $new')
    done < <(echo "$SQL_SERVERS" | jq -c '.[]')
fi
SQL_DB_COUNT=$(echo "$SQL_DBS" | jq 'length')
add_resources "$SQL_DBS"
show_progress "SQL Databases" "$SQL_DB_COUNT"

# 4. Storage Accounts
echo -e "  ${YELLOW}→${NC} Storage Accounts..."
STORAGE=$(az storage account list --output json 2>/dev/null || echo "[]")
STORAGE_COUNT=$(echo "$STORAGE" | jq 'length')
add_resources "$STORAGE"
show_progress "Storage Accounts" "$STORAGE_COUNT"

# 5. Cosmos DB
echo -e "  ${YELLOW}→${NC} Cosmos DB..."
COSMOS=$(az cosmosdb list --output json 2>/dev/null || echo "[]")
COSMOS_COUNT=$(echo "$COSMOS" | jq 'length')
add_resources "$COSMOS"
show_progress "Cosmos DB" "$COSMOS_COUNT"

# 6. Virtual Networks
echo -e "  ${YELLOW}→${NC} Virtual Networks..."
VNETS=$(az network vnet list --output json 2>/dev/null || echo "[]")
VNET_COUNT=$(echo "$VNETS" | jq 'length')
add_resources "$VNETS"
show_progress "Virtual Networks" "$VNET_COUNT"

# 7. Load Balancers
echo -e "  ${YELLOW}→${NC} Load Balancers..."
LBS=$(az network lb list --output json 2>/dev/null || echo "[]")
LB_COUNT=$(echo "$LBS" | jq 'length')
add_resources "$LBS"
show_progress "Load Balancers" "$LB_COUNT"

# 8. Key Vaults
echo -e "  ${YELLOW}→${NC} Key Vaults..."
KEYVAULTS=$(az keyvault list --output json 2>/dev/null || echo "[]")
KV_COUNT=$(echo "$KEYVAULTS" | jq 'length')
add_resources "$KEYVAULTS"
show_progress "Key Vaults" "$KV_COUNT"

# 9. CDN Profiles
echo -e "  ${YELLOW}→${NC} CDN Profiles..."
CDNS=$(az cdn profile list --output json 2>/dev/null || echo "[]")
CDN_COUNT=$(echo "$CDNS" | jq 'length')
add_resources "$CDNS"
show_progress "CDN Profiles" "$CDN_COUNT"

echo ""

# Calcular total de recursos antes de enriquecer
TEMP_RESOURCES=$(mktemp)
echo "$ALL_RESOURCES" > "$TEMP_RESOURCES"
TOTAL_RESOURCES=$(jq 'length' "$TEMP_RESOURCES")

echo -e "${YELLOW}🔍 Extrayendo información de Azure DevOps...${NC}"

# Ejecutar extracción de metadata de DevOps inline
devops_count=0
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

# Crear archivo temporal para mappings
TEMP_MAPPINGS=$(mktemp)

# Procesar cada App Service para extraer metadata de VSTSRM
while IFS= read -r resource; do
    resource_name=$(echo "$resource" | jq -r '.name')
    resource_id=$(echo "$resource" | jq -r '.id')

    # Obtener metadata del recurso
    metadata=$(az rest --method post \
        --uri "https://management.azure.com${resource_id}/config/metadata/list?api-version=2022-09-01" \
        -o json 2>/dev/null || echo "{}")

    # Verificar si tiene configuración de VSTSRM (Azure DevOps)
    vstsrm_project=$(echo "$metadata" | jq -r '.properties.VSTSRM_ProjectId // empty')
    vstsrm_build_id=$(echo "$metadata" | jq -r '.properties.VSTSRM_BuildDefinitionId // empty')
    vstsrm_url=$(echo "$metadata" | jq -r '.properties.VSTSRM_BuildDefinitionWebAccessUrl // empty')

    if [ -z "$vstsrm_project" ] || [ "$vstsrm_project" == "null" ]; then
        continue
    fi

    # Extraer organización del URL
    if [[ "$vstsrm_url" =~ https://([^.]+)\.(visualstudio\.com|dev\.azure\.com) ]]; then
        org_name="${BASH_REMATCH[1]}"

        # Si tenemos PAT, obtener información del repositorio
        if [ -n "$AZURE_DEVOPS_PAT" ] && [ -n "$vstsrm_build_id" ]; then
            build_def=$(curl -s -u ":$AZURE_DEVOPS_PAT" \
                "https://dev.azure.com/$org_name/$vstsrm_project/_apis/build/definitions/$vstsrm_build_id?api-version=7.0" \
                2>/dev/null || echo "{}")

            repo_url=$(echo "$build_def" | jq -r '.repository.url // empty')
            repo_type=$(echo "$build_def" | jq -r '.repository.type // empty')
            default_branch=$(echo "$build_def" | jq -r '.repository.defaultBranch // "main"' | sed 's|refs/heads/||')

            if [ -n "$repo_url" ] && [ "$repo_url" != "null" ] && [ "$repo_url" != "empty" ]; then
                provider="azuredevops"
                if [[ "$repo_type" == "GitHub" ]]; then
                    provider="github"
                elif [[ "$repo_type" == "GitLab" ]]; then
                    provider="gitlab"
                fi

                # Guardar mapping en archivo temporal
                echo "$resource_name|$repo_url|$default_branch|$provider" >> "$TEMP_MAPPINGS"
                devops_count=$((devops_count + 1))
            fi
        fi
    fi
done < <(jq -c '.[] | select(.type == "Microsoft.Web/sites")' "$TEMP_RESOURCES")

if [ "$devops_count" -gt 0 ]; then
    echo -e "${GREEN}✓${NC} Azure DevOps: $devops_count repositorios detectados"

    # Enriquecer ALL_RESOURCES con los mappings
    while IFS='|' read -r name url branch provider; do
        ALL_RESOURCES=$(echo "$ALL_RESOURCES" | jq --arg name "$name" \
            --arg url "$url" \
            --arg branch "$branch" \
            --arg provider "$provider" \
            'map(if .name == $name then . + {devopsRepository: {url: $url, branch: $branch, provider: $provider}} else . end)')
    done < "$TEMP_MAPPINGS"

    rm -f "$TEMP_MAPPINGS"
else
    if [ -z "$AZURE_DEVOPS_PAT" ]; then
        echo -e "${YELLOW}⚠${NC}  Azure DevOps: PAT no configurado. Configura AZURE_DEVOPS_PAT para obtener repositorios"
    else
        echo -e "${YELLOW}⚠${NC}  Azure DevOps: No se encontraron repositorios"
    fi
    rm -f "$TEMP_MAPPINGS"
fi

echo ""

# Actualizar el archivo temporal con los datos enriquecidos
echo "$ALL_RESOURCES" > "$TEMP_RESOURCES"

# Crear el JSON final con metadata (usando archivo temporal)
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Crear el JSON final escribiendo directamente al archivo
jq -n \
    --arg timestamp "$TIMESTAMP" \
    --arg subId "$SUBSCRIPTION_ID" \
    --arg subName "$SUBSCRIPTION_NAME" \
    --arg tenantId "$TENANT_ID" \
    --arg subState "$SUBSCRIPTION_STATE" \
    --slurpfile resources "$TEMP_RESOURCES" \
    '{
        subscription: {
            subscriptionId: $subId,
            subscriptionName: $subName,
            tenantId: $tenantId,
            state: $subState
        },
        resources: $resources[0],
        timestamp: $timestamp
    }' > "$OUTPUT_FILE"

# Limpiar archivo temporal
rm -f "$TEMP_RESOURCES"

echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ Recolección Completada                        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "📊 Total de recursos: ${GREEN}$TOTAL_RESOURCES${NC}"
echo -e "📁 Archivo generado: ${GREEN}$OUTPUT_FILE${NC}"
echo -e "⏰ Timestamp: ${GREEN}$TIMESTAMP${NC}"
echo ""
echo -e "${YELLOW}💡 Tip:${NC} Puedes ejecutar este script periódicamente con cron"
echo -e "   Ejemplo: ${GREEN}0 * * * * $0${NC} (cada hora)"
echo ""
