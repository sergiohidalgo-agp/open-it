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

# 2. App Services (Web Apps)
echo -e "  ${YELLOW}→${NC} App Services..."
WEBAPPS=$(az webapp list --output json 2>/dev/null || echo "[]")
WEBAPP_COUNT=$(echo "$WEBAPPS" | jq 'length')
add_resources "$WEBAPPS"
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

# Calcular total de recursos
TOTAL_RESOURCES=$(echo "$ALL_RESOURCES" | jq 'length')

# Crear el JSON final con metadata
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

FINAL_JSON=$(jq -n \
    --arg timestamp "$TIMESTAMP" \
    --arg subId "$SUBSCRIPTION_ID" \
    --arg subName "$SUBSCRIPTION_NAME" \
    --arg tenantId "$TENANT_ID" \
    --arg subState "$SUBSCRIPTION_STATE" \
    --argjson resources "$ALL_RESOURCES" \
    '{
        subscription: {
            subscriptionId: $subId,
            subscriptionName: $subName,
            tenantId: $tenantId,
            state: $subState
        },
        resources: $resources,
        timestamp: $timestamp
    }')

# Guardar el JSON
echo "$FINAL_JSON" > "$OUTPUT_FILE"

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
