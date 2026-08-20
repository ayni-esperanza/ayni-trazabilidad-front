// Estados consistentes con registro de solicitudes
export type EstadoProyecto = 'Pendiente' | 'En Proceso' | 'Completado' | 'Retrasado' | 'Cancelado' | 'Archivado';
export type EstadoTarea = 'Pendiente' | 'En Proceso' | 'Completado' | 'Retrasado';
export type MonedaDashboard = 'PEN' | 'USD';
export type FiltroMonedaDashboard = 'TODAS' | MonedaDashboard;

export interface ProyectoEnCurso {
  id: number;
  proyecto: string;
  empresa: string;
  responsable: string;
  etapa: string;
  fechas: string;
  estado: EstadoProyecto;
  mes: string;
  mesActivo?: string;
  mesFinalizado?: string;
  fechaCreacion: Date;
  fechaInicio?: Date;
  fechaFinalizacion?: Date;
  fechaRegistro?: Date | string;
  fechaActualizacion?: Date | string;
  gastoTotal?: number; // Para vista de gastos
  gastoTotalPen?: number;
  gastoTotalUsd?: number;
  lugar?: string;      // Ubicación/ciudad del proyecto
  area?: string;       // Area principal del proyecto
  areas?: string[];    // Areas asociadas al proyecto
}

export interface TareaEncargado {
  id: number;
  responsable: string;
  tarea: string;
  proyecto: string;
  proyectoId: number; // ID del proyecto asociado
  etapa: string;
  fechas: string;
  fechaRegistro?: Date | string;
  fechaActualizacion?: Date | string;
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
  mes?: string;
  responsable?: string;
  moneda?: MonedaDashboard;
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

export interface SerieGrafico {
  name: string;
  series: DatoGrafico[];
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
