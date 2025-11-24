import type { StoredProcedureStats, ExecutionPattern } from "@/lib/types/sql"

/**
 * Datos mock realistas basados en sys.dm_exec_procedure_stats
 * Simula stored procedures de un sistema ERP/CRM típico
 */

const databases = ["ProductionDB", "SalesDB", "InventoryDB", "HRDB", "FinanceDB"]
const schemas = ["dbo", "sales", "inventory", "hr", "finance", "reporting"]

const procedureTypes = [
  "GetCustomerOrders",
  "UpdateInventory",
  "ProcessPayment",
  "GenerateReport",
  "SyncData",
  "CalculateTotals",
  "ValidateTransaction",
  "ExportData",
  "ImportBatch",
  "CleanupOldRecords",
  "RefreshMaterializedView",
  "AggregateMetrics",
  "SendNotifications",
  "BackupData",
  "ArchiveRecords",
]

// Generar timestamp realista (últimas 24 horas a 7 días)
const generateTimestamp = (hoursAgo: number): string => {
  const date = new Date()
  date.setHours(date.getHours() - hoursAgo)
  return date.toISOString()
}

// Generar datos mock de stored procedures
export const mockStoredProcedures: StoredProcedureStats[] = Array.from({ length: 30 }, (_, i) => {
  const database = databases[Math.floor(Math.random() * databases.length)]
  const schema = schemas[Math.floor(Math.random() * schemas.length)]
  const procType = procedureTypes[Math.floor(Math.random() * procedureTypes.length)]
  const procedureName = `${schema}.${procType}_${Math.random() > 0.5 ? 'v2' : 'v1'}`

  // Variar patrones de ejecución (algunos SP se ejecutan mucho, otros poco)
  const executionPattern = Math.random()
  let executionCount: number
  let totalCPU: number
  let totalReads: number

  if (executionPattern > 0.8) {
    // SPs de alta frecuencia (reportes, consultas)
    executionCount = Math.floor(Math.random() * 50000) + 10000
    totalCPU = Math.random() * 1000 + 100
    totalReads = Math.floor(Math.random() * 500000000) + 10000000
  } else if (executionPattern > 0.5) {
    // SPs de frecuencia media (transacciones)
    executionCount = Math.floor(Math.random() * 10000) + 1000
    totalCPU = Math.random() * 500 + 50
    totalReads = Math.floor(Math.random() * 100000000) + 1000000
  } else {
    // SPs de baja frecuencia (mantenimiento, batch jobs)
    executionCount = Math.floor(Math.random() * 1000) + 10
    totalCPU = Math.random() * 200 + 10
    totalReads = Math.floor(Math.random() * 50000000) + 100000
  }

  const totalElapsed = totalCPU * (1 + Math.random() * 0.5) // Elapsed siempre >= CPU
  const avgCPU = totalCPU / executionCount
  const avgElapsed = totalElapsed / executionCount
  const totalWrites = Math.floor(totalReads * (Math.random() * 0.3)) // Writes ~30% de reads

  const impactScore =
    executionCount * 0.3 +
    totalCPU * 0.4 +
    (totalReads / 1000000.0) * 0.3

  return {
    DatabaseName: database,
    ProcedureName: procedureName,
    ExecutionCount: executionCount,
    TotalCPUSeconds: parseFloat(totalCPU.toFixed(2)),
    TotalElapsedSeconds: parseFloat(totalElapsed.toFixed(2)),
    AvgCPUSeconds: parseFloat(avgCPU.toFixed(4)),
    AvgElapsedSeconds: parseFloat(avgElapsed.toFixed(4)),
    TotalReads: totalReads,
    TotalWrites: totalWrites,
    LastExecutionTime: generateTimestamp(Math.floor(Math.random() * 24)),
    CachedTime: generateTimestamp(Math.floor(Math.random() * 168)), // última semana
    ImpactScore: parseFloat(impactScore.toFixed(2)),
  }
}).sort((a, b) => b.TotalCPUSeconds - a.TotalCPUSeconds) // Ordenar por CPU descendente

// Generar patrones de ejecución por hora (últimas 24 horas)
export const mockExecutionPatterns: ExecutionPattern[] = (() => {
  const patterns: ExecutionPattern[] = []

  databases.forEach(dbName => {
    for (let hour = 0; hour < 24; hour++) {
      // Simular patrones de uso típicos:
      // - Bajo uso: 00:00 - 06:00
      // - Alto uso: 08:00 - 18:00 (horario laboral)
      // - Medio uso: 18:00 - 00:00
      let baseExecutions: number

      if (hour >= 0 && hour < 6) {
        // Madrugada - batch jobs y mantenimiento
        baseExecutions = Math.floor(Math.random() * 500) + 100
      } else if (hour >= 8 && hour < 18) {
        // Horario laboral - pico de actividad
        baseExecutions = Math.floor(Math.random() * 3000) + 1000
      } else {
        // Noche - actividad moderada
        baseExecutions = Math.floor(Math.random() * 1000) + 300
      }

      patterns.push({
        ExecutionHour: hour,
        ExecutionsInPeriod: baseExecutions,
        DatabaseName: dbName,
      })
    }
  })

  return patterns
})()

// Top 15 SPs por CPU para el gráfico de barras
export const getTop15ByCPU = (): StoredProcedureStats[] => {
  return mockStoredProcedures.slice(0, 15)
}

// Datos para gráfico de dispersión (todos los SPs)
export const getScatterData = (): StoredProcedureStats[] => {
  return mockStoredProcedures
}

// Patrones de ejecución agregados por hora
export const getExecutionPatternsByHour = (): ExecutionPattern[] => {
  return mockExecutionPatterns
}
