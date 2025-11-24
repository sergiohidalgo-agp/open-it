# SQL Server Performance Monitoring

## Resumen

Dashboard de monitoreo de performance para Stored Procedures de SQL Server 2016, construido con React, TypeScript y Recharts.

## Ubicación

- **Ruta**: `/sql-performance`
- **Archivo**: `app/(dashboard)/sql-performance/page.tsx`
- **Navegación**: Sidebar > "SQL Performance"

## Características Implementadas

### 1. Gráfico de Barras Horizontal - Top 15 SPs por CPU

**Propósito**: Identificar los stored procedures con mayor consumo de CPU.

**Características**:
- Barras horizontales ordenadas por `TotalCPUSeconds` (descendente)
- Color degradado basado en `ExecutionCount` (más oscuro = más ejecuciones)
- Tooltip interactivo mostrando:
  - Nombre del procedimiento
  - Base de datos
  - CPU Total y Promedio
  - Número de ejecuciones

**Implementación**:
```tsx
<BarChart layout="vertical" data={top15Data}>
  <Bar dataKey="TotalCPUSeconds">
    {/* Colores dinámicos por ExecutionCount */}
  </Bar>
</BarChart>
```

### 2. Gráfico de Dispersión - CPU vs Ejecuciones

**Propósito**: Detectar outliers y patrones de consumo anormales.

**Características**:
- Eje X: `ExecutionCount` (escala logarítmica)
- Eje Y: `TotalCPUSeconds`
- Tamaño de burbuja: `TotalReads` (lecturas de disco)
- Color: `DatabaseName` (agrupación por base de datos)
- Tooltip mostrando métricas detalladas

**Implementación**:
```tsx
<ScatterChart>
  <XAxis scale="log" dataKey="ExecutionCount" />
  <YAxis dataKey="TotalCPUSeconds" />
  <ZAxis dataKey="TotalReads" range={[50, 500]} />
  {/* Un scatter por cada base de datos */}
</ScatterChart>
```

**Interpretación**:
- **Punto grande arriba a la derecha**: Alto CPU + muchas ejecuciones + muchas lecturas → Candidato a optimización prioritaria
- **Punto pequeño arriba a la izquierda**: Alto CPU + pocas ejecuciones → Revisar lógica interna del SP
- **Punto grande abajo**: Muchas lecturas pero bajo CPU → Posible cache hit o queries simples

### 3. Gráfico de Área Apilada - Patrón de Ejecución 24h

**Propósito**: Visualizar patrones de uso horario y picos de carga.

**Características**:
- Eje X: Hora del día (0-23)
- Eje Y: Número de ejecuciones
- Áreas apiladas por `DatabaseName`
- Tooltip agregado mostrando total por hora

**Implementación**:
```tsx
<AreaChart data={areaChartData}>
  {databases.map(db =>
    <Area
      dataKey={db}
      stackId="1"
      fill={databaseColors[db]}
    />
  )}
</AreaChart>
```

**Patrones típicos identificables**:
- **Madrugada (00:00-06:00)**: Batch jobs y mantenimiento
- **Horario laboral (08:00-18:00)**: Pico de transacciones de usuarios
- **Noche (18:00-00:00)**: Reportes y procesos asíncronos

## KPIs Principales

### Total SPs
- **Descripción**: Número total de stored procedures monitoreados
- **Fuente**: `scatterData.length`

### CPU Total
- **Descripción**: Suma total de CPU consumida por todos los SPs
- **Unidad**: Segundos
- **Fuente**: `sum(TotalCPUSeconds)`

### Ejecuciones
- **Descripción**: Total de ejecuciones acumuladas
- **Fuente**: `sum(ExecutionCount)`

### Avg CPU
- **Descripción**: CPU promedio por ejecución
- **Unidad**: Segundos
- **Cálculo**: `sum(AvgCPUSeconds) / count(SPs)`

## Origen de Datos

### Query SQL (Producción)

```sql
-- Top 30 SPs consumidores de CPU
SELECT TOP 30
    DB_NAME(ps.database_id) AS DatabaseName,
    OBJECT_SCHEMA_NAME(ps.object_id, ps.database_id) + '.' +
    OBJECT_NAME(ps.object_id, ps.database_id) AS ProcedureName,
    ps.execution_count AS ExecutionCount,
    ps.total_worker_time/1000000.0 AS TotalCPUSeconds,
    ps.total_elapsed_time/1000000.0 AS TotalElapsedSeconds,
    ps.total_worker_time/1000000.0/NULLIF(ps.execution_count,0) AS AvgCPUSeconds,
    ps.total_elapsed_time/1000000.0/NULLIF(ps.execution_count,0) AS AvgElapsedSeconds,
    ps.total_logical_reads AS TotalReads,
    ps.total_logical_writes AS TotalWrites,
    ps.last_execution_time AS LastExecutionTime,
    ps.cached_time AS CachedTime,
    (ps.execution_count * 0.3 +
     ps.total_worker_time/1000000.0 * 0.4 +
     ps.total_logical_reads/1000000.0 * 0.3) AS ImpactScore
FROM sys.dm_exec_procedure_stats ps
WHERE ps.database_id > 4  -- Excluir bases del sistema
    AND ps.object_id > 0
ORDER BY ps.total_worker_time DESC;
```

### DMVs Utilizadas

- **`sys.dm_exec_procedure_stats`**: Estadísticas de ejecución de stored procedures
  - Se resetea cuando el plan sale del cache
  - Acumulativa desde el último reinicio de SQL Server
  - Solo incluye SPs compilados (no ad-hoc queries)

### Datos Reales (Producción)

**Archivos**:
- `data/query-1.json` - Datos extraídos de SQL Server
- `lib/data/sql-data-loader.ts` - Loader y transformer de datos

**Origen**:
- 30 stored procedures reales de producción
- 5 bases de datos: AGP_PRO, AGP_SCRAPING, AGP_SRCeI, GYP_PRO, AGP_HIPOTECARIO
- Datos extraídos de `sys.dm_exec_procedure_stats`
- Patrones de ejecución generados sintéticamente basados en datos reales

## Tipos TypeScript

**Archivo**: `lib/types/sql.ts`

```typescript
interface StoredProcedureStats {
  DatabaseName: string
  ProcedureName: string
  ExecutionCount: number
  TotalCPUSeconds: number
  TotalElapsedSeconds: number
  AvgCPUSeconds: number
  AvgElapsedSeconds: number
  TotalReads: number
  TotalWrites: number
  LastExecutionTime: string
  CachedTime: string
  ImpactScore: number
}

interface ExecutionPattern {
  ExecutionHour: number
  ExecutionsInPeriod: number
  DatabaseName: string
}
```

## Paleta de Colores

Navy blue theme consistente con el diseño del dashboard:

```typescript
const databaseColors = {
  AGP_PRO: "hsl(220, 70%, 50%)",           // Navy blue - Base principal
  AGP_SCRAPING: "hsl(200, 70%, 50%)",      // Cyan blue - Scraping
  AGP_SRCeI: "hsl(180, 70%, 50%)",         // Turquoise - SRCeI
  GYP_PRO: "hsl(260, 70%, 50%)",           // Purple - GYP
  AGP_HIPOTECARIO: "hsl(280, 70%, 50%)",   // Violet - Hipotecario
}
```

## Accesibilidad

- Tooltips interactivos en todos los gráficos
- Formato de números localizados (`toLocaleString()`)
- Colores con contraste suficiente (WCAG 2.1 AA)
- Labels descriptivos en ejes
- Responsive design (funciona en mobile)

## Performance

### Optimizaciones Implementadas

1. **Hidratación controlada**:
   - `useState` + `useEffect` para evitar mismatch client/server
   - KPIs muestran "—" durante hidratación

2. **Cálculos pre-procesados**:
   - Datos se calculan una vez al cargar el componente
   - No se recalculan en cada render

3. **Memoization (futura)**:
   ```typescript
   // TODO: Implementar cuando tengamos datos reales
   const top15Data = useMemo(() => getTop15ByCPU(), [rawData])
   ```

## Actualización de Datos

### Método Actual (JSON Estático)

1. Ejecutar la query SQL en SQL Server Management Studio
2. Exportar resultados como JSON:
   ```sql
   -- Agregar FOR JSON AUTO al final de la query
   FOR JSON AUTO;
   ```
3. Guardar el JSON en `dashboard-nextjs/data/query-1.json`
4. El dashboard se recargará automáticamente

### Transformer de Datos

El archivo `lib/data/sql-data-loader.ts` realiza:
- Conversión de strings a números (ExecutionCount, TotalReads, TotalWrites)
- Ordenamiento por TotalCPUSeconds
- Extracción de bases de datos únicas
- Generación de patrones de ejecución sintéticos basados en:
  - Horario laboral (9-18h): 15-20% actividad
  - Inicio jornada (6-9h): 10-15% actividad
  - Madrugada (0-6h): 3-8% actividad (batch jobs)
  - Noche (22-24h): 4-8% actividad

## Integración con SQL Server en Tiempo Real (Futuro)

### Endpoint API Sugerido

```typescript
// app/api/sql/performance/route.ts
export async function GET(request: Request) {
  // 1. Conectar a SQL Server
  // 2. Ejecutar query de performance
  // 3. Transformar datos
  // 4. Retornar JSON

  return Response.json({
    success: true,
    data: storedProcedures,
    executionPatterns: patterns,
  })
}
```

### Cliente HTTP

```typescript
// En el componente
useEffect(() => {
  fetch('/api/sql/performance')
    .then(res => res.json())
    .then(data => {
      setStoredProcedures(data.data)
      setExecutionPatterns(data.executionPatterns)
    })
}, [])
```

## Próximos Pasos

### Fase 2 - Análisis Avanzado
- [ ] Tabla detallada de SPs con filtros y búsqueda
- [ ] Drill-down por SP individual con query plan
- [ ] Comparación temporal (día vs semana vs mes)
- [ ] Alertas automáticas para SPs anómalos

### Fase 3 - Optimización
- [ ] Sugerencias automáticas de índices
- [ ] Detección de missing indexes
- [ ] Análisis de parameter sniffing
- [ ] Recomendaciones de recompilación

### Fase 4 - Monitoreo en Tiempo Real
- [ ] WebSocket para actualizaciones live
- [ ] Notificaciones push para degradación de performance
- [ ] Dashboard de comparación histórica

## Referencias

- [SQL Server DMVs Documentation](https://docs.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-views/)
- [Recharts Documentation](https://recharts.org/)
- [Next.js App Router](https://nextjs.org/docs/app)

---

## Resumen de Implementación

### ✅ Completado
- Dashboard interactivo con 3 tipos de gráficos
- Integración con datos reales de SQL Server
- 30 stored procedures monitoreados
- 5 bases de datos en producción
- KPIs calculados dinámicamente
- Paleta de colores corporativa
- Responsive design
- Tooltips interactivos y accesibles

### 📊 Métricas Actuales
- **Total SPs**: 30
- **Bases de Datos**: 5 (AGP_PRO, AGP_SCRAPING, AGP_SRCeI, GYP_PRO, AGP_HIPOTECARIO)
- **Rango ExecutionCount**: 12 - 16,585,551
- **Rango TotalCPUSeconds**: 5,220 - 992,005

---

**Autor**: IT Infrastructure Team
**Última actualización**: 2025-11-19
**Versión**: 1.1.0 (Datos reales integrados)
