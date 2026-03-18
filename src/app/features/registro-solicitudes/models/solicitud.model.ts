export type EstadoSolicitud = 'En Proceso' | 'Completado' | 'Cancelado';
export type EstadoTarea = 'Pendiente' | 'En Proceso' | 'Completado' | 'Retrasado';

export interface OrdenCompra {
  numero: string;
  fecha: string;
  tipo?: string;
  total?: number;
}

export interface FlujoAdjunto {
  nombre: string;
  tipo: string;
  tamano: number;
  archivo?: File;
}


export interface FlujoNodo {
  id: number;
  nombre: string;
  tipo: 'inicio' | 'tarea';
  posicionX?: number;
  posicionY?: number;
  responsableId?: number;
  fechaInicio?: string;
  fechaFin?: string;
  descripcion?: string;
  adjuntos?: FlujoAdjunto[];
  siguientesIds: number[];
}

export interface FlujoProyecto {
  nodos: FlujoNodo[];
}

export interface Solicitud {
  id: number;
  nombreProyecto: string;
  cliente: string;
  representante?: string;
  costo: number;
  responsableId: number;
  responsableNombre?: string;
  descripcion: string;
  ubicacion?: string;
  fechaSolicitud?: Date;
  fechaInicio?: Date | string;
  fechaFin?: Date | string;
  estado: EstadoSolicitud;
}

export interface Proyecto {
  id: number;
  solicitudId: number;
  nombreProyecto: string;
  cliente: string;
  representante?: string;
  costo: number;
  ordenesCompra?: OrdenCompra[];
  responsableId: number;
  responsableNombre?: string;
  descripcion: string;
  ubicacion?: string;
  fechaInicio: Date | string;
  fechaFinalizacion: Date | string;
  procesoId: number;
  procesoNombre?: string;
  estado: EstadoSolicitud;
  etapaActual?: number;
  motivoCancelacion?: string;
  etapas?: EtapaProyecto[];
  flujo?: FlujoProyecto;
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
  estado: EstadoTarea;
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
