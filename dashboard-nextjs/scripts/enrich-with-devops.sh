#!/bin/bash

###############################################################################
# Script de Enriquecimiento con Azure DevOps
# OpenIT Dashboard
#
# Descripción:
#   Obtiene información de repositorios Git desde Azure DevOps para
#   App Services y Functions que usan Azure Pipelines.
#
# Uso:
#   ./scripts/enrich-with-devops.sh
#
# Requisitos:
#   - Azure CLI con extensión azure-devops instalada
#   - Personal Access Token (PAT) de Azure DevOps configurado
#   - Variables de entorno configuradas (ver abajo)
#
# Variables de entorno requeridas:
#   AZURE_DEVOPS_ORG      - Nombre de la organización (ej: "mycompany")
#   AZURE_DEVOPS_PAT      - Personal Access Token
#   AZURE_DEVOPS_PROJECT  - Proyecto por defecto (opcional)
###############################################################################

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   OpenIT - Azure DevOps Repository Enrichment     ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
echo ""

# Verificar que la extensión de Azure DevOps esté instalada
echo -e "${YELLOW}🔍 Verificando Azure DevOps CLI extension...${NC}"
if ! az extension show -n azure-devops &> /dev/null; then
    echo -e "${YELLOW}⚠️  Extensión azure-devops no encontrada. Instalando...${NC}"
    az extension add --name azure-devops --yes
    echo -e "${GREEN}✓${NC} Extensión instalada correctamente"
else
    echo -e "${GREEN}✓${NC} Extensión ya instalada"
fi

echo ""

# Verificar variables de entorno
echo -e "${YELLOW}🔍 Verificando configuración...${NC}"

if [ -z "$AZURE_DEVOPS_ORG" ]; then
    echo -e "${RED}❌ Error: Variable AZURE_DEVOPS_ORG no configurada${NC}"
    echo ""
    echo "Configura las variables de entorno:"
    echo -e "${BLUE}export AZURE_DEVOPS_ORG=\"tu-organizacion\"${NC}"
    echo -e "${BLUE}export AZURE_DEVOPS_PAT=\"tu-personal-access-token\"${NC}"
    echo ""
    echo "Para crear un PAT:"
    echo "1. Ve a https://dev.azure.com/TU-ORG/_usersSettings/tokens"
    echo "2. Crea un nuevo token con permisos: Build (Read), Release (Read), Code (Read)"
    echo ""
    exit 1
fi

if [ -z "$AZURE_DEVOPS_PAT" ]; then
    echo -e "${RED}❌ Error: Variable AZURE_DEVOPS_PAT no configurada${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Organización: $AZURE_DEVOPS_ORG"
if [ -n "$AZURE_DEVOPS_PROJECT" ]; then
    echo -e "${GREEN}✓${NC} Proyecto por defecto: $AZURE_DEVOPS_PROJECT"
fi

# Configurar Azure DevOps defaults
export AZURE_DEVOPS_EXT_PAT=$AZURE_DEVOPS_PAT
az devops configure --defaults organization=https://dev.azure.com/$AZURE_DEVOPS_ORG

echo ""

# Directorio base del script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DATA_DIR="$PROJECT_ROOT/data"
INPUT_FILE="$DATA_DIR/azure-raw.json"
OUTPUT_FILE="$DATA_DIR/azure-devops-mappings.json"

# Verificar que existe el archivo de entrada
if [ ! -f "$INPUT_FILE" ]; then
    echo -e "${RED}❌ Error: No se encuentra $INPUT_FILE${NC}"
    echo "Primero ejecuta: ./scripts/fetch-azure-resources.sh"
    exit 1
fi

echo -e "${YELLOW}📊 Obteniendo lista de pipelines de Azure DevOps...${NC}"

# Obtener todos los proyectos si no se especificó uno
if [ -z "$AZURE_DEVOPS_PROJECT" ]; then
    PROJECTS=$(az devops project list --output json 2>/dev/null | jq -r '.[].name')
    echo -e "${GREEN}✓${NC} Proyectos encontrados: $(echo "$PROJECTS" | wc -l | tr -d ' ')"
else
    PROJECTS="$AZURE_DEVOPS_PROJECT"
    echo -e "${GREEN}✓${NC} Usando proyecto: $AZURE_DEVOPS_PROJECT"
fi

# Array para almacenar mappings
MAPPINGS="[]"

# Contador
total_mapped=0

# Iterar sobre cada proyecto
while IFS= read -r project; do
    echo ""
    echo -e "${BLUE}📁 Proyecto: $project${NC}"

    # Obtener pipelines del proyecto
    pipelines=$(az pipelines list --project "$project" --output json 2>/dev/null || echo "[]")
    pipeline_count=$(echo "$pipelines" | jq 'length')

    if [ "$pipeline_count" -eq 0 ]; then
        echo -e "  ${YELLOW}⚠️${NC}  Sin pipelines"
        continue
    fi

    echo -e "  ${GREEN}✓${NC} Pipelines encontrados: $pipeline_count"

    # Para cada pipeline, obtener su repositorio y buscar App Services relacionados
    while IFS= read -r pipeline; do
        pipeline_id=$(echo "$pipeline" | jq -r '.id')
        pipeline_name=$(echo "$pipeline" | jq -r '.name')

        # Obtener definición completa del pipeline
        pipeline_def=$(az pipelines show --id "$pipeline_id" --project "$project" --output json 2>/dev/null || echo "{}")

        # Extraer información del repositorio
        repo_type=$(echo "$pipeline_def" | jq -r '.repository.type // empty')
        repo_url=$(echo "$pipeline_def" | jq -r '.repository.url // empty')
        repo_name=$(echo "$pipeline_def" | jq -r '.repository.name // empty')
        default_branch=$(echo "$pipeline_def" | jq -r '.repository.defaultBranch // "main"' | sed 's|refs/heads/||')

        if [ -z "$repo_url" ] || [ "$repo_url" == "null" ]; then
            continue
        fi

        # Buscar en azure-raw.json App Services que puedan estar relacionados con este pipeline
        # Heurística: buscar por nombre similar (sin prefijos as-, func-, etc)
        clean_pipeline_name=$(echo "$pipeline_name" | sed -E 's/^(as-|func-|app-|api-)//' | tr '[:upper:]' '[:lower:]')

        # Buscar App Services que coincidan
        matching_resources=$(jq -r --arg name "$clean_pipeline_name" \
            '.resources[] |
             select(.type == "Microsoft.Web/sites") |
             select(.name | ascii_downcase | contains($name)) |
             .name' "$INPUT_FILE" 2>/dev/null || echo "")

        if [ -n "$matching_resources" ]; then
            while IFS= read -r resource_name; do
                if [ -n "$resource_name" ]; then
                    # Crear mapping
                    mapping=$(jq -n \
                        --arg resource "$resource_name" \
                        --arg repo "$repo_url" \
                        --arg branch "$default_branch" \
                        --arg provider "$repo_type" \
                        --arg pipeline "$pipeline_name" \
                        '{
                            resourceName: $resource,
                            repository: {
                                url: $repo,
                                branch: $branch,
                                provider: $provider
                            },
                            pipelineName: $pipeline,
                            project: "'$project'"
                        }')

                    MAPPINGS=$(echo "$MAPPINGS" | jq --argjson new "$mapping" '. + [$new]')
                    total_mapped=$((total_mapped + 1))

                    echo -e "    ${GREEN}✓${NC} $resource_name → $repo_name ($default_branch)"
                fi
            done <<< "$matching_resources"
        fi

    done < <(echo "$pipelines" | jq -c '.[]')

done <<< "$PROJECTS"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ Enriquecimiento Completado                    ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "📊 Total de recursos mapeados: ${GREEN}$total_mapped${NC}"
echo -e "📁 Archivo generado: ${GREEN}$OUTPUT_FILE${NC}"
echo ""

# Guardar mappings
echo "$MAPPINGS" | jq '.' > "$OUTPUT_FILE"

echo -e "${YELLOW}💡 Tip:${NC} Ahora ejecuta fetch-azure-resources.sh para integrar estos datos"
echo ""
