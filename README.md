# IT Infrastructure Dashboard

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16.0.3-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.0-61DAFB)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6)](https://www.typescriptlang.org/)

> **[English](#english)** | **[Español](#español)**

---

## English

A professional enterprise-grade IT infrastructure management dashboard built with modern web technologies and SOLID principles.

## 🏗️ Architecture

**Monorepo Structure** with strict SOLID principles implementation:
- Clean separation of concerns across all layers
- Atomic component design with single responsibilities
- Optimized for performance and maintainability
- Type-safe with TypeScript throughout

## 🚀 Tech Stack

All libraries are battle-tested, enterprise-backed, and actively maintained:

| Technology | Version | Enterprise Users | Purpose |
|------------|---------|------------------|---------|
| **Next.js** | 16.0.3 | Vercel, Netflix, TikTok, Twitch | React framework with App Router |
| **React** | 19.2.0 | Facebook, Instagram, Netflix, Uber | UI library |
| **TypeScript** | 5.x | Microsoft, Google, Slack, Airbnb | Type safety |
| **Tailwind CSS** | 4.x | GitHub, Shopify, Netflix, NASA | Utility-first CSS |
| **shadcn/ui** | Latest | Linear, Vercel, Cal.com | Component library (Radix UI) |
| **Lucide React** | Latest | 10k+ stars, active maintenance | Icon system |

## 📁 Project Structure

```
.
├── dashboard-nextjs/          # Main Next.js application
│   ├── app/                   # Next.js App Router
│   │   ├── layout.tsx        # Root layout with sidebar
│   │   ├── page.tsx          # Dashboard home
│   │   └── globals.css       # Global styles & theme
│   ├── components/           # React components
│   │   ├── app-sidebar.tsx  # Navigation sidebar
│   │   └── ui/              # shadcn/ui components
│   ├── lib/                 # Utilities
│   │   └── utils.ts         # Helper functions
│   └── hooks/               # Custom React hooks
├── CLAUDE.md                # AI assistant guidance
└── README.md               # This file
```

## 🎯 Core Principles

### SOLID Architecture
- **S**ingle Responsibility: Each module does one thing well
- **O**pen/Closed: Open for extension, closed for modification
- **L**iskov Substitution: Derived types are substitutable
- **I**nterface Segregation: No unused dependencies
- **D**ependency Inversion: Depend on abstractions

### Code Quality
- ✅ Minimal, efficient code
- ✅ Optimized performance
- ✅ Atomic responsibilities
- ✅ DRY principle
- ✅ Composition over inheritance
- ✅ Full type safety

## 🛠️ Setup & Installation

### Prerequisites
- Node.js 20+ (LTS recommended)
- npm 10+

### Quick Start

```bash
# Clone repository
git clone <repository-url>
cd open-it

# Navigate to application
cd dashboard-nextjs

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at **http://localhost:3000**

## 📜 Available Commands

```bash
# Development
npm run dev          # Start dev server with hot reload

# Production
npm run build        # Create optimized production build
npm start            # Start production server

# Code Quality
npm run lint         # Run ESLint
```

## 🎨 Design System

### Color Palette
- **Theme**: Navy blue monochromatic corporate design
- **Color Space**: OKLCH for perceptual uniformity
- **Modes**: Light and dark theme support
- **Customization**: CSS variables in `app/globals.css`

### Components
Built with **shadcn/ui** (based on Radix UI primitives):
- Fully accessible (WCAG 2.1 compliant)
- Keyboard navigation support
- Screen reader friendly
- Customizable and themeable

## 📊 Features

### Current Implementation
- ✅ Responsive sidebar navigation
- ✅ KPI metrics dashboard
- ✅ Server monitoring interface
- ✅ Alert system timeline
- ✅ Ticket management overview
- ✅ Maintenance scheduler
- ✅ Dark/light mode support
- ✅ Mobile-responsive design

### Coming Soon
- [ ] Real-time data integration
- [ ] Advanced data visualization
- [ ] User authentication
- [ ] API integration layer
- [ ] Database connectivity

## 🔧 Adding Components

shadcn/ui components can be added on-demand:

```bash
# Add a new component
npx shadcn@latest add [component-name]

# Examples
npx shadcn@latest add table
npx shadcn@latest add chart
npx shadcn@latest add form
```

## 📝 Development Guidelines

1. **Component Creation**: Follow atomic design principles
2. **Type Safety**: Always define TypeScript interfaces/types
3. **Styling**: Use Tailwind utility classes, avoid custom CSS
4. **State Management**: Keep state as local as possible
5. **Performance**: Use React.memo, useMemo, useCallback when needed
6. **Accessibility**: Ensure all UI is keyboard navigable and screen-reader friendly

## 🧪 Testing Strategy

```bash
# Unit tests (coming soon)
npm run test

# E2E tests (coming soon)
npm run test:e2e

# Type checking
npx tsc --noEmit
```

## 📚 Documentation

- **CLAUDE.md**: Detailed technical documentation and AI assistant guidance
- **Component Docs**: See `components/ui/` for individual component usage
- **Type Definitions**: Full TypeScript definitions in source files

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

**Key requirements:**
1. Follow SOLID principles strictly
2. Ensure all libraries meet enterprise standards
3. Write minimal, optimized code
4. Update documentation for any changes
5. Maintain type safety throughout
6. Follow our [Git Commit Conventions](#git-conventions) (Gitmoji + Spanish)

## 🐛 Bug Reports & Feature Requests

Please use [GitHub Issues](../../issues) to report bugs or request features.

## 📄 License

This project is licensed under the [MIT License](LICENSE) - see the LICENSE file for details.

## 🙏 Acknowledgments

Built with enterprise-grade open source technologies:
- [Next.js](https://nextjs.org/) by Vercel
- [React](https://reactjs.org/) by Meta
- [Tailwind CSS](https://tailwindcss.com/) by Tailwind Labs
- [shadcn/ui](https://ui.shadcn.com/) by shadcn
- [Radix UI](https://www.radix-ui.com/) by WorkOS
- [Lucide Icons](https://lucide.dev/) by the Lucide community

## 📞 Support

For support, please open an issue or contact the maintainers.

---

## Español

Un dashboard profesional de nivel empresarial para gestión de infraestructura TI, construido con tecnologías web modernas y principios SOLID.

## 🏗️ Arquitectura

**Estructura Monorepo** con implementación estricta de principios SOLID:
- Separación limpia de responsabilidades en todas las capas
- Diseño de componentes atómicos con responsabilidades únicas
- Optimizado para rendimiento y mantenibilidad
- Type-safe con TypeScript en todo el código

## 🚀 Stack Tecnológico

Todas las librerías están probadas en batalla, respaldadas por empresas y mantenidas activamente:

| Tecnología | Versión | Usuarios Empresariales | Propósito |
|------------|---------|------------------------|-----------|
| **Next.js** | 16.0.3 | Vercel, Netflix, TikTok, Twitch | Framework React con App Router |
| **React** | 19.2.0 | Facebook, Instagram, Netflix, Uber | Librería UI |
| **TypeScript** | 5.x | Microsoft, Google, Slack, Airbnb | Seguridad de tipos |
| **Tailwind CSS** | 4.x | GitHub, Shopify, Netflix, NASA | CSS utility-first |
| **shadcn/ui** | Latest | Linear, Vercel, Cal.com | Librería de componentes (Radix UI) |
| **Lucide React** | Latest | 10k+ estrellas, mantenimiento activo | Sistema de iconos |

## 📁 Estructura del Proyecto

```
.
├── dashboard-nextjs/          # Aplicación Next.js principal
│   ├── app/                   # Next.js App Router
│   │   ├── layout.tsx        # Layout raíz con sidebar
│   │   ├── page.tsx          # Página principal del dashboard
│   │   └── globals.css       # Estilos globales y tema
│   ├── components/           # Componentes React
│   │   ├── app-sidebar.tsx  # Sidebar de navegación
│   │   └── ui/              # Componentes shadcn/ui
│   ├── lib/                 # Utilidades
│   │   └── utils.ts         # Funciones helper
│   └── hooks/               # Custom React hooks
├── CLAUDE.md                # Guía para asistente IA
└── README.md               # Este archivo
```

## 🎯 Principios Fundamentales

### Arquitectura SOLID
- **S**ingle Responsibility: Cada módulo hace una cosa bien
- **O**pen/Closed: Abierto para extensión, cerrado para modificación
- **L**iskov Substitution: Los tipos derivados son sustituibles
- **I**nterface Segregation: Sin dependencias no utilizadas
- **D**ependency Inversion: Depende de abstracciones

### Calidad de Código
- ✅ Código mínimo y eficiente
- ✅ Rendimiento optimizado
- ✅ Responsabilidades atómicas
- ✅ Principio DRY
- ✅ Composición sobre herencia
- ✅ Type safety completo

## 🛠️ Instalación y Configuración

### Prerequisitos
- Node.js 20+ (se recomienda LTS)
- npm 10+

### Inicio Rápido

```bash
# Clonar repositorio
git clone <repository-url>
cd open-it

# Navegar a la aplicación
cd dashboard-nextjs

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

La aplicación estará disponible en **http://localhost:3000**

## 📜 Comandos Disponibles

```bash
# Desarrollo
npm run dev          # Iniciar servidor dev con hot reload

# Producción
npm run build        # Crear build optimizado para producción
npm start            # Iniciar servidor de producción

# Calidad de Código
npm run lint         # Ejecutar ESLint
```

## 🎨 Sistema de Diseño

### Paleta de Colores
- **Tema**: Diseño corporativo monocromático azul marino
- **Espacio de Color**: OKLCH para uniformidad perceptual
- **Modos**: Soporte para tema claro y oscuro
- **Personalización**: Variables CSS en `app/globals.css`

### Componentes
Construido con **shadcn/ui** (basado en primitivos Radix UI):
- Completamente accesible (WCAG 2.1 compliant)
- Soporte de navegación por teclado
- Amigable con lectores de pantalla
- Personalizable y tematizable

## 📊 Características

### Implementación Actual
- ✅ Navegación sidebar responsive
- ✅ Dashboard de métricas KPI
- ✅ Interfaz de monitoreo de servidores
- ✅ Línea de tiempo del sistema de alertas
- ✅ Resumen de gestión de tickets
- ✅ Programador de mantenimiento
- ✅ Soporte modo claro/oscuro
- ✅ Diseño mobile-responsive

### Próximamente
- [ ] Integración de datos en tiempo real
- [ ] Visualización avanzada de datos
- [ ] Autenticación de usuarios
- [ ] Capa de integración API
- [ ] Conectividad con base de datos

## 🔧 Agregando Componentes

Los componentes shadcn/ui se pueden agregar bajo demanda:

```bash
# Agregar un nuevo componente
npx shadcn@latest add [component-name]

# Ejemplos
npx shadcn@latest add table
npx shadcn@latest add chart
npx shadcn@latest add form
```

## 📝 Guías de Desarrollo

1. **Creación de Componentes**: Seguir principios de diseño atómico
2. **Type Safety**: Siempre definir interfaces/types de TypeScript
3. **Estilos**: Usar clases utility de Tailwind, evitar CSS personalizado
4. **Gestión de Estado**: Mantener el estado lo más local posible
5. **Rendimiento**: Usar React.memo, useMemo, useCallback cuando sea necesario
6. **Accesibilidad**: Asegurar que toda la UI sea navegable por teclado y amigable con lectores de pantalla

## 🧪 Estrategia de Testing

```bash
# Tests unitarios (próximamente)
npm run test

# Tests E2E (próximamente)
npm run test:e2e

# Verificación de tipos
npx tsc --noEmit
```

## 📚 Documentación

- **CLAUDE.md**: Documentación técnica detallada y guía para asistente IA
- **Docs de Componentes**: Ver `components/ui/` para uso de componentes individuales
- **Definiciones de Tipos**: Definiciones completas de TypeScript en archivos fuente

## 🤝 Contribuyendo

¡Damos la bienvenida a contribuciones! Por favor consulta nuestras [Guías de Contribución](CONTRIBUTING.md) para detalles.

**Requisitos clave:**
1. Seguir principios SOLID estrictamente
2. Asegurar que todas las librerías cumplan estándares empresariales
3. Escribir código mínimo y optimizado
4. Actualizar documentación para cualquier cambio
5. Mantener type safety en todo momento
6. Seguir nuestras [Convenciones de Commit Git](#git-conventions) (Gitmoji + Español)

<a name="git-conventions"></a>
### Convenciones de Commit Git

**Formato:** `[emoji] Descripción corta en español`

Ver [CLAUDE.md](CLAUDE.md#git-commit-conventions) para la lista completa de emojis Gitmoji.

## 🐛 Reportes de Bugs y Solicitudes de Features

Por favor usa [GitHub Issues](../../issues) para reportar bugs o solicitar features.

## 📄 Licencia

Este proyecto está licenciado bajo la [Licencia MIT](LICENSE) - ver el archivo LICENSE para detalles.

## 🙏 Agradecimientos

Construido con tecnologías open source de nivel empresarial:
- [Next.js](https://nextjs.org/) por Vercel
- [React](https://reactjs.org/) por Meta
- [Tailwind CSS](https://tailwindcss.com/) por Tailwind Labs
- [shadcn/ui](https://ui.shadcn.com/) por shadcn
- [Radix UI](https://www.radix-ui.com/) por WorkOS
- [Lucide Icons](https://lucide.dev/) por la comunidad Lucide

## 📞 Soporte

Para soporte, por favor abre un issue o contacta a los mantenedores.

---

**Construido con estándares empresariales, optimizado para rendimiento, diseñado para escalar.**
