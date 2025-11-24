"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Database, Activity, Clock, TrendingUp } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  AreaChart,
  Area,
  Cell,
} from "recharts"
import { getTop15ByCPU, getScatterData, getExecutionPatternsByHour, uniqueDatabases } from "@/lib/data/sql-data-loader"
import type { StoredProcedureStats, ExecutionPattern } from "@/lib/types/sql"

// Paleta de colores para databases (navy blue theme) - Bases de datos reales
const databaseColors: Record<string, string> = {
  AGP_PRO: "hsl(220, 70%, 50%)",           // Navy blue - Base principal
  AGP_SCRAPING: "hsl(200, 70%, 50%)",      // Cyan blue - Scraping
  AGP_SRCeI: "hsl(180, 70%, 50%)",         // Turquoise - SRCeI
  GYP_PRO: "hsl(260, 70%, 50%)",           // Purple - GYP
  AGP_HIPOTECARIO: "hsl(280, 70%, 50%)",   // Violet - Hipotecario
}

// Generar color degradado basado en ExecutionCount
const getColorByExecutionCount = (count: number, maxCount: number): string => {
  const intensity = count / maxCount
  const hue = 220 // Navy blue
  const lightness = 70 - intensity * 30 // Más oscuro = más ejecuciones
  return `hsl(${hue}, 70%, ${lightness}%)`
}

export default function SQLPerformancePage() {
  const [mounted, setMounted] = useState(false)
  const top15Data = getTop15ByCPU()
  const scatterData = getScatterData()
  const executionPatterns = getExecutionPatternsByHour()

  // Calcular máximo de ExecutionCount para degradado
  const maxExecutionCount = Math.max(...top15Data.map(sp => sp.ExecutionCount))

  // Calcular KPIs
  const totalCPU = scatterData.reduce((sum, sp) => sum + sp.TotalCPUSeconds, 0)
  const totalExecutions = scatterData.reduce((sum, sp) => sum + sp.ExecutionCount, 0)
  const avgCPU = scatterData.reduce((sum, sp) => sum + sp.AvgCPUSeconds, 0) / scatterData.length

  useEffect(() => {
    setMounted(true)
  }, [])

  // Preparar datos para gráfico de dispersión
  const scatterChartData = scatterData.map(sp => ({
    name: sp.ProcedureName,
    ExecutionCount: sp.ExecutionCount,
    TotalCPUSeconds: sp.TotalCPUSeconds,
    TotalReads: sp.TotalReads,
    DatabaseName: sp.DatabaseName,
    AvgCPUSeconds: sp.AvgCPUSeconds,
  }))

  // Preparar datos para gráfico de área (agrupar por hora)
  const areaChartData = Array.from({ length: 24 }, (_, hour) => {
    const hourData: { hour: number; [key: string]: number } = { hour }

    executionPatterns
      .filter(pattern => pattern.ExecutionHour === hour)
      .forEach(pattern => {
        hourData[pattern.DatabaseName] = pattern.ExecutionsInPeriod
      })

    return hourData
  })

  // Custom tooltip para barras
  const CustomBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as StoredProcedureStats
      return (
        <div className="bg-popover border border-border rounded-lg shadow-lg p-3 text-xs">
          <p className="font-semibold text-foreground mb-2">{data.ProcedureName}</p>
          <div className="space-y-1 text-muted-foreground">
            <p><span className="font-medium">Base de datos:</span> {data.DatabaseName}</p>
            <p><span className="font-medium">CPU Total:</span> {data.TotalCPUSeconds.toFixed(2)}s</p>
            <p><span className="font-medium">Ejecuciones:</span> {data.ExecutionCount.toLocaleString()}</p>
            <p><span className="font-medium">CPU Promedio:</span> {data.AvgCPUSeconds.toFixed(4)}s</p>
          </div>
        </div>
      )
    }
    return null
  }

  // Custom tooltip para dispersión
  const CustomScatterTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-popover border border-border rounded-lg shadow-lg p-3 text-xs">
          <p className="font-semibold text-foreground mb-2">{data.name}</p>
          <div className="space-y-1 text-muted-foreground">
            <p><span className="font-medium">Base de datos:</span> {data.DatabaseName}</p>
            <p><span className="font-medium">Ejecuciones:</span> {data.ExecutionCount.toLocaleString()}</p>
            <p><span className="font-medium">CPU Total:</span> {data.TotalCPUSeconds.toFixed(2)}s</p>
            <p><span className="font-medium">CPU Promedio:</span> {data.AvgCPUSeconds.toFixed(4)}s</p>
            <p><span className="font-medium">Lecturas:</span> {(data.TotalReads / 1000000).toFixed(2)}M</p>
          </div>
        </div>
      )
    }
    return null
  }

  // Custom tooltip para área
  const CustomAreaTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, entry: any) => sum + entry.value, 0)
      return (
        <div className="bg-popover border border-border rounded-lg shadow-lg p-3 text-xs">
          <p className="font-semibold text-foreground mb-2">Hora: {label}:00</p>
          <div className="space-y-1 mb-2">
            <p className="font-medium text-muted-foreground">Total: {total.toLocaleString()} ejecuciones</p>
          </div>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-muted-foreground">{entry.name}:</span>
                <span className="font-medium">{entry.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SQL Server Performance</h1>
          <p className="text-muted-foreground mt-1">
            Monitoreo de Stored Procedures - SQL Server 2016
          </p>
        </div>
        <Badge variant="default" className="gap-2">
          <Database className="h-4 w-4" />
          {uniqueDatabases.length} Databases
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total SPs</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scatterData.length}</div>
            <p className="text-xs text-muted-foreground">Monitoreados activamente</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU Total</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mounted ? `${totalCPU.toFixed(0)}s` : '—'}
            </div>
            <p className="text-xs text-muted-foreground">Últimas 24 horas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ejecuciones</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mounted ? totalExecutions.toLocaleString() : '—'}
            </div>
            <p className="text-xs text-muted-foreground">Total acumulado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg CPU</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mounted ? `${avgCPU.toFixed(4)}s` : '—'}
            </div>
            <p className="text-xs text-muted-foreground">Por ejecución</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico 1: Top 15 SPs por CPU - Barras Horizontales */}
      <Card>
        <CardHeader>
          <CardTitle>Top 15 Stored Procedures por Consumo de CPU</CardTitle>
          <CardDescription>
            Barras coloreadas según número de ejecuciones (más oscuro = más ejecuciones)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={500}>
            <BarChart
              data={top15Data}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
              <YAxis
                type="category"
                dataKey="ProcedureName"
                width={200}
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: 11 }}
              />
              <Tooltip content={<CustomBarTooltip />} />
              <Legend />
              <Bar dataKey="TotalCPUSeconds" name="CPU Total (segundos)" radius={[0, 4, 4, 0]}>
                {top15Data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getColorByExecutionCount(entry.ExecutionCount, maxExecutionCount)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico 2: CPU vs Ejecuciones - Dispersión */}
      <Card>
        <CardHeader>
          <CardTitle>Relación CPU vs Ejecuciones</CardTitle>
          <CardDescription>
            Tamaño de burbuja = Total de lecturas. Color = Base de datos. Eje X en escala logarítmica.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                type="number"
                dataKey="ExecutionCount"
                name="Ejecuciones"
                scale="log"
                domain={['auto', 'auto']}
                stroke="hsl(var(--muted-foreground))"
                label={{ value: 'Ejecuciones (escala log)', position: 'insideBottom', offset: -10 }}
              />
              <YAxis
                type="number"
                dataKey="TotalCPUSeconds"
                name="CPU Total"
                stroke="hsl(var(--muted-foreground))"
                label={{ value: 'CPU Total (segundos)', angle: -90, position: 'insideLeft' }}
              />
              <ZAxis type="number" dataKey="TotalReads" range={[50, 500]} name="Lecturas" />
              <Tooltip content={<CustomScatterTooltip />} />
              <Legend />
              {Object.keys(databaseColors).map(dbName => (
                <Scatter
                  key={dbName}
                  name={dbName}
                  data={scatterChartData.filter(d => d.DatabaseName === dbName)}
                  fill={databaseColors[dbName]}
                  fillOpacity={0.7}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico 3: Patrón de Ejecución 24h - Área Apilada */}
      <Card>
        <CardHeader>
          <CardTitle>Patrón de Ejecución - Últimas 24 Horas</CardTitle>
          <CardDescription>
            Distribución de ejecuciones por base de datos a lo largo del día
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={areaChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="hour"
                stroke="hsl(var(--muted-foreground))"
                label={{ value: 'Hora del día', position: 'insideBottom', offset: -10 }}
                tickFormatter={(value) => `${value}:00`}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                label={{ value: 'Ejecuciones', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={<CustomAreaTooltip />} />
              <Legend />
              {Object.keys(databaseColors).map(dbName => (
                <Area
                  key={dbName}
                  type="monotone"
                  dataKey={dbName}
                  stackId="1"
                  stroke={databaseColors[dbName]}
                  fill={databaseColors[dbName]}
                  fillOpacity={0.6}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
