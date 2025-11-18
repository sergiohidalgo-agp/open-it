import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Rutas públicas que no requieren autenticación
  const publicPaths = ['/login']
  const path = request.nextUrl.pathname

  // Si es una ruta pública, permitir acceso
  if (publicPaths.includes(path)) {
    return NextResponse.next()
  }

  // Para el middleware, no podemos acceder a localStorage
  // En producción, esto se manejaría con cookies o tokens
  // Por ahora, dejamos pasar todas las rutas
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
