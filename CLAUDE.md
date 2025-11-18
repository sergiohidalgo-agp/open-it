# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 16 application with React 19, TypeScript 5, and Tailwind CSS 4. The project uses the Next.js App Router architecture with TypeScript for type safety.

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
    - `layout.tsx` - Root layout with Geist font configuration
    - `page.tsx` - Home page component
    - `globals.css` - Global styles with Tailwind directives
  - `public/` - Static assets (SVG icons)
  - `next.config.ts` - Next.js configuration
  - `tsconfig.json` - TypeScript configuration with `@/*` path alias
  - `eslint.config.mjs` - ESLint configuration using Next.js presets
  - `postcss.config.mjs` - PostCSS configuration for Tailwind CSS 4

## TypeScript Configuration

- Path alias `@/*` maps to the root directory
- Target: ES2017
- JSX: react-jsx (React 19 automatic runtime)
- Strict mode enabled
- Module resolution: bundler

## Styling

Uses Tailwind CSS 4 with PostCSS. Global styles are in `app/globals.css`. The project includes dark mode support via `dark:` class variants.

## Fonts

The project uses Geist (sans) and Geist Mono fonts loaded via `next/font/google` with CSS variables for font families.
