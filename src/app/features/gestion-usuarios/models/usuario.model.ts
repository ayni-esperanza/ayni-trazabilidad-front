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
