export interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  username: string;
  telefono?: string;
  cargo: string;
  area: string;
  fechaIngreso: Date;
  activo: boolean;
  roles: Rol[];
  permisos: Permiso[];
  foto?: string;
}

export interface Rol {
  id: number;
  nombre: string;
  descripcion: string;
  permisos: Permiso[];
  activo: boolean;
}

export interface Permiso {
  id: number;
  nombre: string;
  descripcion: string;
  modulo: string;
  acciones: string[];
}

export interface ActividadUsuario {
  id: number;
  usuarioId: number;
  accion: string;
  modulo: string;
  descripcion: string;
  fecha: Date;
  ipAddress?: string;
}

// ==================== Request/Response DTOs ====================

export interface UsuarioRequest {
  nombre: string;
  apellido: string;
  username: string;
  email: string;
  telefono?: string;
  cargo?: string;
  area?: string;
  rolId: number;
  activo?: boolean;
  password?: string; // Solo para creación
  foto?: string | null; // Base64 de la imagen
}

export interface UsuarioResponse {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  username: string;
  telefono?: string;
  cargo: string;
  area: string;
  fechaIngreso: string; // ISO date string desde backend
  activo: boolean;
  roles: Rol[];
  foto?: string;
}

export interface UsuarioCreacionResponse {
  usuario: UsuarioResponse;
  passwordGenerado: string; // Contraseña generada automáticamente
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export interface EstadisticasUsuarios {
  totalUsuarios: number;
  usuariosActivos: number;
  administradores: number;
  ingenieros: number;
}

// ==================== Filtros ====================

export interface FiltrosUsuario {
  busqueda: string;
  rolId: number | null;
  activo?: boolean | null;
}
