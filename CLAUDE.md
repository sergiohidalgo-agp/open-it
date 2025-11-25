# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an IT infrastructure management dashboard built with Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, and shadcn/ui. The application provides a professional corporate intranet interface for IT department operations with real-time monitoring, metrics visualization, and system management capabilities.

## Core Principles

### SOLID Architecture
This project strictly follows SOLID principles:
- **Single Responsibility**: Each component, function, and module has one well-defined purpose
- **Open/Closed**: Components are open for extension but closed for modification
- **Liskov Substitution**: Derived components can substitute their base components
- **Interface Segregation**: No component should depend on methods it doesn't use
- **Dependency Inversion**: Depend on abstractions, not concretions

### Monorepo Structure
This project uses a monorepo architecture with SOLID principles:
- Each package/workspace has a single, clear responsibility
- Shared code is properly abstracted and reusable
- Dependencies are managed at the workspace level
- Code is organized by domain and feature boundaries

### Library Selection Standards
**ALL libraries must meet these criteria:**
1. **Community Support**: Active maintenance with regular updates
2. **Enterprise Adoption**: Used by medium-to-large companies in production
3. **Open Source**: Preferably MIT or similar permissive license
4. **Battle-Tested**: Proven in real-world applications with substantial user base

**Current approved libraries:**
- **Next.js**: Used by Vercel, Netflix, TikTok, Twitch, Hulu
- **React**: Used by Facebook, Instagram, Netflix, Uber, Airbnb
- **TypeScript**: Used by Microsoft, Google, Slack, Airbnb
- **Tailwind CSS**: Used by GitHub, Shopify, Netflix, NASA
- **shadcn/ui**: Component system built on Radix UI (used by Linear, Vercel, Cal.com)
- **Lucide React**: Fork of Feather Icons, actively maintained, 10k+ GitHub stars
- **Recharts**: Used by Airbnb, Alibaba, Microsoft for data visualization
- **Azure React Icons**: Official Azure service icons library
- **React Icons**: Popular icon library with 10k+ GitHub stars
- **Azure Cosmos DB SDK**: Official Microsoft Azure NoSQL database client
- **Pino**: High-performance logging library used by Fastify, Platformatic
- **Zod**: TypeScript-first schema validation used by tRPC, Remix, Astro

### Code Quality Standards
- **Efficient & Minimal**: Write less code that does more
- **Optimized**: Performance is a feature, not an afterthought
- **Atomic Responsibilities**: Break down complex logic into smallest possible units
- **DRY Principle**: Don't Repeat Yourself - abstract common patterns
- **Composition over Inheritance**: Prefer functional composition
- **Type Safety**: Leverage TypeScript's type system fully

### Documentation Requirements
- **README.md**: Must be in repository root, always up-to-date
- **Expert-Level Clarity**: Any senior developer should understand the project immediately
- **Executable Instructions**: Clear setup and run commands
- **Architecture Overview**: High-level system design documented

## Git Commit Conventions

### ✅ Commit Rules (Gitmoji + Spanish)

**Format:**
```
[emoji] [Short, clear description in Spanish]
```

**Description (optional):**
Use bullet points (-) with brief explanations in Spanish.

### 🎯 Emoji Guide (Gitmoji)

- ✨ Nueva funcionalidad
- 🐛 Corregir bug
- ♻️ Refactorizar sin cambiar comportamiento
- 🔥 Eliminar código/archivos
- 📝 Actualización o creación de documentación
- 🚀 Deploy o preparar release
- ✅ Agregar/mejorar tests
- 🧪 Tests experimentales/fallidos
- ⚡️ Mejoras de rendimiento
- 🔒 Correcciones/mejoras de seguridad
- 🔐 Cambios relacionados con autenticación
- ⬆️ Actualizar dependencias
- ⬇️ Degradar dependencias
- 📦 Actualizar build/release/package
- 🚚 Mover/renombrar archivos o carpetas
- 🧩 Scripts/herramientas/configuración
- 🛠️ Cambio menor de configuración/tooling
- 🌐 Cambios de i18n/l10n
- ✏️ Corrección de typos
- ⏪️ Revertir cambios
- 🔀 Merge de branches
- 💄 Pulir UI/UX
- 🧹 Limpiar código/archivos
- 🧵 Cambios de concurrencia/hilos
- 🛡️ Agregar validaciones extra
- ⚰️ Eliminación de código muerto
- 🩹 Hotfix/parche rápido
- 🗃️ Cambios/migraciones de BD
- 🏗️ WIP (Trabajo en progreso)
- 🚨 Correcciones de lint/warnings
- 📸 Snapshots de tests visuales
- 🚧 Código temporal/incompleto
- 🏷️ Tipos, etiquetas o cambios de nombres

### ⚠️ CRITICAL COMMIT RULES:
- **NEVER add credits to Claude Code, Anthropic, or any AI assistant**
- **NEVER include "Generated with Claude Code" or similar in commit messages**
- **NEVER add "Co-Authored-By: Claude" or similar references**
- All code is reviewed and supervised by the company
- Copyright belongs exclusively to the company and its human collaborators
- Commits must be descriptive but without AI tool references

## Development Commands

```bash
# Start development server
npm run dev
# or
cd dashboard-nextjs && npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

The development server runs at http://localhost:3000

## Project Structure

- `dashboard-nextjs/` - Main application directory
  - `app/` - Next.js App Router directory containing routes and layouts
    - `(dashboard)/` - Route group for authenticated dashboard pages
      - `layout.tsx` - Dashboard layout with sidebar provider and navigation
      - `page.tsx` - Dashboard home page with metrics, server status, and alerts
      - `azure-resources/page.tsx` - Azure resources monitoring and management
      - `sql-performance/page.tsx` - SQL Server performance monitoring
    - `api/` - API routes for backend endpoints
    - `login/page.tsx` - Authentication login page
    - `layout.tsx` - Root layout wrapper
    - `globals.css` - Global styles with Tailwind directives and custom color scheme
  - `components/` - React components
    - `app-sidebar.tsx` - Main sidebar navigation component with IT-focused menu items
    - `auth-guard.tsx` - Authentication guard for protected routes
    - `azure-service-icon.tsx` - Azure service icon mapper component
    - `error-boundary.tsx` - Error boundary for graceful error handling
    - `sync-button.tsx` - Cosmos DB sync trigger button
    - `sync-conflicts-dialog.tsx` - Conflict resolution modal
    - `sync-logs-terminal.tsx` - Sync logs display component
    - `graceful-degradation.tsx` - Fallback UI component
    - `ui/` - shadcn/ui component library (card, badge, button, avatar, dropdown, sidebar, table, select, etc.)
  - `lib/` - Utility functions and data layers
    - `utils.ts` - Helper functions (cn utility for class merging)
    - `azure/` - Azure-related utilities
      - `transformer.ts` - Azure data transformation logic
    - `data/` - Data layer and loaders
      - `sql-data-loader.ts` - SQL data loading utilities
      - `mock-sql-data.ts` - Mock SQL performance data
    - `db/` - Cosmos DB integration layer
      - `cosmos-client.ts` - Singleton Cosmos DB client
      - `init.ts` - Database initialization and setup
      - `schemas.ts` - Zod validation schemas
      - `queries.ts` - Common database queries
      - `sync-helpers.ts` - Sync logic and conflict detection
    - `logger/` - Logging infrastructure
      - `index.ts` - Pino logger configuration
    - `services/` - Business logic services
      - `azure-service.ts` - Azure resource service
      - `sync-service.ts` - Cosmos DB sync service
    - `types/` - TypeScript type definitions
      - `azure.ts` - Azure resource types
      - `sql.ts` - SQL performance types
      - `database.ts` - Database schema types
      - `sync-logs.ts` - Sync log types
    - `validation/` - Schema validation
      - `azure-schemas.ts` - Zod schemas for Azure resources
    - `utils/` - Additional utilities
      - `retry.ts` - Retry logic for API calls
  - `hooks/` - Custom React hooks
    - `use-mobile.ts` - Mobile detection hook for responsive sidebar
  - `public/` - Static assets (SVG icons)
  - `scripts/` - Azure CLI automation scripts
    - `fetch-azure-resources.sh` - Fetch Azure resources data
    - `extract-devops-metadata.sh` - Extract Azure DevOps metadata
    - `enrich-with-participants.sh` - Fetch project participants
    - `enrich-with-devops.sh` - Enrich resources with DevOps data
  - `data/` - Generated data files
    - `azure-raw.json` - Raw Azure resources
    - `azure-devops-mappings.json` - DevOps project mappings
    - `azure-participants.json` - Project participants data
  - `middleware.ts` - Next.js middleware for authentication
  - `.env.example` - Environment variables template
  - `next.config.ts` - Next.js configuration
  - `tsconfig.json` - TypeScript configuration with `@/*` path alias
  - `eslint.config.mjs` - ESLint configuration using Next.js presets
  - `postcss.config.mjs` - PostCSS configuration for Tailwind CSS 4
  - `components.json` - shadcn/ui configuration file

## TypeScript Configuration

- Path alias `@/*` maps to the root directory
- Target: ES2017
- JSX: react-jsx (React 19 automatic runtime)
- Strict mode enabled
- Module resolution: bundler

## UI Architecture

### shadcn/ui Integration

The project uses shadcn/ui as the component library. To add new components:

```bash
npx shadcn@latest add [component-name]
```

Current installed components: sidebar, card, button, avatar, dropdown-menu, separator, badge, sheet, tooltip, input, skeleton, label, select, table

### Design System

**Color Palette**: Navy blue monochromatic corporate theme using OKLCH color space
- Primary colors use hue 240 (navy blue) with varying lightness and chroma
- Light mode: Light backgrounds with dark navy accents
- Dark mode: Dark navy backgrounds with lighter accents
- Sidebar uses darker navy tones for professional appearance

**Color Variables** (defined in `app/globals.css`):
- `--primary`: Main navy blue for buttons and key actions
- `--secondary`: Lighter navy for secondary elements
- `--accent`: Mid-tone navy for highlights
- `--sidebar`: Dark navy background for sidebar
- `--sidebar-primary`: Accent color for active sidebar items
- All colors support both light and dark modes

### Layout Structure

The application uses a persistent sidebar layout:
- `SidebarProvider` wraps the entire app for state management
- `AppSidebar` component provides collapsible navigation
- `SidebarInset` contains the main content area with header and content
- Sidebar is collapsible to icon-only mode
- Mobile-responsive with sheet overlay on smaller screens

### Navigation Structure

Main sections in sidebar:
- **Dashboard**: Main overview page with KPIs and metrics
- **Recursos Azure**: Azure resources monitoring with DevOps integration
- **SQL Performance**: SQL Server performance monitoring and analytics

## Dashboard Features

### Main Dashboard (`app/(dashboard)/page.tsx`)
The home page includes:
- **Metrics Overview**: 4 KPI cards showing active servers, users, storage, and uptime
- **Server Status**: Real-time monitoring table with CPU, RAM, and uptime for critical servers
- **Recent Alerts**: Timeline of system events with status indicators
- **Pending Tickets**: Summary of support tickets by priority
- **Scheduled Maintenance**: List of upcoming maintenance tasks

### Azure Resources (`app/(dashboard)/azure-resources/page.tsx`)
Azure infrastructure monitoring interface:
- **Resource Overview**: Summary of total Azure resources across subscriptions
- **Resource Table**: Detailed view with filtering and search capabilities
- **Resource Types**: Virtual Machines, Storage Accounts, SQL Databases, App Services, etc.
- **Service Icons**: Visual identification using Azure-specific icons
- **Real-time Data**: Integration with Azure CLI (`az resource list`) for live data
- **Mock Data Fallback**: Demonstration data when Azure CLI is not available

### SQL Performance (`app/(dashboard)/sql-performance/page.tsx`)
SQL Server performance monitoring dashboard:
- **Top 15 Stored Procedures**: By CPU consumption with execution metrics
- **Performance Charts**:
  - CPU vs Executions scatter plot for identifying performance outliers
  - 24-hour execution pattern timeline
- **Metrics Displayed**: Total CPU time, execution count, avg duration, last execution
- **Data Visualization**: Interactive charts using Recharts library

### Authentication
- **Login Page** (`app/login/page.tsx`): User authentication interface with email/password and SSO
- **Auth Guard** (`components/auth-guard.tsx`): Route protection for authenticated areas
- **Middleware** (`middleware.ts`): Server-side route protection
- Demo credentials: any email with password `demo123`
- SSO simulation with Microsoft branding
- Session stored in localStorage (mock implementation)

### Azure Cosmos DB Integration
- **Automatic Initialization**: Database and containers created on first sync
- **Smart Sync**: Detects new, updated, and deleted resources
- **Conflict Detection**: Field-by-field comparison between Azure and database
- **Conflict Resolution**: User-driven resolution with preview
- **Sync History**: Complete audit trail of all synchronizations
- **API Endpoints**:
  - `POST /api/sync/preview` - Preview changes without applying
  - `POST /api/sync/execute` - Execute sync with conflict resolutions

### Azure DevOps Integration
- **Repository Metadata**: Extracts Git repository information from App Services
- **Project Participants**: Displays team members with avatars
- **Build Pipelines**: Links to Azure DevOps build definitions
- **VSTSRM Metadata**: Uses Azure App Service metadata API for DevOps info
- **Scripts**: Automated data collection via Azure CLI and DevOps REST API

### Logging System
- **Pino Logger**: High-performance structured logging
- **Pretty Printing**: Human-readable logs in development
- **Log Levels**: Configurable via environment variables
- **Structured Data**: JSON-formatted logs for production

### Error Handling
- **Error Boundaries**: Graceful degradation for component errors
- **Fallback UI**: User-friendly error messages
- **Retry Logic**: Automatic retry for transient failures
- **Validation**: Zod schemas for runtime type safety

All data can use either live Azure data (via CLI/API) or mock data for demonstration.

## Styling

Uses Tailwind CSS 4 with PostCSS. Global styles are in `app/globals.css` with custom CSS variables for theming.

## Fonts

The project uses Geist (sans) and Geist Mono fonts loaded via `next/font/google` with CSS variables for font families.

## Adding New shadcn/ui Components

```bash
# Examples:
npx shadcn@latest add chart
npx shadcn@latest add form
npx shadcn@latest add dialog
npx shadcn@latest add tabs
```

## Environment Variables

Create a `.env.local` file in the `dashboard-nextjs/` directory:

```bash
# Azure Cosmos DB (optional)
AZURE_COSMOSDB_OPENIT=AccountEndpoint=https://your-account.documents.azure.com:443/;AccountKey=your-key;
COSMOS_DATABASE_NAME=openit
COSMOS_LOG_LEVEL=warn

# Azure DevOps (optional)
AZURE_DEVOPS_PAT=your-personal-access-token
```

**Required Permissions for Azure DevOps PAT:**
- Build (Read)
- Code (Read)
- Project and Team (Read)
- Identity (Read)

See [COSMOS_DB_SYNC.md](../COSMOS_DB_SYNC.md) and [AZURE_DEVOPS_INTEGRATION.md](../AZURE_DEVOPS_INTEGRATION.md) for detailed configuration.

## Architecture Patterns

### Route Groups
The application uses Next.js route groups for organizing routes:
- `(dashboard)/` - Authenticated dashboard pages with shared layout
- Routes outside groups like `/login` have independent layouts

### Data Layer Architecture
- **Types Layer** (`lib/types/`): TypeScript interfaces and type definitions
- **Data Layer** (`lib/data/`): Data loading, fetching, and mock data
- **Transformation Layer** (`lib/azure/transformer.ts`): Business logic for data transformation
- **Presentation Layer**: React components consume processed data

### Component Organization
- **UI Components** (`components/ui/`): Pure, reusable shadcn/ui components
- **Feature Components** (`components/`): Business logic components (auth-guard, app-sidebar)
- **Page Components** (`app/`): Route-level components that compose features

### Integration Points
- **Azure Integration**: Uses Azure CLI commands and REST API for real-time data
- **Azure DevOps**: REST API integration for repository and team data
- **Cosmos DB**: Full CRUD operations with conflict resolution
- **SQL Integration**: Ready for SQL Server connection via queries
- **API Routes** (`app/api/`): Backend endpoints for data fetching and processing
  - `/api/sync/preview` - Preview sync changes
  - `/api/sync/execute` - Execute database sync

### Data Collection Scripts

Automated scripts for Azure data collection:

```bash
# Fetch Azure resources
./scripts/fetch-azure-resources.sh

# Extract DevOps metadata from App Services
./scripts/extract-devops-metadata.sh

# Fetch project participants from Azure DevOps
./scripts/enrich-with-participants.sh

# Complete enrichment pipeline
./scripts/enrich-with-devops.sh
```

**Prerequisites:**
- Azure CLI installed and authenticated
- Azure DevOps PAT configured in environment
- Appropriate permissions on Azure subscriptions
