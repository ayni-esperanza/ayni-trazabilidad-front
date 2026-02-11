// Estados consistentes con registro de solicitudes
export type EstadoProyecto = 'Pendiente' | 'En Proceso' | 'Completado' | 'Retrasado' | 'Cancelado';
export type EstadoTarea = 'Pendiente' | 'En Proceso' | 'Completado' | 'Retrasado';

export interface ProyectoEnCurso {
  id: number;
  proyecto: string;
  responsable: string;
  etapa: string;
  fechas: string;
  estado: EstadoProyecto;
  mes: string; // Ene, Feb, Mar, etc.
  fechaCreacion: Date;
  gastoTotal?: number; // Para vista de gastos
}

export interface TareaEncargado {
  id: number;
  responsable: string;
  tarea: string;
  proyecto: string;
  proyectoId: number; // ID del proyecto asociado
  etapa: string;
  fechas: string;
  estado: EstadoTarea;
}

// Modelo para gastos por proyecto
export interface GastoProyecto {
  id: number;
  proyectoId: number;
  proyecto: string;
  categoria: 'Materiales' | 'Mano de Obra' | string; // string para otros costos personalizados
  descripcion: string;
  monto: number;
  fecha: Date | string;
  responsable?: string;
}

export interface MetricaProyecto {
  total: number;
  tendencia: number[];
  periodo: string;
}

export interface Gastos {
  hoy: number;
  mes: number;
  ayer: number;
}

export interface DatoGrafico {
  name: string;
  value: number;
}

export interface ResumenTablero {
  proyectosFinalizados: number;
  proyectosActivos: number;
  gastos: Gastos;
  datosProyectosFinalizados: DatoGrafico[];
  datosProyectosActivos: DatoGrafico[];
  datosGastos: DatoGrafico[];
  proyectosEnCurso: ProyectoEnCurso[];
  tareasEncargados: TareaEncargado[];
  gastosProyectos: GastoProyecto[]; // Nuevo: gastos detallados
}
