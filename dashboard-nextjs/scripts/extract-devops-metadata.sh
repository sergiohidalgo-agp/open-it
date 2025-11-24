#!/bin/bash

###############################################################################
# Script de Extracción de Metadata de Azure DevOps
# OpenIT Dashboard
#
# Descripción:
#   Extrae información de repositorios Git desde la metadata de deployment
#   de App Services que usan Azure DevOps (VSTSRM)
#
# Uso:
#   ./scripts/extract-devops-metadata.sh
#
# Requisitos:
#   - Azure CLI autenticado
#   - Variable de entorno: AZURE_DEVOPS_PAT (Personal Access Token)
#
###############################################################################

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   OpenIT - Extractor de Metadata Azure DevOps     ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
echo ""

# Verificar PAT de Azure DevOps
if [ -z "$AZURE_DEVOPS_PAT" ]; then
    echo -e "${YELLOW}⚠️  Variable AZURE_DEVOPS_PAT no configurada${NC}"
    echo -e "${YELLOW}   El script funcionará pero sin información completa del repositorio${NC}"
    echo ""
fi

# Directorio base
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DATA_DIR="$PROJECT_ROOT/data"
INPUT_FILE="$DATA_DIR/azure-raw.json"
OUTPUT_FILE="$DATA_DIR/azure-devops-mappings.json"

# Verificar archivo de entrada
if [ ! -f "$INPUT_FILE" ]; then
    echo -e "${RED}❌ Error: $INPUT_FILE no encontrado${NC}"
    echo "Ejecuta primero: ./scripts/fetch-azure-resources.sh"
    exit 1
fi

# Array de mappings
MAPPINGS="[]"
total_processed=0
total_mapped=0

echo -e "${YELLOW}🔍 Extrayendo metadata de App Services...${NC}"
echo ""

# Obtener subscription ID
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

# Procesar cada App Service
jq -c '.resources[] | select(.type == "Microsoft.Web/sites")' "$INPUT_FILE" | while read -r resource; do
    resource_name=$(echo "$resource" | jq -r '.name')
    resource_group=$(echo "$resource" | jq -r '.resourceGroup')
    resource_id=$(echo "$resource" | jq -r '.id')

    total_processed=$((total_processed + 1))

    # Obtener metadata del recurso
    metadata=$(az rest --method post \
        --uri "https://management.azure.com${resource_id}/config/metadata/list?api-version=2022-09-01" \
        -o json 2>/dev/null || echo "{}")

    # Verificar si tiene configuración de VSTSRM (Azure DevOps)
    vstsrm_project=$(echo "$metadata" | jq -r '.properties.VSTSRM_ProjectId // empty')
    vstsrm_build_id=$(echo "$metadata" | jq -r '.properties.VSTSRM_BuildDefinitionId // empty')
    vstsrm_url=$(echo "$metadata" | jq -r '.properties.VSTSRM_BuildDefinitionWebAccessUrl // empty')

    if [ -z "$vstsrm_project" ] || [ "$vstsrm_project" == "null" ]; then
        # No tiene Azure DevOps configurado
        continue
    fi

    echo -e "${BLUE}📦${NC} $resource_name"
    echo -e "   Project ID: $vstsrm_project"
    echo -e "   Build ID: $vstsrm_build_id"

    # Extraer organización y proyecto del URL
    if [[ "$vstsrm_url" =~ https://([^.]+)\.(visualstudio\.com|dev\.azure\.com) ]]; then
        org_name="${BASH_REMATCH[1]}"
        echo -e "   Organización: $org_name"

        # Si tenemos PAT, obtener información del build definition
        if [ -n "$AZURE_DEVOPS_PAT" ] && [ -n "$vstsrm_build_id" ]; then
            # Llamar a Azure DevOps API
            build_def=$(curl -s -u ":$AZURE_DEVOPS_PAT" \
                "https://dev.azure.com/$org_name/$vstsrm_project/_apis/build/definitions/$vstsrm_build_id?api-version=7.0" \
                2>/dev/null || echo "{}")

            repo_url=$(echo "$build_def" | jq -r '.repository.url // empty')
            repo_type=$(echo "$build_def" | jq -r '.repository.type // empty')
            repo_name=$(echo "$build_def" | jq -r '.repository.name // empty')
            default_branch=$(echo "$build_def" | jq -r '.repository.defaultBranch // "main"' | sed 's|refs/heads/||')

            if [ -n "$repo_url" ] && [ "$repo_url" != "null" ]; then
                echo -e "   ${GREEN}✓${NC} Repositorio: $repo_name"
                echo -e "   ${GREEN}✓${NC} Branch: $default_branch"

                # Determinar provider
                provider="azuredevops"
                if [[ "$repo_type" == "GitHub" ]]; then
                    provider="github"
                elif [[ "$repo_type" == "GitLab" ]]; then
                    provider="gitlab"
                fi

                # Crear mapping
                mapping=$(jq -n \
                    --arg resource "$resource_name" \
                    --arg repo "$repo_url" \
                    --arg branch "$default_branch" \
                    --arg provider "$provider" \
                    --arg buildId "$vstsrm_build_id" \
                    --arg projectId "$vstsrm_project" \
                    '{
                        resourceName: $resource,
                        repository: {
                            url: $repo,
                            branch: $branch,
                            provider: $provider
                        },
                        buildDefinitionId: $buildId,
                        projectId: $projectId
                    }')

                # Guardar en archivo temporal para evitar problemas de scope
                echo "$mapping" >> "$DATA_DIR/.temp_mappings.json"
                total_mapped=$((total_mapped + 1))
            else
                echo -e "   ${YELLOW}⚠${NC}  No se pudo obtener info del repositorio"
            fi
        else
            # Sin PAT, solo guardamos la metadata básica
            mapping=$(jq -n \
                --arg resource "$resource_name" \
                --arg buildId "$vstsrm_build_id" \
                --arg projectId "$vstsrm_project" \
                --arg url "$vstsrm_url" \
                '{
                    resourceName: $resource,
                    buildDefinitionId: $buildId,
                    projectId: $projectId,
                    buildUrl: $url
                }')

            echo "$mapping" >> "$DATA_DIR/.temp_mappings.json"
            total_mapped=$((total_mapped + 1))
        fi
    fi

    echo ""
done

# Consolidar mappings desde archivo temporal
if [ -f "$DATA_DIR/.temp_mappings.json" ]; then
    jq -s '.' "$DATA_DIR/.temp_mappings.json" > "$OUTPUT_FILE"
    rm -f "$DATA_DIR/.temp_mappings.json"

    total_mapped=$(jq 'length' "$OUTPUT_FILE")
else
    echo "[]" > "$OUTPUT_FILE"
    total_mapped=0
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ Extracción Completada                         ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "📊 App Services procesados: $total_processed"
echo -e "✅ Recursos mapeados: ${GREEN}$total_mapped${NC}"
echo -e "📁 Archivo generado: ${GREEN}$OUTPUT_FILE${NC}"
echo ""

if [ -z "$AZURE_DEVOPS_PAT" ]; then
    echo -e "${YELLOW}💡 Tip:${NC} Para obtener URLs de repositorios completas, configura:"
    echo -e "   ${BLUE}export AZURE_DEVOPS_PAT=\"tu-pat-token\"${NC}"
    echo ""
fi
