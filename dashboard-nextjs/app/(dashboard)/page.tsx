import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Server, Users, HardDrive, Activity, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2 } from "lucide-react"

export default function Home() {
  return (
    <div className="flex flex-1 flex-col gap-4">
      {/* Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Servidores Activos</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span className="text-green-500">2 nuevos</span> esta semana
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,247</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span className="text-green-500">+12%</span> vs mes anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Almacenamiento</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">67%</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <span className="text-muted-foreground">8.4 TB / 12.5 TB</span> usados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime Promedio</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">99.8%</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              <span className="text-green-500">Excelente</span> performance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Estado de Servidores Críticos</CardTitle>
            <CardDescription>Monitoreo en tiempo real de infraestructura principal</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: "SRV-WEB-01", status: "online", cpu: 45, memory: 62, uptime: "28d 14h" },
                { name: "SRV-DB-01", status: "online", cpu: 78, memory: 85, uptime: "45d 3h" },
                { name: "SRV-APP-01", status: "warning", cpu: 89, memory: 72, uptime: "15d 8h" },
                { name: "SRV-BACKUP-01", status: "online", cpu: 23, memory: 48, uptime: "62d 19h" },
              ].map((server) => (
                <div key={server.name} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium leading-none">{server.name}</p>
                      <Badge
                        variant={server.status === "online" ? "default" : "secondary"}
                        className={
                          server.status === "online"
                            ? "bg-green-500 hover:bg-green-600"
                            : "bg-yellow-500 hover:bg-yellow-600"
                        }
                      >
                        {server.status === "online" ? "Online" : "Warning"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Uptime: {server.uptime}
                    </p>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">CPU</div>
                      <div className={`font-medium ${server.cpu > 80 ? "text-yellow-500" : ""}`}>
                        {server.cpu}%
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">RAM</div>
                      <div className={`font-medium ${server.memory > 80 ? "text-yellow-500" : ""}`}>
                        {server.memory}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alertas Recientes</CardTitle>
            <CardDescription>Últimos eventos del sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  type: "warning",
                  title: "Alto uso de CPU",
                  server: "SRV-APP-01",
                  time: "Hace 15 min"
                },
                {
                  type: "info",
                  title: "Backup completado",
                  server: "SRV-BACKUP-01",
                  time: "Hace 1 hora"
                },
                {
                  type: "success",
                  title: "Actualización aplicada",
                  server: "SRV-WEB-01",
                  time: "Hace 2 horas"
                },
                {
                  type: "warning",
                  title: "Espacio en disco bajo",
                  server: "SRV-DB-01",
                  time: "Hace 4 horas"
                },
              ].map((alert, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="mt-0.5">
                    {alert.type === "warning" && (
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    )}
                    {alert.type === "info" && (
                      <Activity className="h-4 w-4 text-blue-500" />
                    )}
                    {alert.type === "success" && (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">{alert.title}</p>
                    <p className="text-xs text-muted-foreground">{alert.server}</p>
                    <p className="text-xs text-muted-foreground">{alert.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions / Additional Info */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tickets Pendientes</CardTitle>
            <CardDescription>Solicitudes de soporte activas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Críticos</p>
                  <p className="text-xs text-muted-foreground">Requieren atención inmediata</p>
                </div>
                <Badge variant="destructive" className="text-lg px-3">3</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Altos</p>
                  <p className="text-xs text-muted-foreground">Prioridad alta</p>
                </div>
                <Badge className="bg-yellow-500 hover:bg-yellow-600 text-lg px-3">8</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Normales</p>
                  <p className="text-xs text-muted-foreground">Prioridad normal</p>
                </div>
                <Badge variant="secondary" className="text-lg px-3">15</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Próximos Mantenimientos</CardTitle>
            <CardDescription>Tareas programadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { task: "Actualización de seguridad", date: "Hoy, 22:00", server: "Todos los servidores" },
                { task: "Backup semanal", date: "Mañana, 02:00", server: "SRV-BACKUP-01" },
                { task: "Revisión de logs", date: "Miércoles, 10:00", server: "SRV-WEB-01" },
              ].map((task, idx) => (
                <div key={idx} className="flex items-start gap-3 border-b pb-2 last:border-0">
                  <Activity className="h-4 w-4 text-primary mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">{task.task}</p>
                    <p className="text-xs text-muted-foreground">{task.server}</p>
                    <p className="text-xs text-muted-foreground font-medium">{task.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
