#!/bin/bash

###############################################################################
# Script de Enriquecimiento con Participantes de Azure DevOps
# OpenIT Dashboard
#
# Descripción:
#   Obtiene información de participantes (miembros del equipo) de proyectos
#   de Azure DevOps y los asocia con App Services.
#
# Uso:
#   ./scripts/enrich-with-participants.sh
#
# Requisitos:
#   - Azure CLI autenticado
#   - Azure DevOps extension instalada
#   - Personal Access Token (PAT) de Azure DevOps configurado
#   - Variables de entorno configuradas (ver abajo)
#
# Variables de entorno requeridas:
#   AZURE_DEVOPS_ORG      - Nombre de la organización (ej: "Automotriz-Chile")
#   AZURE_DEVOPS_PAT      - Personal Access Token con permisos de lectura
#
# Ejemplo de uso:
#   export AZURE_DEVOPS_ORG="Automotriz-Chile"
#   export AZURE_DEVOPS_PAT="tu-pat-token"
#   ./scripts/enrich-with-participants.sh
###############################################################################

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   OpenIT - Azure DevOps Participants Enrichment   ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
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
    echo "2. Crea un nuevo token con permisos: Project and Team (Read), Identity (Read)"
    echo ""
    exit 1
fi

if [ -z "$AZURE_DEVOPS_PAT" ]; then
    echo -e "${RED}❌ Error: Variable AZURE_DEVOPS_PAT no configurada${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Organización: $AZURE_DEVOPS_ORG"

# Configurar Azure DevOps defaults
export AZURE_DEVOPS_EXT_PAT=$AZURE_DEVOPS_PAT
BASE_URL="https://dev.azure.com/$AZURE_DEVOPS_ORG"

echo ""

# Directorio base del script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DATA_DIR="$PROJECT_ROOT/data"
MAPPINGS_FILE="$DATA_DIR/azure-devops-mappings.json"
OUTPUT_FILE="$DATA_DIR/azure-participants.json"

# Verificar que existe el archivo de mappings
if [ ! -f "$MAPPINGS_FILE" ]; then
    echo -e "${RED}❌ Error: No se encuentra $MAPPINGS_FILE${NC}"
    echo "Primero ejecuta: ./scripts/extract-devops-metadata.sh"
    exit 1
fi

echo -e "${YELLOW}📊 Obteniendo participantes de proyectos...${NC}"
echo ""

# Array para almacenar participantes
PARTICIPANTS="[]"

# Obtener proyectos únicos de los mappings
PROJECTS=$(jq -r '.[].projectId // empty' "$MAPPINGS_FILE" | sort -u)

# Contador
total_projects=0
total_participants=0

# Iterar sobre cada proyecto
while IFS= read -r project_id; do
    if [ -z "$project_id" ] || [ "$project_id" == "null" ]; then
        continue
    fi

    total_projects=$((total_projects + 1))

    # Obtener información del proyecto
    project_info=$(curl -s -u ":$AZURE_DEVOPS_PAT" \
        "$BASE_URL/_apis/projects/$project_id?api-version=7.0" 2>/dev/null || echo "{}")

    project_name=$(echo "$project_info" | jq -r '.name // empty')

    if [ -z "$project_name" ] || [ "$project_name" == "null" ]; then
        echo -e "${YELLOW}⚠️${NC}  Proyecto $project_id no encontrado"
        continue
    fi

    echo -e "${BLUE}📁 Proyecto: $project_name${NC}"

    # Obtener miembros del equipo del proyecto
    # El team por defecto tiene el mismo nombre que el proyecto
    team_members=$(curl -s -u ":$AZURE_DEVOPS_PAT" \
        "$BASE_URL/_apis/projects/$project_id/teams?api-version=7.0" 2>/dev/null || echo "{}")

    # Obtener el team principal (generalmente el primero)
    team_id=$(echo "$team_members" | jq -r '.value[0].id // empty')

    if [ -z "$team_id" ] || [ "$team_id" == "null" ]; then
        echo -e "  ${YELLOW}⚠️${NC}  Sin equipos definidos"
        continue
    fi

    # Obtener miembros del equipo
    members=$(curl -s -u ":$AZURE_DEVOPS_PAT" \
        "$BASE_URL/_apis/projects/$project_id/teams/$team_id/members?api-version=7.0" 2>/dev/null || echo "{}")

    member_count=$(echo "$members" | jq '.value | length')

    if [ "$member_count" -eq 0 ]; then
        echo -e "  ${YELLOW}⚠️${NC}  Sin miembros"
        continue
    fi

    echo -e "  ${GREEN}✓${NC} Miembros encontrados: $member_count"

    # Procesar cada miembro
    members_array="[]"
    while IFS= read -r member; do
        member_id=$(echo "$member" | jq -r '.identity.id')
        display_name=$(echo "$member" | jq -r '.identity.displayName')
        unique_name=$(echo "$member" | jq -r '.identity.uniqueName // empty')
        image_url=$(echo "$member" | jq -r '.identity.imageUrl // empty')

        # Agregar al array
        member_obj=$(jq -n \
            --arg id "$member_id" \
            --arg name "$display_name" \
            --arg unique "$unique_name" \
            --arg img "$image_url" \
            '{
                id: $id,
                displayName: $name,
                uniqueName: $unique,
                imageUrl: $img
            }')

        members_array=$(echo "$members_array" | jq --argjson new "$member_obj" '. + [$new]')
        total_participants=$((total_participants + 1))

    done < <(echo "$members" | jq -c '.value[]')

    # Asociar participantes con el proyecto
    project_participants=$(jq -n \
        --arg projectId "$project_id" \
        --arg projectName "$project_name" \
        --argjson participants "$members_array" \
        '{
            projectId: $projectId,
            projectName: $projectName,
            participants: $participants
        }')

    PARTICIPANTS=$(echo "$PARTICIPANTS" | jq --argjson new "$project_participants" '. + [$new]')

    echo -e "  ${GREEN}✓${NC} Participantes procesados: $member_count"
    echo ""

done <<< "$PROJECTS"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ Enriquecimiento Completado                    ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "📊 Proyectos procesados: ${GREEN}$total_projects${NC}"
echo -e "👥 Total de participantes: ${GREEN}$total_participants${NC}"
echo -e "📁 Archivo generado: ${GREEN}$OUTPUT_FILE${NC}"
echo ""

# Guardar participantes
echo "$PARTICIPANTS" | jq '.' > "$OUTPUT_FILE"

echo -e "${YELLOW}💡 Tip:${NC} Para ver los participantes de un proyecto específico:"
echo -e "   ${BLUE}jq '.[] | select(.projectName == \"nombre-proyecto\")' $OUTPUT_FILE${NC}"
echo ""
echo -e "${YELLOW}💡 Siguiente paso:${NC} Ejecuta fetch-azure-resources.sh para integrar estos datos"
echo ""
