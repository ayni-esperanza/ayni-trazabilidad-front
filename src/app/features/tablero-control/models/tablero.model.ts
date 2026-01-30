export interface ProyectoEnCurso {
  id: number;
  proyecto: string;
  responsable: string;
  etapa: string;
  fechas: string;
  estado: 'warning' | 'success' | 'danger';
}

export interface TareaEncargado {
  id: number;
  responsable: string;
  tarea: string;
  proyecto: string;
  etapa: string;
  fechas: string;
  estado: 'warning' | 'success' | 'danger';
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
}
