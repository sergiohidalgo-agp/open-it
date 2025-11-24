import type { StoredProcedureStats, ExecutionPattern } from "@/lib/types/sql"
import rawData from "@/data/query-1.json"

/**
 * Transformer de datos reales de SQL Server
 * Convierte los datos del JSON (strings) a números y genera patrones de ejecución
 */

interface RawSPData {
  DatabaseName: string
  ProcedureName: string
  ExecutionCount: string
  TotalCPUSeconds: number
  TotalElapsedSeconds: number
  AvgCPUSeconds: number
  AvgElapsedSeconds: number
  TotalReads: string
  TotalWrites: string
  LastExecutionTime: string
  CachedTime: string
  ImpactScore: number
}

// Transformar datos raw a formato interno
const transformSPData = (raw: RawSPData): StoredProcedureStats => ({
  DatabaseName: raw.DatabaseName,
  ProcedureName: raw.ProcedureName,
  ExecutionCount: parseInt(raw.ExecutionCount, 10),
  TotalCPUSeconds: raw.TotalCPUSeconds,
  TotalElapsedSeconds: raw.TotalElapsedSeconds,
  AvgCPUSeconds: raw.AvgCPUSeconds,
  AvgElapsedSeconds: raw.AvgElapsedSeconds,
  TotalReads: parseInt(raw.TotalReads, 10),
  TotalWrites: parseInt(raw.TotalWrites, 10),
  LastExecutionTime: raw.LastExecutionTime,
  CachedTime: raw.CachedTime,
  ImpactScore: raw.ImpactScore,
})

// Cargar y transformar todos los datos
export const storedProcedures: StoredProcedureStats[] = (rawData as RawSPData[])
  .map(transformSPData)
  .sort((a, b) => b.TotalCPUSeconds - a.TotalCPUSeconds)

// Extraer bases de datos únicas
export const uniqueDatabases = [...new Set(storedProcedures.map(sp => sp.DatabaseName))].sort()

/**
 * Generar patrones de ejecución por hora (sintético)
 * Basado en los datos de ejecución total y patrones típicos de uso
 */
export const generateExecutionPatterns = (): ExecutionPattern[] => {
  const patterns: ExecutionPattern[] = []

  // Agrupar SPs por base de datos
  const spsByDatabase = storedProcedures.reduce((acc, sp) => {
    if (!acc[sp.DatabaseName]) {
      acc[sp.DatabaseName] = []
    }
    acc[sp.DatabaseName].push(sp)
    return acc
  }, {} as Record<string, StoredProcedureStats[]>)

  // Generar patrón para cada hora y base de datos
  uniqueDatabases.forEach(dbName => {
    const dbSPs = spsByDatabase[dbName] || []
    const totalExecutions = dbSPs.reduce((sum, sp) => sum + sp.ExecutionCount, 0)

    for (let hour = 0; hour < 24; hour++) {
      // Distribución horaria basada en patrones típicos:
      // - Madrugada (0-6): 3-8% del total
      // - Mañana (6-9): 10-15% (inicio jornada)
      // - Horario pico (9-18): 15-20% por hora
      // - Tarde (18-22): 8-12%
      // - Noche (22-24): 4-8%

      let hourlyFactor: number

      if (hour >= 0 && hour < 6) {
        // Madrugada - batch jobs
        hourlyFactor = 0.03 + Math.random() * 0.05
      } else if (hour >= 6 && hour < 9) {
        // Inicio de jornada
        hourlyFactor = 0.10 + Math.random() * 0.05
      } else if (hour >= 9 && hour < 18) {
        // Horario pico laboral
        hourlyFactor = 0.15 + Math.random() * 0.05
      } else if (hour >= 18 && hour < 22) {
        // Tarde
        hourlyFactor = 0.08 + Math.random() * 0.04
      } else {
        // Noche
        hourlyFactor = 0.04 + Math.random() * 0.04
      }

      // Aplicar variación adicional para bases de datos específicas
      if (dbName === "AGP_SCRAPING") {
        // Scraping puede tener más actividad nocturna
        if (hour >= 0 && hour < 6) {
          hourlyFactor *= 1.5
        }
      }

      const executionsInHour = Math.floor(totalExecutions * hourlyFactor / 24)

      patterns.push({
        ExecutionHour: hour,
        ExecutionsInPeriod: executionsInHour,
        DatabaseName: dbName,
      })
    }
  })

  return patterns
}

// Top 15 SPs por CPU
export const getTop15ByCPU = (): StoredProcedureStats[] => {
  return storedProcedures.slice(0, 15)
}

// Todos los SPs para gráfico de dispersión
export const getScatterData = (): StoredProcedureStats[] => {
  return storedProcedures
}

// Patrones de ejecución por hora
export const getExecutionPatternsByHour = (): ExecutionPattern[] => {
  return generateExecutionPatterns()
}

// Estadísticas generales
export const getSummaryStats = () => {
  const totalSPs = storedProcedures.length
  const totalCPU = storedProcedures.reduce((sum, sp) => sum + sp.TotalCPUSeconds, 0)
  const totalExecutions = storedProcedures.reduce((sum, sp) => sum + sp.ExecutionCount, 0)
  const avgCPU = storedProcedures.reduce((sum, sp) => sum + sp.AvgCPUSeconds, 0) / totalSPs

  return {
    totalSPs,
    totalCPU,
    totalExecutions,
    avgCPU,
    databases: uniqueDatabases.length,
  }
}
