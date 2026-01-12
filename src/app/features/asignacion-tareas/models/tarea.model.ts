export interface Tarea {
  id: number;
  titulo: string;
  descripcion: string;
  proyectoId: number;
  proyectoNombre: string;
  responsableId: number;
  responsableNombre: string;
  fechaInicio: Date;
  fechaFin: Date;
  estado: 'Pendiente' | 'En progreso' | 'Completada' | 'Bloqueada';
  prioridad: 'Alta' | 'Media' | 'Baja';
  etapa: string;
  porcentajeAvance: number;
}

export interface AsignacionTarea {
  tareaId: number;
  usuarioId: number;
  fechaAsignacion: Date;
  observaciones?: string;
}

export interface TareaPorProyecto {
  proyectoId: number;
  proyectoNombre: string;
  tareas: Tarea[];
}

export interface TareaPorUsuario {
  usuarioId: number;
  usuarioNombre: string;
  tareas: Tarea[];
}
