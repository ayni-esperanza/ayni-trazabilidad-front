export interface Solicitud {
  id: number;
  nombreProyecto: string;
  cliente: string;
  costo: number;
  responsableId: number;
  responsableNombre?: string;
  descripcion: string;
  fechaSolicitud?: Date;
  estado: 'Pendiente' | 'En Proceso' | 'Completado' | 'Cancelado' | 'Finalizado';
}

export interface Proyecto {
  id: number;
  solicitudId: number;
  nombreProyecto: string;
  cliente: string;
  costo: number;
  ordenCompra?: string;
  responsableId: number;
  responsableNombre?: string;
  descripcion: string;
  fechaInicio: Date | string;
  fechaFinalizacion: Date | string;
  procesoId: number;
  procesoNombre?: string;
  estado: 'Pendiente' | 'En Proceso' | 'Completado' | 'Cancelado' | 'Finalizado';
  etapaActual?: number;
}

export interface EtapaProyecto {
  id: number;
  proyectoId: number;
  etapaId: number;
  nombre: string;
  orden: number;
  presupuesto: number;
  responsableId: number;
  responsableNombre?: string;
  fechaInicio: Date | string;
  fechaFinalizacion: Date | string;
  estado: 'Pendiente' | 'En Proceso' | 'Completado' | 'Cancelado';
  tareas: TareaAsignada[];
}

export interface TareaAsignada {
  id: number;
  etapaProyectoId: number;
  responsableId: number;
  responsableNombre: string;
  tarea: string;
  fechaInicio: Date;
  fechaFin: Date;
  estado: 'Pendiente' | 'En Proceso' | 'Completado' | 'Con Retraso';
}

export interface Responsable {
  id: number;
  nombre: string;
  cargo?: string;
  email?: string;
}

export interface ProcesoSimple {
  id: number;
  nombre: string;
  etapas: EtapaSimple[];
}

export interface EtapaSimple {
  id: number;
  nombre: string;
  orden: number;
}

export interface FiltroBusquedaSolicitud {
  estado?: string;
  prioridad?: string;
  fechaDesde?: Date;
  fechaHasta?: Date;
  solicitante?: string;
}
