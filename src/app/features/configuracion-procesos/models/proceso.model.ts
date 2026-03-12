export interface Proceso {
  id: number;
  proceso: string;
  descripcion?: string;
  area: string;
  activo?: boolean;
  flujo: string[];
}

export interface PaginatedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}



export interface Etapa {
  id: number;
  nombre: string;
  descripcion: string;
  orden: number;
  color: string;
  activo: boolean;
  estados: Estado[];
}

export interface Estado {
  id: number;
  nombre: string;
  descripcion: string;
  tipo: 'Inicial' | 'En proceso' | 'Final';
  color: string;
}

export interface ConfiguracionNotificacion {
  id: number;
  evento: string;
  destinatarios: string[];
  plantillaMensaje: string;
  activo: boolean;
}
