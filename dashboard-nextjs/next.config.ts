import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuración vacía de Turbopack para silenciar advertencia
  turbopack: {},

  // Optimizar bundle del servidor - excluir paquetes de logging
  serverExternalPackages: ['pino', 'pino-pretty', 'thread-stream'],
};

export default nextConfig;
