/**
 * SQL Server Stored Procedure Performance Types
 * Basado en sys.dm_exec_procedure_stats de SQL Server 2016
 */

export interface StoredProcedureStats {
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

export interface ExecutionPattern {
  ExecutionHour: number
  ExecutionsInPeriod: number
  DatabaseName: string
}

export interface SPPerformanceResponse {
  success: boolean
  data: StoredProcedureStats[]
  executionPatterns: ExecutionPattern[]
  error?: string
}
